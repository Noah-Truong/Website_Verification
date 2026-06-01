import Link from "next/link";
import { NewProjectForm } from "@/components/NewProjectForm";

export default function NewProjectPage() {
  return (
    <div className="rise max-w-2xl mx-auto">
      <Link href="/dashboard" className="mono text-xs text-muted hover:text-signal transition">
        ← Back to projects
      </Link>
      <div className="mt-4 mb-8">
        <p className="label-eyebrow mb-2">New verification project</p>
        <h1 className="text-3xl font-semibold tracking-tight">Set up a project</h1>
        <p className="text-muted mt-2 text-sm leading-relaxed">
          Provide the live site, the repository, and the client&apos;s requirements
          document. The document is parsed into a verification checklist, and the
          live site is audited against the Phase 6/7 manual checks.
        </p>
      </div>
      <NewProjectForm />
    </div>
  );
}
