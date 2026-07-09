"use client";

import { useEffect, useState } from "react";

/**
 * Warns when Next.js static assets 404 (stale .next cache).
 * Critical inline CSS still applies; JS may not hydrate until dev restart.
 */
export function StylesHealthBanner() {
  const [stale, setStale] = useState(false);

  useEffect(() => {
    const assets = [
      document.querySelector<HTMLLinkElement>(
        'link[href*="/_next/static/css/app/layout.css"]'
      )?.href,
      document.querySelector<HTMLScriptElement>(
        'script[src*="/_next/static/chunks/main-app.js"]'
      )?.src,
    ].filter(Boolean) as string[];

    if (assets.length === 0) return;

    Promise.all(
      assets.map((url) =>
        fetch(url, { method: "HEAD" })
          .then((res) => res.ok)
          .catch(() => false)
      )
    ).then((results) => {
      if (results.some((ok) => !ok)) setStale(true);
    });
  }, []);

  if (!stale) return null;

  return (
    <div
      role="status"
      className="fixed top-0 left-0 right-0 z-[10000] px-4 py-2 text-center text-xs bg-amber-500/15 border-b border-amber-500/35 text-amber-200 pointer-events-auto"
    >
      App bundles failed to load (stale cache). Buttons may not work until you
      hard-refresh (Cmd+Shift+R) or run{" "}
      <code className="text-amber-100/90">cd web && npm run dev:clean</code> in
      the bio-age-tool folder.
    </div>
  );
}