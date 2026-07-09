#!/usr/bin/env node
/**
 * Add brok.neobanx.com → Vercel (76.76.21.21) in Cloudflare DNS.
 * Usage: CLOUDFLARE_API_TOKEN=xxx node scripts/cloudflare-brok-dns.mjs
 */
const TOKEN = process.env.CLOUDFLARE_API_TOKEN?.trim();
const ZONE = process.env.CLOUDFLARE_ZONE ?? "neobanx.com";
const NAME = process.env.CLOUDFLARE_RECORD_NAME ?? "brok";
const IP = process.env.VERCEL_A_RECORD_IP ?? "76.76.21.21";

if (!TOKEN) {
  console.error("CLOUDFLARE_API_TOKEN required");
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${TOKEN}`,
  "Content-Type": "application/json",
};

async function cf(path, opts = {}) {
  const res = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    ...opts,
    headers: { ...headers, ...opts.headers },
  });
  const json = await res.json();
  if (!json.success) {
    throw new Error(JSON.stringify(json.errors ?? json));
  }
  return json.result;
}

const zones = await cf(`/zones?name=${ZONE}`);
const zone = zones[0];
if (!zone) throw new Error(`Zone not found: ${ZONE}`);

const existing = await cf(
  `/zones/${zone.id}/dns_records?type=A&name=${NAME}.${ZONE}`
);
const payload = {
  type: "A",
  name: NAME,
  content: IP,
  ttl: 1,
  proxied: false,
};

if (existing[0]) {
  const updated = await cf(`/zones/${zone.id}/dns_records/${existing[0].id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  console.log("Updated:", updated.name, "→", updated.content);
} else {
  const created = await cf(`/zones/${zone.id}/dns_records`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  console.log("Created:", created.name, "→", created.content);
}