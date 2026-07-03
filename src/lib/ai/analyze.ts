import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { randomUUID } from "crypto";
import type {
  AiAnalysis,
  ChecklistItem,
  RequirementAssessment,
  RequirementStatus,
  VerificationRun,
} from "../types";
import type { PageText } from "../verify/content";

const DEFAULT_MODEL = "claude-3-5-sonnet-latest";
const MAX_REQUIREMENTS = 80;
const VALID_STATUS: RequirementStatus[] = ["met", "unmet", "partial", "unverifiable"];
const VALID_CONFIDENCE = ["high", "medium", "low"] as const;

export class AiConfigError extends Error {}

function summarizeRun(run: VerificationRun | undefined): string {
  if (!run || run.status !== "complete") {
    return "No automated audit results are available.";
  }
  const lines: string[] = [];
  lines.push(
    `Automated audit score ${run.score}/100 (pass ${run.summary.pass}, warn ${run.summary.warn}, fail ${run.summary.fail}).`,
  );
  const site = run.siteChecks
    .map((c) => `- [${c.status.toUpperCase()}] ${c.label}: ${c.detail}`)
    .join("\n");
  if (site) lines.push("Site-wide checks:\n" + site);

  for (const page of run.pages) {
    if (!page.ok) {
      lines.push(`Page ${page.url}: unreachable (${page.error ?? "error"}).`);
      continue;
    }
    const checks = page.checks
      .map((c) => `  - [${c.status.toUpperCase()}] ${c.label}: ${c.detail}`)
      .join("\n");
    lines.push(`Page ${page.url}:\n${checks}`);
  }

  if (run.performance.length > 0) {
    const perf = run.performance
      .map((p) =>
        p.performance === null
          ? `  - ${p.url}: performance data unavailable`
          : `  - ${p.url}: Perf ${p.performance}, A11y ${p.accessibility}, BP ${p.bestPractices}, SEO ${p.seo}, LCP ${p.lcp ?? "?"}, CLS ${p.cls ?? "?"}`,
      )
      .join("\n");
    lines.push("Lighthouse (PageSpeed Insights):\n" + perf);
  }
  return lines.join("\n\n");
}

function summarizeContent(pages: PageText[]): string {
  if (pages.length === 0) return "No page content was captured.";
  return pages
    .map(
      (p) =>
        `URL: ${p.url}\nTitle: ${p.title || "(none)"}\nHas form: ${p.hasForm ? "yes" : "no"}\nContent: ${p.text}`,
    )
    .join("\n\n---\n\n");
}

const SYSTEM_PROMPT = `You are a senior web QA engineer at Nortiq Labs verifying that a delivered client website satisfies the client's stated requirements before handover.

You are given (1) the client's requirements, (2) automated audit results for the live site (SEO, security headers, links, accessibility, Lighthouse), and (3) extracted text/structure from the live pages.

For EACH requirement, decide whether the live website satisfies it. Be strict and evidence-based: only mark "met" when the audit or page content clearly supports it. Never invent facts about the client or business.

Status values:
- "met": clearly satisfied by concrete evidence.
- "unmet": clearly not satisfied (the evidence contradicts it or the expected element/content is absent).
- "partial": partially satisfied or satisfied with caveats.
- "unverifiable": cannot be determined from the live site/audit (e.g. backend behaviour, subjective brand feel, off-site items, requires manual/visual review).

Respond with ONLY a JSON object, no prose, in this exact shape:
{
  "summary": "1-2 sentence overall readiness summary",
  "assessments": [
    { "itemId": "<id>", "status": "met|unmet|partial|unverifiable", "confidence": "high|medium|low", "rationale": "why, referencing evidence", "evidence": "the specific signal you used" }
  ]
}
Include exactly one assessment object per requirement, preserving the given itemId.`;

