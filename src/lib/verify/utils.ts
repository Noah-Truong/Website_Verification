import "server-only";

export const USER_AGENT =
  "NortiqVerification/0.1 (+https://nortiq.labs; website QA bot)";

export interface FetchedPage {
  url: string;
  finalUrl: string;
  status: number | null;
  ok: boolean;
  headers: Headers | null;
  body: string;
  error?: string;
}

export function normalizeUrl(input: string): string {
  let url = input.trim();
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }
  return url.replace(/\/+$/, "") || url;
}

export function withCacheBuster(url: string, round: number): string {
  const u = new URL(url);
  u.searchParams.set("cb", `round${round}`);
  return u.toString();
}

export async function fetchPage(
  url: string,
  timeoutMs = 15000,
): Promise<FetchedPage> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { "user-agent": USER_AGENT, accept: "text/html,*/*" },
      redirect: "follow",
      signal: controller.signal,
      cache: "no-store",
    });
    const body = await res.text();
    return {
      url,
      finalUrl: res.url || url,
      status: res.status,
      ok: res.ok,
      headers: res.headers,
      body,
    };
  } catch (err) {
    return {
      url,
      finalUrl: url,
      status: null,
      ok: false,
      headers: null,
      body: "",
      error: err instanceof Error ? err.message : "Request failed",
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchStatus(url: string, timeoutMs = 10000): Promise<number | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { "user-agent": USER_AGENT },
      redirect: "follow",
      signal: controller.signal,
      cache: "no-store",
    });
    return res.status;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
