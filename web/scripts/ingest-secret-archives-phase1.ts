/**
 * Phase 1 Secret Archives ingest from Buddhabot USB library.
 *
 * Usage (from web/):
 *   npx tsx scripts/ingest-secret-archives-phase1.ts
 *   LIBRARY_ROOT="/Volumes/NO NAME/usb-drive/..." npx tsx scripts/ingest-secret-archives-phase1.ts
 *
 * Requires: pdftotext, pdfinfo on PATH; web/.env.local with Supabase service role.
 * Tables must exist (migration 027_secret_archives.sql).
 */

import { createHash } from "crypto";
import { execFileSync } from "child_process";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";
import {
  PHASE1_WORKS,
  hashText,
  isQuotableChunk,
  scrubFounderIdentityFromText,
  type Phase1WorkSpec,
} from "../lib/secretArchives";

const DEFAULT_LIBRARY =
  "/Volumes/NO NAME/usb-drive/buddhabot/Buddhabot website/library";

function loadEnv() {
  const envPath = resolve(__dirname, "../.env.local");
  if (!existsSync(envPath)) throw new Error(`Missing ${envPath}`);
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    if (!line.includes("=") || line.trim().startsWith("#")) continue;
    const i = line.indexOf("=");
    const k = line.slice(0, i).trim();
    const v = line.slice(i + 1).trim();
    if (!process.env[k]) process.env[k] = v;
  }
}

function sha256File(path: string): string {
  const buf = readFileSync(path);
  return createHash("sha256").update(buf).digest("hex");
}

function pdfPageCount(path: string): number {
  try {
    const out = execFileSync("pdfinfo", [path], {
      encoding: "utf8",
      maxBuffer: 2 * 1024 * 1024,
    });
    const m = out.match(/^Pages:\s*(\d+)/m);
    return m ? parseInt(m[1], 10) : 0;
  } catch {
    return 0;
  }
}

function extractPageText(path: string, page: number): string {
  try {
    return execFileSync(
      "pdftotext",
      ["-layout", "-f", String(page), "-l", String(page), path, "-"],
      { encoding: "utf8", maxBuffer: 8 * 1024 * 1024 }
    );
  } catch {
    return "";
  }
}

/** Merge thin pages into ~target-char chunks while tracking page range. */
function buildChunks(
  pages: { page: number; text: string }[],
  targetChars = 1400
): {
  chunk_index: number;
  page_start: number;
  page_end: number;
  text: string;
  text_hash: string;
  is_quotable: boolean;
  keywords: string[];
}[] {
  const out: {
    chunk_index: number;
    page_start: number;
    page_end: number;
    text: string;
    text_hash: string;
    is_quotable: boolean;
    keywords: string[];
  }[] = [];

  let buf = "";
  let start = 0;
  let end = 0;

  const flush = () => {
    const text = buf.replace(/\s+/g, " ").trim();
    if (!text) {
      buf = "";
      return;
    }
    const words = text
      .toLowerCase()
      .split(/\W+/)
      .filter((w) => w.length > 4)
      .slice(0, 24);
    const uniq = [...new Set(words)].slice(0, 12);
    out.push({
      chunk_index: out.length,
      page_start: start,
      page_end: end,
      text,
      text_hash: hashText(text),
      is_quotable: isQuotableChunk(text),
      keywords: uniq,
    });
    buf = "";
  };

  for (const p of pages) {
    const t = p.text.trim();
    if (!t) continue;
    if (!buf) {
      start = p.page;
      end = p.page;
      buf = t;
      continue;
    }
    if (buf.length + t.length > targetChars && buf.length > 200) {
      flush();
      start = p.page;
      end = p.page;
      buf = t;
    } else {
      end = p.page;
      buf = `${buf}\n\n${t}`;
    }
  }
  flush();
  return out;
}

async function applyMigrationIfNeeded(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sb: any
) {
  // Probe table existence
  const { error } = await sb.from("secret_archive_works").select("work_id").limit(1);
  if (!error) return true;
  if (error.code === "42P01" || /does not exist|schema cache/i.test(error.message)) {
    console.error(
      "Table secret_archive_works missing. Apply migration 027_secret_archives.sql first."
    );
    return false;
  }
  // other errors may still mean table exists (empty RLS etc.)
  console.warn("Probe warning:", error.message);
  return true;
}

