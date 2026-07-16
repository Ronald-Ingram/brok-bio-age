"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { forceFullMediaVolume } from "@/lib/audioGain";
import { sanitizeBrokAvatarError } from "@/lib/brokAvatarErrors";
import { brokAuthHeaders } from "@/lib/authFetch";
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
  userId?: string | null;
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

function isSessionConnected(data: {
  type?: string;
  state?: string;
  session_state?: string;
}): boolean {
  const state = data.state ?? data.session_state;
  if (state === "closed" || state === "closing" || state === "failed") {
    return false;
  }
  // LiveAvatar may report connected via state or type-only events.
  if (state === "connected" || state === "ready") return true;
  const t = (data.type ?? "").toLowerCase();
  return (
    t === "session.created" ||
    t === "session.updated" ||
    t.includes("connected") ||
    t === "agent.idle" ||
    t === "agent.listening"
  );
}

function isMobileClient(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
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
          session_state?: string;
        };
        if (isSessionConnected(data)) {
          clearTimeout(timer);
          ws.removeEventListener("message", onMsg);
          resolve();
        }
        const st = data.state ?? data.session_state;
        if (st === "closed" || st === "closing") {
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
  { enabled, userId, avatarId, sandboxMode, onError, onStatus, onSpeakProgress },
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
  const onErrorRef = useRef(onError);
  const onStatusRef = useRef(onStatus);
  const softReconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startSessionRef = useRef<() => Promise<void>>(async () => {});
  const [isLive, setIsLive] = useState(false);
  const [status, setStatus] = useState<"idle" | "connecting" | "live" | "error">("idle");
  const [connectError, setConnectError] = useState<string | null>(null);
  const mobile = isMobileClient();

  enabledRef.current = enabled;
  onErrorRef.current = onError;
  onStatusRef.current = onStatus;

  const setStat = useCallback((s: typeof status) => {
    setStatus(s);
    onStatusRef.current?.(s);
    setIsLive(s === "live");
  }, []);

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

  const scheduleSoftReconnect = useCallback(() => {
    if (!enabledRef.current) return;
    if (softReconnectTimer.current) clearTimeout(softReconnectTimer.current);
    softReconnectTimer.current = setTimeout(() => {
      if (!enabledRef.current || connectingRef.current) return;
      // Don't spam parent error UI — quietly reconnect when WS drops (common on mobile).
      void startSessionRef.current();
    }, mobile ? 800 : 400);
  }, [mobile]);

  const startSession = useCallback(async () => {
    if (!enabledRef.current || connectingRef.current) return;
    connectingRef.current = true;
    const gen = ++connectGenRef.current;
    setStat("connecting");
    setConnectError(null);

    const wsOpenMs = mobile ? 25_000 : 15_000;
    const wsReadyMs = mobile ? 22_000 : 12_000;

    try {
      if (sessionIdRef.current || wsRef.current || roomRef.current) {
        await stopLocalSession(true);
      }
      const res = await fetch("/api/brok/heygen/session", { method: "POST" });
      const data = (await res.json()) as SessionPayload & {
        error?: string;
        hint?: string;
      };
      if (!res.ok) {
        throw new Error(
          sanitizeBrokAvatarError(data.hint ?? data.error ?? "session_failed")
        );
      }
      if (gen !== connectGenRef.current) return;
      if (data.isSandbox) {
        console.warn("[BROK Avatar] Preview session active — production avatar not configured.");
      }

      sessionIdRef.current = data.sessionId;

      const { Room, RoomEvent, Track } = await import("livekit-client");
      const room = new Room({
        // Mobile Safari: adaptive stream helps under cellular constraints.
        adaptiveStream: true,
        dynacast: true,
      });
      roomRef.current = room;

      const attachTrack = (track: import("livekit-client").RemoteTrack) => {
        if (track.kind === Track.Kind.Video && videoRef.current) {
          track.attach(videoRef.current);
          // iOS needs playsInline + play() after attach.
          void videoRef.current.play().catch(() => null);
        }
        if (track.kind === Track.Kind.Audio && audioRef.current) {
          track.attach(audioRef.current);
          // Always full volume — mobile may leave elements muted after autoplay dance.
          forceFullMediaVolume(audioRef.current);
          void audioRef.current.play().catch(() => null);
        }
      };

      room.on(RoomEvent.TrackSubscribed, (track) => {
        attachTrack(track);
        if (enabledRef.current && gen === connectGenRef.current) {
          setStat("live");
        }
      });
      room.on(RoomEvent.TrackPublished, (pub) => {
        if (pub.track) attachTrack(pub.track);
      });
      room.on(RoomEvent.Disconnected, () => {
        if (enabledRef.current && gen === connectGenRef.current) {
          setStat("error");
          scheduleSoftReconnect();
        }
      });

      await room.connect(data.livekitUrl, data.livekitClientToken);

      for (const participant of room.remoteParticipants.values()) {
        for (const pub of participant.trackPublications.values()) {
          if (pub.track) attachTrack(pub.track);
        }
      }

      const ws = new WebSocket(data.wsUrl);
      wsRef.current = ws;
      ws.addEventListener("close", () => {
        if (enabledRef.current && gen === connectGenRef.current) {
          // Mobile Safari often drops idle WS — reconnect quietly instead of alarming.
          setStat("error");
          scheduleSoftReconnect();
        }
      });

      await waitForWsOpen(ws, wsOpenMs);
      try {
        await waitForWsConnected(ws, wsReadyMs);
      } catch {
        if (room.state !== "connected" && room.state !== "reconnecting") {
          throw new Error("heygen_ws_timeout");
        }
        console.warn(
          "[BROK Avatar] WS connect event slow — continuing with LiveKit room ready"
        );
      }
      if (gen !== connectGenRef.current) return;

      // More frequent keep-alives on mobile to reduce silent drops.
      keepAliveRef.current = setInterval(() => {
        if (ws.readyState !== WebSocket.OPEN) return;
        ws.send(
          JSON.stringify({
            type: "session.keep_alive",
            event_id: crypto.randomUUID(),
          })
        );
      }, mobile ? 20_000 : 40_000);

      if (sandboxMode) {
        sandboxRefreshRef.current = setInterval(() => {
          if (enabledRef.current) void startSession();
        }, 50_000);
      }

      setStat("live");
      setConnectError(null);
      // Video can stay muted for autoplay; room audio is unmuted on speak().
      if (videoRef.current) {
        videoRef.current.muted = true;
        videoRef.current.playsInline = true;
        void videoRef.current.play().catch(() => null);
      }
      if (audioRef.current) {
        // Start unmuted on desktop; mobile unmutes in enableRoomAudio() on speak gesture.
        if (!mobile) forceFullMediaVolume(audioRef.current);
        else audioRef.current.muted = true;
        void audioRef.current.play().catch(() => null);
      }
    } catch (e) {
      if (gen === connectGenRef.current) {
        const msg = sanitizeBrokAvatarError(
          e instanceof Error ? e.message : "avatar_connect_failed"
        );
        setConnectError(msg);
        setStat("error");
        // Soft errors on mobile — parent can still fall back to voice.
        onErrorRef.current?.(msg);
      }
      await stopLocalSession(true);
    } finally {
      connectingRef.current = false;
    }
  }, [mobile, sandboxMode, scheduleSoftReconnect, setStat, stopLocalSession]);

  startSessionRef.current = startSession;

  const sessionReady = useCallback(() => {
    const wsOk = wsRef.current?.readyState === WebSocket.OPEN;
    const roomOk =
      roomRef.current?.state === "connected" ||
      roomRef.current?.state === "reconnecting";
    // Require both; mobile often keeps room while WS dies — speak needs WS.
    return Boolean(wsOk && roomOk && sessionIdRef.current);
  }, []);

  const ensureSession = useCallback(async () => {
    if (sessionReady()) return;

    if (connectingRef.current) {
      const deadline = Date.now() + (mobile ? 40_000 : 35_000);
      while (connectingRef.current && Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 150));
        if (sessionReady()) return;
      }
      if (sessionReady()) return;
    }

    // Up to 3 connect attempts — mobile networks drop the first session often.
    let lastErr: Error | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await stopLocalSession(true);
        await startSession();
        if (sessionReady()) return;
        lastErr = new Error("heygen_ws_not_ready");
      } catch (e) {
        lastErr = e instanceof Error ? e : new Error("heygen_ws_not_ready");
      }
      await new Promise((r) => setTimeout(r, 400 + attempt * 500));
    }
    throw lastErr ?? new Error("heygen_ws_not_ready");
  }, [mobile, sessionReady, startSession, stopLocalSession]);

  const teardown = useCallback(async () => {
    connectGenRef.current += 1;
    if (softReconnectTimer.current) {
      clearTimeout(softReconnectTimer.current);
      softReconnectTimer.current = null;
    }
    await stopLocalSession(true);
    setStat("idle");
  }, [setStat, stopLocalSession]);

  /**
   * Connect when avatar toggled on; tear down when off.
   * Mobile: delay connect slightly so toggle gesture settles; primary connect is still
   * ensureSession() on first speak (user gesture) for better WebRTC success.
   */
  useEffect(() => {
    if (!enabled) {
      void teardown();
      return;
    }
    setConnectError(null);
    const delay = mobile ? 350 : 0;
    const t = setTimeout(() => {
      void startSession();
    }, delay);
    return () => {
      clearTimeout(t);
      void teardown();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- stable connect lifecycle
  }, [enabled, sandboxMode, avatarId, mobile]);

  // Reconnect when phone wakes / tab returns (iOS Safari freezes WS).
  useEffect(() => {
    if (!enabled) return;
    const onVis = () => {
      if (document.visibilityState !== "visible") return;
      if (!enabledRef.current) return;
      if (sessionReady()) return;
      scheduleSoftReconnect();
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pageshow", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pageshow", onVis);
    };
  }, [enabled, scheduleSoftReconnect, sessionReady]);

  const enableRoomAudio = useCallback(async () => {
    // Video stays muted (autoplay); LiveKit audio track is on <audio> — boost that.
    if (videoRef.current) {
      videoRef.current.playsInline = true;
      await videoRef.current.play().catch(() => null);
    }
    if (audioRef.current) {
      forceFullMediaVolume(audioRef.current);
      await audioRef.current.play().catch(() => null);
    }
    // Re-assert after a tick — iOS sometimes applies mute after attach.
    window.setTimeout(() => {
      forceFullMediaVolume(audioRef.current);
      void audioRef.current?.play().catch(() => null);
    }, 50);
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

  const speakOnce = useCallback(
    async (text: string, fullLength: boolean) => {
      await ensureSession();
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        throw new Error("heygen_ws_not_ready");
      }

      await enableRoomAudio();

      const prepared = normalizeForSpeech(text);
      // Always chunk long answers so mobile + Cartesia stay under limits.
      const segments =
        fullLength || prepared.length > 480
          ? chunkTextForTts(prepared)
          : [prepared];

      for (let i = 0; i < segments.length; i++) {
        onSpeakProgress?.(i + 1, segments.length);

        const res = await fetch("/api/brok/heygen/speak", {
          method: "POST",
          headers: await brokAuthHeaders(),
          body: JSON.stringify({
            text: segments[i],
            fullLength: false,
            user_id: userId ?? undefined,
          }),
        });
        const payload = await readSpeakResponse(res);
        if (!res.ok) {
          throw new Error(
            sanitizeBrokAvatarError(
              payload.hint ?? payload.error ?? "speak_failed"
            )
          );
        }

        const liveWs = wsRef.current;
        if (!liveWs || liveWs.readyState !== WebSocket.OPEN) {
          throw new Error("heygen_ws_not_ready");
        }
        await streamPcmToAvatar(liveWs, payload.chunks ?? []);
      }
    },
    [enableRoomAudio, ensureSession, onSpeakProgress, streamPcmToAvatar, userId]
  );

  const speak = useCallback(
    async (text: string, fullLength = true) => {
      if (!enabledRef.current) return;
      try {
        try {
          await speakOnce(text, fullLength);
        } catch {
          // One hard reconnect + retry — common after mobile network blips.
          await stopLocalSession(true);
          await startSession();
          await speakOnce(text, fullLength);
        }
        setConnectError(null);
        setStat("live");
      } finally {
        if (!enabledRef.current) {
          await stopLocalSession(true);
          setStat("idle");
        }
      }
    },
    [setStat, speakOnce, startSession, stopLocalSession]
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
      <audio
        ref={audioRef}
        autoPlay
        playsInline
        // Do not leave muted=true stuck; volume forced full on speak.
        className="hidden"
      />
      {status === "connecting" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white/60 text-xs gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-neon-cyan" />
          Starting BROK live avatar…
        </div>
      )}
      {enabled && status === "idle" && (
        <p className="absolute top-2 left-2 text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/5 text-white/45 border border-white/10">
          Reconnecting…
        </p>
      )}
      {status === "live" && (
        <p className="absolute top-2 left-2 text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-400/15 text-emerald-400 border border-emerald-400/25">
          Live{sandboxMode ? " · preview" : ""}
        </p>
      )}
      {status === "error" && (
        <div className="absolute bottom-2 inset-x-2 flex flex-col items-center justify-center gap-2 rounded-lg bg-black/70 px-3 py-2 text-center border border-red-400/20">
          <p className="text-[10px] text-red-300/90">
            Live session paused — static BROK shown
            {connectError ? `: ${connectError}` : ""}
          </p>
          <button
            type="button"
            onClick={() => {
              setConnectError(null);
              void startSession();
            }}
            className="text-[10px] px-2 py-1 rounded border border-neon-cyan/40 text-neon-cyan hover:bg-neon-cyan/10"
          >
            Retry live avatar
          </button>
        </div>
      )}
    </div>
  );
});