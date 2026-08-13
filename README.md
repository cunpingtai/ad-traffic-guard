# @cunpingtai/ad-traffic-guard

A small browser-side **ad eligibility gate** for sites that want to avoid requesting AdSense immediately for obvious crawlers, automation, hidden tabs, extremely short visits, and suspiciously high-frequency navigation.

It does **not** promise to identify every bot, does **not** replace Google's invalid-traffic systems, and does **not** guarantee that an AdSense account will never receive ad-serving limits. The goal is narrower: reduce unnecessary ad requests from low-confidence page views while keeping the site itself accessible.

## What it does

1. Does not load the AdSense SDK until the visitor passes your eligibility policy.
2. Hard-blocks known crawler UAs and `navigator.webdriver` by default.
3. Counts **visible time**, not just wall-clock timeout time.
4. Accepts either a trusted interaction + visible time, or a longer passive-reading path.
5. Delays high-frequency page/reload patterns.
6. Keeps localhost ads off by default.
7. Lazy-loads individual ad slots near the viewport.
8. Keeps consent/CMP as a separate gate.

## Install

```bash
npm install @cunpingtai/ad-traffic-guard
```

## Next.js App Router

Create a client wrapper:

```tsx
"use client";

import { usePathname } from "next/navigation";
import {
  AdSenseLoader,
  AdTrafficGuardProvider,
  LazyAdSlot,
} from "@cunpingtai/ad-traffic-guard/react";

const client = "ca-pub-XXXXXXXXXXXXXXXX";

export function Monetization({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const consentGranted = true; // Replace with your CMP state.

  return (
    <AdTrafficGuardProvider routeKey={pathname}>
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

Then wrap your application from `app/layout.tsx`. Do **not** also place the AdSense SDK statically in `<head>` if your goal is to gate the SDK request.

## Default policy

| Traffic state | Default behavior |
|---|---|
| Recognized crawler/bot UA | Block ads for page view |
| `navigator.webdriver === true` | Block ads for page view |
| localhost / loopback | Block ads |
| Hidden / prerender page | Wait |
| Trusted interaction + >= 5s visible | Eligible if risk is not high |
| Focused passive reader + >= 15s visible | Eligible if risk is not high |
| High page/reload frequency | Require >= 20s visible |
| Still unqualified after 30s | Keep ads disabled for page view |

All values are configurable.

## Customize the policy

```tsx
<AdTrafficGuardProvider
  routeKey={pathname}
  config={{
    interactionMinVisibleMs: 6_000,
    passiveMinVisibleMs: 18_000,
    highFrequencyMinVisibleMs: 25_000,
    maxWaitMs: 35_000,
    highFrequencyPageViews: 8,
    highFrequencyReloads: 3,
    highRiskThreshold: 55,
    additionalBotPattern: /my-internal-crawler/i,
  }}
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

  return (
    <pre>
      {JSON.stringify(result, null, 2)}
    </pre>
  );
}
```

Typical result:

```json
{
  "status": "allowed",
  "allowed": true,
  "risk": "trusted",
  "score": 0,
  "reason": "trusted-interaction",
  "signals": {
    "elapsedMs": 9000,
    "visibleMs": 8400,
    "pageVisible": true,
    "pageFocused": true,
    "hadTrustedInteraction": true,
    "knownBot": false,
    "webdriver": false,
    "localhost": false,
    "prerender": false,
    "pageViewsInWindow": 2,
    "reloadsInWindow": 0
  }
}
```

## Framework-agnostic usage

```ts
import { createAdTrafficGuard } from "@cunpingtai/ad-traffic-guard/core";

const guard = createAdTrafficGuard();

guard.subscribe((result) => {
  if (result.allowed) {
    console.log("This page view is eligible to request ads.");
  }
});

guard.start();
```

For client-side routing, call:

```ts
guard.trackPageView();
```

on each SPA route transition.

## Consent / CMP

Traffic eligibility and consent are different problems. This package intentionally does **not** pretend to be a consent-management platform.

Use your consent/CMP state as another condition:

```tsx
<AdSenseLoader
  client="ca-pub-XXXXXXXXXXXXXXXX"
  consentGranted={cmpAllowsAds}
/>
```

and pass the same value to `LazyAdSlot`.

Your implementation still needs to comply with the applicable Google consent requirements and local privacy law.

## Important integration rule

If your existing app already contains this in the initial HTML:

```html
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?...">
</script>
```

then the SDK is already being requested before the guard can make a decision. Remove the static loader and let `<AdSenseLoader>` own SDK loading.

## Logging recommendation

Do not send raw IP addresses or invasive fingerprints from this package. A useful aggregate event looks like:

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
  pageViewsInWindow: result.signals.pageViewsInWindow
}
```

Use this to compare:

`page views -> ad eligible page views -> ad requests -> impressions`

before tuning thresholds.

## Development

```bash
npm install
npm test
npm run pack:check
```

## Publishing

```bash
npm publish --access public
```

Repository: [github.com/cunpingtai/ad-traffic-guard](https://github.com/cunpingtai/ad-traffic-guard)
