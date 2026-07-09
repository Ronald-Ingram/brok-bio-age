"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { BROK_REFERENCE_IMAGE } from "@/lib/brokApiConfig";
import { chunkTextForTts } from "@/lib/speechChunks";
import { normalizeForSpeech } from "@/lib/spokenText";
import { Loader2 } from "lucide-react";
import Image from "next/image";

async function readSpeakResponse(res: Response): Promise<{
  chunks?: string[];
  error?: string;
  hint?: string;
}> {
  const raw = await res.text();
  const ct = res.headers.get("content-type") ?? "";
  if (!ct.includes("json")) {
    throw new Error(raw.slice(0, 160) || `Voice service error (${res.status})`);
  }
  try {
    return JSON.parse(raw) as {
      chunks?: string[];
      error?: string;
      hint?: string;
    };
  } catch {
    throw new Error(raw.slice(0, 160) || "Invalid voice service response");
  }
}

export interface HeyGenLiveAvatarHandle {
  speak: (text: string, fullLength?: boolean) => Promise<void>;
  isConnected: boolean;
}

interface HeyGenLiveAvatarProps {
  enabled: boolean;
  avatarId?: string | null;
  sandboxMode?: boolean;
  onError?: (message: string) => void;
  onStatus?: (status: "idle" | "connecting" | "live" | "error") => void;
  onSpeakProgress?: (current: number, total: number) => void;
}

interface SessionPayload {
  sessionId: string;
  livekitUrl: string;
  livekitClientToken: string;
  wsUrl: string;
  avatarId?: string;
  isSandbox?: boolean;
}

function isSessionConnected(data: { type?: string; state?: string }): boolean {
  if (data.state === "closed" || data.state === "closing") return false;
  if (data.state !== "connected") return false;
  return !data.type || data.type === "session.state_updated";
}

function waitForWsOpen(ws: WebSocket, timeoutMs = 15_000): Promise<void> {
  if (ws.readyState === WebSocket.OPEN) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("heygen_ws_open_timeout")), timeoutMs);
    ws.addEventListener("open", () => {
      clearTimeout(timer);
      resolve();
    });
    ws.addEventListener("error", () => {
      clearTimeout(timer);
      reject(new Error("heygen_ws_error"));
    });
  });
}

function waitForWsConnected(ws: WebSocket, timeoutMs = 25_000): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("heygen_ws_timeout")), timeoutMs);

    ws.addEventListener("message", function onMsg(event) {
      try {
        const data = JSON.parse(event.data as string) as {
          type?: string;
          state?: string;
        };
        if (isSessionConnected(data)) {
          clearTimeout(timer);
          ws.removeEventListener("message", onMsg);
          resolve();
        }
        if (data.state === "closed" || data.state === "closing") {
          clearTimeout(timer);
          ws.removeEventListener("message", onMsg);
          reject(new Error("heygen_ws_closed"));
        }
      } catch {
        /* ignore */
      }
    });
  });
}

export const HeyGenLiveAvatar = forwardRef<
  HeyGenLiveAvatarHandle,
  HeyGenLiveAvatarProps
