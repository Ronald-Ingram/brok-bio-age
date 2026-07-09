#!/usr/bin/env node
/**
 * Switch neobanx.com nameservers at GoDaddy → Vercel DNS.
 * Imports your Chrome GoDaddy session when available, then automates NS change.
 *
 * Usage: node scripts/godaddy-vercel-ns-playwright.mjs
 */
import { chromium } from "playwright";
import { execSync } from "child_process";
import path from "path";
import os from "os";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DOMAIN = process.env.GODADDY_DOMAIN ?? "neobanx.com";
const GODADDY_EMAIL = process.env.GODADDY_EMAIL?.trim();
const GODADDY_PASSWORD = process.env.GODADDY_PASSWORD;
const GODADDY_CUSTOMER = process.env.GODADDY_CUSTOMER?.trim();
const NS1 = "ns1.vercel-dns.com";
const NS2 = "ns2.vercel-dns.com";
const PROFILE = path.join(os.homedir(), ".brok-godaddy-playwright");
const LOGIN_WAIT_MS = Number(process.env.GODADDY_LOGIN_WAIT_MS ?? 600_000);
const SHOT = path.join(PROFILE, "last-step.png");

if (!fs.existsSync(PROFILE)) fs.mkdirSync(PROFILE, { recursive: true });

