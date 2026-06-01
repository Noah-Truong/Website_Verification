import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getProjectsForUser } from "@/lib/db";
import { ScoreRing, StatusDot } from "@/components/Visuals";
import type { Project } from "@/lib/types";

function relativeDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const projects = user ? await getProjectsForUser(user.id) : [];

  return (
    <div className="rise">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <p className="label-eyebrow mb-2">Verification workspace</p>
          <h1 className="text-3xl font-semibold tracking-tight">Projects</h1>
          <p className="text-muted mt-1 text-sm">
            {projects.length} project{projects.length === 1 ? "" : "s"} tracked
            against the delivery checklist.
          </p>
        </div>
        <Link
          href="/projects/new"
          className="bg-signal text-ink font-semibold px-5 py-3 text-sm hover:brightness-110 transition"
        >
          + New verification
        </Link>
      </div>

      {projects.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function ProjectCard({ project }: { project: Project }) {
  const latest = project.runs[0];
  const checkedCount = project.checklist.filter((c) => c.checked).length;
  const host = (() => {
    try {
      return new URL(project.websiteUrl).host;
    } catch {
      return project.websiteUrl;
    }
  })();

  return (
    <Link
      href={`/projects/${project.id}`}
      className="panel ticked p-5 flex flex-col gap-4 hover:border-signal/50 transition group"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="font-semibold truncate group-hover:text-signal transition">
            {project.name}
          </h2>
          {project.clientName && (
            <p className="text-sm text-muted truncate">{project.clientName}</p>
          )}
          <p className="mono text-xs text-faint truncate mt-1">{host}</p>
        </div>
        {latest && latest.status === "complete" ? (
          <ScoreRing score={latest.score} size={58} />
        ) : (
          <span className="mono text-xs text-faint border border-line px-2 py-1 shrink-0">
            {latest?.status === "error" ? "ERROR" : "NOT RUN"}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-line-soft pt-3">
        <div className="flex items-center gap-3">
          {latest && latest.status === "complete" ? (
            <>
              <StatusDot status="pass" count={latest.summary.pass} />
              <StatusDot status="warn" count={latest.summary.warn} />
              <StatusDot status="fail" count={latest.summary.fail} />
            </>
          ) : (
            <span className="mono text-xs text-faint">No audit yet</span>
          )}
        </div>
        <span className="mono text-xs text-faint">
          {project.checklist.length > 0
            ? `${checkedCount}/${project.checklist.length} reqs`
            : relativeDate(project.createdAt)}
        </span>
      </div>
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="panel ticked p-12 text-center">
      <div className="mx-auto w-12 h-12 grid place-items-center border border-line mb-5">
        <span className="text-signal text-xl mono">+</span>
      </div>
      <h2 className="text-lg font-semibold">No projects yet</h2>
      <p className="text-muted text-sm mt-1 max-w-md mx-auto">
        Create your first verification project. Add the live website URL, the Git
        repository, and the client&apos;s requirements document to generate a
        checklist and run an automated audit.
      </p>
      <Link
        href="/projects/new"
        className="inline-block mt-6 bg-signal text-ink font-semibold px-5 py-3 text-sm hover:brightness-110 transition"
      >
        + New verification
      </Link>
    </div>
  );
}
