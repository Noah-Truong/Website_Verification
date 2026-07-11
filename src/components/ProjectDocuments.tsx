"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ClientDocument } from "@/lib/types";

const ACCEPT = ".pdf,.docx,.txt,.md,.markdown,.csv,.rtf";

export function ProjectDocuments({
  projectId,
  documents,
  requirementCounts,
}: {
  projectId: string;
  documents: ClientDocument[];
  requirementCounts: Record<string, number>;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setError(null);
    setUploading(true);
    const form = new FormData();
    form.set("document", file);
    try {
      const res = await fetch(`/api/projects/${projectId}/documents`, {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not upload the document.");
      } else {
        router.refresh();
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function remove(documentId: string) {
    setError(null);
    setRemovingId(documentId);
    try {
      const res = await fetch(`/api/projects/${projectId}/documents`, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ documentId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not remove the document.");
      } else {
        router.refresh();
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setRemovingId(null);
      setConfirmId(null);
    }
  }

  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between gap-3 mb-2">
        <p className="label-eyebrow">
          Documents{documents.length > 0 ? ` · ${documents.length}` : ""}
        </p>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="mono text-xs text-signal hover:underline disabled:opacity-50"
        >
          {uploading ? "uploading…" : "+ add document"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) upload(file);
          }}
        />
      </div>

      {documents.length === 0 ? (
        <p className="text-xs text-muted">
          No documents yet. Add a client document to extract requirements into
          the checklist.
        </p>
      ) : (
        <ul className="flex flex-col">
          {documents.map((doc) => (
            <li
              key={doc.id}
              className="py-2 border-b border-line-soft last:border-0"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="mono text-xs text-muted truncate">
                    ▤ {doc.fileName}
                  </p>
                  <p className="mono text-xs text-faint mt-1">
                    {doc.charCount.toLocaleString()} characters ·{" "}
                    {requirementCounts[doc.id] ?? 0} requirements ·{" "}
                    {new Date(doc.uploadedAt).toLocaleDateString()}
                  </p>
                </div>
                {confirmId === doc.id ? (
                  <span className="flex items-center gap-2 mono text-xs shrink-0">
                    <button
                      onClick={() => remove(doc.id)}
                      disabled={removingId === doc.id}
                      className="text-fail hover:underline disabled:opacity-50"
                    >
                      {removingId === doc.id ? "removing…" : "remove"}
                    </button>
                    <button
                      onClick={() => setConfirmId(null)}
                      className="text-muted hover:text-fg"
                    >
                      cancel
                    </button>
                  </span>
                ) : (
                  <button
                    onClick={() => setConfirmId(doc.id)}
                    className="mono text-xs text-faint hover:text-fail transition shrink-0"
                  >
                    ✕
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="mono text-[0.65rem] text-faint mt-2">
        PDF · DOCX · TXT · MD — max 20MB
      </p>
      {error && <p className="mono text-xs text-fail mt-2">{error}</p>}
    </div>
  );
}
