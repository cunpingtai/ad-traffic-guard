import { isbot } from "isbot";
import {
  ATG_KNOWN_CRAWLER_COOKIE,
  ATG_KNOWN_CRAWLER_HEADER,
  knownCrawlerCookieValue
} from "../shared/known-crawler-mark.js";

export {
  ATG_KNOWN_CRAWLER_COOKIE,
  ATG_KNOWN_CRAWLER_HEADER,
  knownCrawlerCookieValue
};

export type HeaderReader = {
  get(name: string): string | null | undefined;
};

export function isKnownCrawlerUserAgent(
  userAgent?: string | null
): boolean {
  return isbot(userAgent);
}

function readCookieValue(
  cookieHeader: string | null | undefined,
  name: string
): string | null {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(";");
  for (const part of parts) {
    const [rawKey, ...rest] = part.trim().split("=");
    if (rawKey === name) {
      return rest.join("=") || "";
    }
  }
  return null;
}

/**
 * Server/edge helper: mark known crawlers via isbot + optional prior marks.
 * `isbot === false` only means "unknown", not "human".
 */
export function isKnownCrawlerRequest(headers: HeaderReader): boolean {
  const marked =
    headers.get(ATG_KNOWN_CRAWLER_HEADER) ??
    headers.get(ATG_KNOWN_CRAWLER_HEADER.toUpperCase());
  if (marked === "1" || marked === "true") return true;

  const cookie = headers.get("cookie") ?? headers.get("Cookie");
  if (readCookieValue(cookie, ATG_KNOWN_CRAWLER_COOKIE) === knownCrawlerCookieValue) {
    return true;
  }

  const ua = headers.get("user-agent") ?? headers.get("User-Agent");
  return isKnownCrawlerUserAgent(ua);
}

export function buildKnownCrawlerCookie(options?: {
  maxAgeSeconds?: number;
  path?: string;
}): string {
  const maxAge = options?.maxAgeSeconds ?? 60 * 60;
  const path = options?.path ?? "/";
  return `${ATG_KNOWN_CRAWLER_COOKIE}=${knownCrawlerCookieValue}; Path=${path}; Max-Age=${maxAge}; SameSite=Lax`;
}
