"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeleteProjectButton({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  async function remove() {
    setLoading(true);
    await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
    router.push("/dashboard");
    router.refresh();
  }

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="mono text-xs text-faint hover:text-fail transition"
      >
        Delete project
      </button>
    );
  }

  return (
    <span className="flex items-center gap-2 mono text-xs">
      <span className="text-muted">Sure?</span>
      <button
        onClick={remove}
        disabled={loading}
        className="text-fail hover:underline disabled:opacity-50"
      >
        {loading ? "deleting…" : "yes, delete"}
      </button>
      <button onClick={() => setConfirming(false)} className="text-muted hover:text-fg">
        cancel
      </button>
    </span>
  );
}
