import { Brand } from "./Brand";

const STEPS = [
  "Client document → checklist",
  "SEO + structured data audit",
  "Security headers & crawlable links",
  "Lighthouse via PageSpeed Insights",
];

export function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen grid lg:grid-cols-[1.1fr_1fr]">
      {/* Brand / context panel */}
      <div className="relative hidden lg:flex flex-col justify-between p-12 border-r border-line overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute left-0 right-0 h-px bg-signal/30 scanline" />
        </div>
        <Brand size="lg" />
        <div className="relative max-w-md">
          <p className="label-eyebrow mb-4">Website Delivery Verification</p>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight">
            Ship every client site at the same{" "}
            <span className="text-signal">quality bar.</span>
          </h1>
          <p className="text-muted mt-4 leading-relaxed">
            The internal console that turns the Nortiq Website Development Manual
            into an automated, repeatable pre-delivery audit.
          </p>
          <ul className="mt-8 flex flex-col gap-3">
            {STEPS.map((s, i) => (
              <li key={s} className="flex items-center gap-3 text-sm">
                <span className="mono text-xs text-signal w-6">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-fg/90">{s}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="mono text-xs text-faint">
          Internal members / co-creators only — Phase 6/7 verification loop
        </p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-10">
            <Brand size="md" />
          </div>
          <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
          <p className="text-muted text-sm mt-1 mb-8">{subtitle}</p>
          {children}
        </div>
      </div>
    </div>
  );
}
