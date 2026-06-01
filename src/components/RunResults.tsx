import type { CheckResult, PerformanceScore, VerificationRun } from "@/lib/types";
import { ScoreRing, StatusBadge, scoreColor } from "./Visuals";

function CheckRow({ check }: { check: CheckResult }) {
  return (
    <li className="flex items-start gap-3 py-2.5 border-b border-line-soft last:border-0">
      <div className="shrink-0 mt-0.5">
        <StatusBadge status={check.status} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-sm font-medium">{check.label}</span>
          {check.reference && (
            <span className="mono text-[0.65rem] text-faint">§{check.reference}</span>
          )}
        </div>
        <p className="text-xs text-muted mt-0.5 break-words">{check.detail}</p>
      </div>
    </li>
  );
}

function CheckGroup({ title, checks }: { title: string; checks: CheckResult[] }) {
  if (checks.length === 0) return null;
  return (
    <div className="panel p-4">
      <p className="label-eyebrow mb-1">{title}</p>
      <ul>
        {checks.map((c) => (
          <CheckRow key={c.id} check={c} />
        ))}
      </ul>
    </div>
  );
}

function PerfCell({ value }: { value: number | null }) {
  if (value === null) return <span className="mono text-xs text-faint">—</span>;
  return (
    <span className="mono text-sm font-semibold" style={{ color: scoreColor(value) }}>
      {value}
    </span>
  );
}

function PerformanceTable({ scores }: { scores: PerformanceScore[] }) {
  const usable = scores.filter(
    (s) => s.performance !== null || s.error === undefined,
  );
  if (scores.length === 0) return null;

  return (
    <div className="panel p-4">
      <p className="label-eyebrow mb-3">
        Lighthouse · PageSpeed Insights (mobile) — pass ≥ 90
      </p>
      {usable.every((s) => s.performance === null) && (
        <p className="text-xs text-warn mb-3">
          PageSpeed Insights data unavailable (the API may be rate-limited or the
          site unreachable). SEO and security checks above are unaffected.
        </p>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="mono text-xs text-faint text-left">
              <th className="font-normal py-1.5 pr-3">Page</th>
              <th className="font-normal py-1.5 px-2 text-center">Perf</th>
              <th className="font-normal py-1.5 px-2 text-center">A11y</th>
              <th className="font-normal py-1.5 px-2 text-center">BP</th>
              <th className="font-normal py-1.5 px-2 text-center">SEO</th>
              <th className="font-normal py-1.5 px-2 text-center">LCP</th>
              <th className="font-normal py-1.5 pl-2 text-center">CLS</th>
            </tr>
          </thead>
          <tbody>
            {scores.map((s) => (
              <tr key={s.url} className="border-t border-line-soft">
                <td className="py-2 pr-3 mono text-xs text-muted truncate max-w-[180px]">
                  {pathOf(s.url)}
                </td>
                <td className="py-2 px-2 text-center"><PerfCell value={s.performance} /></td>
                <td className="py-2 px-2 text-center"><PerfCell value={s.accessibility} /></td>
                <td className="py-2 px-2 text-center"><PerfCell value={s.bestPractices} /></td>
                <td className="py-2 px-2 text-center"><PerfCell value={s.seo} /></td>
                <td className="py-2 px-2 text-center mono text-xs text-muted">{s.lcp ?? "—"}</td>
                <td className="py-2 pl-2 text-center mono text-xs text-muted">{s.cls ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function pathOf(url: string): string {
  try {
    const u = new URL(url);
    return u.pathname === "/" ? "/ (home)" : u.pathname;
  } catch {
    return url;
  }
}

export function RunResults({ run }: { run: VerificationRun }) {
  if (run.status === "error") {
    return (
      <div className="panel ticked p-6 border-fail/40">
        <p className="label-eyebrow text-fail mb-2">Verification error</p>
        <p className="text-sm text-fg">{run.error}</p>
        <p className="text-xs text-muted mt-3">
          Confirm the website URL is reachable and publicly accessible (disable
          Vercel preview authentication during verification — manual Sec.7.6).
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Score header */}
      <div className="panel ticked p-5 flex flex-wrap items-center gap-6">
        <ScoreRing score={run.score} size={88} label="Audit" />
        <div className="flex-1 min-w-[200px]">
          <p className="label-eyebrow mb-2">Automated audit score</p>
          <div className="flex gap-5">
            <SummaryStat label="Passed" value={run.summary.pass} color="var(--color-pass)" />
            <SummaryStat label="Warnings" value={run.summary.warn} color="var(--color-warn)" />
            <SummaryStat label="Failed" value={run.summary.fail} color="var(--color-fail)" />
            <SummaryStat label="Checks" value={run.summary.total} color="var(--color-muted)" />
          </div>
        </div>
        <p className="mono text-xs text-faint">
          {new Date(run.createdAt).toLocaleString()}
        </p>
      </div>

      <PerformanceTable scores={run.performance} />

      <CheckGroup title="Site-wide checks" checks={run.siteChecks} />

      {/* Per-page */}
      {run.pages.map((page, i) => (
        <details key={page.url + i} className="panel" open={i === 0}>
          <summary className="cursor-pointer select-none p-4 flex items-center justify-between gap-3 list-none">
            <span className="mono text-sm truncate">{pathOf(page.url)}</span>
            <span className="flex items-center gap-2 shrink-0">
              {page.ok ? (
                <PageMini checks={page.checks} />
              ) : (
                <span className="mono text-xs text-fail">
                  {page.error ?? "unreachable"}
                </span>
              )}
              <span className="mono text-xs text-faint">▾</span>
            </span>
          </summary>
          {page.ok && (
            <ul className="px-4 pb-3 border-t border-line-soft">
              {page.checks.map((c) => (
                <CheckRow key={c.id} check={c} />
              ))}
            </ul>
          )}
        </details>
      ))}
    </div>
  );
}

function PageMini({ checks }: { checks: CheckResult[] }) {
  const pass = checks.filter((c) => c.status === "pass").length;
  const warn = checks.filter((c) => c.status === "warn").length;
  const fail = checks.filter((c) => c.status === "fail").length;
  return (
    <span className="mono text-xs flex items-center gap-2">
      <span style={{ color: "var(--color-pass)" }}>{pass}✓</span>
      {warn > 0 && <span style={{ color: "var(--color-warn)" }}>{warn}!</span>}
      {fail > 0 && <span style={{ color: "var(--color-fail)" }}>{fail}✕</span>}
    </span>
  );
}

function SummaryStat({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div>
      <div className="mono text-2xl font-semibold leading-none" style={{ color }}>
        {value}
      </div>
      <div className="label-eyebrow mt-1">{label}</div>
    </div>
  );
}
