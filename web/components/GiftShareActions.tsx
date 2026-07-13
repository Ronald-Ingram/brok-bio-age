"use client";

import {
  buildGiftMailtoHref,
  buildNativeSmsHref,
  canUseNativeShare,
  shareGiftNative,
} from "@/lib/giftShareLinks";
import { Check, Copy, Mail, Share2, Smartphone } from "lucide-react";
import { useMemo, useState } from "react";

interface GiftShareActionsProps {
  shareText: string;
  /** Plain-text SMS body; defaults to shareText */
  smsText?: string;
  giftUrl: string;
  recipientName: string;
  phone?: string | null;
  email?: string | null;
  compact?: boolean;
}

export function GiftShareActions({
  shareText,
  smsText,
  giftUrl,
  recipientName,
  phone,
  email,
  compact = false,
}: GiftShareActionsProps) {
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);
  const nativeShare = useMemo(() => canUseNativeShare(), []);

  const smsHref = buildNativeSmsHref(phone ?? undefined, smsText ?? shareText);
  const mailtoHref =
    email?.trim() ? buildGiftMailtoHref(email, recipientName, shareText) : null;

  const copyShare = async () => {
    await navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const onNativeShare = async () => {
    setSharing(true);
    try {
      await shareGiftNative({
        title: `$POCK gift for ${recipientName}`,
        text: shareText,
        url: giftUrl,
      });
    } finally {
      setSharing(false);
    }
  };

  const btnClass = compact
    ? "inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-2 text-xs text-white/75 hover:border-neon-cyan/35 hover:text-neon-cyan transition-colors"
    : "inline-flex items-center gap-2 rounded-xl border border-neon-cyan/40 bg-neon-cyan/10 px-4 py-2.5 text-sm font-medium text-neon-cyan hover:bg-neon-cyan/20 transition-colors";

  return (
    <div className="space-y-2">
      <p className="text-[11px] text-white/40 leading-relaxed">
        Text message opens Messages on iPhone or Mac (if iPhone relay is on). You
        tap Send — nothing leaves BROK servers.
      </p>
      <div className={`flex flex-wrap gap-2 ${compact ? "" : "pt-1"}`}>
      <a href={smsHref} className={btnClass}>
        <Smartphone className="h-3.5 w-3.5 shrink-0" />
        Text message
      </a>
      {mailtoHref && (
        <a href={mailtoHref} className={btnClass}>
          <Mail className="h-3.5 w-3.5 shrink-0" />
          Email
        </a>
      )}
      {nativeShare && (
        <button
          type="button"
          onClick={onNativeShare}
          disabled={sharing}
          className={btnClass}
        >
          <Share2 className="h-3.5 w-3.5 shrink-0" />
          Share…
        </button>
      )}
      <button type="button" onClick={copyShare} className={btnClass}>
        {copied ? (
          <Check className="h-3.5 w-3.5 shrink-0" />
        ) : (
          <Copy className="h-3.5 w-3.5 shrink-0" />
        )}
        {copied ? "Copied" : "Copy message"}
      </button>
      </div>
    </div>
  );
}