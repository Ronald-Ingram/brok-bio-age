/**
 * Peak-normalize PCM s16le so the loudest sample sits at `targetPeak` of full scale.
 * Makes soft clone voices louder without the hard clipping/distortion of fixed gain.
 * If already near target, leaves audio essentially unchanged.
 */
export function normalizePcmS16lePeak(
  pcm: Buffer,
  targetPeak = 0.88
): Buffer {
  if (!pcm.length) return pcm;
  const n = pcm.length - (pcm.length % 2);
  let peak = 1;
  for (let i = 0; i < n; i += 2) {
    const a = Math.abs(pcm.readInt16LE(i));
    if (a > peak) peak = a;
  }
  // Already loud enough — don't boost (avoids re-distorting hot takes).
  if (peak >= 28000) return pcm;

  const target = Math.min(0.95, Math.max(0.5, targetPeak)) * 32767;
  const gain = target / peak;
  // Cap boost so silence-ish clips don't explode.
  const g = Math.min(gain, 2.4);

  const out = Buffer.allocUnsafe(pcm.length);
  for (let i = 0; i < n; i += 2) {
    const s = pcm.readInt16LE(i);
    // Soft knee near rails instead of brick-wall clip.
    let v = (s * g) / 32768;
    if (Math.abs(v) > 0.9) {
      const sign = v < 0 ? -1 : 1;
      const over = Math.abs(v) - 0.9;
      v = sign * (0.9 + Math.tanh(over * 3) * 0.08);
    }
    out.writeInt16LE(
      Math.max(-32768, Math.min(32767, Math.round(v * 32767))),
      i
    );
  }
  if (n < pcm.length) pcm.copy(out, n, n);
  return out;
}

/** @deprecated Use normalizePcmS16lePeak — fixed gain clipped and distorted. */
export function boostPcmS16le(pcm: Buffer, _gain = 1.85): Buffer {
  return normalizePcmS16lePeak(pcm, 0.88);
}

/** Browser: force full playback volume on an HTMLMediaElement. */
export function forceFullMediaVolume(
  el: HTMLMediaElement | null | undefined
): void {
  if (!el) return;
  try {
    el.muted = false;
    el.volume = 1;
    if (typeof el.setAttribute === "function") {
      el.setAttribute("playsinline", "true");
    }
  } catch {
    /* ignore */
  }
}
