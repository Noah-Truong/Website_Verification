export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export type CheckStatus = "pass" | "fail" | "warn" | "skip" | "info";

export interface CheckResult {
  id: string;
  category: string;
  label: string;
  status: CheckStatus;
  detail: string;
  /** Reference to the manual section that motivates this check. */
  reference?: string;
}

export interface PageReport {
  url: string;
  ok: boolean;
  statusCode: number | null;
  checks: CheckResult[];
  error?: string;
}

export interface PerformanceScore {
  url: string;
  performance: number | null;
  accessibility: number | null;
  bestPractices: number | null;
  seo: number | null;
  lcp?: string;
  cls?: string;
  error?: string;
}

export interface VerificationRun {
  id: string;
  projectId: string;
  createdAt: string;
  finishedAt: string | null;
  status: "running" | "complete" | "error";
  /** 0-100 weighted score across automated checks. */
  score: number;
  summary: {
    pass: number;
    fail: number;
    warn: number;
    total: number;
  };
  siteChecks: CheckResult[];
  pages: PageReport[];
  performance: PerformanceScore[];
  error?: string;
}

export interface ChecklistItem {
  id: string;
  /** Section heading the item was found under, if any. */
  section?: string;
  text: string;
  checked: boolean;
  /** Optional note the developer adds when verifying the item. */
  note?: string;
}

export type RequirementStatus = "met" | "unmet" | "partial" | "unverifiable";

export interface RequirementAssessment {
  itemId: string;
  status: RequirementStatus;
  confidence: "high" | "medium" | "low";
  /** One- or two-sentence explanation of the verdict. */
  rationale: string;
  /** Concrete evidence from the site/audit the model relied on. */
  evidence?: string;
}

export interface AiAnalysis {
  id: string;
  createdAt: string;
  model: string;
  /** Short overall readiness summary across all requirements. */
  summary: string;
  assessments: RequirementAssessment[];
}

export interface ClientDocument {
  fileName: string;
  mimeType: string;
  /** Raw extracted text, truncated for storage. */
  textPreview: string;
  charCount: number;
}

export interface Project {
  id: string;
  ownerId: string;
  name: string;
  clientName: string;
  websiteUrl: string;
  repoUrl: string;
  document: ClientDocument | null;
  checklist: ChecklistItem[];
  aiAnalysis: AiAnalysis | null;
  createdAt: string;
  updatedAt: string;
  runs: VerificationRun[];
}
