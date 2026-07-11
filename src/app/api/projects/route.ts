import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getSessionUserId } from "@/lib/auth";
import { getProjectsForUser, createProject } from "@/lib/db";
import { MAX_FILE_BYTES, parseUploadedFile } from "@/lib/parse/document";
import { normalizeUrl } from "@/lib/verify/utils";
import type { ChecklistItem, ClientDocument, Project } from "@/lib/types";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const projects = await getProjectsForUser(userId);
  return NextResponse.json({ projects });
}

export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form data." }, { status: 400 });
  }

  const name = String(form.get("name") ?? "").trim();
  const clientName = String(form.get("clientName") ?? "").trim();
  const websiteUrlRaw = String(form.get("websiteUrl") ?? "").trim();
  const repoUrl = String(form.get("repoUrl") ?? "").trim();
  const file = form.get("document");

  if (!name) {
    return NextResponse.json({ error: "Project name is required." }, { status: 400 });
  }
  if (!websiteUrlRaw) {
    return NextResponse.json({ error: "Website URL is required." }, { status: 400 });
  }

  let websiteUrl: string;
  try {
    websiteUrl = normalizeUrl(websiteUrlRaw);
    new URL(websiteUrl);
  } catch {
    return NextResponse.json({ error: "Website URL is invalid." }, { status: 400 });
  }

  const documents: ClientDocument[] = [];
  let checklist: ChecklistItem[] = [];

  if (file && file instanceof File && file.size > 0) {
    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json(
        { error: "Document exceeds the 20MB limit." },
        { status: 400 },
      );
    }
    try {
      const parsed = await parseUploadedFile(file);
      documents.push(parsed.document);
      checklist = parsed.items;
    } catch {
      return NextResponse.json(
        { error: "Could not read the uploaded document. Try PDF, DOCX, TXT, or MD." },
        { status: 400 },
      );
    }
  }

  const now = new Date().toISOString();
  const project: Project = {
    id: randomUUID(),
    ownerId: userId,
    name,
    clientName,
    websiteUrl,
    repoUrl,
    documents,
    checklist,
    aiAnalysis: null,
    createdAt: now,
    updatedAt: now,
    runs: [],
  };

  await createProject(project);

  return NextResponse.json({ project });
}
