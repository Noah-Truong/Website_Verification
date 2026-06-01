"use client";

import { useMemo, useState } from "react";
import type {
  AiAnalysis,
  ChecklistItem,
  RequirementAssessment,
  RequirementStatus,
} from "@/lib/types";

const STATUS_META: Record<
  RequirementStatus,
  { color: string; label: string }
> = {
  met: { color: "var(--color-pass)", label: "MET" },
  unmet: { color: "var(--color-fail)", label: "UNMET" },
  partial: { color: "var(--color-warn)", label: "PARTIAL" },
  unverifiable: { color: "var(--color-info)", label: "REVIEW" },
};

export function ChecklistPanel({
  projectId,
  initialItems,
  initialAnalysis,
  hasRun,
}: {
  projectId: string;
  initialItems: ChecklistItem[];
  initialAnalysis: AiAnalysis | null;
  hasRun: boolean;
}) {
  const [items, setItems] = useState<ChecklistItem[]>(initialItems);
  const [analysis, setAnalysis] = useState<AiAnalysis | null>(initialAnalysis);
  const [filter, setFilter] = useState<"all" | "open" | "done">("all");
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkedCount = items.filter((i) => i.checked).length;
  const progress = items.length ? Math.round((checkedCount / items.length) * 100) : 0;

  const assessmentMap = useMemo(() => {
    const map = new Map<string, RequirementAssessment>();
    analysis?.assessments.forEach((a) => map.set(a.itemId, a));
    return map;
  }, [analysis]);

  const grouped = useMemo(() => {
    const visible = items.filter((i) =>
      filter === "all" ? true : filter === "done" ? i.checked : !i.checked,
    );
    const map = new Map<string, ChecklistItem[]>();
    for (const item of visible) {
      const key = item.section ?? "General requirements";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    return [...map.entries()];
  }, [items, filter]);

  async function patch(itemId: string, checked: boolean) {
    try {
      await fetch(`/api/projects/${projectId}/checklist`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ itemId, checked }),
      });
    } catch {
      /* best-effort; UI state already updated */
    }
  }

  async function toggle(item: ChecklistItem) {
    const next = !item.checked;
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, checked: next } : i)),
    );
    await patch(item.id, next);
  }

  async function runAnalysis() {
    setError(null);
    setAnalyzing(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/analyze`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Analysis failed.");
      } else {
        setAnalysis(data.analysis as AiAnalysis);
      }
    } catch {
      setError("Network error during analysis.");
    } finally {
      setAnalyzing(false);
    }
  }

  async function applyMet() {
    const metUnchecked = items.filter(
      (i) => !i.checked && assessmentMap.get(i.id)?.status === "met",
    );
    if (metUnchecked.length === 0) return;
    setItems((prev) =>
      prev.map((i) =>
        assessmentMap.get(i.id)?.status === "met" ? { ...i, checked: true } : i,
      ),
    );
    await Promise.all(metUnchecked.map((i) => patch(i.id, true)));
  }

  const metUncheckedCount = items.filter(
    (i) => !i.checked && assessmentMap.get(i.id)?.status === "met",
  ).length;

  if (items.length === 0) {
    return (
      <div className="panel p-6 text-center">
        <p className="text-sm text-muted">
          No requirements were extracted. Upload a client document with bullet
          points, checkboxes, or requirement statements to generate a checklist.
        </p>
      </div>
    );
  }

  return (
    <div className="panel ticked p-5">
      <div className="flex items-center justify-between gap-4 mb-4">
        <div>
          <p className="label-eyebrow">Client requirements</p>
          <p className="mono text-sm mt-1">
            <span className="text-signal">{checkedCount}</span>
            <span className="text-faint"> / {items.length} verified</span>
          </p>
        </div>
        <div className="flex border border-line mono text-xs">
          {(["all", "open", "done"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2.5 py-1.5 transition ${
                filter === f ? "bg-signal text-ink" : "text-muted hover:text-fg"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="h-1 bg-line mb-4 overflow-hidden">
        <div
          className="h-full bg-signal transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* AI analysis controls */}
      <div className="border border-line-soft bg-surface/40 p-3 mb-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="label-eyebrow">AI requirement analysis</span>
          </div>
          <button
            onClick={runAnalysis}
            disabled={analyzing}
            className="mono text-xs bg-info/15 text-info border border-info/40 px-2.5 py-1.5 hover:bg-info/25 transition disabled:opacity-50"
          >
            {analyzing ? "Analyzing…" : analysis ? "Re-analyze" : "Analyze with AI"}
          </button>
        </div>
        {!hasRun && !analysis && (
          <p className="text-xs text-faint mt-2">
            Tip: run a verification first so the AI can use the audit results as
            evidence.
          </p>
        )}
        {analysis && (
          <div className="mt-2.5">
            <p className="text-xs text-fg/90 leading-relaxed">{analysis.summary}</p>
            <div className="flex items-center justify-between mt-2">
              <span className="mono text-[0.65rem] text-faint">
                {analysis.model} ·{" "}
                {new Date(analysis.createdAt).toLocaleString()}
              </span>
              {metUncheckedCount > 0 && (
                <button
                  onClick={applyMet}
                  className="mono text-[0.65rem] text-signal hover:underline"
                >
                  ✓ accept {metUncheckedCount} met
                </button>
              )}
            </div>
          </div>
        )}
        {error && <p className="mono text-xs text-fail mt-2">{error}</p>}
      </div>

      <div className="flex flex-col gap-5 max-h-[640px] overflow-y-auto pr-1">
        {grouped.map(([section, sectionItems]) => (
          <div key={section}>
            <p className="mono text-xs text-faint mb-2 sticky top-0 bg-panel py-1">
              {section}
            </p>
            <ul className="flex flex-col gap-1">
              {sectionItems.map((item) => (
                <ChecklistRow
                  key={item.id}
                  item={item}
                  assessment={assessmentMap.get(item.id)}
                  onToggle={() => toggle(item)}
                />
              ))}
            </ul>
          </div>
        ))}
        {grouped.length === 0 && (
          <p className="text-sm text-muted text-center py-4">
            Nothing to show for this filter.
          </p>
        )}
      </div>
    </div>
  );
}

function ChecklistRow({
  item,
  assessment,
  onToggle,
}: {
  item: ChecklistItem;
  assessment?: RequirementAssessment;
  onToggle: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const meta = assessment ? STATUS_META[assessment.status] : null;

  return (
    <li className="py-1">
      <div className="flex items-start gap-3">
        <button onClick={onToggle} className="flex items-start gap-3 text-left group flex-1 min-w-0">
          <span
            className={`mt-0.5 w-4 h-4 shrink-0 border grid place-items-center transition ${
              item.checked
                ? "bg-signal border-signal text-ink"
                : "border-line group-hover:border-signal"
            }`}
          >
            {item.checked && <span className="text-[0.6rem] leading-none">✓</span>}
          </span>
          <span
            className={`text-sm leading-snug transition ${
              item.checked ? "text-faint line-through" : "text-fg/90"
            }`}
          >
            {item.text}
          </span>
        </button>
        {meta && (
          <button
            onClick={() => setExpanded((e) => !e)}
            className="mono text-[0.6rem] font-semibold px-1.5 py-0.5 border shrink-0 mt-0.5"
            style={{
              color: meta.color,
              borderColor: `color-mix(in srgb, ${meta.color} 45%, transparent)`,
            }}
            title="Show AI rationale"
          >
            {meta.label}
          </button>
        )}
      </div>
      {meta && expanded && assessment && (
        <div className="ml-7 mt-1.5 border-l-2 pl-3 py-1" style={{ borderColor: meta.color }}>
          <p className="text-xs text-fg/80 leading-relaxed">{assessment.rationale}</p>
          {assessment.evidence && (
            <p className="text-xs text-faint mt-1">
              <span className="mono">evidence:</span> {assessment.evidence}
            </p>
          )}
          <p className="mono text-[0.6rem] text-faint mt-1">
            confidence: {assessment.confidence}
          </p>
        </div>
      )}
    </li>
  );
}
