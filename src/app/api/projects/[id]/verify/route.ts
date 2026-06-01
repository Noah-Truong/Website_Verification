import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { getProject, mutate } from "@/lib/db";
import { runVerification } from "@/lib/verify/runner";

const MAX_STORED_RUNS = 10;

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const project = await getProject(id, userId);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const run = await runVerification(project.id, project.websiteUrl);

  await mutate((db) => {
    const target = db.projects.find((p) => p.id === id && p.ownerId === userId);
    if (!target) return;
    target.runs.unshift(run);
    target.runs = target.runs.slice(0, MAX_STORED_RUNS);
    target.updatedAt = new Date().toISOString();
  });

  return NextResponse.json({ run });
}
