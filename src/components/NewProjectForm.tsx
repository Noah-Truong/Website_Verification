"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

const ACCEPT = ".pdf,.docx,.txt,.md,.markdown,.csv,.rtf";

export function NewProjectForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = new FormData(e.currentTarget);
    if (file) form.set("document", file);
    else form.delete("document");

    try {
      const res = await fetch("/api/projects", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not create project.");
        setLoading(false);
        return;
      }
      router.push(`/projects/${data.project.id}`);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  function handleFiles(files: FileList | null) {
    if (files && files[0]) setFile(files[0]);
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      <section className="panel p-5 flex flex-col gap-4">
        <h2 className="label-eyebrow">01 · Project</h2>
        <Field label="Project name" name="name" placeholder="Acme Corp corporate site" required />
        <Field label="Client name" name="clientName" placeholder="Acme Corporation" />
      </section>

      <section className="panel p-5 flex flex-col gap-4">
        <h2 className="label-eyebrow">02 · Targets</h2>
        <Field
          label="Website URL"
          name="websiteUrl"
          placeholder="https://acme.com"
          required
          hint="The live or Vercel preview URL to audit."
        />
        <Field
          label="Git repository"
          name="repoUrl"
          placeholder="https://github.com/nortiq/acme-site"
          hint="Reference link to the source repository."
        />
      </section>

      <section className="panel p-5 flex flex-col gap-3">
        <h2 className="label-eyebrow">03 · Client requirements document</h2>
        <p className="text-sm text-muted">
          Upload the client&apos;s document. It becomes the verification checklist
          (PDF, DOCX, TXT, MD).
        </p>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            handleFiles(e.dataTransfer.files);
          }}
          onClick={() => inputRef.current?.click()}
          className={`border border-dashed cursor-pointer px-5 py-8 text-center transition ${
            dragging ? "border-signal bg-signal/5" : "border-line hover:border-signal/50"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          {file ? (
            <div className="flex items-center justify-center gap-3">
              <span className="mono text-sm text-signal">{file.name}</span>
              <span className="mono text-xs text-faint">
                {(file.size / 1024).toFixed(0)} KB
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                  if (inputRef.current) inputRef.current.value = "";
                }}
                className="mono text-xs text-fail hover:underline"
              >
                remove
              </button>
            </div>
          ) : (
            <>
              <p className="text-sm text-fg">
                Drop a file here or <span className="text-signal">browse</span>
              </p>
              <p className="mono text-xs text-faint mt-1">
                PDF · DOCX · TXT · MD — max 20MB
              </p>
            </>
          )}
        </div>
      </section>

      {error && (
        <p className="mono text-sm text-fail border border-fail/40 bg-fail/5 px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={loading}
          className="bg-signal text-ink font-semibold px-6 py-3 text-sm hover:brightness-110 transition disabled:opacity-50"
        >
          {loading ? "Creating project…" : "Create project"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className="mono text-xs text-muted hover:text-fg transition px-3 py-3"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  hint,
  ...props
}: { label: string; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="label-eyebrow">{label}</span>
      <input
        {...props}
        className="bg-surface border border-line px-3 py-2.5 text-sm text-fg placeholder:text-faint focus:border-signal transition"
      />
      {hint && <span className="text-xs text-faint">{hint}</span>}
    </label>
  );
}