function importChromeCookies() {
  const script = path.join(__dirname, "export-godaddy-cookies.py");
  try {
    const raw = execSync(`python3 "${script}"`, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    return JSON.parse(raw.trim());
  } catch (e) {
    console.warn("Cookie import skipped:", e.stderr?.toString() || e.message);
    return [];
  }
}

let browser;
let context;
let page;

async function dismissBotWall() {
  const retry = page.getByRole("button", { name: /let's try again/i }).first();
  if (await retry.isVisible().catch(() => false)) {
    await retry.click();
    await page.waitForTimeout(3000);
  }
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
    context = await browser.newContext({
      viewport: { width: 1400, height: 960 },
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    });
    page = await context.newPage();
  }
}

await launchBrowser();

const cookies = importChromeCookies();
if (cookies.length) {
  try {
    await context.addCookies(cookies);
    console.log(`Imported ${cookies.length} GoDaddy cookies from Chrome`);
  } catch (e) {
    console.warn("Cookie import partial:", e.message);
  }
}

async function snap(label) {
  try {
    await page.screenshot({ path: SHOT, fullPage: true });
    console.log(`screenshot: ${SHOT} (${label})`);
  } catch {}
}

function isLoggedIn() {
  const url = page.url();
  return !url.includes("sso.godaddy.com") && !url.includes("/login");
}

async function submitPassword() {
  const passField = page.locator('input#password, input[name="password"], input[type="password"]').first();
  if (!(await passField.isVisible().catch(() => false))) return false;
  await passField.fill(GODADDY_PASSWORD);
  const submit = page.getByRole("button", { name: /^sign in$/i }).first();
  if (await submit.isVisible().catch(() => false)) {
    await submit.click();
    await page.waitForTimeout(8000);
  }
  return true;
}

async function loginOnSignInForm(identifier) {
  const useEmail = page.getByRole("link", { name: /use email/i }).first();
  if (identifier.includes("@") && (await useEmail.isVisible().catch(() => false))) {
    await useEmail.click();
    await page.waitForTimeout(800);
  }

  const emailField = page.locator('input[type="email"], input#email').first();
  const userField = page.locator('input#username, input[name="username"]').first();
  if (identifier.includes("@") && (await emailField.isVisible().catch(() => false))) {
    await emailField.fill(identifier);
  } else if (await userField.isVisible().catch(() => false)) {
    await userField.fill(identifier);
  } else {
    return false;
  }

  if (await submitPassword()) return isLoggedIn();

  const continueBtn = page.getByRole("button", { name: /^continue$/i }).first();
  if (await continueBtn.isVisible().catch(() => false)) {
    await continueBtn.click();
    await page.waitForTimeout(3000);
    if (await submitPassword()) return isLoggedIn();
  }
  return false;
}

async function tryAutoLogin() {
  if (!GODADDY_EMAIL || !GODADDY_PASSWORD) return false;

  await page.goto("https://sso.godaddy.com/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  await dismissBotWall();

  const ids = [GODADDY_EMAIL, GODADDY_CUSTOMER, "31690513", "587160134"].filter(Boolean);
  for (const id of ids) {
    if (await loginOnSignInForm(id)) {
      console.log(`✓ GoDaddy login succeeded (${id.includes("@") ? "email" : "customer #"})`);
      return true;
    }
    await page.goto("https://sso.godaddy.com/", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);
  }

  await snap("login-pending");
  return false;
}

async function waitForLogin() {
  await page
    .goto(`https://dcc.godaddy.com/control/portfolio/${DOMAIN}/settings?subtab=nameservers`, {
      waitUntil: "domcontentloaded",
    })
    .catch(() => {});
  await page.waitForTimeout(4000);
  if (isLoggedIn()) {
    console.log("✓ GoDaddy session active (cookies)");
    return;
  }

  if (await tryAutoLogin()) return;

  await page.goto("https://account.godaddy.com/products", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);
  if (isLoggedIn()) {
    console.log("✓ GoDaddy session active");
    return;
  }

  console.log("→ Sign in manually in the Playwright window (GoDaddy blocks bots).");
  console.log("  Or use your normal Chrome tab that just opened to nameserver settings.");
  const start = Date.now();
  while (Date.now() - start < LOGIN_WAIT_MS) {
    if (isLoggedIn()) {
      console.log("✓ GoDaddy session active");
      return;
    }
    await page.waitForTimeout(2000);
  }
  throw new Error("GoDaddy login timeout — re-run: npm run dns:godaddy-ns");
}

async function clickNameserverControls() {
  const changeNs = page.getByRole("button", { name: /change nameservers/i }).first();
  if (await changeNs.isVisible().catch(() => false)) {
    await changeNs.click();
    await page.waitForTimeout(2000);
    return true;
  }

  const nsLink = page.getByRole("link", { name: /nameserver/i }).first();
  if (await nsLink.isVisible().catch(() => false)) {
    await nsLink.click();
    await page.waitForTimeout(2000);
    return true;
  }

  const nsTab = page.getByText(/^nameservers$/i).first();
  if (await nsTab.isVisible().catch(() => false)) {
    await nsTab.click();
    await page.waitForTimeout(2000);
    const edit = page.getByRole("button", { name: /change|edit/i }).first();
    if (await edit.isVisible().catch(() => false)) {
      await edit.click();
      await page.waitForTimeout(2000);
      return true;
    }
  }

  const manage = page.getByRole("button", { name: /manage dns|dns/i }).first();
  if (await manage.isVisible().catch(() => false)) {
    await manage.click();
    await page.waitForTimeout(2000);
  }
  return false;
}

async function openNameserverEditor() {
  const urls = [
    `https://dcc.godaddy.com/control/portfolio/${DOMAIN}/settings?subtab=nameservers`,
    `https://dcc.godaddy.com/control/portfolio/${DOMAIN}/settings`,
    `https://dcc.godaddy.com/control/dnsmanagement?domainName=${DOMAIN}`,
    `https://dcc.godaddy.com/domains/${DOMAIN}/dns`,
    "https://account.godaddy.com/products",
    "https://dcc.godaddy.com/control/portfolio",
  ];

  for (const url of urls) {
    await page.goto(url, { waitUntil: "networkidle" }).catch(() =>
      page.goto(url, { waitUntil: "domcontentloaded" })
    );
    await page.waitForTimeout(5000);
    if (page.url().includes("sso.godaddy.com")) continue;

    if (await clickNameserverControls()) return;

    const search = page
      .locator('input[type="search"], input[placeholder*="search" i], input[aria-label*="search" i]')
      .first();
    if (await search.isVisible().catch(() => false)) {
      await search.fill(DOMAIN);
      await page.waitForTimeout(2500);
      const domainRow = page.getByText(DOMAIN, { exact: true }).first();
      if (await domainRow.isVisible().catch(() => false)) {
        await domainRow.click();
        await page.waitForTimeout(3000);
        if (await clickNameserverControls()) return;
      }
      const dnsBtn = page.getByRole("button", { name: /dns/i }).first();
      if (await dnsBtn.isVisible().catch(() => false)) {
        await dnsBtn.click();
        await page.waitForTimeout(3000);
        if (await clickNameserverControls()) return;
      }
    }

    const domainLink = page.getByRole("link", { name: new RegExp(DOMAIN, "i") }).first();
    if (await domainLink.isVisible().catch(() => false)) {
      await domainLink.click();
      await page.waitForTimeout(3000);
      if (await clickNameserverControls()) return;
    }
  }

  await snap("open-nameservers-failed");
  throw new Error("Could not find Nameservers editor — see screenshot");
}

async function chooseCustom() {
  const opts = [
    page.getByLabel(/custom/i),
    page.getByText(/custom nameservers/i),
    page.getByText(/use my own nameservers/i),
    page.getByText(/i'll use my own/i),
    page.locator('input[type="radio"][value*="custom" i]'),
  ];
  for (const opt of opts) {
    if (await opt.first().isVisible().catch(() => false)) {
      await opt.first().click({ force: true });
      await page.waitForTimeout(1000);
      return;
    }
  }
}

async function fillNameservers() {
  await chooseCustom();

  const fields = page.locator(
    'input[aria-label*="nameserver" i], input[name*="nameserver" i], input[placeholder*="nameserver" i], input[type="text"]'
  );
  const n = await fields.count();
  let filled = 0;
  for (let i = 0; i < n && filled < 2; i++) {
    const el = fields.nth(i);
    if (!(await el.isVisible().catch(() => false))) continue;
    const val = await el.inputValue().catch(() => "");
    if (val.includes("domaincontrol") || val.includes("cloudflare")) {
      await el.fill(filled === 0 ? NS1 : NS2);
      filled++;
      continue;
    }
    if (!val || val.includes(".")) {
      const box = await el.boundingBox().catch(() => null);
      if (!box) continue;
      await el.fill(filled === 0 ? NS1 : NS2);
      filled++;
    }
  }

  if (filled < 2) {
    await page.getByLabel(/nameserver 1/i).fill(NS1).catch(() => {});
    await page.getByLabel(/nameserver 2/i).fill(NS2).catch(() => {});
  }

  console.log(`Filled nameservers: ${NS1}, ${NS2}`);
}

async function save() {
  for (const name of [/save/i, /continue/i, /update/i, /apply/i]) {
    const btn = page.getByRole("button", { name }).first();
    if (await btn.isVisible().catch(() => false)) {
      await btn.click({ timeout: 10000 });
      await page.waitForTimeout(2500);
    }
  }
  for (const name of [/save/i, /yes/i, /confirm/i, /agree/i]) {
    const btn = page.getByRole("button", { name }).first();
    if (await btn.isVisible().catch(() => false)) {
      await btn.click({ timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(2000);
    }
  }
}

async function verifyOnPage() {
  const body = await page.locator("body").innerText();
  return body.includes(NS1) && body.includes(NS2);
}

try {
  await waitForLogin();
  await openNameserverEditor();
  await fillNameservers();
  await save();
  await page.waitForTimeout(3000);

  if (await verifyOnPage()) {
    console.log(`✓ Nameservers updated to Vercel DNS`);
  } else {
    await snap("after-save");
    console.log("Save clicked — confirm in browser if a dialog is still open.");
  }

  console.log("\nNext (after 5–30 min propagation):  npm run dns:vercel-seed");
  console.log("Then verify:  dig brok.neobanx.com +short");
} catch (err) {
  await snap("error");
  console.error("GoDaddy automation failed:", err.message);
  console.error(`Screenshot: ${SHOT}`);
  process.exitCode = 1;
} finally {
  await page.waitForTimeout(5000).catch(() => {});
  if (context) await context.close().catch(() => {});
  if (browser) await browser.close().catch(() => {});
}