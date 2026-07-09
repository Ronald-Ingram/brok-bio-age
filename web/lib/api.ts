import type {
  CalculateRequest,
  CalculateResponse,
  ParsePdfResponse,
} from "./types";

/** Local dev hits FastAPI directly; production uses same-origin Next.js proxy. */
function apiBase(): string {
  if (typeof window !== "undefined") {
    if (
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1"
    ) {
      return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
    }
    return "";
  }
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
}

function apiUnreachableMessage(cause?: string): string {
  const isProd =
    typeof window !== "undefined" &&
    !window.location.hostname.includes("localhost");
  if (isProd) {
    return "Lab report upload failed — Bio-Age API is still deploying. Try again in a few minutes or enter labs manually.";
  }
  return cause ?? "Failed to fetch — is the API running on port 8000?";
}

export async function fetchHealth(): Promise<Record<string, unknown>> {
  const res = await fetch(`${apiBase()}/health`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Health check failed: ${res.status}`);
  return res.json();
}

export async function calculateBioAge(
  request: CalculateRequest
): Promise<CalculateResponse> {
  let res: Response;
  try {
    res = await fetch(`${apiBase()}/api/v1/calculate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
  } catch (e) {
    throw new Error(apiUnreachableMessage(e instanceof Error ? e.message : undefined));
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const detail =
      typeof err.detail === "string"
        ? err.detail
        : JSON.stringify(err.detail ?? err);
    throw new Error(detail || `Calculate failed: ${res.status}`);
  }

  return res.json();
}

export async function parseLabFile(file: File): Promise<ParsePdfResponse> {
  const form = new FormData();
  form.append("file", file);

  let res: Response;
  try {
    res = await fetch(`${apiBase()}/api/v1/parse-pdf`, {
      method: "POST",
      body: form,
    });
  } catch (e) {
    throw new Error(apiUnreachableMessage(e instanceof Error ? e.message : undefined));
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const detail =
      typeof err.detail === "string"
        ? err.detail
        : JSON.stringify(err.detail ?? err);
    throw new Error(detail || `Parse failed: ${res.status}`);
  }

  return res.json();
}