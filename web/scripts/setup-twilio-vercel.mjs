#!/usr/bin/env node
/**
 * Push Twilio env vars from web/.env.local → Vercel production.
 * Requires uncommented TWILIO_* lines in .env.local (or pass via env).
 *
 * Usage:
 *   node scripts/setup-twilio-vercel.mjs
 *   TWILIO_ACCOUNT_SID=AC... TWILIO_AUTH_TOKEN=... TWILIO_FROM_NUMBER=+1... node scripts/setup-twilio-vercel.mjs
 */

import { execSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENV_FILE = join(__dirname, "..", ".env.local");

const KEYS = ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_FROM_NUMBER"];

function parseEnvFile(path) {
  const out = {};
  if (!existsSync(path)) return out;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const m = t.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return out;
}

function getValues() {
  const file = parseEnvFile(ENV_FILE);
  const values = {};
  for (const k of KEYS) {
    values[k] = process.env[k]?.trim() || file[k]?.trim() || "";
  }
  return values;
}

async function verifyTwilio({ accountSid, authToken, from }) {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Twilio auth failed (${res.status}): ${text.slice(0, 200)}`);
  }
  const data = await res.json();
  console.log(`  ✓ Twilio account: ${data.friendly_name ?? accountSid} (${data.status})`);
  if (!from.startsWith("+")) {
    throw new Error(`TWILIO_FROM_NUMBER must be E.164 (e.g. +15551234567), got: ${from}`);
  }
  console.log(`  ✓ From number: ${from}`);
}

function pushToVercel(key, value) {
  const input = Buffer.from(value);
  execSync(`npx vercel env add ${key} production --force`, {
    cwd: join(__dirname, ".."),
    input,
    stdio: ["pipe", "inherit", "inherit"],
  });
}

async function main() {
  const values = getValues();
  const missing = KEYS.filter((k) => !values[k]);
  if (missing.length) {
    console.error("\nMissing Twilio credentials:");
    for (const k of missing) console.error(`  - ${k}`);
    console.error("\nAdd to web/.env.local (uncommented) or export before running.");
    console.error("Get them from https://console.twilio.com/");
    process.exit(1);
  }

  console.log("\nVerifying Twilio API credentials…");
  await verifyTwilio(values);

  console.log("\nPushing to Vercel production…");
  for (const k of KEYS) {
    console.log(`  → ${k}`);
    pushToVercel(k, values[k]);
  }

  console.log("\nRedeploying production…");
  execSync("npx vercel --prod --yes", {
    cwd: join(__dirname, ".."),
    stdio: "inherit",
  });

  console.log("\nDone. Check: curl -sL https://brok.neobanx.com/api/health/integrations | jq .smsReady");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});