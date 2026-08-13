# AdTrafficGuard Orchestrator Design (v0.2.0)

## Goal

Refactor `@cunpingtai/ad-traffic-guard` from a homemade bot detector into an **AdSense eligibility orchestrator**:

- `isbot` → known crawler detection (server/edge helper)
- `@fingerprintjs/botd` → browser automation detection (client)
- optional Cloudflare / external signals → risk inputs
- this package → visibility, engagement, frequency, AdSense load gating

## Non-goals

- Fingerprint Pro commercial API
- CAPTCHA / Turnstile for ads
- Maintaining UA regex or headless feature heuristics ourselves

## Architecture

```text
[Edge/Server] isbot(UA) → header/cookie mark
[Client]      BotD.detect() → browserAutomation
[Optional]    cfBotScore / verifiedBot / knownBot injection
[Client]      AdTrafficGuard eligibility → AdSenseLoader → LazyAdSlot
```

## API changes (breaking)

| Old | New |
|---|---|
| homemade UA regex | removed; use `isbot` via server helper |
| `signals.webdriver` | `signals.browserAutomation` |
| `reason: "webdriver"` | `reason: "browser-automation"` |
| `blockWebDriver` | `blockBrowserAutomation` |
| `additionalBotPattern` | removed |
| — | `externalSignals`, `browserAutomationReady` |
| — | export `@cunpingtai/ad-traffic-guard/server` |

## Eligibility rules (unchanged intent)

- known crawler / browser automation / localhost → block ads
- hidden/prerender → wait
- trusted interaction + visible >= 5s → allow
- focused passive reader + visible >= 15s → allow
- high frequency → require >= 20s visible
- still unqualified after maxWait → block page view

## BotD failure policy

Until BotD resolves, ads stay waiting (`detecting-automation`).  
If BotD throws, do not treat as trusted human; remain waiting until `maxWaitMs`, then block with `insufficient-signals`.

## Testing

Pure unit tests cover evaluate/score, external signal merge, and server `isbot` helpers. BotD is injectable for guard-level tests; no network required.