async function upsertWork(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sb: any,
  spec: Phase1WorkSpec,
  absPath: string,
  pageCount: number,
  pagesIngested: number,
  chunkCount: number
) {
  const fileSha = sha256File(absPath);
  const row = {
    work_id: spec.work_id,
    title: spec.title,
    author: spec.author,
    attributed_author: spec.author,
    tradition: spec.tradition,
    topics: spec.topics,
    page_count: pageCount,
    pages_ingested: pagesIngested,
    language: "en",
    era: spec.era ?? null,
    source_file: spec.source_rel,
    source_sha256: fileSha,
    license_class: spec.license_class,
    sensitivity: spec.sensitivity,
    content_class: spec.content_class,
    download_allowed: false,
    quote_max_chars: 600,
    series_id: spec.series_id ?? null,
    summary_short: spec.summary_short,
    summary_deep: null,
    ingest_status: chunkCount > 0 ? "live" : "pending",
    notes:
      pagesIngested < pageCount
        ? `Phase 1 partial ingest: ${pagesIngested}/${pageCount} pages`
        : "Phase 1 full text ingest",
    updated_at: new Date().toISOString(),
  };

  const { error } = await sb.from("secret_archive_works").upsert(row, {
    onConflict: "work_id",
  });
  if (error) throw new Error(`upsert work ${spec.work_id}: ${error.message}`);
}

async function replaceChunks(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sb: any,
  workId: string,
  chunks: ReturnType<typeof buildChunks>
) {
  const { error: delErr } = await sb
    .from("secret_archive_chunks")
    .delete()
    .eq("work_id", workId);
  if (delErr) throw new Error(`delete chunks ${workId}: ${delErr.message}`);

  // Insert in batches
  const batchSize = 40;
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize).map((c) => ({
      work_id: workId,
      chunk_index: c.chunk_index,
      page_start: c.page_start,
      page_end: c.page_end,
      section_title: null,
      text: c.text,
      text_hash: c.text_hash,
      keywords: c.keywords,
      is_quotable: c.is_quotable,
    }));
    const { error } = await sb.from("secret_archive_chunks").insert(batch);
    if (error) throw new Error(`insert chunks ${workId}: ${error.message}`);
  }
}

async function main() {
  loadEnv();
  const libraryRoot = process.env.LIBRARY_ROOT || DEFAULT_LIBRARY;
  if (!existsSync(libraryRoot)) {
    throw new Error(`Library root not found: ${libraryRoot}`);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env");

  const sb = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const ok = await applyMigrationIfNeeded(sb);
  if (!ok) {
    // Try applying via DATABASE_URL + pg if available
    const dbUrl = process.env.DATABASE_URL;
    if (dbUrl) {
      console.log("Attempting SQL migration via DATABASE_URL…");
      try {
        // dynamic import pg
        const pg = await import("pg");
        const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
        await client.connect();
        const sqlPath = resolve(
          __dirname,
          "../../supabase/migrations/027_secret_archives.sql"
        );
        const sql = readFileSync(sqlPath, "utf8");
        await client.query(sql);
        try {
          await client.query("NOTIFY pgrst, 'reload schema'");
        } catch {
          /* optional */
        }
        await client.end();
        console.log("Migration applied; waiting for schema cache…");
        await new Promise((r) => setTimeout(r, 2500));
      } catch (e) {
        console.error("Auto-migration failed:", e);
        process.exit(1);
      }
    } else {
      process.exit(1);
    }
  }

  const results: { work_id: string; chunks: number; pages: number; author: string }[] =
    [];

  for (const spec of PHASE1_WORKS) {
    const abs = resolve(libraryRoot, spec.source_rel);
    if (!existsSync(abs)) {
      console.warn("SKIP missing file:", spec.source_rel);
      continue;
    }
    const totalPages = pdfPageCount(abs) || 1;
    const limit = Math.min(totalPages, spec.max_pages ?? totalPages);
    console.log(
      `→ ${spec.work_id}: ${totalPages} pages (ingest ${limit}) · author=${spec.author}`
    );

    const pageTexts: { page: number; text: string }[] = [];
    for (let p = 1; p <= limit; p++) {
      let text = extractPageText(abs, p);
      if (spec.scrub_founder_identity) {
        text = scrubFounderIdentityFromText(text);
      }
      pageTexts.push({ page: p, text });
      if (p % 20 === 0) process.stdout.write(`  page ${p}/${limit}\n`);
    }

    const chunks = buildChunks(pageTexts);
    await upsertWork(sb, spec, abs, totalPages, limit, chunks.length);
    await replaceChunks(sb, spec.work_id, chunks);
    results.push({
      work_id: spec.work_id,
      chunks: chunks.length,
      pages: limit,
      author: spec.author,
    });
    console.log(
      `  ✓ ${chunks.length} chunks (${chunks.filter((c) => c.is_quotable).length} quotable)`
    );
  }

  console.log("\nPhase 1 ingest complete:");
  for (const r of results) {
    console.log(
      `  ${r.work_id.padEnd(28)} chunks=${String(r.chunks).padStart(4)} pages=${String(r.pages).padStart(4)}  ${r.author}`
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
