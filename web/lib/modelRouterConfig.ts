/**
 * Kiron-first model routing — canon consulted before fallback models.
 * Admin can override via env; Vertex stub for Google grant path.
 */

export type ModelProviderId =
  | "kiron_canon"
  | "grok"
  | "groq"
  | "vertex"
  | "ollama";

export interface ModelRoute {
  id: ModelProviderId;
  label: string;
  model: string;
  role: "canon_gate" | "primary" | "fallback" | "premium";
  envKey?: string;
}

export const MODEL_ROUTING: ModelRoute[] = [
  {
    id: "kiron_canon",
    label: "Kiron Canon",
    model: "retrieval + truth hierarchy",
    role: "canon_gate",
  },
  {
    id: "groq",
    label: "BROK Intelligence (GPT-OSS 120B)",
    model: process.env.GROQ_MODEL ?? "openai/gpt-oss-120b",
    role: "primary",
    envKey: "GROQ_API_KEY",
  },
  {
    id: "grok",
    label: "BROK Genius — markets/crypto/regs first",
    model: process.env.XAI_MODEL ?? "grok-3",
    // Preferential for live markets / crypto / banking regs / deep investments;
    // also capacity backup for all topics when Groq is limited.
    role: "premium",
    envKey: "XAI_API_KEY",
  },
  {
    id: "vertex",
    label: "Google Vertex AI",
    model: process.env.VERTEX_MODEL ?? "gemini-2.0-flash",
    role: "fallback",
    envKey: "GOOGLE_CLOUD_PROJECT",
  },
  {
    id: "ollama",
    label: "Ollama (local VM)",
    model: process.env.OLLAMA_MODEL ?? "llama3.1:70b",
    role: "fallback",
  },
];

export const DEFAULT_LLM_PROVIDER =
  process.env.LLM_PROVIDER?.toLowerCase() ?? "xai";

export function modelRoutingSummary(): string {
  return `Canon first → ${DEFAULT_LLM_PROVIDER} (${MODEL_ROUTING.find((m) => m.id === DEFAULT_LLM_PROVIDER || (DEFAULT_LLM_PROVIDER === "xai" && m.id === "grok"))?.model ?? "configured model"})`;
}