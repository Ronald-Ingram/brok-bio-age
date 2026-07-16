"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type BrowserSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((ev: SpeechRecognitionEventLike) => void) | null;
  onerror: ((ev: { error?: string }) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0?: { transcript?: string } }>;
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
 * Web Speech API dictation into a text field (Chrome/Edge best).
 * Not TTS — only fills input from the mic.
 */
export function useBrowserSpeechInput(opts: {
  /** Current field value when starting a listen session */
  getValue: () => string;
  /** Apply interim/final transcript */
  setValue: (text: string) => void;
  onError?: (message: string) => void;
}) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const baseRef = useRef("");
  const optsRef = useRef(opts);
  optsRef.current = opts;

  useEffect(() => {
    setSupported(Boolean(getSpeechRecognitionCtor()));
    return () => {
      try {
        recognitionRef.current?.abort();
      } catch {
        /* ignore */
      }
      recognitionRef.current = null;
    };
  }, []);

  const stop = useCallback(() => {
    try {
      recognitionRef.current?.stop();
    } catch {
      /* ignore */
    }
    setListening(false);
  }, []);

  const toggle = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      optsRef.current.onError?.(
        "Voice input needs Chrome or Edge (Safari support is limited). You can still type."
      );
      return;
    }

    if (listening) {
      stop();
      return;
    }

    baseRef.current = optsRef.current.getValue().trim();
    const rec = new Ctor();
    recognitionRef.current = rec;
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";

    rec.onresult = (ev: SpeechRecognitionEventLike) => {
      let interim = "";
      let finalChunk = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const piece = ev.results[i]![0]?.transcript ?? "";
        if (ev.results[i]!.isFinal) finalChunk += piece;
        else interim += piece;
      }
      if (finalChunk) {
        const base = baseRef.current;
        baseRef.current = base
          ? `${base}${base.endsWith(" ") ? "" : " "}${finalChunk.trim()}`
          : finalChunk.trim();
      }
      const live = interim.trim();
      const committed = baseRef.current;
      optsRef.current.setValue(
        live
          ? committed
            ? `${committed}${committed.endsWith(" ") ? "" : " "}${live}`
            : live
          : committed
      );
    };

    rec.onerror = (ev) => {
      const code = ev.error ?? "unknown";
      if (code === "not-allowed" || code === "service-not-allowed") {
        optsRef.current.onError?.(
          "Microphone permission blocked — click the lock icon in the address bar → allow Microphone for this site, then try again."
        );
      } else if (code !== "aborted" && code !== "no-speech") {
        optsRef.current.onError?.(
          `Voice input error (${code}). Try again or type instead.`
        );
      }
      setListening(false);
    };

    rec.onend = () => {
      setListening(false);
      recognitionRef.current = null;
    };

    try {
      rec.start();
      setListening(true);
    } catch {
      optsRef.current.onError?.(
        "Could not start microphone — try again or type your message."
      );
      setListening(false);
    }
  }, [listening, stop]);

  return { listening, supported, toggle, stop };
}