function buildUserPrompt(
  requirements: ChecklistItem[],
  runSummary: string,
  contentSummary: string,
): string {
  const reqList = requirements
    .map((r) => `- itemId=${r.id} | section="${r.section ?? "General"}" | requirement: ${r.text}`)
    .join("\n");
  return `# Client requirements (${requirements.length})\n${reqList}\n\n# Automated audit results\n${runSummary}\n\n# Live page content\n${contentSummary}`;
}

function extractJson(text: string): unknown {
  // Strip markdown fences if present, then grab the outermost JSON object.
  const cleaned = text.replace(/```json\s*|\s*```/g, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Model response did not contain JSON.");
  }
  return JSON.parse(cleaned.slice(start, end + 1));
}

function coerceAssessment(
  raw: unknown,
  validIds: Set<string>,
): RequirementAssessment | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const itemId = typeof o.itemId === "string" ? o.itemId : "";
  if (!validIds.has(itemId)) return null;
  const status = VALID_STATUS.includes(o.status as RequirementStatus)
    ? (o.status as RequirementStatus)
    : "unverifiable";
  const confidence = (VALID_CONFIDENCE as readonly string[]).includes(
    o.confidence as string,
  )
    ? (o.confidence as RequirementAssessment["confidence"])
    : "low";
  return {
    itemId,
    status,
    confidence,
    rationale:
      typeof o.rationale === "string" ? o.rationale.slice(0, 600) : "No rationale provided.",
    evidence: typeof o.evidence === "string" ? o.evidence.slice(0, 600) : undefined,
  };
}

/**
 * Ask Claude to judge each client requirement against the audit + live content.
 */
export async function analyzeRequirements(
  checklist: ChecklistItem[],
  run: VerificationRun | undefined,
  pages: PageText[],
): Promise<AiAnalysis> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new AiConfigError(
      "ANTHROPIC_API_KEY is not set. Add it to .env.local to enable AI analysis.",
    );
  }
  const requirements = checklist.slice(0, MAX_REQUIREMENTS);
  if (requirements.length === 0) {
    throw new AiConfigError("There are no requirements to analyze.");
  }

  const model = process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;
  const client = new Anthropic({ apiKey });

  const userPrompt = buildUserPrompt(
    requirements,
    summarizeRun(run),
    summarizeContent(pages),
  );

  // Each requirement yields one JSON assessment (~300 tokens with rationale +
  // evidence). A fixed 4096 budget truncates the JSON for large checklists,
  // which then fails to parse. Size the budget to the checklist and stream so
  // long generations don't hit the non-streaming request limit.
  const maxTokens = Math.min(2048 + requirements.length * 300, 32000);

  const response = await client.messages
    .stream({
      model,
      max_tokens: maxTokens,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    })
    .finalMessage();

  if (response.stop_reason === "max_tokens") {
    throw new Error(
      "The model response was cut off before completing. Try analyzing fewer requirements at once.",
    );
  }

  const textPart = response.content.find((p) => p.type === "text");
  const rawText = textPart && "text" in textPart ? textPart.text : "";
  const parsed = extractJson(rawText) as {
    summary?: unknown;
    assessments?: unknown;
  };

  const validIds = new Set(requirements.map((r) => r.id));
  const assessmentsRaw = Array.isArray(parsed.assessments) ? parsed.assessments : [];
  const assessments = assessmentsRaw
    .map((a) => coerceAssessment(a, validIds))
    .filter((a): a is RequirementAssessment => a !== null);

  // Ensure every requirement has an assessment (fill gaps as unverifiable).
  const covered = new Set(assessments.map((a) => a.itemId));
  for (const r of requirements) {
    if (!covered.has(r.id)) {
      assessments.push({
        itemId: r.id,
        status: "unverifiable",
        confidence: "low",
        rationale: "The model did not return a verdict for this requirement.",
      });
    }
  }

  return {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    model,
    summary:
      typeof parsed.summary === "string"
        ? parsed.summary.slice(0, 600)
        : "Analysis complete.",
    assessments,
  };
}
