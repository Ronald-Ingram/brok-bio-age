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
    id: "grok",
    label: "xAI Grok",
    model: process.env.XAI_MODEL ?? "grok-3",
    role: "premium",
    envKey: "XAI_API_KEY",
  },
  {
    id: "groq",
    label: "Groq Llama",
    model: process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile",
    role: "primary",
    envKey: "GROQ_API_KEY",
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