import test from "node:test";
import assert from "node:assert/strict";
import {
  ATG_KNOWN_CRAWLER_COOKIE,
  ATG_KNOWN_CRAWLER_HEADER,
  isKnownCrawlerRequest,
  isKnownCrawlerUserAgent,
  knownCrawlerCookieValue
} from "../dist/server/index.js";

test("isKnownCrawlerUserAgent detects common crawlers via isbot", () => {
  assert.equal(isKnownCrawlerUserAgent("Mozilla/5.0 (compatible; Googlebot/2.1)"), true);
  assert.equal(isKnownCrawlerUserAgent("Mozilla/5.0 (compatible; bingbot/2.0)"), true);
  assert.equal(
    isKnownCrawlerUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ),
    false
  );
});

test("isKnownCrawlerRequest checks header, cookie, then user-agent", () => {
  assert.equal(
    isKnownCrawlerRequest({
      get(name) {
        if (name.toLowerCase() === ATG_KNOWN_CRAWLER_HEADER) return "1";
        return null;
      }
    }),
    true
  );

  assert.equal(
    isKnownCrawlerRequest({
      get(name) {
        if (name.toLowerCase() === "cookie") {
          return `${ATG_KNOWN_CRAWLER_COOKIE}=${knownCrawlerCookieValue}`;
        }
        return null;
      }
    }),
    true
  );

  assert.equal(
    isKnownCrawlerRequest({
      get(name) {
        if (name.toLowerCase() === "user-agent") {
          return "Mozilla/5.0 (compatible; AhrefsBot/7.0)";
        }
        return null;
      }
    }),
    true
  );

  assert.equal(
    isKnownCrawlerRequest({
      get() {
        return null;
      }
    }),
    false
  );
});
