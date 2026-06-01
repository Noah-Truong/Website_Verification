import "server-only";
import * as cheerio from "cheerio";
import { randomUUID } from "crypto";
import type { CheckResult, CheckStatus, PageReport } from "../types";
import { fetchPage, type FetchedPage } from "./utils";

function check(
  category: string,
  label: string,
  status: CheckStatus,
  detail: string,
  reference?: string,
): CheckResult {
  return { id: randomUUID(), category, label, status, detail, reference };
}

const OG_REQUIRED = [
  "og:title",
  "og:description",
  "og:image",
  "og:url",
  "og:type",
  "og:site_name",
];

/** SEO + accessibility checks for a single page, derived from manual Sec.6.2 / 7.2. */
export function analyzePage(page: FetchedPage): PageReport {
  if (!page.ok || !page.body) {
    return {
      url: page.url,
      ok: false,
      statusCode: page.status,
      checks: [],
      error:
        page.error ??
        `Page returned status ${page.status ?? "unknown"} and could not be analyzed.`,
    };
  }

  const $ = cheerio.load(page.body);
  const checks: CheckResult[] = [];

  // Title
  const title = $("head title").first().text().trim();
  if (!title) {
    checks.push(check("SEO", "Title tag", "fail", "No <title> tag found.", "6.2"));
  } else if (title.length < 10 || title.length > 65) {
    checks.push(
      check(
        "SEO",
        "Title tag",
        "warn",
        `Title is ${title.length} chars (recommended 10-65): "${title}".`,
        "6.2",
      ),
    );
  } else {
    checks.push(check("SEO", "Title tag", "pass", `"${title}"`, "6.2"));
  }

  // Meta description (manual: 100-160 chars)
  const description = $('meta[name="description"]').attr("content")?.trim() ?? "";
  if (!description) {
    checks.push(
      check("SEO", "Meta description", "fail", "No meta description found.", "6.2"),
    );
  } else if (description.length < 100 || description.length > 160) {
    checks.push(
      check(
        "SEO",
        "Meta description",
        "warn",
        `Description is ${description.length} chars (manual requires 100-160).`,
        "6.2",
      ),
    );
  } else {
    checks.push(
      check("SEO", "Meta description", "pass", `${description.length} chars.`, "6.2"),
    );
  }

  // Canonical self-reference
  const canonical = $('link[rel="canonical"]').attr("href")?.trim() ?? "";
  if (!canonical) {
    checks.push(
      check("SEO", "Canonical URL", "fail", "No canonical link found.", "6.2"),
    );
  } else {
    const sameAsPage = (() => {
      try {
        const a = new URL(canonical);
        const b = new URL(page.finalUrl);
        const stripCb = (u: URL) => {
          u.searchParams.delete("cb");
          return `${u.host}${u.pathname.replace(/\/$/, "")}`;
        };
        return stripCb(a) === stripCb(b);
      } catch {
        return false;
      }
    })();
    checks.push(
      check(
        "SEO",
        "Canonical URL",
        sameAsPage ? "pass" : "warn",
        sameAsPage
          ? `Self-referencing: ${canonical}`
          : `Canonical points elsewhere: ${canonical} (manual requires self-reference).`,
        "6.2",
      ),
    );
  }

  // Open Graph
  const presentOg = OG_REQUIRED.filter(
    (prop) => $(`meta[property="${prop}"]`).attr("content")?.trim(),
  );
  const missingOg = OG_REQUIRED.filter((p) => !presentOg.includes(p));
  if (missingOg.length === 0) {
    checks.push(
      check("SEO", "Open Graph tags", "pass", "All required og: tags present.", "6.2"),
    );
  } else {
    checks.push(
      check(
        "SEO",
        "Open Graph tags",
        missingOg.length >= OG_REQUIRED.length ? "fail" : "warn",
        `Missing: ${missingOg.join(", ")}.`,
        "6.2",
      ),
    );
  }

  // Twitter card
  const twitterCard = $('meta[name="twitter:card"]').attr("content")?.trim();
  checks.push(
    check(
      "SEO",
      "Twitter Card",
      twitterCard === "summary_large_image" ? "pass" : "warn",
      twitterCard
        ? `twitter:card = "${twitterCard}" (manual prefers summary_large_image).`
        : "No twitter:card meta tag.",
      "6.2",
    ),
  );

  // Single H1
  const h1Count = $("h1").length;
  checks.push(
    check(
      "SEO",
      "Single H1",
      h1Count === 1 ? "pass" : "fail",
      `${h1Count} <h1> found (exactly one required).`,
      "6.2",
    ),
  );

  // Heading hierarchy (no level skips)
  const headingLevels = $("h1, h2, h3, h4, h5, h6")
    .map((_, el) => Number(el.tagName.replace("h", "")))
    .get();
  let skip: string | null = null;
  for (let i = 1; i < headingLevels.length; i++) {
    if (headingLevels[i] - headingLevels[i - 1] > 1) {
      skip = `H${headingLevels[i - 1]} -> H${headingLevels[i]}`;
      break;
    }
  }
  checks.push(
    check(
      "SEO",
      "Heading hierarchy",
      skip ? "warn" : "pass",
      skip ? `Level skipped: ${skip} (no skipping allowed).` : "No skipped heading levels.",
      "6.2",
    ),
  );

  // JSON-LD structured data
  const jsonLd = $('script[type="application/ld+json"]');
  if (jsonLd.length === 0) {
    checks.push(
      check("SEO", "Structured data (JSON-LD)", "fail", "No JSON-LD script found.", "6.1.5"),
    );
  } else {
    let valid = 0;
    const types = new Set<string>();
    jsonLd.each((_, el) => {
      try {
        const parsed = JSON.parse($(el).contents().text());
        valid++;
        const collect = (node: unknown) => {
          if (Array.isArray(node)) return node.forEach(collect);
          if (node && typeof node === "object") {
            const t = (node as Record<string, unknown>)["@type"];
            if (typeof t === "string") types.add(t);
            const graph = (node as Record<string, unknown>)["@graph"];
            if (graph) collect(graph);
          }
        };
        collect(parsed);
      } catch {
        /* invalid block */
      }
    });
    checks.push(
      check(
        "SEO",
        "Structured data (JSON-LD)",
        valid > 0 ? "pass" : "fail",
        valid > 0
          ? `${valid} valid block(s). Types: ${[...types].join(", ") || "n/a"}.`
          : "JSON-LD present but failed to parse.",
        "6.1.5",
      ),
    );
  }

  // html lang
  const lang = $("html").attr("lang")?.trim();
  checks.push(
    check(
      "Accessibility",
      "html lang attribute",
      lang ? "pass" : "fail",
      lang ? `lang="${lang}"` : "Missing lang attribute on <html>.",
      "6.0",
    ),
  );

  // viewport
  const viewport = $('meta[name="viewport"]').attr("content")?.trim();
  checks.push(
    check(
      "Responsive",
      "Viewport meta",
      viewport ? "pass" : "fail",
      viewport ? `"${viewport}"` : "Missing viewport meta tag.",
      "7.3",
    ),
  );

  // Image alt coverage
  const imgs = $("img");
  const missingAlt = imgs.filter((_, el) => $(el).attr("alt") === undefined).length;
  if (imgs.length === 0) {
    checks.push(check("Accessibility", "Image alt text", "info", "No <img> tags on page.", "6.3.2"));
  } else {
    checks.push(
      check(
        "Accessibility",
        "Image alt text",
        missingAlt === 0 ? "pass" : "warn",
        missingAlt === 0
          ? `All ${imgs.length} images declare alt.`
          : `${missingAlt}/${imgs.length} <img> missing an alt attribute.`,
        "6.3.2",
      ),
    );
  }

  // Internal link integrity (manual Sec.6.4 / 7.2 D)
  const anchors = $("a");
  const noHref = anchors.filter((_, el) => {
    const href = $(el).attr("href");
    return !href || href === "#" || href.trim() === "";
  }).length;
  const jsHref = anchors.filter((_, el) =>
    ($(el).attr("href") ?? "").trim().toLowerCase().startsWith("javascript:"),
  ).length;
  const badLinks = noHref + jsHref;
  checks.push(
    check(
      "Links",
      "Crawlable anchors",
      badLinks === 0 ? "pass" : "warn",
      badLinks === 0
        ? `All ${anchors.length} <a> tags have real href values.`
        : `${badLinks}/${anchors.length} anchors have no/empty/javascript href (Nortiq Issue 28).`,
      "6.4",
    ),
  );

  // External link safety
  const externalUnsafe = anchors
    .filter((_, el) => {
      const href = ($(el).attr("href") ?? "").trim();
      if (!/^https?:\/\//i.test(href)) return false;
      const target = $(el).attr("target");
      const rel = ($(el).attr("rel") ?? "").toLowerCase();
      return target === "_blank" && !rel.includes("noopener");
    })
    .length;
  checks.push(
    check(
      "Links",
      "External link safety",
      externalUnsafe === 0 ? "pass" : "warn",
      externalUnsafe === 0
        ? "External _blank links use rel=noopener."
        : `${externalUnsafe} target=_blank link(s) missing rel="noopener noreferrer".`,
      "6.4.3",
    ),
  );

  return {
    url: page.finalUrl,
    ok: true,
    statusCode: page.status,
    checks,
  };
}

export async function analyzeUrl(url: string): Promise<PageReport> {
  const page = await fetchPage(url);
  return analyzePage(page);
}

/** Discover same-origin internal links from a homepage to verify multiple pages. */
export function discoverInternalLinks(
  homepage: FetchedPage,
  origin: string,
  limit: number,
): string[] {
  if (!homepage.body) return [];
  const $ = cheerio.load(homepage.body);
  const found = new Set<string>();
  $("a[href]").each((_, el) => {
    const href = ($(el).attr("href") ?? "").trim();
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
      return;
    }
    try {
      const resolved = new URL(href, origin);
      if (resolved.origin !== new URL(origin).origin) return;
      resolved.hash = "";
      resolved.search = "";
      const clean = resolved.toString().replace(/\/$/, "");
      if (clean !== origin.replace(/\/$/, "")) found.add(clean);
    } catch {
      /* ignore */
    }
  });
  return [...found].slice(0, limit);
}
