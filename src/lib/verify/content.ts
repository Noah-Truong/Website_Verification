import "server-only";
import * as cheerio from "cheerio";
import { fetchPage } from "./utils";

export interface PageText {
  url: string;
  title: string;
  /** Cleaned, whitespace-collapsed visible text, truncated. */
  text: string;
  /** Whether interactive elements that often map to requirements exist. */
  hasForm: boolean;
}

/**
 * Fetch a page and reduce it to readable text so an LLM can judge content
 * requirements (e.g. "must list 3 service tiers", "include a contact form").
 */
export async function fetchPageText(
  url: string,
  maxChars = 2800,
): Promise<PageText> {
  const page = await fetchPage(url);
  if (!page.ok || !page.body) {
    return {
      url,
      title: "",
      text: `[Could not load page: ${page.error ?? `status ${page.status}`}]`,
      hasForm: false,
    };
  }
  const $ = cheerio.load(page.body);
  const hasForm = $("form").length > 0 || $('input[type="email"]').length > 0;
  $("script, style, noscript, svg, template").remove();
  const title = $("title").first().text().trim();
  const text = $("body").text().replace(/\s+/g, " ").trim().slice(0, maxChars);
  return { url, title, text, hasForm };
}

export async function fetchSiteContent(
  urls: string[],
  maxPages = 5,
): Promise<PageText[]> {
  const targets = urls.slice(0, maxPages);
  return Promise.all(targets.map((u) => fetchPageText(u)));
}
