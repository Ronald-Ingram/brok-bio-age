"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type BrowserSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives?: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: (() => void) | null;
  onresult: ((ev: SpeechRecognitionEventLike) => void) | null;
  onerror: ((ev: { error?: string }) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<{
    isFinal: boolean;
    0?: { transcript?: string; confidence?: number };
  }>;
};

function getSpeechRecognitionCtor():
  | (new () => BrowserSpeechRecognition)
  | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: new () => BrowserSpeechRecognition;
    webkitSpeechRecognition?: new () => BrowserSpeechRecognition;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function isBrowserSpeechSupported(): boolean {
  return Boolean(getSpeechRecognitionCtor());
}

/**
 * Browser SpeechRecognition → text field.
 * Demo reliability notes:
 * - Commit interim text on stop (browsers often never "finalize" last words).
 * - Grace period after stop before auto-send so late finals arrive.
 * - Surface empty captures instead of silent no-ops.
 * - Mobile: prefer tap-to-start / tap-to-stop (hold is optional; finger-slip killed sessions).
 */
export function useBrowserSpeechInput(opts: {
  getValue: () => string;
  setValue: (text: string) => void;
  onError?: (message: string) => void;
  /** After intentional stop with text (hold-release or tap-stop with autoSend). */
  onStopWithText?: (text: string) => void;
  /** Fired when engine is actually listening (after onstart). */
  onReady?: () => void;
}) {
  const [listening, setListening] = useState(false);
  const [ready, setReady] = useState(false);
  const [supported, setSupported] = useState(false);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  /** Finalized transcript for this listen session (appended chunks). */
  const baseRef = useRef("");
  /** Latest non-final interim (often has the last words spoken). */
  const interimRef = useRef("");
  const wantListenRef = useRef(false);
  const intentionalStopRef = useRef(false);
  /** Whether this intentional stop should auto-send (tap-to-send vs parent stopListening). */
  const autoSendOnStopRef = useRef(false);
  const finalizeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const optsRef = useRef(opts);
  optsRef.current = opts;

  const clearTimers = () => {
    if (finalizeTimerRef.current) {
      clearTimeout(finalizeTimerRef.current);
      finalizeTimerRef.current = null;
    }
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
  };

  /** Best full text: finals + trailing interim. */
  const fullTranscript = useCallback(() => {
    const finalPart = baseRef.current.trim();
    const interim = interimRef.current.trim();
    if (finalPart && interim) {
      return `${finalPart}${finalPart.endsWith(" ") ? "" : " "}${interim}`.trim();
    }
    return (finalPart || interim || optsRef.current.getValue()).trim();
  }, []);

  const pushToField = useCallback(() => {
    optsRef.current.setValue(fullTranscript());
  }, [fullTranscript]);

  useEffect(() => {
    setSupported(Boolean(getSpeechRecognitionCtor()));
    return () => {
      wantListenRef.current = false;
      intentionalStopRef.current = true;
      clearTimers();
      try {
        recognitionRef.current?.abort();
      } catch {
        /* ignore */
      }
      recognitionRef.current = null;
    };
  }, []);

  const finishedSessionRef = useRef(false);

  const finishWithOptionalSend = useCallback(
    (autoSend: boolean) => {
      if (finishedSessionRef.current) return;
      finishedSessionRef.current = true;

      setListening(false);
      setReady(false);
      recognitionRef.current = null;

      const text = fullTranscript();
      if (text) {
        optsRef.current.setValue(text);
      }

      if (!autoSend) return;

      if (!text || text.length < 2) {
        optsRef.current.onError?.(
          "Mic was on but no speech was captured. Wait for “Listening…”, speak clearly, then tap Mic again to send."
        );
        return;
      }

      // Grace: some engines deliver a final result after stop()/onend.
      finalizeTimerRef.current = setTimeout(() => {
        const late = fullTranscript();
        if (late && late.length >= 2) {
          optsRef.current.setValue(late);
          optsRef.current.onStopWithText?.(late);
        } else {
          optsRef.current.onError?.(
            "Didn't catch that phrase. Tap Mic, wait for the cyan pulse, speak, then tap Mic again."
          );
        }
      }, 420);
    },
    [fullTranscript]
  );

  const stop = useCallback(
    (optsStop?: { autoSend?: boolean }) => {
      intentionalStopRef.current = true;
      wantListenRef.current = false;
      autoSendOnStopRef.current = Boolean(optsStop?.autoSend);
      clearTimers();

      // Commit interim immediately so release/tap doesn't drop last words.
      const merged = fullTranscript();
      if (merged) {
        baseRef.current = merged;
        interimRef.current = "";
        optsRef.current.setValue(merged);
      }

      const rec = recognitionRef.current;
      if (rec) {
        try {
          rec.stop();
        } catch {
          /* ignore */
        }
        // If onend never fires (Safari), still finalize.
        finalizeTimerRef.current = setTimeout(() => {
          finishWithOptionalSend(autoSendOnStopRef.current);
        }, 500);
      } else {
        finishWithOptionalSend(autoSendOnStopRef.current);
      }
    },
    [finishWithOptionalSend, fullTranscript]
  );

  const wireRecognition = useCallback(
    (rec: BrowserSpeechRecognition, keepBase: string) => {
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = "en-US";
      rec.maxAlternatives = 1;

      rec.onstart = () => {
        setListening(true);
        setReady(true);
        optsRef.current.onReady?.();
      };

      rec.onresult = (ev: SpeechRecognitionEventLike) => {
        let interim = "";
        let finalChunk = "";
        for (let i = ev.resultIndex; i < ev.results.length; i++) {
          const piece = (ev.results[i]![0]?.transcript ?? "").trim();
          if (!piece) continue;
          if (ev.results[i]!.isFinal) finalChunk += (finalChunk ? " " : "") + piece;
          else interim += (interim ? " " : "") + piece;
        }
        if (finalChunk) {
          const base = baseRef.current;
          baseRef.current = base
            ? `${base}${base.endsWith(" ") ? "" : " "}${finalChunk}`
            : finalChunk;
          interimRef.current = "";
        } else {
          interimRef.current = interim;
        }
        pushToField();
      };

      rec.onerror = (ev) => {
        const code = ev.error ?? "unknown";
        if (code === "not-allowed" || code === "service-not-allowed") {
          optsRef.current.onError?.(
            "Microphone blocked — allow Microphone for this site (lock icon), then try again."
          );
          wantListenRef.current = false;
          intentionalStopRef.current = true;
          setListening(false);
          setReady(false);
          recognitionRef.current = null;
          return;
        }
        if (code === "no-speech" || code === "aborted") {
          // Quiet — user may still be holding; onend restarts if still wanted.
          return;
        }
        if (code === "network") {
          optsRef.current.onError?.(
            "Speech service network error — check connection, or type the question."
          );
        } else if (code === "audio-capture") {
          optsRef.current.onError?.(
            "No microphone found. Check device mic / another app using it."
          );
          wantListenRef.current = false;
          intentionalStopRef.current = true;
        }
        // Don't null recognition on recoverable errors mid-session
      };

      rec.onend = () => {
        recognitionRef.current = null;
        setReady(false);

        if (wantListenRef.current && !intentionalStopRef.current) {
          // Mid-session browser drop — restart without wiping transcript.
          restartTimerRef.current = setTimeout(() => {
            if (!wantListenRef.current || intentionalStopRef.current) return;
            if (recognitionRef.current) return;
            try {
              const Ctor2 = getSpeechRecognitionCtor();
              if (!Ctor2) return;
              const rec2 = new Ctor2();
              recognitionRef.current = rec2;
              wireRecognition(rec2, baseRef.current);
              rec2.start();
            } catch {
              setListening(false);
              wantListenRef.current = false;
            }
          }, 220);
          return;
        }

        // Intentional stop: finalize if stop() didn't already schedule it
        if (intentionalStopRef.current) {
          if (!finalizeTimerRef.current) {
            finishWithOptionalSend(autoSendOnStopRef.current);
          }
        } else {
          setListening(false);
        }
      };

      baseRef.current = keepBase;
    },
    [finishWithOptionalSend, pushToField]
  );

  const start = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      optsRef.current.onError?.(
        "Voice input needs Chrome or Edge (Safari is limited). Type if needed."
      );
      return;
    }

    if (recognitionRef.current || wantListenRef.current) return;

    clearTimers();
    intentionalStopRef.current = false;
    autoSendOnStopRef.current = false;
    finishedSessionRef.current = false;
    wantListenRef.current = true;
    baseRef.current = optsRef.current.getValue().trim();
    interimRef.current = "";
    setReady(false);

    const rec = new Ctor();
    recognitionRef.current = rec;
    wireRecognition(rec, baseRef.current);

    try {
      rec.start();
      setListening(true);
    } catch {
      optsRef.current.onError?.(
        "Could not start mic — wait a second and tap Mic again, or type."
      );
      setListening(false);
      setReady(false);
      wantListenRef.current = false;
      recognitionRef.current = null;
    }
  }, [wireRecognition]);

  /**
   * Mobile demo mode: tap once = start, tap again = stop + send.
   * More reliable than hold (no finger-slip cancel).
   */
  const toggle = useCallback(() => {
    if (listening || recognitionRef.current || wantListenRef.current) {
      // Second tap: stop and auto-send if we have text
      stop({ autoSend: true });
      return;
    }
    start();
  }, [listening, start, stop]);

  /** Optional hold-to-talk (pointer down). */
  const pressStart = useCallback(() => {
    if (listening || recognitionRef.current || wantListenRef.current) return;
    start();
  }, [listening, start]);

  /** Optional hold-to-talk release. */
  const pressEnd = useCallback(
    (autoSend = true) => {
      if (!wantListenRef.current && !listening && !recognitionRef.current) {
        return;
      }
      stop({ autoSend });
    },
    [listening, stop]
  );

  return {
    listening,
    /** True after speech engine onstart — safer to speak now. */
    ready,
    supported,
    toggle,
    start,
    stop,
    pressStart,
    pressEnd,
  };
}
