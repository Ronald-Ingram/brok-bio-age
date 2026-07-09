import { BROK_API_BASE, brokApiConfigured } from "./brokApiConfig";

export interface IngestedFile {
  file_id: string;
  filename: string;
  text: string;
  source: "brok_api" | "pdf_extract" | "text" | "bioage_parse";
  char_count: number;
}

export const MAX_FILE_CHARS = 10_000;
export const MAX_ATTACHMENTS = 5;

function bioageApiBase(): string | null {
  const url =
    process.env.BIOAGE_API_URL?.trim() ??
    process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!url || url.includes("localhost")) return null;
  return url.replace(/\/$/, "");
}

async function extractPdfText(bytes: ArrayBuffer): Promise<string> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(bytes));
  const { text } = await extractText(pdf, { mergePages: true });
  return (Array.isArray(text) ? text.join("\n") : String(text ?? "")).trim();
}

async function extractDocxText(bytes: ArrayBuffer): Promise<string> {
  const mammoth = await import("mammoth");
  const buffer = Buffer.from(bytes);
  const result = await mammoth.extractRawText({ buffer });
  return (result.value ?? "").trim();
}

async function ingestViaBioage(file: File): Promise<string> {
  const base = bioageApiBase();
  if (!base) throw new Error("bioage_parse_unavailable");

  const fd = new FormData();
  fd.append("file", file, file.name);
  const res = await fetch(`${base}/api/v1/parse-pdf`, { method: "POST", body: fd });
  const data = (await res.json()) as { raw_text_preview?: string; detail?: string };
  if (!res.ok) throw new Error(data.detail ?? "bioage_parse_failed");
  return (data.raw_text_preview ?? "").trim();
}

export async function ingestFileForChat(file: File): Promise<IngestedFile> {
  const filename = file.name;
  const lower = filename.toLowerCase();
  const file_id = crypto.randomUUID();

  if (brokApiConfigured()) {
    const upstream = new FormData();
    upstream.append("file", file, filename);
    const res = await fetch(`${BROK_API_BASE}/upload-file`, {
      method: "POST",
      body: upstream,
    });
    const data = (await res.json()) as {
      file_id?: string;
      filename?: string;
      text?: string;
      extracted_text?: string;
    };
    if (res.ok && data.file_id) {
      const text = (data.text ?? data.extracted_text ?? "").slice(0, MAX_FILE_CHARS);
      return {
        file_id: data.file_id,
        filename: data.filename ?? filename,
        text,
        source: "brok_api",
        char_count: text.length,
      };
    }
  }

  let text = "";

  if (lower.endsWith(".pdf")) {
    try {
      text = (await extractPdfText(await file.arrayBuffer())).slice(0, MAX_FILE_CHARS);
    } catch {
      text = "";
    }
    if (text.length < 200) {
      try {
        text = (await ingestViaBioage(file)).slice(0, MAX_FILE_CHARS);
      } catch {
        /* fall through */
      }
    }
  } else if (lower.endsWith(".docx")) {
    const bytes = await file.arrayBuffer();
    try {
      text = (await extractDocxText(bytes)).slice(0, MAX_FILE_CHARS);
    } catch (e) {
      const detail = e instanceof Error ? e.message : "docx_extract_failed";
      throw new Error(`docx_extract_failed — ${detail}`);
    }
  } else if (
    lower.endsWith(".txt") ||
    lower.endsWith(".csv") ||
    lower.endsWith(".md") ||
    lower.endsWith(".json")
  ) {
    text = (await file.text()).slice(0, MAX_FILE_CHARS);
  } else if (lower.endsWith(".doc")) {
    throw new Error(
      "file_type_legacy_doc — save as .docx or .pdf; legacy .doc needs BROK_API_URL (VM)"
    );
  } else {
    throw new Error(
      "file_type_unsupported_without_vm — PDF, DOCX, and text files work without BROK_API_URL; images need the VM"
    );
  }

  if (!text.trim()) {
    throw new Error("file_extract_empty — could not read text from this file");
  }

  return {
    file_id,
    filename,
    text: text.trim(),
    source: lower.endsWith(".pdf") ? "pdf_extract" : "text",
    char_count: text.trim().length,
  };
}

export function formatFileContextsForPrompt(
  contexts: { filename: string; text: string }[]
): string {
  if (!contexts.length) return "";
  return contexts
    .map(
      (c) =>
        `--- Attached file: ${c.filename} ---\n${c.text.slice(0, MAX_FILE_CHARS)}`
    )
    .join("\n\n");
}