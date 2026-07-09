#!/usr/bin/env node
/**
 * Seed neobanx.com DNS on Vercel after nameservers point to:
 *   ns1.vercel-dns.com
 *   ns2.vercel-dns.com
 *
 * Usage: node scripts/vercel-neobanx-dns.mjs
 */
import { execSync } from "child_process";

const DOMAIN = "neobanx.com";
const VERCEL_IP = "76.76.21.21";
const CNAME = "cname.vercel-dns.com";

/** @type {Array<[string, string, string]>} */
const RECORDS = [
  ["@", "A", VERCEL_IP],
  ["www", "CNAME", CNAME],
  ["brok", "CNAME", CNAME],
  ["bio-age", "CNAME", CNAME],
  ["@", "MX", "1 smtp.google.com."],
  ["@", "TXT", "v=spf1 include:_spf.google.com ~all"],
  [
    "@",
    "TXT",
    "v=DMARC1; p=quarantine; adkim=r; aspf=r; rua=mailto:dmarc_rua@onsecureserver.net;",
  ],
  [
    "google._domainkey",
    "TXT",
    "v=DKIM1;k=rsa;p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAlqCZWAGh3BN3lZ97JZuisdiw/u3CPxkwpYJhp13B2g5HyQi1RKYYmeH7IoE2OjuJmqHIcFups+I+T1NUbV028QFVe+ee98NZEhhzjvLWwUQ8FKGUN7GS8oHpmazVaqcUp05nlQzNfqPvmUnYB9ML3DRXywzTNMWZ/9R7rduIHOdZiViLUMyBgWw7HF53oag+I+3rxgvJeo3Rig+SGazfiGt7+mA+sB3DWPqIbfxwHHz12/JRStAHbdf9tMw1x2YNuNQPIZkx4rOaHJHc9G4rHw7kA8/bxGx1Vr9TuEQq0hJYv6EWvlyw5sL8oCYopFaH2J1RdEouWh9m/K3oalAA+QIDAQAB",
  ],
];

function sh(cmd) {
  return execSync(cmd, { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }).trim();
}

function zoneReady() {
  try {
    const out = sh("vercel dns ls neobanx.com 2>&1");
    return !out.includes("not a DNS zone");
  } catch (e) {
    const msg = e.stderr?.toString() ?? e.message ?? "";
    return !msg.includes("not a DNS zone");
  }
}

function existing() {
  try {
    return sh("vercel dns ls neobanx.com 2>&1");
  } catch {
    return "";
  }
}

if (!zoneReady()) {
  console.error(
    "neobanx.com is not a Vercel DNS zone yet.\n" +
      "At GoDaddy → neobanx.com → Nameservers, set:\n" +
      "  ns1.vercel-dns.com\n" +
      "  ns2.vercel-dns.com\n" +
      "Then wait 5–30 min and re-run this script."
  );
  process.exit(1);
}

const before = existing();
let added = 0;
let skipped = 0;

for (const [name, type, value] of RECORDS) {
  const label = name === "@" ? DOMAIN : `${name}.${DOMAIN}`;
  const needle = type === "MX" ? "smtp.google.com" : value.slice(0, 24);
  if (before.includes(label) && before.toLowerCase().includes(needle.toLowerCase())) {
    console.log(`skip  ${type} ${label}`);
    skipped++;
    continue;
  }
  try {
    const q = value.includes(" ") ? `"${value.replace(/"/g, '\\"')}"` : value;
    sh(`vercel dns add ${DOMAIN} ${name} ${type} ${q}`);
    console.log(`added ${type} ${label} → ${value.slice(0, 60)}${value.length > 60 ? "…" : ""}`);
    added++;
  } catch (e) {
    const err = e.stderr?.toString() ?? e.message;
    if (/already exists|duplicate/i.test(err)) {
      console.log(`skip  ${type} ${label} (exists)`);
      skipped++;
    } else {
      console.error(`fail  ${type} ${label}:`, err);
    }
  }
}

console.log(`\nDone: ${added} added, ${skipped} skipped`);
console.log("Verify: dig brok.neobanx.com +short");