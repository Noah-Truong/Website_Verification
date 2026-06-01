import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getProject } from "@/lib/db";
import { VerifyButton } from "@/components/VerifyButton";
import { ChecklistPanel } from "@/components/ChecklistPanel";
import { RunResults } from "@/components/RunResults";
import { DeleteProjectButton } from "@/components/DeleteProjectButton";
import { scoreColor } from "@/components/Visuals";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) notFound();
  const project = await getProject(id, user.id);
  if (!project) notFound();

  const latest = project.runs[0];

  return (
    <div className="rise flex flex-col gap-8">
      <div>
        <Link href="/dashboard" className="mono text-xs text-muted hover:text-signal transition">
          ← Projects
        </Link>

        <div className="mt-4 flex flex-wrap items-start justify-between gap-6">
          <div className="min-w-0">
            <p className="label-eyebrow mb-2">
              {project.clientName || "Verification project"}
            </p>
            <h1 className="text-3xl font-semibold tracking-tight break-words">
              {project.name}
            </h1>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-3 mono text-xs">
              <a
                href={project.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-signal hover:underline"
              >
                ↗ {hostOf(project.websiteUrl)}
              </a>
              {project.repoUrl && (
                <a
                  href={project.repoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted hover:text-fg"
                >
                  ⎇ repository
                </a>
              )}
              {project.document && (
                <span className="text-muted">▤ {project.document.fileName}</span>
              )}
            </div>
          </div>
          <VerifyButton projectId={project.id} />
        </div>
      </div>

      <div className="grid lg:grid-cols-[1.6fr_1fr] gap-8 items-start">
        {/* Audit results */}
        <section className="flex flex-col gap-4 min-w-0">
          <div className="flex items-center justify-between">
            <h2 className="label-eyebrow">Automated audit · Phase 6/7</h2>
            {project.runs.length > 1 && (
              <span className="mono text-xs text-faint">
                {project.runs.length} runs recorded
              </span>
            )}
          </div>
          {latest ? (
            <RunResults run={latest} />
          ) : (
            <div className="panel ticked p-10 text-center">
              <p className="text-sm text-muted max-w-sm mx-auto">
                No audit has run yet. Click{" "}
                <span className="text-signal">Run verification</span> to fetch the
                live site and check it against the manual&apos;s SEO, security,
                link, and performance criteria.
              </p>
            </div>
          )}

          {project.runs.length > 1 && (
            <div className="panel p-4">
              <p className="label-eyebrow mb-3">Run history</p>
              <ul className="flex flex-col gap-1">
                {project.runs.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center justify-between mono text-xs py-1.5 border-b border-line-soft last:border-0"
                  >
                    <span className="text-muted">
                      {new Date(r.createdAt).toLocaleString()}
                    </span>
                    {r.status === "complete" ? (
                      <span className="flex items-center gap-3">
                        <span style={{ color: "var(--color-pass)" }}>{r.summary.pass}✓</span>
                        <span style={{ color: "var(--color-warn)" }}>{r.summary.warn}!</span>
                        <span style={{ color: "var(--color-fail)" }}>{r.summary.fail}✕</span>
                        <span
                          className="font-semibold w-8 text-right"
                          style={{ color: scoreColor(r.score) }}
                        >
                          {r.score}
                        </span>
                      </span>
                    ) : (
                      <span className="text-fail">error</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* Checklist sidebar */}
        <aside className="flex flex-col gap-4">
          <ChecklistPanel
            projectId={project.id}
            initialItems={project.checklist}
            initialAnalysis={project.aiAnalysis}
            hasRun={project.runs.length > 0}
          />

          {project.document && (
            <div className="panel p-4">
              <p className="label-eyebrow mb-2">Source document</p>
              <p className="mono text-xs text-muted">
                {project.document.fileName}
              </p>
              <p className="mono text-xs text-faint mt-1">
                {project.document.charCount.toLocaleString()} characters parsed ·{" "}
                {project.checklist.length} requirements extracted
              </p>
            </div>
          )}

          <div className="flex justify-end">
            <DeleteProjectButton projectId={project.id} />
          </div>
        </aside>
      </div>
    </div>
  );
}

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}
