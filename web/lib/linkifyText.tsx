import React, { type ReactNode } from "react";

/**
 * Safe client-side linkify for BROK chat / answer panes.
 * - Only http(s) schemes
 * - Renders React <a> nodes (no raw HTML)
 * - Strips common trailing punctuation from bare URLs
 * - Supports markdown [label](https://...) as well as bare URLs
 */

// Escape ] so the character class is not closed early.
const TRAILING_PUNCT = /[.,;:!?)\]}'"»」】]+$/;

/** Combined: markdown links first, then bare URLs. */
const LINK_TOKEN =
  /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)|(https?:\/\/[^\s<>"']+)/gi;

function cleanBareUrl(raw: string): { href: string; trailing: string } {
  let href = raw;
  let trailing = "";
  const m = href.match(TRAILING_PUNCT);
  if (m) {
    trailing = m[0];
    href = href.slice(0, -trailing.length);
  }
  // Drop unbalanced closing paren often stuck to URLs: ...(status/123)
  while (href.endsWith(")") && (href.match(/\(/g)?.length ?? 0) < (href.match(/\)/g)?.length ?? 0)) {
    trailing = `)${trailing}`;
    href = href.slice(0, -1);
  }
  return { href, trailing };
}

function isSafeHttpUrl(href: string): boolean {
  try {
    const u = new URL(href);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function Anchor({ href, children }: { href: string; children: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-neon-cyan underline underline-offset-2 hover:text-neon-cyan/80 break-all"
    >
      {children}
    </a>
  );
}

/**
 * Turn plain text into React nodes with clickable http(s) links.
 */
export function linkifyText(text: string): ReactNode[] {
  if (!text) return [];

  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;
  const re = new RegExp(LINK_TOKEN.source, LINK_TOKEN.flags);

  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    const full = match[0];
    const start = match.index;

    if (start > lastIndex) {
      nodes.push(text.slice(lastIndex, start));
    }

    const mdLabel = match[1];
    const mdHref = match[2];
    const bare = match[3];

    if (mdLabel != null && mdHref != null) {
      if (isSafeHttpUrl(mdHref)) {
        nodes.push(
          <Anchor key={`a-${key++}`} href={mdHref}>
            {mdLabel}
          </Anchor>
        );
      } else {
        nodes.push(full);
      }
    } else if (bare) {
      const { href, trailing } = cleanBareUrl(bare);
      if (href && isSafeHttpUrl(href)) {
        nodes.push(
          <Anchor key={`a-${key++}`} href={href}>
            {href}
          </Anchor>
        );
        if (trailing) nodes.push(trailing);
      } else {
        nodes.push(full);
      }
    } else {
      nodes.push(full);
    }

    lastIndex = start + full.length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes.length ? nodes : [text];
}

/** Convenience wrapper for message bodies. */
export function LinkifiedText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  return <span className={className}>{linkifyText(text)}</span>;
}
