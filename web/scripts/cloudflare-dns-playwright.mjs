#!/usr/bin/env node
/**
 * Add brok.neobanx.com DNS record in Cloudflare (neobanx.com zone).
 * Usage:
 *   CLOUDFLARE_EMAIL=ronald@neobanx.com node scripts/cloudflare-dns-playwright.mjs
 */
import { chromium } from "playwright";
import { execSync } from "child_process";
import path from "path";
import os from "os";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ZONE = process.env.CLOUDFLARE_ZONE ?? "neobanx.com";
const NAME = process.env.CLOUDFLARE_RECORD_NAME ?? "brok";
const IP = process.env.VERCEL_A_RECORD_IP ?? "76.76.21.21";
const EMAIL = process.env.CLOUDFLARE_EMAIL?.trim() ?? "ronald@neobanx.com";
const PASSWORD = process.env.CLOUDFLARE_PASSWORD;
const PROFILE = path.join(os.homedir(), ".brok-cloudflare-playwright");
const LOGIN_WAIT_MS = Number(process.env.CLOUDFLARE_LOGIN_WAIT_MS ?? 600_000);
const SHOT = path.join(PROFILE, "last-step.png");

if (!fs.existsSync(PROFILE)) fs.mkdirSync(PROFILE, { recursive: true });

function importCookies() {
  const script = path.join(__dirname, "export-cloudflare-cookies.py");
  try {
    const raw = execSync(`python3 "${script}"`, { encoding: "utf8" });
    return JSON.parse(raw.trim());
  } catch {
    return [];
  }
}

let browser;
let context;
let page;

async function snap(label) {
  try {
    await page.screenshot({ path: SHOT, fullPage: true });
    console.log(`screenshot: ${SHOT} (${label})`);
  } catch {}
}

function isChallengePage() {
  return page.url().includes("challenges.cloudflare.com");
}

async function isChallengeContent() {
  const body = await page.locator("body").innerText().catch(() => "");
  return /verify you are human|performing security verification/i.test(body);
}

async function passChallenge() {
  if (!(await isChallengeContent()) && !isChallengePage()) return;

  console.log("→ Cloudflare human verification — complete checkbox if visible…");
  const frames = page.frames();
  for (const frame of frames) {
    const box = frame.locator('input[type="checkbox"], [role="checkbox"], .ctp-checkbox-label').first();
    if (await box.isVisible().catch(() => false)) {
      await box.click({ force: true }).catch(() => {});
      break;
    }
  }
  await page.locator('input[type="checkbox"], [role="checkbox"]').first().click({ force: true }).catch(() => {});

  for (let i = 0; i < 60; i++) {
    await page.waitForTimeout(2000);
    if (!(await isChallengeContent()) && loggedIn(page.url())) {
      console.log("✓ Passed Cloudflare verification");
      return;
    }
  }
}

function loggedIn(url) {
  return (
    url.includes("dash.cloudflare.com") &&
    !url.includes("/login") &&
    !url.includes("/sign-up") &&
    !url.includes("challenges.cloudflare.com")
  );
}

async function launchBrowser() {
  try {
    context = await chromium.launchPersistentContext(PROFILE, {
      channel: "chrome",
      headless: false,
      viewport: { width: 1400, height: 960 },
      ignoreDefaultArgs: ["--enable-automation"],
      args: ["--disable-blink-features=AutomationControlled"],
    });
    page = context.pages()[0] ?? (await context.newPage());
    browser = null;
  } catch {
    browser = await chromium.launch({
      channel: "chrome",
      headless: false,
      ignoreDefaultArgs: ["--enable-automation"],
      args: ["--disable-blink-features=AutomationControlled"],
    });
    context = await browser.newContext({ viewport: { width: 1400, height: 960 } });
    page = await context.newPage();
  }

  const cookies = importCookies();
  if (cookies.length) {
    try {
      await context.addCookies(cookies);
      console.log(`Imported ${cookies.length} Cloudflare cookies from Chrome`);
    } catch (e) {
      console.warn("Cookie import partial:", e.message);
    }
  }
}

async function tryEmailLogin() {
  if (!PASSWORD) return false;
  await page.goto("https://dash.cloudflare.com/login", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);

  const email = page.locator('input[type="email"], input[name="email"]').first();
  if (await email.isVisible().catch(() => false)) {
    await email.fill(EMAIL);
    await page.getByRole("button", { name: /continue|next/i }).first().click().catch(() => {});
    await page.waitForTimeout(2500);
  }

  const pass = page.locator('input[type="password"]').first();
  if (await pass.isVisible().catch(() => false)) {
    await pass.fill(PASSWORD);
    await page.getByRole("button", { name: /log in|sign in|continue/i }).first().click();
    await page.waitForTimeout(6000);
  }

  return loggedIn(page.url());
}

