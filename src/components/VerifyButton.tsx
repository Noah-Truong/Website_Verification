"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const PHASES = [
  "Fetching homepage…",
  "Auditing security headers…",
  "Checking robots.txt & sitemap.xml…",
  "Analyzing SEO & structured data…",
  "Running Lighthouse (PageSpeed Insights)…",
  "Aggregating results…",
];

export function VerifyButton({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setError(null);
    setLoading(true);
    setPhase(0);
    const interval = setInterval(() => {
      setPhase((p) => Math.min(p + 1, PHASES.length - 1));
    }, 2200);

    try {
      const res = await fetch(`/api/projects/${projectId}/verify`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Verification failed.");
      } else if (data.run?.status === "error") {
        setError(data.run.error ?? "Verification could not reach the site.");
      }
      router.refresh();
    } catch {
      setError("Network error while running verification.");
    } finally {
      clearInterval(interval);
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-stretch gap-2">
      <button
        onClick={run}
        disabled={loading}
        className="bg-signal text-ink font-semibold px-5 py-3 text-sm hover:brightness-110 transition disabled:opacity-70 disabled:cursor-wait whitespace-nowrap"
      >
        {loading ? (
          <span className="inline-flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-ink pulse" />
            Running audit…
          </span>
        ) : (
          "▷ Run verification"
        )}
      </button>
      {loading && (
        <p className="mono text-xs text-signal-dim text-right">{PHASES[phase]}</p>
      )}
      {error && (
        <p className="mono text-xs text-fail text-right max-w-xs">{error}</p>
      )}
    </div>
  );
}
