# @cunpingtai/ad-traffic-guard

AdSense **eligibility orchestrator** for multi-site publishers.

It does **not** try to reinvent bot detection. Instead:

1. **`isbot`** (server/edge) — known crawlers that declare themselves
2. **`@fingerprintjs/botd`** (browser) — Headless/Selenium/Playwright-style automation
3. **Optional Cloudflare / external signals** — network bot reputation when you have it
4. **This package** — visible time, trusted interaction, frequency, SDK + slot lazy load

It does **not** promise to catch every bot, replace Google's invalid-traffic systems, or guarantee an AdSense account will never be limited. Goal: reduce low-confidence ad requests while keeping the site fully accessible.

## Install

```bash
npm install @cunpingtai/ad-traffic-guard
```

## Next.js App Router

### 1. Middleware — mark known crawlers with `isbot`

```ts
// middleware.ts
import { NextResponse, type NextRequest } from "next/server";
import {
  ATG_KNOWN_CRAWLER_HEADER,
  isKnownCrawlerRequest
} from "@cunpingtai/ad-traffic-guard/server";

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  if (isKnownCrawlerRequest(request.headers)) {
    response.headers.set(ATG_KNOWN_CRAWLER_HEADER, "1");
    response.cookies.set("atg-known-crawler", "1", {
      path: "/",
      maxAge: 60 * 60,
      sameSite: "lax"
    });
  }

  return response;
}
```

`isbot === false` only means **unknown**, not human.

### 2. Client monetization wrapper

```tsx
"use client";

import { usePathname } from "next/navigation";
import {
  AdSenseLoader,
  AdTrafficGuardProvider,
  LazyAdSlot
} from "@cunpingtai/ad-traffic-guard/react";

const client = "ca-pub-XXXXXXXXXXXXXXXX";

export function Monetization({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const consentGranted = true; // Replace with your CMP state.

  return (
    <AdTrafficGuardProvider
      routeKey={pathname}
      // Optional: pass Cloudflare Enterprise bot score / verified bot here
      // externalSignals={{ cfBotScore, verifiedBot, knownBot }}
    >
      <AdSenseLoader client={client} consentGranted={consentGranted} />
      {children}
      <LazyAdSlot
        client={client}
        slot="1234567890"
        consentGranted={consentGranted}
        rootMargin="800px 0px"
      />
    </AdTrafficGuardProvider>
  );
}
```

Wrap from `app/layout.tsx`. **Remove** any static AdSense SDK tag from `<head>`:

```html
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?...">
```

## Default policy

> **Current default: `passthrough: true`.**  
> All eligibility checks are skipped and ads are allowed immediately (including Auto ads script load). Set `passthrough: false` when you want the guard back on.

| Traffic state | Behavior when `passthrough: false` |
|---|---|
| `isbot` / known-crawler cookie / verified bot | Block ads |
| BotD reports browser automation | Block ads |
| BotD still running / detector error | Wait (fail closed) |
| Cloudflare score `< 30` (when provided) | High risk → no ads |
| localhost / loopback | Block ads |
| Hidden / prerender page | Wait |
| Trusted interaction + >= 5s visible | Eligible if risk is not high |
| Focused passive reader + >= 15s visible | Eligible if risk is not high |
| High page/reload frequency | Require >= 20s visible |
| Still unqualified after 30s | Keep ads disabled for page view |

## Customize

```tsx
<AdTrafficGuardProvider
  routeKey={pathname}
  // Re-enable gating later:
  config={{ passthrough: false }}
  externalSignals={{ knownBot, cfBotScore, verifiedBot }}
>
  {children}
</AdTrafficGuardProvider>
```

## Read the decision

```tsx
"use client";

import { useAdEligibility } from "@cunpingtai/ad-traffic-guard/react";

export function DebugAdTrafficGuard() {
  const { result } = useAdEligibility();
  return <pre>{JSON.stringify(result, null, 2)}</pre>;
}
```

## Framework-agnostic usage

```ts
import { createAdTrafficGuard } from "@cunpingtai/ad-traffic-guard/core";

const guard = createAdTrafficGuard({
  externalSignals: { knownBot: false }
});

guard.subscribe((result) => {
  if (result.allowed) {
    console.log("Eligible to request ads");
  }
});

guard.start();
```

## Consent / CMP

Traffic eligibility and consent are separate gates:

```tsx
<AdSenseLoader client="ca-pub-XXXXXXXXXXXXXXXX" consentGranted={cmpAllowsAds} />
```

## Logging recommendation

Do not send raw IPs or invasive fingerprints. Aggregate:

```ts
{
  site: location.hostname,
  path: location.pathname,
  status: result.status,
  risk: result.risk,
  score: result.score,
  reason: result.reason,
  visibleMs: result.signals.visibleMs,
  interacted: result.signals.hadTrustedInteraction,
  browserAutomation: result.signals.browserAutomation,
  knownBot: result.signals.knownBot,
  cfBotScore: result.signals.cfBotScore
}
```

## Development

```bash
npm install
npm test
npm run pack:check
```

## Publishing

```bash
npm publish --access public --otp=YOUR_OTP
```

Repository: [github.com/cunpingtai/ad-traffic-guard](https://github.com/cunpingtai/ad-traffic-guard)
