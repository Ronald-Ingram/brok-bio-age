"use client";

import {
  HeyGenLiveAvatar,
  type HeyGenLiveAvatarHandle,
} from "@/components/HeyGenLiveAvatar";
import { BusinessCanvasPanel } from "@/components/BusinessCanvasPanel";
import { InneagramPanel } from "@/components/InneagramPanel";
import { IemReportModal } from "@/components/IemReportModal";
import { forceFullMediaVolume } from "@/lib/audioGain";
import { sanitizeBrokAvatarError } from "@/lib/brokAvatarErrors";
import { BROK_REFERENCE_IMAGE } from "@/lib/brokApiConfig";
import type { IemReportPayload } from "@/lib/iemReportTypes";
import {
  BROK_AVATAR_LABEL,
  BROK_VOICE_CLONE_LABEL,
  voiceDisplayName,
} from "@/lib/brokProductLabels";
import { spokenExcerpt, wantsFullLengthSpeech } from "@/lib/spokenExcerpt";
import { usePock } from "@/context/PockContext";
import { MAX_ATTACHMENTS } from "@/lib/brokFileIngest";
import {
  BarChart3,
  FileUp,
  LayoutGrid,
  Sparkles,
  Loader2,
  Mic,
  MicOff,
  Send,
  User,
  UserX,
  Volume2,
  X,
} from "lucide-react";
import Image from "next/image";
import { brokAuthHeaders } from "@/lib/authFetch";
import { buildPageContextPayload } from "@/lib/brokPageContext";
import { useBrowserSpeechInput } from "@/hooks/useBrowserSpeechInput";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

type ChatTurn = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

const threadStorageKey = (userId: string) => `brok_thread_id:${userId}`;

interface BrokStatus {
  brokApi: boolean;
  cartesia: boolean;
  heygen: boolean;
  heygenSandbox?: boolean;
  heygenAvatarId?: string | null;
  heygenBrokAvatarActive?: boolean;
  brokAvatarImage?: string;
  heygenUsingCustomAvatar?: boolean;
  cartesiaVoice?: { id: string; name: string } | null;
  voiceCloneReady?: boolean;
  voiceReady?: boolean;
  voiceCloneName?: string;
  voiceProvider?: string | null;
  voiceCloneHint?: string;
  voiceLabel?: string;
  avatarLabel?: string;
  preferXttsVoice?: boolean;
  xttsVoicePreferred?: boolean;
  chatReady?: boolean;
  chatProvider?: string | null;
  chatProviderLabel?: string;
  groqFallback?: boolean;
  routingSummary?: string;
  llmProvider?: string;
}

interface BrokAvatarPanelProps {
  /** Tight vertical stack on mobile — avatar then chat with minimal gap */
  layout?: "default" | "stacked";
}