>(function HeyGenLiveAvatar(
  { enabled, avatarId, sandboxMode, onError, onStatus, onSpeakProgress },
  ref
) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const roomRef = useRef<import("livekit-client").Room | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const keepAliveRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sandboxRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const connectGenRef = useRef(0);
  const connectingRef = useRef(false);
  const enabledRef = useRef(enabled);
  const [isLive, setIsLive] = useState(false);
  const [status, setStatus] = useState<"idle" | "connecting" | "live" | "error">("idle");

  enabledRef.current = enabled;

  const setStat = useCallback(
    (s: typeof status) => {
      setStatus(s);
      onStatus?.(s);
      setIsLive(s === "live");
    },
    [onStatus]
  );

  const clearTimers = useCallback(() => {
    if (keepAliveRef.current) {
      clearInterval(keepAliveRef.current);
      keepAliveRef.current = null;
    }
    if (sandboxRefreshRef.current) {
      clearInterval(sandboxRefreshRef.current);
      sandboxRefreshRef.current = null;
    }
  }, []);

  const stopLocalSession = useCallback(async (notifyServer: boolean) => {
    clearTimers();
    wsRef.current?.close();
    wsRef.current = null;

    if (roomRef.current) {
      await roomRef.current.disconnect();
      roomRef.current = null;
    }

    if (notifyServer && sessionIdRef.current) {
      const id = sessionIdRef.current;
      sessionIdRef.current = null;
      fetch("/api/brok/heygen/stop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: id }),
      }).catch(() => null);
    } else {
      sessionIdRef.current = null;
    }
  }, [clearTimers]);

  const startSession = useCallback(async () => {
    if (!enabledRef.current || connectingRef.current) return;
    connectingRef.current = true;
    const gen = ++connectGenRef.current;
    setStat("connecting");

    try {
      if (sessionIdRef.current || wsRef.current || roomRef.current) {
        await stopLocalSession(true);
      }
      const res = await fetch("/api/brok/heygen/session", { method: "POST" });
      const data = (await res.json()) as SessionPayload & {
        error?: string;
        hint?: string;
      };
      if (!res.ok) throw new Error(data.hint ?? data.error ?? "session_failed");
      if (gen !== connectGenRef.current) return;
      if (data.isSandbox) {
        console.warn(
          "[HeyGen] Sandbox session — Wayne test face. Set HEYGEN_SANDBOX=false for BROK avatar."
        );
      }

      sessionIdRef.current = data.sessionId;

      const { Room, RoomEvent, Track } = await import("livekit-client");
      const room = new Room();
      roomRef.current = room;

      const attachTrack = (track: import("livekit-client").RemoteTrack) => {
        if (track.kind === Track.Kind.Video && videoRef.current) {
          track.attach(videoRef.current);
        }
        if (track.kind === Track.Kind.Audio && audioRef.current) {
          track.attach(audioRef.current);
        }
      };

      room.on(RoomEvent.TrackSubscribed, (track) => attachTrack(track));
      room.on(RoomEvent.TrackPublished, (pub) => {
        if (pub.track) attachTrack(pub.track);
      });
      room.on(RoomEvent.Disconnected, () => {
        if (enabledRef.current && gen === connectGenRef.current) {
          setStat("error");
        }
      });

      await room.connect(data.livekitUrl, data.livekitClientToken);

      const ws = new WebSocket(data.wsUrl);
      wsRef.current = ws;
      ws.addEventListener("close", () => {
        if (enabledRef.current && gen === connectGenRef.current && status === "live") {
          setStat("error");
        }
      });

      await waitForWsOpen(ws);
      await waitForWsConnected(ws);
      if (gen !== connectGenRef.current) return;

      keepAliveRef.current = setInterval(() => {
        if (ws.readyState !== WebSocket.OPEN) return;
        ws.send(
          JSON.stringify({
            type: "session.keep_alive",
            event_id: crypto.randomUUID(),
          })
        );
      }, 45_000);

      if (sandboxMode) {
        sandboxRefreshRef.current = setInterval(() => {
          if (enabledRef.current) void startSession();
        }, 50_000);
      }

      setStat("live");
    } catch (e) {
      if (gen === connectGenRef.current) {
        const msg = e instanceof Error ? e.message : "heygen_connect_failed";
        setStat("error");
        onError?.(msg);
      }
      await stopLocalSession(true);
    } finally {
      connectingRef.current = false;
    }
  }, [onError, sandboxMode, setStat, status, stopLocalSession]);

  const ensureSession = useCallback(async () => {
    const wsOk = wsRef.current?.readyState === WebSocket.OPEN;
    const roomOk =
      roomRef.current?.state === "connected" ||
      roomRef.current?.state === "reconnecting";
    if (wsOk && roomOk) return;
    await stopLocalSession(true);
    await startSession();
    if (wsRef.current?.readyState !== WebSocket.OPEN) {
      throw new Error("heygen_ws_not_ready");
    }
  }, [startSession, stopLocalSession]);

  const teardown = useCallback(async () => {
    connectGenRef.current += 1;
    await stopLocalSession(true);
    setStat("idle");
  }, [setStat, stopLocalSession]);

  useEffect(() => {
    if (!enabled) {
      teardown();
      return;
    }
    startSession();
    return () => {
      void teardown();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, sandboxMode, avatarId]);

  const enableRoomAudio = useCallback(async () => {
    if (videoRef.current) {
      videoRef.current.muted = false;
      await videoRef.current.play().catch(() => null);
    }
    if (audioRef.current) {
      audioRef.current.muted = false;
      await audioRef.current.play().catch(() => null);
    }
  }, []);

  const streamPcmToAvatar = useCallback(
    async (ws: WebSocket, pcmChunks: string[]) => {
      const speakId = crypto.randomUUID();
      const speakAck = new Promise<void>((resolve, reject) => {
        const timer = setTimeout(
          () => reject(new Error("avatar_speak_timeout")),
          60_000
        );
        const onMsg = (event: MessageEvent) => {
          try {
            const data = JSON.parse(event.data as string) as {
              type?: string;
              event_id?: string;
            };
            const t = data.type ?? "";
            if (
              t === "agent.speak_started" ||
              t === "agent.speak_ended" ||
              data.event_id === speakId
            ) {
              clearTimeout(timer);
              ws.removeEventListener("message", onMsg);
              resolve();
            }
          } catch {
            /* ignore */
          }
        };
        ws.addEventListener("message", onMsg);
      });

      for (const audio of pcmChunks) {
        ws.send(JSON.stringify({ type: "agent.speak", audio, event_id: speakId }));
      }
      ws.send(JSON.stringify({ type: "agent.speak_end", event_id: speakId }));
      await speakAck;
    },
    []
  );

  const speak = useCallback(
    async (text: string, fullLength = false) => {
      await ensureSession();
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        throw new Error("heygen_ws_not_ready");
      }

      await enableRoomAudio();

      const prepared = normalizeForSpeech(text);
      const segments = fullLength
        ? chunkTextForTts(prepared)
        : [prepared];

      for (let i = 0; i < segments.length; i++) {
        onSpeakProgress?.(i + 1, segments.length);

        const res = await fetch("/api/brok/heygen/speak", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: segments[i],
            fullLength: false,
          }),
        });
        const payload = await readSpeakResponse(res);
        if (!res.ok) {
          throw new Error(payload.hint ?? payload.error ?? "speak_failed");
        }

        await streamPcmToAvatar(ws, payload.chunks ?? []);
      }
    },
    [enableRoomAudio, ensureSession, onSpeakProgress, streamPcmToAvatar]
  );

  useImperativeHandle(
    ref,
    () => ({
      speak,
      isConnected: isLive,
    }),
    [speak, isLive]
  );

  return (
    <div className="relative w-full h-full min-h-[280px] bg-black rounded-xl overflow-hidden">
      <Image
        src={BROK_REFERENCE_IMAGE}
        alt=""
        fill
        aria-hidden
        className="object-contain object-center"
      />
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`absolute inset-0 w-full h-full object-contain object-center bg-transparent transition-opacity duration-300 ${
          status === "live" ? "opacity-100" : "opacity-0"
        }`}
      />
      <audio ref={audioRef} autoPlay playsInline className="hidden" />
      {status === "connecting" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white/60 text-xs gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-neon-cyan" />
          Starting BROK live avatar…
        </div>
      )}
      {status === "live" && (
        <p className="absolute top-2 left-2 text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-400/15 text-emerald-400 border border-emerald-400/25">
          Live{sandboxMode ? " · preview" : ""}
        </p>
      )}
      {status === "error" && (
        <div className="absolute bottom-2 inset-x-2 flex items-center justify-center rounded-lg bg-black/70 px-3 py-2 text-center border border-red-400/20">
          <p className="text-[10px] text-red-300/90">
            Live session paused — static BROK shown · send again to reconnect
          </p>
        </div>
      )}
    </div>
  );
});