async function tryGoogleLogin() {
  await page.goto("https://dash.cloudflare.com/login", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  const google = page.getByRole("button", { name: /google/i }).first();
  if (await google.isVisible().catch(() => false)) {
    await google.click();
    await page.waitForTimeout(5000);
  }
  return loggedIn(page.url());
}

async function waitForLogin() {
  await page.goto(`https://dash.cloudflare.com/${ZONE}/dns`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(4000);
  if (loggedIn(page.url()) && !page.url().includes("/login")) {
    console.log("✓ Cloudflare session active");
    return;
  }

  if (await tryEmailLogin()) {
    console.log("✓ Cloudflare login succeeded (email)");
    return;
  }

  if (PASSWORD) {
    await page.goto("https://dash.cloudflare.com/login", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);
  }
  await tryGoogleLogin();

  console.log(`→ Sign in as ${EMAIL} in the browser (Google Workspace SSO works).`);
  const start = Date.now();
  while (Date.now() - start < LOGIN_WAIT_MS) {
    if (loggedIn(page.url())) {
      console.log("✓ Cloudflare session active");
      return;
    }
    await page.waitForTimeout(2000);
  }
  await snap("login-timeout");
  throw new Error("Cloudflare login timeout");
}

async function openZoneDns() {
  const urls = [
    `https://dash.cloudflare.com/${ZONE}/dns`,
    `https://dash.cloudflare.com/?to=/:account/${ZONE}/dns`,
    "https://dash.cloudflare.com/",
  ];
  for (const url of urls) {
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(4000);
    await passChallenge();
    if (!loggedIn(page.url()) && !(await isChallengeContent())) continue;

    if (page.url().includes("/dns") && !(await isChallengeContent())) return;

    const search = page.locator('input[placeholder*="Search" i], input[type="search"]').first();
    if (await search.isVisible().catch(() => false)) {
      await search.fill(ZONE);
      await page.waitForTimeout(1500);
    }
    const zone = page.locator(`a:has-text("${ZONE}")`).first();
    if (await zone.isVisible().catch(() => false)) {
      await zone.click();
      await page.waitForTimeout(2000);
    }
    const dns = page.getByRole("link", { name: /^DNS$/i }).first();
    if (await dns.isVisible().catch(() => false)) {
      await dns.click();
      await page.waitForTimeout(2000);
      return;
    }
  }
  await snap("open-dns-failed");
  throw new Error("Could not open neobanx.com DNS — see screenshot");
}

async function recordExists() {
  const body = await page.locator("body").innerText();
  return body.includes(NAME) && (body.includes(IP) || body.includes("vercel"));
}

async function addRecord() {
  await passChallenge();
  if (await recordExists()) {
    console.log(`✓ Record already present for ${NAME}.${ZONE}`);
    return;
  }

  const addBtn = page
    .getByRole("button", { name: /add record/i })
    .or(page.getByText(/add record/i))
    .first();
  await addBtn.click({ timeout: 30000 });

  const typeField = page.locator('select, [data-testid="dns-record-type"]').first();
  if (await typeField.isVisible().catch(() => false)) {
    await typeField.selectOption("A").catch(() => {});
  }

  await page.locator('input[name="name"], input[aria-label="Name"]').first().fill(NAME);
  await page
    .locator('input[name="content"], input[name="ipv4"], input[aria-label="IPv4 address"]')
    .first()
    .fill(IP);

  const proxyOff = page.getByText(/DNS only/i).first();
  if (await proxyOff.isVisible().catch(() => false)) await proxyOff.click();

  await page.getByRole("button", { name: /^save$/i }).first().click({ timeout: 15000 });
  await page.waitForTimeout(3000);
  console.log(`✓ Created A record: ${NAME}.${ZONE} → ${IP} (DNS only)`);
}

await launchBrowser();

try {
  await waitForLogin();
  await openZoneDns();
  await addRecord();
  console.log("Done. Verify: dig brok.neobanx.com +short");
} catch (err) {
  await snap("error");
  console.error("Cloudflare DNS failed:", err.message);
  process.exitCode = 1;
} finally {
  await page.waitForTimeout(3000).catch(() => {});
  if (context) await context.close().catch(() => {});
  if (browser) await browser.close().catch(() => {});
}