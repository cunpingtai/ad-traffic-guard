# AdTrafficGuard Orchestrator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `@cunpingtai/ad-traffic-guard@0.2.0` as an orchestrator over `isbot` + BotD + eligibility rules.

**Architecture:** Delete homemade bot UA/webdriver detectors. Add `detectors/` + injectable BotD. Keep evaluate/guard focused on ad eligibility.

**Tech Stack:** TypeScript, `isbot@5`, `@fingerprintjs/botd@2`, React peer, node:test.

---

### Task 1: Unit tests for new evaluate / server helpers

- [ ] Expand `tests/evaluate.test.mjs` for browserAutomation, detecting-automation, cfBotScore
- [ ] Add `tests/server.test.mjs` for isbot helpers
- [ ] Confirm failures against current 0.1.0 build

### Task 2: Core types + evaluate + detectors

- [ ] Update types/config/evaluate
- [ ] Add detectors/isbot.ts, botd.ts, external.ts
- [ ] Delete src/core/bot.ts
- [ ] Make tests pass for pure functions

### Task 3: Guard + React + docs

- [ ] Wire BotD + externalSignals into guard/provider
- [ ] Export `./server`
- [ ] Update README/examples
- [ ] Bump to 0.2.0, run full test suite
