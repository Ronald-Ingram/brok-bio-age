import type { IemCategory } from "./iemScorecard";

export type IemRecommendation =
  | "Proceed"
  | "Proceed with Conditions"
  | "Decline"
  | "Needs More Data";

export interface IemReportFactor {
  name: string;
  score: number;
  rationale: string;
}

export interface IemReportCategory {
  name: IemCategory;
  score: number;
  max_score: number;
  factors: IemReportFactor[];
}

export interface IemReportData {
  subject: string;
  counterparty?: string;
  executive_summary: string;
  overall_score: number;
  recommendation: IemRecommendation;
  categories: IemReportCategory[];
  strengths: string[];
  gaps: string[];
  conditions: string[];
  cfo_questions: string[];
  methodology_note: string;
}

export interface IemReportPayload {
  report: IemReportData;
  html: string;
  markdown: string;
  generated_at: string;
  sources: string[];
  provider: string;
}