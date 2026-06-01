import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { getProject, mutate } from "@/lib/db";
import { analyzeRequirements, AiConfigError } from "@/lib/ai/analyze";
import { fetchSiteContent } from "@/lib/verify/content";
import { normalizeUrl } from "@/lib/verify/utils";

export const maxDuration = 120;

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const project = await getProject(id, userId);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (project.checklist.length === 0) {
    return NextResponse.json(
      { error: "No requirements were extracted from the document to analyze." },
      { status: 400 },
    );
  }

  const latestRun = project.runs[0];

  // Build the list of pages to read for content context: prefer audited pages,
  // otherwise just the homepage.
  const pageUrls =
    latestRun && latestRun.pages.length > 0
      ? latestRun.pages.map((p) => p.url)
      : [normalizeUrl(project.websiteUrl)];

  try {
    const pages = await fetchSiteContent(pageUrls);
    const analysis = await analyzeRequirements(project.checklist, latestRun, pages);

    await mutate((db) => {
      const target = db.projects.find((p) => p.id === id && p.ownerId === userId);
      if (!target) return;
      target.aiAnalysis = analysis;
      target.updatedAt = new Date().toISOString();
    });

    return NextResponse.json({ analysis });
  } catch (err) {
    if (err instanceof AiConfigError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? `AI analysis failed: ${err.message}`
            : "AI analysis failed.",
      },
      { status: 502 },
    );
  }
}