export function BrokAvatarPanel({ layout = "default" }: BrokAvatarPanelProps) {
  const stacked = layout === "stacked";
  const pathname = usePathname();
  const { user } = usePock();
  const heygenRef = useRef<HeyGenLiveAvatarHandle>(null);
  const [status, setStatus] = useState<BrokStatus | null>(null);
  const [heygenLive, setHeygenLive] = useState(false);
  const [message, setMessage] = useState("");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [response, setResponse] = useState("");
  const [threadId, setThreadId] = useState<string | null>(null);
  const [chatTurns, setChatTurns] = useState<ChatTurn[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [fileIds, setFileIds] = useState<string[]>([]);
  const [fileContexts, setFileContexts] = useState<
    { filename: string; text: string }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [iemReportLoading, setIemReportLoading] = useState(false);
  const [iemReport, setIemReport] = useState<IemReportPayload | null>(null);
  const [inneagramOpen, setInneagramOpen] = useState(false);
  const [canvasOpen, setCanvasOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voiceOn, setVoiceOn] = useState(true);
  const [avatarOn, setAvatarOn] = useState(false);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [speakProgress, setSpeakProgress] = useState<string | null>(null);
  const [lastUserMessage, setLastUserMessage] = useState("");
  const [lastModel, setLastModel] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const messageRef = useRef(message);
  messageRef.current = message;

  const messageInputRef = useRef<HTMLTextAreaElement | null>(null);
  /** True when the user used mic (or we should re-arm) for continuous voice dialogue. */
  const preferVoiceInputRef = useRef(false);

  const {
    listening,
    supported: sttSupported,
    toggle: toggleListen,
    start: startListening,
    stop: stopListening,
  } = useBrowserSpeechInput({
    getValue: () => messageRef.current,
    setValue: setMessage,
    onError: (msg) => setError(msg),
  });

  const useHeyGenLive = Boolean(avatarOn && status?.heygen);

  // Stable callbacks so HeyGenLiveAvatar does not reconnect-loop every render.
  const handleAvatarError = useCallback((msg: string) => {
    setError(sanitizeBrokAvatarError(msg));
  }, []);
  const handleAvatarStatus = useCallback((s: "idle" | "connecting" | "live" | "error") => {
    setHeygenLive(s === "live");
  }, []);
  const handleAvatarSpeakProgress = useCallback((current: number, total: number) => {
    setSpeakProgress(
      total > 1
        ? `Speaking part ${current} of ${total}…`
        : "Generating speech…"
    );
  }, []);

  const loadStatus = useCallback(async () => {
    const res = await fetch("/api/brok/status");
    if (res.ok) setStatus(await res.json());
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const loadThreadHistory = useCallback(async () => {
    if (!user?.id) {
      setThreadId(null);
      setChatTurns([]);
      return;
    }

    const stored =
      typeof window !== "undefined"
        ? localStorage.getItem(threadStorageKey(user.id))
        : null;

    setHistoryLoading(true);
    try {
      const qs = stored ? `?thread_id=${encodeURIComponent(stored)}` : "";
      const res = await fetch(`/api/brok/threads${qs}`, {
        headers: await brokAuthHeaders(),
      });
      if (!res.ok) return;

      const data = (await res.json()) as {
        thread_id?: string | null;
        messages?: ChatTurn[];
      };

      if (data.thread_id) {
        setThreadId(data.thread_id);
        localStorage.setItem(threadStorageKey(user.id), data.thread_id);
      } else {
        setThreadId(null);
        localStorage.removeItem(threadStorageKey(user.id));
      }

      // API returns oldest→newest; UI keeps newest first for heavy-user scanning.
      const turns = [...(data.messages ?? [])].reverse();
      setChatTurns(turns);
      const lastAssistant = turns.find((m) => m.role === "assistant");
      setResponse(lastAssistant?.content ?? "");
    } finally {
      setHistoryLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void loadThreadHistory();
  }, [loadThreadHistory]);

  const startNewConversation = async () => {
    if (!user?.id) return;
    setError(null);
    try {
      const res = await fetch("/api/brok/threads", {
        method: "POST",
        headers: await brokAuthHeaders(),
        body: JSON.stringify({
          user_id: user.id,
          page_pathname: pathname ?? "/",
        }),
      });
      const data = (await res.json()) as { thread_id?: string; error?: string };
      if (!res.ok || !data.thread_id) {
        throw new Error(data.error ?? "new_thread_failed");
      }
      setThreadId(data.thread_id);
      localStorage.setItem(threadStorageKey(user.id), data.thread_id);
      setChatTurns([]);
      setResponse("");
      setMessage("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start new conversation");
    }
  };

  /**
   * When Voice and/or Avatar are ON, speak the full on-screen answer (demos + UX).
   * Text still defaults shorter from the model; fullLength speech only when toggles are on
   * or the user explicitly asked for a full-length read.
   */
  const speechPayload = (text: string, userMessage: string) => {
    const full =
      voiceOn ||
      avatarOn ||
      useHeyGenLive ||
      wantsFullLengthSpeech(userMessage);
    return {
      text: spokenExcerpt(text, { fullLength: full }),
      fullLength: full,
    };
  };

  const playBrokVoice = async (
    text: string,
    userMessage: string,
    opts?: { force?: boolean }
  ) => {
    if (!voiceOn || (useHeyGenLive && !opts?.force)) return;
    setVoiceLoading(true);
    try {
      const payload = speechPayload(text, userMessage);
      const res = await fetch("/api/brok/voice", {
        method: "POST",
        headers: await brokAuthHeaders(),
        body: JSON.stringify({
          text: payload.text,
          fullLength: payload.fullLength,
          user_id: user?.id,
        }),
      });
      if (!res.ok) {
        const raw = await res.text();
        let msg = "Voice unavailable";
        try {
          const data = JSON.parse(raw) as { hint?: string; error?: string };
          msg = data.hint ?? data.error ?? msg;
        } catch {
          if (raw) msg = raw.slice(0, 160);
        }
        setError(msg);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      if (audioRef.current) {
        const audio = audioRef.current;
        audio.src = url;
        forceFullMediaVolume(audio);
        // Wait until playback finishes (with timeout — iOS sometimes never fires "ended").
        await new Promise<void>((resolve) => {
          let settled = false;
          const done = () => {
            if (settled) return;
            settled = true;
            window.clearTimeout(safety);
            audio.removeEventListener("ended", done);
            audio.removeEventListener("error", done);
            audio.removeEventListener("pause", onPauseMaybeDone);
            try {
              URL.revokeObjectURL(url);
            } catch {
              /* ignore */
            }
            resolve();
          };
          // If playback stalls or iOS drops the ended event, free the UI within ~2 min max.
          const safety = window.setTimeout(done, 120_000);
          const onPauseMaybeDone = () => {
            // Treat near-end pause as done (common iOS quirk).
            if (
              audio.duration &&
              Number.isFinite(audio.duration) &&
              audio.currentTime >= audio.duration - 0.35
            ) {
              done();
            }
          };
          audio.addEventListener("ended", done);
          audio.addEventListener("error", done);
          audio.addEventListener("pause", onPauseMaybeDone);
          forceFullMediaVolume(audio);
          void audio.play().catch(() => done());
        });
      } else {
        URL.revokeObjectURL(url);
      }
    } finally {
      setVoiceLoading(false);
    }
  };

  const speakResponse = async (text: string, userMessage: string) => {
    const payload = speechPayload(text, userMessage);
    if (useHeyGenLive && heygenRef.current) {
      setVoiceLoading(true);
      setSpeakProgress("Speaking full answer…");
      try {
        // One silent retry path lives inside speak(); if still down, voice-only fallback.
        await heygenRef.current.speak(payload.text, true);
        setError(null);
      } catch (e) {
        const msg = sanitizeBrokAvatarError(
          e instanceof Error ? e.message : "avatar_speech_failed"
        );
        setError(
          `${msg} Playing ${BROK_VOICE_CLONE_LABEL} for the full answer (text above is complete).`
        );
        await playBrokVoice(text, userMessage, { force: true });
      } finally {
        setVoiceLoading(false);
        setSpeakProgress(null);
      }
      return;
    }
    await playBrokVoice(text, userMessage);
  };

  const addPendingFiles = (incoming: FileList | File[]) => {
    const next = [...pendingFiles];
    for (const f of Array.from(incoming)) {
      if (next.length + fileContexts.length >= MAX_ATTACHMENTS) break;
      if (!next.some((p) => p.name === f.name && p.size === f.size)) {
        next.push(f);
      }
    }
    setPendingFiles(next);
  };

  const removePendingFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const clearAttachedContext = () => {
    setFileContexts([]);
    setFileIds([]);
  };

  const uploadPendingFiles = async (
    contexts: { filename: string; text: string }[],
    uploadedIds: string[]
  ) => {
    if (!pendingFiles.length) return { contexts, uploadedIds };

    const uploads = await Promise.all(
      pendingFiles.map(async (f) => {
        const fd = new FormData();
        fd.append("file", f);
        const up = await fetch("/api/brok/upload", { method: "POST", body: fd });
        const upData = (await up.json()) as {
          file_id?: string;
          filename?: string;
          text?: string;
          error?: string;
        };
        return { file: f, ok: up.ok, data: upData };
      })
    );

    const failed = uploads.filter((u) => !u.ok);
    if (failed.length === uploads.length) {
      throw new Error(failed[0]?.data.error ?? "upload_failed");
    }
    if (failed.length) {
      setError(
        `${failed.length} file(s) failed: ${failed.map((f) => f.file.name).join(", ")}`
      );
    }

    const nextContexts = [...contexts];
    const nextIds = [...uploadedIds];
    for (const u of uploads.filter((x) => x.ok)) {
      if (u.data.file_id) nextIds.push(u.data.file_id);
      if (u.data.text?.trim()) {
        nextContexts.push({
          filename: u.data.filename ?? u.file.name,
          text: u.data.text,
        });
      }
    }

    const trimmedContexts = nextContexts.slice(0, MAX_ATTACHMENTS);
    const trimmedIds = nextIds.slice(0, MAX_ATTACHMENTS);
    setFileContexts(trimmedContexts);
    setFileIds(trimmedIds);
    setPendingFiles([]);
    return { contexts: trimmedContexts, uploadedIds: trimmedIds };
  };

  const handleGenerateIemReport = async () => {
    if (!message.trim() && !pendingFiles.length && !fileContexts.length) return;
    setError(null);
    setIemReportLoading(true);

    try {
      const { contexts } = await uploadPendingFiles(fileContexts, fileIds);
      const res = await fetch("/api/brok/iem-report", {
        method: "POST",
        headers: await brokAuthHeaders(),
        body: JSON.stringify({
          message:
            message.trim() ||
            "Produce a formal IEM evaluation report for the attached opportunity.",
          file_contexts: contexts.length ? contexts : undefined,
          user_id: user?.id,
        }),
      });

      const data = (await res.json()) as IemReportPayload & { error?: string; hint?: string };
      if (!res.ok) {
        throw new Error(data.hint ?? data.error ?? "iem_report_failed");
      }

      setIemReport(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "IEM report failed");
    } finally {
      setIemReportLoading(false);
    }
  };

  const rearmVoiceInput = useCallback(() => {
    setMessage("");
    messageRef.current = "";
    const coarse =
      typeof window !== "undefined" &&
      window.matchMedia("(pointer: coarse)").matches;
    // Desktop: soft-focus empty box. Mobile: never auto-focus (breaks scroll + keyboard).
    if (!coarse) {
      requestAnimationFrame(() => {
        messageInputRef.current?.focus({ preventScroll: true });
      });
    }
    if (!sttSupported || !preferVoiceInputRef.current) return;
    // Auto re-arm mic on desktop only. On iPhone, auto SpeechRecognition often
    // leaves the composer dead until refresh — user taps Mic instead.
    if (coarse) return;
    window.setTimeout(() => {
      if (preferVoiceInputRef.current) startListening();
    }, 280);
  }, [startListening, sttSupported]);

  const handleSend = async () => {
    if (!message.trim() && !pendingFiles.length && !fileContexts.length) return;
    // If mic is live at send, they are in voice dialogue mode.
    if (listening) preferVoiceInputRef.current = true;
    stopListening();
    setError(null);
    setLoading(true);
    setResponse("");

    const userMsg =
      message.trim() || "Analyze the attached file.";
    // Clear input immediately so the box is empty while BROK works.
    setMessage("");
    messageRef.current = "";

    try {
      let uploadedIds = [...fileIds];
      let contexts = [...fileContexts];

      if (pendingFiles.length) {
        try {
          const uploaded = await uploadPendingFiles(contexts, uploadedIds);
          contexts = uploaded.contexts;
          uploadedIds = uploaded.uploadedIds;
        } catch (e) {
          const hint =
            userMsg &&
            userMsg !== "Analyze the attached file." &&
            " Remove attachments to send text only, or attach PDF/DOCX/txt files.";
          // Restore draft so they can fix attachments.
          setMessage(userMsg === "Analyze the attached file." ? "" : userMsg);
          throw new Error(
            (e instanceof Error ? e.message : "upload_failed") + (hint ?? "")
          );
        }
      }

      const optimisticUser: ChatTurn = {
        id: `pending-user-${Date.now()}`,
        role: "user",
        content: userMsg,
      };
      // Newest-first storage: prepend so the top of the list is always latest.
      setChatTurns((prev) => [optimisticUser, ...prev]);

      const res = await fetch("/api/brok/chat", {
        method: "POST",
        headers: await brokAuthHeaders(),
        body: JSON.stringify({
          message: userMsg,
          thread_id: threadId,
          user_id: user?.id,
          file_ids: uploadedIds.length ? uploadedIds : undefined,
          file_contexts: contexts.length ? contexts : undefined,
          page_context: buildPageContextPayload(pathname ?? "/"),
        }),
      });

      const data = (await res.json()) as {
        response?: string;
        thread_id?: string;
        error?: string;
        hint?: string;
        model?: string;
        provider?: string;
        used_backup?: boolean;
        groq_model?: string;
      };

      if (!res.ok) {
        setChatTurns((prev) => prev.filter((t) => t.id !== optimisticUser.id));
        setMessage(userMsg === "Analyze the attached file." ? "" : userMsg);
        throw new Error(data.hint ?? data.error ?? "chat_failed");
      }

      setLastUserMessage(userMsg);
      const reply = data.response ?? "";
      setResponse(reply);
      const modelLabel =
        data.model ||
        data.groq_model ||
        (data.provider ? String(data.provider) : null);
      setLastModel(
        modelLabel
          ? `${modelLabel}${data.used_backup ? " (backup path)" : ""}`
          : null
      );
      if (data.thread_id) {
        setThreadId(data.thread_id);
        if (user?.id) {
          localStorage.setItem(threadStorageKey(user.id), data.thread_id);
        }
      }
      const ts = Date.now();
      setChatTurns((prev) => [
        { id: `assistant-${ts}`, role: "assistant", content: reply },
        { id: `user-${ts}`, role: "user", content: userMsg },
        ...prev.filter((t) => t.id !== optimisticUser.id),
      ]);
      // Speak full answer (waits for audio/avatar); then re-arm empty mic box.
      await speakResponse(reply, userMsg);
      rearmVoiceInput();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  };

  const hasDialogue = Boolean(response || chatTurns.length);
  // Mobile: compact when chatting with Avatar off; full-size when Avatar is ON.
  // Desktop (sm+) always uses the large aspect box — unchanged.
  const mobileAvatarClass = avatarOn
    ? "h-[min(48vh,380px)] sm:h-auto sm:aspect-[3/4] sm:min-h-[360px] sm:max-h-[560px]"
    : hasDialogue
      ? "h-[140px] sm:h-auto sm:aspect-[3/4] sm:min-h-[360px] sm:max-h-[560px]"
      : "h-[180px] sm:h-auto sm:aspect-[3/4] sm:min-h-[360px] sm:max-h-[560px]";

  const composer = (
    <div className="space-y-2 rounded-xl border border-neon-cyan/30 bg-black/35 p-3 sm:border-white/10 sm:bg-transparent sm:p-0">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-xs uppercase tracking-wider text-neon-cyan/90 sm:text-white/40">
          Your message
        </span>
        {listening ? (
          <span className="text-[11px] font-medium text-neon-cyan animate-pulse">
            ● Listening — Stop, then Send
          </span>
        ) : loading ? (
          <span className="text-[11px] text-white/45">BROK thinking…</span>
        ) : voiceLoading ? (
          <span className="text-[11px] text-white/45">BROK speaking…</span>
        ) : (
          <span className="text-[11px] text-white/55">
            Tap <strong className="text-white/80">Mic</strong> or type
          </span>
        )}
      </div>
      <div className="flex gap-2 items-stretch">
        <button
          type="button"
          onClick={() => {
            setError(null);
            if (!listening) preferVoiceInputRef.current = true;
            void toggleListen();
          }}
          disabled={loading}
          title={
            sttSupported
              ? listening
                ? "Stop microphone"
                : "Turn on microphone"
              : "Dictation needs Chrome or Edge"
          }
          aria-label={listening ? "Stop microphone" : "Turn on microphone"}
          aria-pressed={listening}
          className={`shrink-0 inline-flex flex-col items-center justify-center gap-0.5 min-w-[3.75rem] sm:min-w-[4.25rem] px-2 rounded-xl border transition-colors touch-manipulation ${
            listening
              ? "border-neon-cyan/70 bg-neon-cyan/25 text-neon-cyan shadow-[0_0_12px_rgba(34,211,238,0.25)]"
              : sttSupported
                ? "border-neon-cyan/40 bg-neon-cyan/15 text-neon-cyan"
                : "border-white/10 bg-black/20 text-white/30"
          }`}
        >
          {listening ? (
            <Mic className="w-5 h-5 animate-pulse" />
          ) : sttSupported ? (
            <Mic className="w-5 h-5" />
          ) : (
            <MicOff className="w-5 h-5" />
          )}
          <span className="text-[10px] font-semibold leading-none">
            {listening ? "Stop" : "Mic"}
          </span>
        </button>
        <textarea
          ref={messageInputRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onFocus={() => {
            if (listening) stopListening();
          }}
          rows={3}
          enterKeyHint="send"
          autoComplete="off"
          autoCorrect="on"
          placeholder={
            listening
              ? "Listening… speak now"
              : loading
                ? "BROK is thinking…"
                : "Type or tap Mic to speak…"
          }
          className={`flex-1 min-w-0 px-3 py-3 rounded-xl bg-black/50 border text-base sm:text-sm resize-y min-h-[88px] sm:min-h-[100px] outline-none touch-manipulation ${
            listening
              ? "border-neon-cyan/50 focus:border-neon-cyan/60"
              : "border-white/15 focus:border-neon-cyan/40"
          }`}
        />
        <button
          type="button"
          disabled={
            loading ||
            iemReportLoading ||
            (!message.trim() && !pendingFiles.length && !fileContexts.length)
          }
          onClick={() => void handleSend()}
          className="shrink-0 inline-flex flex-col items-center justify-center gap-0.5 min-w-[3.75rem] px-2 rounded-xl border border-neon-cyan/50 bg-neon-cyan/20 text-neon-cyan text-[10px] font-semibold disabled:opacity-50 touch-manipulation sm:hidden"
          aria-label="Send to BROK"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
          Send
        </button>
      </div>
      <p className="text-[10px] text-white/40 leading-snug hidden sm:block">
        <strong className="text-white/60">Mic</strong> → speak → Send.{" "}
        <strong className="text-white/60">Voice / Avatar</strong> = BROK talks back.
        {!sttSupported && (
          <span className="text-amber-200/80"> Dictation needs Chrome or Edge.</span>
        )}
      </p>
    </div>
  );

  return (
    <div
      className={
        stacked
          ? "flex flex-col gap-0 sm:gap-1 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-6"
          : "grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]"
      }
    >
      <section
        className={`rounded-2xl border border-white/10 bg-bg-card space-y-2 sm:space-y-3 ${
          stacked
            ? "p-2 pb-1 sm:p-5 rounded-b-none sm:rounded-b-2xl border-b-0 sm:border-b"
            : "p-5 space-y-4"
        }`}
      >
        <div
          className={`relative mx-auto w-full max-w-md rounded-xl overflow-hidden border border-neon-cyan/20 bg-black transition-[height] duration-300 ${
            stacked ? mobileAvatarClass : "aspect-[3/4] min-h-[420px] max-h-[600px]"
          }`}
        >
          <Image
            src={BROK_REFERENCE_IMAGE}
            alt="BROK static avatar"
            fill
            className={`object-contain object-center transition-opacity duration-300 ${
              useHeyGenLive && heygenLive && avatarOn ? "opacity-0" : "opacity-100"
            }`}
            priority
          />
          {useHeyGenLive && avatarOn ? (
            <div className="absolute inset-0 z-10">
              <HeyGenLiveAvatar
                ref={heygenRef}
                enabled={avatarOn}
                userId={user?.id}
                avatarId={status?.heygenAvatarId}
                sandboxMode={status?.heygenSandbox}
                onError={handleAvatarError}
                onStatus={handleAvatarStatus}
                onSpeakProgress={handleAvatarSpeakProgress}
              />
            </div>
          ) : null}
          {!avatarOn && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-end pb-4 bg-black/25 pointer-events-none">
              <p className="rounded-full border border-white/15 bg-black/50 px-3 py-1 text-[10px] text-white/50">
                Avatar off · saves credits
              </p>
            </div>
          )}
          {avatarOn && !status?.heygen && (
            <p className="absolute bottom-0 inset-x-0 text-[10px] text-center py-1.5 bg-black/70 text-amber-300/90 z-10">
              Static reference · {BROK_AVATAR_LABEL} connecting…
            </p>
          )}
        </div>

        <div className={stacked ? "hidden sm:block space-y-3" : "space-y-3"}>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setVoiceOn((v) => !v)}
              disabled={useHeyGenLive}
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs border transition-colors ${
                voiceOn && !useHeyGenLive
                  ? "border-neon-cyan/40 bg-neon-cyan/10 text-neon-cyan"
                  : "border-white/15 text-white/45"
              } ${useHeyGenLive ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {voiceOn ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
              Voice {voiceOn ? "on" : "off"}
              <span className="text-white/35">
                ({status?.voiceLabel ?? voiceDisplayName(status ?? {})})
              </span>
            </button>
            <button
              type="button"
              onClick={() => setAvatarOn((v) => !v)}
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs border transition-colors ${
                avatarOn
                  ? "border-neon-cyan/40 bg-neon-cyan/10 text-neon-cyan"
                  : "border-white/15 text-white/45"
              }`}
            >
              {avatarOn ? <User className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
              Avatar {avatarOn ? "on" : "off"}
              <span className="text-white/35">
                ({status?.avatarLabel ?? BROK_AVATAR_LABEL})
              </span>
            </button>
          </div>
          <p className="text-[11px] text-white/40 leading-relaxed">
            {useHeyGenLive && heygenLive
              ? status?.voiceReady
                ? `${BROK_AVATAR_LABEL} live — lip-sync with ${status.voiceLabel ?? BROK_VOICE_CLONE_LABEL}.`
                : `${BROK_AVATAR_LABEL} speaking — enable BROK Voice for lip-sync.`
              : useHeyGenLive
                ? `${BROK_AVATAR_LABEL} connecting…`
                : "Toggle voice or avatar off for text-only."}
          </p>
          {status && !status.voiceReady && (
            <p className="text-[11px] text-amber-300/80 border border-amber-400/20 rounded-lg px-3 py-2 bg-amber-400/5">
              {status.voiceCloneHint ??
                `Connect Neobanx voice service for ${BROK_VOICE_CLONE_LABEL}.`}
            </p>
          )}
          {status && !status.chatReady && (
            <p className="text-xs text-amber-400/90 border border-amber-400/20 rounded-lg px-3 py-2 bg-amber-400/5">
              BROK Intelligence unavailable — contact Neobanx support.
            </p>
          )}
          {status && status.chatReady && status.routingSummary && (
            <p className="text-xs text-white/40 border border-white/10 rounded-lg px-3 py-2">
              {status.routingSummary}. IEM · Inneagram · up to {MAX_ATTACHMENTS} files.
            </p>
          )}
          {fileContexts.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 text-[10px] text-emerald-400/80">
              <span>
                In context ({fileContexts.length}):{" "}
                {fileContexts.map((f) => f.filename).join(", ")}
              </span>
              <button
                type="button"
                onClick={clearAttachedContext}
                className="text-white/35 hover:text-white/60 underline"
              >
                Clear
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Mobile: Avatar → answer → input → history. Desktop: answer → history → input. */}
      <section
        className={`rounded-2xl border border-white/10 bg-bg-card flex flex-col gap-3 ${
          stacked
            ? "p-2 pt-2 sm:p-5 rounded-t-none sm:rounded-t-2xl border-t-0 sm:border-t -mt-px"
            : "p-5 space-y-4"
        }`}
      >
        <div className="flex items-center justify-between gap-2 order-1">
          <span className="text-xs uppercase tracking-wider text-white/40">
            Conversation
          </span>
          <button
            type="button"
            onClick={() => void startNewConversation()}
            disabled={!user?.id || loading}
            className="text-[10px] text-white/40 hover:text-neon-cyan/80 underline disabled:opacity-40"
          >
            New conversation
          </button>
        </div>

        {stacked && (
          <div className="flex flex-wrap gap-2 order-1 sm:hidden">
            <button
              type="button"
              onClick={() => setVoiceOn((v) => !v)}
              disabled={useHeyGenLive}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs border transition-colors ${
                voiceOn && !useHeyGenLive
                  ? "border-neon-cyan/40 bg-neon-cyan/10 text-neon-cyan"
                  : "border-white/15 text-white/45"
              } ${useHeyGenLive ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {voiceOn ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
              Voice
            </button>
            <button
              type="button"
              onClick={() => setAvatarOn((v) => !v)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs border transition-colors ${
                avatarOn
                  ? "border-neon-cyan/40 bg-neon-cyan/10 text-neon-cyan"
                  : "border-white/15 text-white/45"
              }`}
            >
              {avatarOn ? <User className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
              Avatar
            </button>
          </div>
        )}

        {response ? (
          <div className="order-2 rounded-xl border border-neon-cyan/25 bg-neon-cyan/5 p-3 sm:p-4 space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-[10px] uppercase tracking-wider text-neon-cyan/80">
                Latest answer
                {lastModel ? (
                  <span className="ml-2 normal-case tracking-normal text-white/35">
                    · {lastModel}
                  </span>
                ) : null}
              </span>
              <button
                type="button"
                className="text-[10px] text-white/40 hover:text-white/70 underline"
                onClick={() => {
                  void navigator.clipboard?.writeText(response);
                }}
              >
                Copy full text
              </button>
            </div>
            <p className="text-sm sm:text-[15px] text-white/90 whitespace-pre-wrap leading-relaxed sm:max-h-[min(40vh,360px)] sm:overflow-y-auto">
              {response}
            </p>
          </div>
        ) : null}

        <div className="order-3 sm:order-4">{composer}</div>

        {(chatTurns.length > 0 || historyLoading) && (
          <div className="order-4 sm:order-3 rounded-xl border border-white/8 bg-black/25 p-3 space-y-3 min-h-[80px] sm:max-h-[min(52vh,520px)] sm:overflow-y-auto">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] uppercase tracking-wider text-white/35">
                Earlier dialogue
              </span>
              <span className="text-[10px] text-white/30">Newest first</span>
            </div>
            {historyLoading && chatTurns.length === 0 ? (
              <p className="text-[11px] text-white/35 flex items-center gap-2">
                <Loader2 className="w-3 h-3 animate-spin" />
                Loading history…
              </p>
            ) : (
              chatTurns.map((turn) => (
                <div
                  key={turn.id}
                  className={
                    turn.role === "user"
                      ? "text-sm text-white/55 pl-2 border-l-2 border-neon-cyan/30"
                      : "text-sm text-white/80 pl-2 border-l-2 border-white/15"
                  }
                >
                  <span className="text-[10px] uppercase tracking-wider text-white/30 block mb-0.5">
                    {turn.role === "user" ? "You" : "BROK"}
                  </span>
                  <p className="whitespace-pre-wrap leading-relaxed break-words">
                    {turn.content}
                  </p>
                </div>
              ))
            )}
          </div>
        )}

        <div className="order-5 space-y-3">
          <label className="flex items-center gap-3 rounded-xl border border-dashed border-white/15 px-4 py-3 cursor-pointer hover:border-neon-cyan/30 transition-colors">
            <FileUp className="w-5 h-5 text-neon-cyan shrink-0" />
            <span className="text-sm text-white/55 flex-1">
              {pendingFiles.length
                ? `${pendingFiles.length} file(s) ready to upload`
                : `Attach up to ${MAX_ATTACHMENTS} PDF or DOCX files (optional)`}
            </span>
            <input
              type="file"
              className="hidden"
              multiple
              accept=".pdf,.docx,.txt,.csv,.md,.json,.png,.jpg,.jpeg,.webp"
              onChange={(e) => {
                if (e.target.files?.length) addPendingFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </label>

          {pendingFiles.length > 0 && (
            <ul className="space-y-1.5 rounded-xl border border-white/8 bg-black/20 px-3 py-2">
              {pendingFiles.map((f, i) => (
                <li
                  key={`${f.name}-${f.size}`}
                  className="flex items-center justify-between gap-2 text-xs text-white/60"
                >
                  <span className="truncate">{f.name}</span>
                  <button
                    type="button"
                    onClick={() => removePendingFile(i)}
                    className="shrink-0 p-1 rounded hover:bg-white/10 text-white/40"
                    aria-label={`Remove ${f.name}`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
            <button
              type="button"
              disabled={
                loading ||
                iemReportLoading ||
                (!message.trim() && !pendingFiles.length && !fileContexts.length)
              }
              onClick={handleSend}
              className="hidden sm:inline-flex flex-1 items-center justify-center gap-2 px-5 py-3 rounded-xl bg-neon-cyan/15 border border-neon-cyan/50 text-neon-cyan text-sm font-medium hover:bg-neon-cyan/25 disabled:opacity-50 transition-colors"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {loading ? "Thinking…" : "Send to BROK"}
            </button>
            <button
              type="button"
              disabled={
                loading ||
                iemReportLoading ||
                !status?.chatReady ||
                (!message.trim() && !pendingFiles.length && !fileContexts.length)
              }
              onClick={handleGenerateIemReport}
              title="Generate a formatted IEM report"
              className="inline-flex flex-1 items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white/5 border border-white/15 text-white/80 text-sm font-medium hover:bg-white/10 hover:border-neon-cyan/30 disabled:opacity-50 transition-colors"
            >
              {iemReportLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <BarChart3 className="w-4 h-4 text-neon-cyan" />
              )}
              {iemReportLoading ? "Building report…" : "IEM Report"}
            </button>
            <button
              type="button"
              onClick={() => setInneagramOpen(true)}
              className="inline-flex flex-1 items-center justify-center gap-2 px-5 py-3 rounded-xl bg-violet-500/10 border border-violet-400/35 text-violet-200 text-sm font-medium hover:bg-violet-500/20 transition-colors sm:min-w-[140px]"
            >
              <Sparkles className="w-4 h-4" />
              Inneagram
            </button>
            <button
              type="button"
              onClick={() => setCanvasOpen(true)}
              className="inline-flex flex-1 items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-500/10 border border-emerald-400/35 text-emerald-100 text-sm font-medium hover:bg-emerald-500/20 transition-colors sm:min-w-[140px]"
            >
              <LayoutGrid className="w-4 h-4" />
              Business Canvas
            </button>
          </div>
          <p className="text-[10px] text-white/35">
            Business Canvas = workshop BMC. IEM = deal scorecard. Inneagram = archetype.
            No voice/avatar tokens for those tools.
          </p>

          {(error || ((voiceOn || useHeyGenLive) && response)) && (
            <div className="rounded-xl border border-white/8 bg-black/25 p-4 space-y-2">
              {error && <p className="text-sm text-red-400/90">{error}</p>}
              {(voiceOn || useHeyGenLive) && response && (
                <p className="text-[10px] text-white/35 flex items-center gap-1">
                  <Volume2 className="w-3 h-3" />
                  {voiceLoading
                    ? speakProgress ?? "Generating speech…"
                    : useHeyGenLive
                      ? "Avatar speaks the full answer"
                      : "Voice speaks the full answer"}
                </p>
              )}
            </div>
          )}
        </div>

        <audio ref={audioRef} playsInline preload="auto" className="hidden" />
      </section>

      <IemReportModal payload={iemReport} onClose={() => setIemReport(null)} />
      <InneagramPanel
        open={inneagramOpen}
        onClose={() => setInneagramOpen(false)}
        userId={user?.id}
      />
      <BusinessCanvasPanel
        open={canvasOpen}
        onClose={() => setCanvasOpen(false)}
      />
    </div>
  );
}
