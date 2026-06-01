import "server-only";
import mammoth from "mammoth";
import { randomUUID } from "crypto";
import type { ChecklistItem } from "../types";

export interface ParsedDocument {
  text: string;
  items: Omit<ChecklistItem, "checked" | "note">[];
}

async function extractPdf(buffer: Buffer): Promise<string> {
  // Import the implementation directly to avoid pdf-parse's index debug code.
  const mod = await import("pdf-parse/lib/pdf-parse.js");
  const pdfParse = (mod.default ?? mod) as (b: Buffer) => Promise<{ text: string }>;
  const data = await pdfParse(buffer);
  return data.text ?? "";
}

async function extractDocx(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value ?? "";
}

function extractPlain(buffer: Buffer): string {
  return buffer.toString("utf8");
}

export async function extractText(
  buffer: Buffer,
  fileName: string,
  mimeType: string,
): Promise<string> {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".pdf") || mimeType === "application/pdf") {
    return extractPdf(buffer);
  }
  if (
    lower.endsWith(".docx") ||
    mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return extractDocx(buffer);
  }
  // txt, md, csv, and anything else we treat as UTF-8 text.
  return extractPlain(buffer);
}

const HEADING_RE =
  /^(#{1,6}\s+.+|(?:Phase|Section|Step|Part|Chapter)\s+[\w.\d]+.*|\d+(?:\.\d+)*\s+[A-Z].{2,70})$/;
const CHECKBOX_RE = /^[-*•]\s*\[[ xX]?\]\s*(.+)$/;
const BULLET_RE = /^[-*•‣◦]\s+(.+)$/;
const NUMBERED_RE = /^\d+[.)]\s+(.+)$/;
const REQUIREMENT_RE =
  /\b(must|must not|should|shall|required|require[ds]?|need to|needs to|ensure|verify|confirm|make sure|do not|don't|prohibited)\b/i;

function cleanHeading(line: string): string {
  return line.replace(/^#{1,6}\s+/, "").replace(/[:：]\s*$/, "").trim();
}

function normalize(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .replace(/[*_`]+/g, "")
    .trim();
}

/**
 * Heuristically pull "checklist-like" requirements out of an arbitrary client
 * document so a developer can verify them one by one. Recognizes markdown
 * checkboxes, bullets, numbered lists, and imperative requirement sentences.
 */
export function extractChecklist(
  text: string,
): Omit<ChecklistItem, "checked" | "note">[] {
  const lines = text.split(/\r?\n/);
  const items: Omit<ChecklistItem, "checked" | "note">[] = [];
  const seen = new Set<string>();
  let currentSection: string | undefined;

  const push = (raw: string) => {
    const value = normalize(raw);
    if (value.length < 6 || value.length > 280) return;
    const key = value.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    items.push({ id: randomUUID(), section: currentSection, text: value });
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const checkbox = line.match(CHECKBOX_RE);
    if (checkbox) {
      push(checkbox[1]);
      continue;
    }

    if (HEADING_RE.test(line) && line.length <= 90 && !BULLET_RE.test(line)) {
      currentSection = cleanHeading(line);
      continue;
    }

    const bullet = line.match(BULLET_RE);
    if (bullet) {
      push(bullet[1]);
      continue;
    }

    const numbered = line.match(NUMBERED_RE);
    if (numbered) {
      push(numbered[1]);
      continue;
    }

    if (REQUIREMENT_RE.test(line) && line.length <= 220) {
      push(line);
    }
  }

  return items;
}

export async function parseDocument(
  buffer: Buffer,
  fileName: string,
  mimeType: string,
): Promise<ParsedDocument> {
  const text = await extractText(buffer, fileName, mimeType);
  const items = extractChecklist(text);
  return { text, items };
}
