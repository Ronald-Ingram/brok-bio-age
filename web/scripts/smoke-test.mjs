#!/usr/bin/env node
/**
 * Smoke test brok.neobanx.com — pages, APIs, key copy.
 * Usage: node scripts/smoke-test.mjs [baseUrl]
 */

const BASE = (process.argv[2] ?? process.env.SMOKE_BASE_URL ?? "https://brok.neobanx.com").replace(/\/$/, "");

const PAGES = [
  { path: "/", must: ["BROK in every pocket", "Prelaunch MVP pricing", "Essential", "Pro"] },
  { path: "/genius-wallet", must: ["Genius Wallet", "Genius Token"] },
  { path: "/bio-age", must: ["Bio-Age", "BROK"] },
  { path: "/inneagram", must: ["Inneagram", "Nine Gates"] },
  { path: "/chat", must: ["BROK Chat", "Message"] },
  { path: "/avatar", must: ["BROK Live Avatar", "static"] },
  { path: "/subscribe", must: ["BROK Subscriptions", "Prelaunch MVP pricing"] },
  { path: "/claim", must: ["Claim", "POCK"] },
];

const APIS = [
  { path: "/api/health/integrations", json: true, check: (d) => d.siteUrl === BASE || d.siteUrl?.includes("brok") },
  { path: "/api/brok/status", json: true, check: (d) => typeof d === "object" },
];

let passed = 0;
let failed = 0;

function ok(msg) {
  passed++;
  console.log(`  ✓ ${msg}`);
}

function fail(msg) {
  failed++;
  console.log(`  ✗ ${msg}`);
}

async function testPage({ path, must }) {
  const url = `${BASE}${path}`;
  try {
    const res = await fetch(url, { redirect: "follow" });
    const html = await res.text();
    if (res.status !== 200) {
      fail(`${path} → HTTP ${res.status}`);
      return;
    }
    const missing = must.filter((s) => !html.includes(s));
    if (missing.length) {
      fail(`${path} → missing: ${missing.join(", ")}`);
      return;
    }
    ok(`${path} (${res.status})`);
  } catch (e) {
    fail(`${path} → ${e instanceof Error ? e.message : e}`);
  }
}

async function testApi({ path, json, check }) {
  const url = `${BASE}${path}`;
  try {
    const res = await fetch(url);
    const data = json ? await res.json() : await res.text();
    if (res.status !== 200) {
      fail(`${path} → HTTP ${res.status}`);
      return;
    }
    if (check && !check(data)) {
      fail(`${path} → check failed: ${JSON.stringify(data).slice(0, 120)}`);
      return;
    }
    ok(`${path} (${res.status})`);
    return data;
  } catch (e) {
    fail(`${path} → ${e instanceof Error ? e.message : e}`);
  }
}

console.log(`\nSmoke test: ${BASE}\n`);

console.log("Pages:");
for (const p of PAGES) await testPage(p);

console.log("\nAPIs:");
let health = null;
for (const a of APIS) {
  const d = await testApi(a);
  if (a.path.includes("health")) health = d;
}

if (health) {
  console.log("\nIntegration health:");
  const flags = [
    ["paymentsReady", health.paymentsReady],
    ["smsReady", health.smsReady],
    ["avatarReady", health.avatarReady],
    ["inviteSecret", health.inviteSecret],
    ["stripeWebhook", health.stripeWebhook],
  ];
  for (const [k, v] of flags) {
    console.log(`  ${v ? "✓" : "○"} ${k}: ${v}`);
  }
}

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);