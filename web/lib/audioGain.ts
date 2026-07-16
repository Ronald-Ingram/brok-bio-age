/** Browser: force full (100%) playback volume — does not rewrite audio samples. */
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
