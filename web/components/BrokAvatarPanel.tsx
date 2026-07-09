"use client";

import {
  HeyGenLiveAvatar,
  type HeyGenLiveAvatarHandle,
} from "@/components/HeyGenLiveAvatar";
import { InneagramPanel } from "@/components/InneagramPanel";
import { IemReportModal } from "@/components/IemReportModal";
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
import { buildPageContextPayload } from "@/lib/brokPageContext";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

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
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [fileIds, setFileIds] = useState<string[]>([]);
  const [fileContexts, setFileContexts] = useState<
    { filename: string; text: string }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [iemReportLoading, setIemReportLoading] = useState(false);
  const [iemReport, setIemReport] = useState<IemReportPayload | null>(null);
  const [inneagramOpen, setInneagramOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voiceOn, setVoiceOn] = useState(true);
  const [avatarOn, setAvatarOn] = useState(true);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [speakProgress, setSpeakProgress] = useState<string | null>(null);
  const [lastUserMessage, setLastUserMessage] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const useHeyGenLive = Boolean(avatarOn && status?.heygen);

  const loadStatus = useCallback(async () => {
    const res = await fetch("/api/brok/status");
    if (res.ok) setStatus(await res.json());
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const speechPayload = (text: string, userMessage: string) => {
    const fullLength = wantsFullLengthSpeech(userMessage);
    return {
      text: spokenExcerpt(text, { fullLength }),
      fullLength,
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: payload.text,
          fullLength: payload.fullLength,
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
        audioRef.current.src = url;
        await audioRef.current.play();
      }
    } finally {
      setVoiceLoading(false);
    }
  };

  const speakResponse = async (text: string, userMessage: string) => {
    const payload = speechPayload(text, userMessage);
    if (useHeyGenLive && heygenRef.current) {
      setVoiceLoading(true);
      setSpeakProgress(
        payload.fullLength ? "Preparing full-length speech…" : "Generating speech…"
      );
      try {
        await heygenRef.current.speak(payload.text, payload.fullLength);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Avatar speech failed";
        setError(`${msg} — playing ${BROK_VOICE_CLONE_LABEL} audio instead`);
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message:
            message.trim() ||
            "Produce a formal IEM evaluation report for the attached opportunity.",
          file_contexts: contexts.length ? contexts : undefined,
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

  const handleSend = async () => {
    if (!message.trim() && !pendingFiles.length && !fileContexts.length) return;
    setError(null);
    setLoading(true);
    setResponse("");

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
            message.trim() &&
            " Remove attachments to send text only, or attach PDF/DOCX/txt files.";
          throw new Error(
            (e instanceof Error ? e.message : "upload_failed") + (hint ?? "")
          );
        }
      }

      const res = await fetch("/api/brok/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: message.trim() || "Analyze the attached file.",
          session_id: sessionId,
          user_id: user?.id,
          file_ids: uploadedIds.length ? uploadedIds : undefined,
          file_contexts: contexts.length ? contexts : undefined,
          page_context: buildPageContextPayload(pathname ?? "/"),
        }),
      });

      const data = (await res.json()) as {
        response?: string;
        session_id?: string;
        error?: string;
        hint?: string;
      };

      if (!res.ok) {
        throw new Error(data.hint ?? data.error ?? "chat_failed");
      }

      const userMsg =
        message.trim() || "Analyze the attached file.";
      setLastUserMessage(userMsg);
      const reply = data.response ?? "";
      setResponse(reply);
      if (data.session_id) setSessionId(data.session_id);
      setMessage("");
      await speakResponse(reply, userMsg);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={
        stacked
          ? "flex flex-col gap-0 sm:gap-1 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-6"
          : "grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]"
      }
    >
      <section
        className={`rounded-2xl border border-white/10 bg-bg-card space-y-3 ${
          stacked ? "p-2 pb-1 sm:p-5 sm:space-y-4 rounded-b-none sm:rounded-b-2xl border-b-0 sm:border-b" : "p-5 space-y-4"
        }`}
      >
        <div
          className={`relative mx-auto w-full max-w-md rounded-xl overflow-hidden border border-neon-cyan/20 bg-black ${
            stacked
              ? "aspect-[4/5] max-h-[min(36vh,320px)] sm:aspect-[3/4] sm:min-h-[360px] sm:max-h-[560px]"
              : "aspect-[3/4] min-h-[420px] max-h-[600px]"
          }`}
        >
          <Image
            src={BROK_REFERENCE_IMAGE}
            alt="BROK static avatar"
            fill
            className={`object-contain object-center transition-opacity duration-300 ${
              useHeyGenLive && heygenLive && avatarOn && !voiceLoading
                ? "opacity-0"
                : "opacity-100"
            }`}
            priority
          />
          {useHeyGenLive && avatarOn ? (
            <div className="absolute inset-0 z-10">
              <HeyGenLiveAvatar
                ref={heygenRef}
                enabled={avatarOn}
                avatarId={status?.heygenAvatarId}
                sandboxMode={status?.heygenSandbox}
                onError={(msg) => setError(msg)}
                onStatus={(s) => setHeygenLive(s === "live")}
                onSpeakProgress={(current, total) =>
                  setSpeakProgress(
                    total > 1
                      ? `Speaking part ${current} of ${total}…`
                      : "Generating speech…"
                  )
                }
              />
            </div>
          ) : null}
          {!avatarOn && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-end pb-6 bg-black/25 pointer-events-none">
              <p className="rounded-full border border-white/15 bg-black/50 px-3 py-1 text-[10px] text-white/50">
                Avatar off — static image · saves session credits
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
            <span className="text-white/35">({status?.avatarLabel ?? BROK_AVATAR_LABEL})</span>
          </button>
        </div>

        <p className="text-[11px] text-white/40 leading-relaxed">
          {useHeyGenLive && heygenLive
            ? status?.voiceReady
              ? `${BROK_AVATAR_LABEL} live — lip-sync with ${status.voiceLabel ?? BROK_VOICE_CLONE_LABEL}. Toggle avatar off to save credits.`
              : `${BROK_AVATAR_LABEL} live — enable BROK Voice for lip-sync. Say "full length please" to hear entire replies.`
            : "Toggle voice or avatar off for text-only. Ask for full length to hear complete answers."}
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
            {status.routingSummary}. IEM scorecard · Inneagram · up to {MAX_ATTACHMENTS} files.
          </p>
        )}
        {status?.voiceReady && (
          <p className="text-[10px] text-white/40">
            {status.voiceLabel ?? BROK_VOICE_CLONE_LABEL} → {status.avatarLabel ?? BROK_AVATAR_LABEL}
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

      <section
        className={`rounded-2xl border border-white/10 bg-bg-card space-y-3 flex flex-col ${
          stacked
            ? "p-2 pt-1 sm:p-5 sm:pt-4 sm:space-y-4 rounded-t-none sm:rounded-t-2xl border-t-0 sm:border-t -mt-px"
            : "p-5 space-y-4"
        }`}
      >
        <label className="block space-y-1.5 flex-1">
          <span className="text-xs uppercase tracking-wider text-white/40">
            Message
          </span>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            placeholder="Ask BROK anything — deal review, IEM scoring, strategy, bio-age…"
            className="w-full px-4 py-3 rounded-xl bg-black/30 border border-white/10 text-sm resize-y min-h-[100px] focus:border-neon-cyan/40 outline-none"
          />
        </label>

        {stacked && (
          <div className="flex flex-wrap gap-2 sm:hidden">
            <button
              type="button"
              onClick={() => setVoiceOn((v) => !v)}
              disabled={useHeyGenLive}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] border transition-colors ${
                voiceOn && !useHeyGenLive
                  ? "border-neon-cyan/40 bg-neon-cyan/10 text-neon-cyan"
                  : "border-white/15 text-white/45"
              } ${useHeyGenLive ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {voiceOn ? <Mic className="w-3 h-3" /> : <MicOff className="w-3 h-3" />}
              Voice
            </button>
            <button
              type="button"
              onClick={() => setAvatarOn((v) => !v)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] border transition-colors ${
                avatarOn
                  ? "border-neon-cyan/40 bg-neon-cyan/10 text-neon-cyan"
                  : "border-white/15 text-white/45"
              }`}
            >
              {avatarOn ? <User className="w-3 h-3" /> : <UserX className="w-3 h-3" />}
              Avatar
            </button>
          </div>
        )}

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
            className="inline-flex flex-1 items-center justify-center gap-2 px-5 py-3 rounded-xl bg-neon-cyan/15 border border-neon-cyan/50 text-neon-cyan text-sm font-medium hover:bg-neon-cyan/25 disabled:opacity-50 transition-colors"
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
            title="Generate a formatted IEM report (HTML, Markdown, or Print/PDF)"
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
        </div>
        <p className="text-[10px] text-white/35">
          IEM Report = deal scorecard (HTML). Inneagram = Ingram archetype profile (Summary 7.22) —
          saved locally + account. No voice/avatar tokens.
        </p>

        {(response || error) && (
          <div className="rounded-xl border border-white/8 bg-black/25 p-4 space-y-2 min-h-[120px]">
            {error && <p className="text-sm text-red-400/90">{error}</p>}
            {response && (
              <p className="text-sm text-white/75 whitespace-pre-wrap leading-relaxed">
                {response}
              </p>
            )}
            {(voiceOn || useHeyGenLive) && response && (
              <p className="text-[10px] text-white/35 flex items-center gap-1">
                <Volume2 className="w-3 h-3" />
                {voiceLoading
                  ? speakProgress ?? "Generating speech…"
                  : wantsFullLengthSpeech(lastUserMessage)
                    ? "Reading full response aloud"
                    : useHeyGenLive
                      ? "Avatar speaks opening excerpt — say full length please for entire reply"
                      : "Voice speaks opening excerpt — say full length please for entire reply"}
              </p>
            )}
          </div>
        )}

        <audio ref={audioRef} className="hidden" />
      </section>

      <IemReportModal payload={iemReport} onClose={() => setIemReport(null)} />
      <InneagramPanel
        open={inneagramOpen}
        onClose={() => setInneagramOpen(false)}
        userId={user?.id}
      />
    </div>
  );
}