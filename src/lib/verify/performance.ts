import "server-only";
import type { PerformanceScore } from "../types";

const PSI_ENDPOINT =
  "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

function pct(value: number | undefined | null): number | null {
  if (value === undefined || value === null) return null;
  return Math.round(value * 100);
}

/**
 * Run a real Lighthouse audit through Google's PageSpeed Insights API
 * (manual Phase 7 Sec.7.4). Best-effort: returns an error field on failure so
 * a run still completes without performance data.
 */
export async function measurePerformance(url: string): Promise<PerformanceScore> {
  const params = new URLSearchParams({ url, strategy: "mobile" });
  for (const cat of ["performance", "accessibility", "best-practices", "seo"]) {
    params.append("category", cat);
  }
  if (process.env.PAGESPEED_API_KEY) {
    params.set("key", process.env.PAGESPEED_API_KEY);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60000);
  try {
    const res = await fetch(`${PSI_ENDPOINT}?${params.toString()}`, {
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) {
      return {
        url,
        performance: null,
        accessibility: null,
        bestPractices: null,
        seo: null,
        error: `PageSpeed API returned ${res.status}.`,
      };
    }
    const data = await res.json();
    const cats = data?.lighthouseResult?.categories ?? {};
    const audits = data?.lighthouseResult?.audits ?? {};
    return {
      url,
      performance: pct(cats.performance?.score),
      accessibility: pct(cats.accessibility?.score),
      bestPractices: pct(cats["best-practices"]?.score),
      seo: pct(cats.seo?.score),
      lcp: audits["largest-contentful-paint"]?.displayValue,
      cls: audits["cumulative-layout-shift"]?.displayValue,
    };
  } catch (err) {
    return {
      url,
      performance: null,
      accessibility: null,
      bestPractices: null,
      seo: null,
      error:
        err instanceof Error
          ? `PageSpeed audit failed: ${err.message}`
          : "PageSpeed audit failed.",
    };
  } finally {
    clearTimeout(timer);
  }
}
