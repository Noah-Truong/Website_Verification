import type { CheckStatus } from "@/lib/types";

export function scoreColor(score: number): string {
  if (score >= 90) return "var(--color-pass)";
  if (score >= 70) return "var(--color-warn)";
  return "var(--color-fail)";
}

export function ScoreRing({
  score,
  size = 72,
  label,
}: {
  score: number;
  size?: number;
  label?: string;
}) {
  const stroke = 5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  const color = scoreColor(score);
  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      aria-label={`Score ${score} out of 100`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--color-line)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.22,1,0.36,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="mono font-semibold leading-none" style={{ color, fontSize: size / 3.2 }}>
          {score}
        </span>
        {label && <span className="label-eyebrow mt-0.5 text-[0.55rem]">{label}</span>}
      </div>
    </div>
  );
}

const STATUS_META: Record<CheckStatus, { color: string; glyph: string; text: string }> = {
  pass: { color: "var(--color-pass)", glyph: "✓", text: "PASS" },
  fail: { color: "var(--color-fail)", glyph: "✕", text: "FAIL" },
  warn: { color: "var(--color-warn)", glyph: "!", text: "WARN" },
  skip: { color: "var(--color-skip)", glyph: "–", text: "SKIP" },
  info: { color: "var(--color-info)", glyph: "i", text: "INFO" },
};

export function StatusBadge({ status }: { status: CheckStatus }) {
  const meta = STATUS_META[status];
  return (
    <span
      className="mono inline-flex items-center gap-1.5 text-[0.65rem] font-semibold px-1.5 py-0.5 border"
      style={{ color: meta.color, borderColor: `color-mix(in srgb, ${meta.color} 45%, transparent)` }}
    >
      <span aria-hidden>{meta.glyph}</span>
      {meta.text}
    </span>
  );
}

export function StatusDot({ status, count }: { status: CheckStatus; count: number }) {
  const meta = STATUS_META[status];
  return (
    <span className="inline-flex items-center gap-1.5 mono text-xs">
      <span
        className="w-2 h-2 rounded-full"
        style={{ background: meta.color }}
        aria-hidden
      />
      <span style={{ color: meta.color }}>{count}</span>
    </span>
  );
}
