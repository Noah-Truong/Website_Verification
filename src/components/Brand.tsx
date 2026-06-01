export function Brand({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const dim = size === "lg" ? 40 : size === "sm" ? 24 : 30;
  const text =
    size === "lg" ? "text-2xl" : size === "sm" ? "text-base" : "text-lg";
  return (
    <div className="flex items-center gap-3">
      <svg
        width={dim}
        height={dim}
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden
        className="shrink-0"
      >
        <rect
          x="1.5"
          y="1.5"
          width="29"
          height="29"
          rx="3"
          stroke="var(--color-signal)"
          strokeWidth="1.5"
        />
        <path
          d="M9 20.5L14 25.5L24 11"
          stroke="var(--color-signal)"
          strokeWidth="2.5"
          strokeLinecap="square"
        />
        <path d="M7 7H12" stroke="var(--color-muted)" strokeWidth="1.5" />
      </svg>
      <div className={`${text} font-semibold tracking-tight leading-none`}>
        Nortiq<span className="text-signal">Verify</span>
      </div>
    </div>
  );
}
