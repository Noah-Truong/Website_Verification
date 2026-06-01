import "server-only";
import { randomUUID } from "crypto";
import type { CheckResult, PageReport, VerificationRun } from "../types";
import { fetchPage, normalizeUrl } from "./utils";
import { analyzePage, analyzeUrl, discoverInternalLinks } from "./seo";
import { analyzeSecurityHeaders, analyzeSiteFiles } from "./site";
import { measurePerformance } from "./performance";

const MAX_PAGES = 8;
const MAX_PERF_PAGES = 3;

function summarize(checks: CheckResult[]) {
  let pass = 0;
  let fail = 0;
  let warn = 0;
  for (const c of checks) {
    if (c.status === "pass") pass++;
    else if (c.status === "fail") fail++;
    else if (c.status === "warn") warn++;
  }
  return { pass, fail, warn, total: pass + fail + warn };
}

/**
 * Run the full automated verification suite against a live website, modelled on
 * the manual's Phase 6/7 checklists.
 */
export async function runVerification(
  projectId: string,
  websiteUrl: string,
): Promise<VerificationRun> {
  const id = randomUUID();
  const createdAt = new Date().toISOString();
  const origin = normalizeUrl(websiteUrl);

  try {
    // 1. Homepage
    const homepage = await fetchPage(origin);
    if (!homepage.ok) {
      return {
        id,
        projectId,
        createdAt,
        finishedAt: new Date().toISOString(),
        status: "error",
        score: 0,
        summary: { pass: 0, fail: 0, warn: 0, total: 0 },
        siteChecks: [],
        pages: [],
        performance: [],
        error:
          homepage.error ??
          `Homepage ${origin} returned status ${homepage.status ?? "unknown"}.`,
      };
    }

    // 2. Site-wide checks (security headers + robots/sitemap/404)
    const securityChecks = analyzeSecurityHeaders(homepage);
    const { checks: fileChecks, sitemapUrls } = await analyzeSiteFiles(origin);
    const siteChecks = [...securityChecks, ...fileChecks];

    // 3. Determine pages to audit (sitemap first, then discovered links)
    const discovered = discoverInternalLinks(homepage, origin, MAX_PAGES);
    const candidateSet = new Set<string>([origin]);
    for (const u of sitemapUrls) candidateSet.add(u.replace(/\/$/, ""));
    for (const u of discovered) candidateSet.add(u);
    const pageUrls = [...candidateSet].slice(0, MAX_PAGES);

    // 4. Per-page SEO/accessibility analysis
    const pages: PageReport[] = [];
    for (const url of pageUrls) {
      if (url === origin) {
        pages.push(analyzePage(homepage));
      } else {
        pages.push(await analyzeUrl(url));
      }
    }

    // 5. Performance via PageSpeed Insights (subset of pages, best-effort)
    const perfTargets = pageUrls.slice(0, MAX_PERF_PAGES);
    const performance = await Promise.all(
      perfTargets.map((url) => measurePerformance(url)),
    );

    // 6. Score: weighted across all automated boolean checks
    const allChecks = [...siteChecks, ...pages.flatMap((p) => p.checks)];
    const summary = summarize(allChecks);
    const scoreableTotal = summary.pass + summary.fail + summary.warn;
    const rawScore =
      scoreableTotal === 0
        ? 0
        : ((summary.pass + summary.warn * 0.5) / scoreableTotal) * 100;
    const score = Math.round(rawScore);

    return {
      id,
      projectId,
      createdAt,
      finishedAt: new Date().toISOString(),
      status: "complete",
      score,
      summary,
      siteChecks,
      pages,
      performance,
    };
  } catch (err) {
    return {
      id,
      projectId,
      createdAt,
      finishedAt: new Date().toISOString(),
      status: "error",
      score: 0,
      summary: { pass: 0, fail: 0, warn: 0, total: 0 },
      siteChecks: [],
      pages: [],
      performance: [],
      error: err instanceof Error ? err.message : "Verification failed.",
    };
  }
}
