/**
 * Boost mono/stereo PCM s16le amplitude (in-place-safe copy).
 * Soft-clips to int16 range. Used so cloned TTS is phone-loud by default.
 */
export function boostPcmS16le(pcm: Buffer, gain = 1.85): Buffer {
  if (!pcm.length || gain === 1) return pcm;
  const out = Buffer.allocUnsafe(pcm.length);
  const n = pcm.length - (pcm.length % 2);
  for (let i = 0; i < n; i += 2) {
    const s = pcm.readInt16LE(i);
    const v = Math.round(s * gain);
    out.writeInt16LE(Math.max(-32768, Math.min(32767, v)), i);
  }
  if (n < pcm.length) pcm.copy(out, n, n);
  return out;
}

/** Browser: force full playback volume on an HTMLMediaElement. */
export function forceFullMediaVolume(
  el: HTMLMediaElement | null | undefined
): void {
  if (!el) return;
  try {
    el.muted = false;
    el.volume = 1;
    // iOS sometimes keeps a prior low volume after interruptions.
    if (typeof el.setAttribute === "function") {
      el.setAttribute("playsinline", "true");
    }
  } catch {
    /* ignore */
  }
}
