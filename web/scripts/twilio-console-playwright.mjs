#!/usr/bin/env node
/**
 * Try to read Twilio credentials from an existing Chrome session.
 * Opens console.twilio.com — if logged in, prints Account SID hint + phone numbers.
 */

import { chromium } from "playwright";
import { homedir } from "node:os";
import { join } from "node:path";

const CHROME = join(
  homedir(),
  "Library/Application Support/Google/Chrome/Default"
);

async function main() {
  console.log("Opening Twilio console with Chrome profile…");
  let context;
  try {
    context = await chromium.launchPersistentContext(CHROME, {
      channel: "chrome",
      headless: false,
      viewport: { width: 1280, height: 900 },
    });
  } catch (e) {
    console.error("Could not launch Chrome profile:", e instanceof Error ? e.message : e);
    console.error("Log into https://console.twilio.com manually, then add credentials to web/.env.local");
    process.exit(1);
  }

  const page = context.pages()[0] ?? (await context.newPage());
  await page.goto("https://console.twilio.com/", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(5000);

  const url = page.url();
  const body = await page.locator("body").innerText().catch(() => "");

  if (url.includes("login") || body.toLowerCase().includes("log in")) {
    console.log("\nNot logged into Twilio. Please sign in in the browser window.");
    console.log("Then copy from Console → Account Info:");
    console.log("  TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN");
    console.log("And Phone Numbers → Active number:");
    console.log("  TWILIO_FROM_NUMBER");
    console.log("\nRun: node scripts/setup-twilio-vercel.mjs");
    await page.waitForTimeout(120000);
    await context.close();
    return;
  }

  // Dashboard — try to scrape account SID from page
  const sidMatch = body.match(/AC[a-f0-9]{32}/i);
  if (sidMatch) {
    console.log(`\nFound Account SID on page: ${sidMatch[0]}`);
  }

  await page.goto("https://console.twilio.com/us1/develop/phone-numbers/manage/incoming", {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await page.waitForTimeout(3000);
  const phones = await page.locator("body").innerText();
  const phoneMatch = phones.match(/\+1[\d\s()-]{10,}/g);
  if (phoneMatch?.length) {
    console.log("Phone numbers found:");
    for (const p of [...new Set(phoneMatch)].slice(0, 5)) {
      console.log(`  ${p.replace(/\s/g, "")}`);
    }
  }

  console.log("\nAuth Token cannot be scraped from UI — copy from Account Info.");
  console.log("Add all three to web/.env.local, then: node scripts/setup-twilio-vercel.mjs");
  await page.waitForTimeout(30000);
  await context.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});