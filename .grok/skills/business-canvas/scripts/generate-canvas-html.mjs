#!/usr/bin/env node
/**
 * Fill Business Model Canvas HTML template from JSON answers.
 * Usage:
 *   node generate-canvas-html.mjs --out ~/Downloads/canvas.html --data ./answers.json
 *   node generate-canvas-html.mjs --out ./canvas.html --json '{"ventureName":"Acme",...}'
 */
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const templatePath = resolve(__dirname, "../references/canvas-template.html");

const KEYS = [
  "ventureName",
  "date",
  "customerSegments",
  "valuePropositions",
  "channels",
  "customerRelationships",
  "revenueStreams",
  "costStructure",
  "keyResources",
  "keyActivities",
  "keyPartnerships",
  "problem",
  "statusQuo",
  "assumptions",
  "keyMetrics",
  "unfairAdvantage",
];

function parseArgs(argv) {
  const out = { out: null, data: null, json: null };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--out") out.out = argv[++i];
    else if (argv[i] === "--data") out.data = argv[++i];
    else if (argv[i] === "--json") out.json = argv[++i];
  }
  return out;
}

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const args = parseArgs(process.argv);
if (!args.out) {
  console.error("Usage: --out <file.html> (--data answers.json | --json '{...}')");
  process.exit(1);
}

let data = {};
if (args.json) data = JSON.parse(args.json);
else if (args.data) data = JSON.parse(readFileSync(resolve(args.data), "utf8"));
else {
  console.error("Provide --data or --json");
  process.exit(1);
}

if (!data.date) data.date = new Date().toISOString().slice(0, 10);
if (!data.ventureName) data.ventureName = "Venture";

let html = readFileSync(templatePath, "utf8");
for (const k of KEYS) {
  const re = new RegExp(`\\{\\{${k}\\}\\}`, "g");
  html = html.replace(re, esc(data[k] ?? "—"));
}

const outPath = resolve(args.out);
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, html, "utf8");
console.log("Wrote", outPath);
console.log("Open in Chrome → Print → Save as PDF (landscape, backgrounds on).");
