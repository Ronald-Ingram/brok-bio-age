#!/usr/bin/env node
/**
 * Browser smoke test — catches client-rendered copy.
 * Usage: node scripts/smoke-test-playwright.mjs [baseUrl]
 */

import { chromium } from "playwright";

const BASE = (process.argv[2] ?? "https://brok.neobanx.com").replace(/\/$/, "");

const CHECKS = [
  {
    path: "/",
    must: ["BROK in every pocket", "Prelaunch MVP pricing", "Essential", "Pro", "$9", "$49"],
  },
  {
    path: "/genius-wallet",
    must: ["Genius Wallet", "Genius Token", "$POCK", "Gift $POCK", "digital asset transfer"],
  },
  { path: "/subscribe", must: ["BROK Subscriptions", "Prelaunch MVP pricing", "$9", "$49"] },
  { path: "/claim", must: ["Claim", "POCK"] },
  { path: "/bio-age", must: ["Bio-Age"] },
  { path: "/inneagram", must: ["Inneagram"] },
  { path: "/chat", must: ["BROK Chat"] },
  { path: "/avatar", must: ["BROK Live Avatar"] },
];

let passed = 0;
let failed = 0;

async function checkPage(page, { path, must }) {
  const url = `${BASE}${path}`;
  try {
    const res = await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
    if (!res || res.status() >= 400) {
      failed++;
      console.log(`  ✗ ${path} → HTTP ${res?.status()}`);
      return;
    }
    await page.waitForTimeout(800);
    const text = await page.locator("body").innerText();
    const missing = must.filter((s) => !text.includes(s));
    if (missing.length) {
      failed++;
      console.log(`  ✗ ${path} → missing: ${missing.join(", ")}`);
      return;
    }
    passed++;
    console.log(`  ✓ ${path}`);
  } catch (e) {
    failed++;
    console.log(`  ✗ ${path} → ${e instanceof Error ? e.message : e}`);
  }
}

async function main() {
  console.log(`\nPlaywright smoke test: ${BASE}\n`);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

  for (const c of CHECKS) await checkPage(page, c);

  // Mobile chat layout — dialogue should be near avatar
  try {
    await page.goto(`${BASE}/chat`, { waitUntil: "networkidle", timeout: 45000 });
    const avatar = page.locator('img[alt="BROK static avatar"]').first();
    const textarea = page.locator("textarea").first();
    await avatar.waitFor({ timeout: 10000 });
    await textarea.waitFor({ timeout: 10000 });
    const aBox = await avatar.boundingBox();
    const tBox = await textarea.boundingBox();
    if (aBox && tBox) {
      const gap = tBox.y - (aBox.y + aBox.height);
      if (gap > 80) {
        failed++;
        console.log(`  ✗ /chat mobile layout → gap ${Math.round(gap)}px (want ≤80px)`);
      } else {
        passed++;
        console.log(`  ✓ /chat mobile layout (gap ${Math.round(gap)}px)`);
      }
    }
  } catch (e) {
    failed++;
    console.log(`  ✗ /chat mobile layout → ${e instanceof Error ? e.message : e}`);
  }

  await browser.close();
  console.log(`\n${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main();