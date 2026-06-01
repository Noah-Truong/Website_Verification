import "server-only";
import { randomUUID } from "crypto";
import type { CheckResult, CheckStatus } from "../types";
import { fetchPage, fetchStatus, type FetchedPage } from "./utils";

function check(
  category: string,
  label: string,
  status: CheckStatus,
  detail: string,
  reference?: string,
): CheckResult {
  return { id: randomUUID(), category, label, status, detail, reference };
}

const SECURITY_HEADERS: { key: string; label: string }[] = [
  { key: "strict-transport-security", label: "Strict-Transport-Security" },
  { key: "x-content-type-options", label: "X-Content-Type-Options" },
  { key: "referrer-policy", label: "Referrer-Policy" },
  { key: "permissions-policy", label: "Permissions-Policy" },
  { key: "x-frame-options", label: "X-Frame-Options" },
];

/** Security header audit per manual Sec.6.1.3 / 6.5 (Nortiq Issue 29). */
export function analyzeSecurityHeaders(homepage: FetchedPage): CheckResult[] {
  const checks: CheckResult[] = [];
  const headers = homepage.headers;

  checks.push(
    check(
      "Security",
      "HTTPS",
      homepage.finalUrl.startsWith("https://") ? "pass" : "fail",
      homepage.finalUrl.startsWith("https://")
        ? "Served over HTTPS."
        : "Site is not served over HTTPS.",
      "6.5",
    ),
  );

  for (const { key, label } of SECURITY_HEADERS) {
    const value = headers?.get(key);
    checks.push(
      check(
        "Security",
        label,
        value ? "pass" : "fail",
        value ? value : `Header "${label}" is not set.`,
        "6.1.3",
      ),
    );
  }
  return checks;
}

/** robots.txt, sitemap.xml and 404 behaviour (manual Sec.6.1.1 / 6.1.2 / 7.2 B). */
export async function analyzeSiteFiles(
  origin: string,
): Promise<{ checks: CheckResult[]; sitemapUrls: string[] }> {
  const checks: CheckResult[] = [];
  const base = new URL(origin);

  // robots.txt
  const robots = await fetchPage(`${base.origin}/robots.txt`);
  if (robots.ok && robots.body) {
    const hasSitemap = /sitemap\s*:/i.test(robots.body);
    checks.push(
      check(
        "SEO",
        "robots.txt",
        hasSitemap ? "pass" : "warn",
        hasSitemap
          ? "Returns 200 and declares a Sitemap line."
          : "Returns 200 but has no Sitemap: line.",
        "6.1.1",
      ),
    );
  } else {
    checks.push(
      check(
        "SEO",
        "robots.txt",
        "fail",
        `robots.txt did not return 200 (status ${robots.status ?? "error"}).`,
        "6.1.1",
      ),
    );
  }

  // sitemap.xml
  const sitemap = await fetchPage(`${base.origin}/sitemap.xml`);
  const sitemapUrls: string[] = [];
  if (sitemap.ok && sitemap.body) {
    const matches = sitemap.body.match(/<loc>\s*([^<]+?)\s*<\/loc>/gi) ?? [];
    for (const m of matches) {
      const url = m.replace(/<\/?loc>/gi, "").trim();
      if (url) sitemapUrls.push(url);
    }
    checks.push(
      check(
        "SEO",
        "sitemap.xml",
        sitemapUrls.length > 0 ? "pass" : "warn",
        sitemapUrls.length > 0
          ? `Returns 200 with ${sitemapUrls.length} URL(s).`
          : "Returns 200 but no <loc> entries were found.",
        "6.1.2",
      ),
    );
  } else {
    checks.push(
      check(
        "SEO",
        "sitemap.xml",
        "fail",
        `sitemap.xml did not return 200 (status ${sitemap.status ?? "error"}).`,
        "6.1.2",
      ),
    );
  }

  // 404 handling
  const notFoundStatus = await fetchStatus(
    `${base.origin}/__nortiq_does_not_exist_${Date.now()}`,
  );
  checks.push(
    check(
      "SEO",
      "404 handling",
      notFoundStatus === 404
        ? "pass"
        : notFoundStatus && notFoundStatus >= 400
          ? "warn"
          : "fail",
      notFoundStatus === 404
        ? "Unknown paths correctly return 404."
        : `Unknown path returned status ${notFoundStatus ?? "error"} (expected 404).`,
      "7.2",
    ),
  );

  return { checks, sitemapUrls };
}
