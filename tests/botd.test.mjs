import test from "node:test";
import assert from "node:assert/strict";
import { detectBrowserAutomationWith } from "../dist/detectors/botd.js";

test("detectBrowserAutomationWith maps BotD bot:true to automation=true", async () => {
  const result = await detectBrowserAutomationWith(async () => ({
    bot: true,
    botKind: "webdriver"
  }));
  assert.deepEqual(result, {
    ready: true,
    automation: true,
    botKind: "webdriver",
    error: false
  });
});

test("detectBrowserAutomationWith maps BotD bot:false to automation=false", async () => {
  const result = await detectBrowserAutomationWith(async () => ({ bot: false }));
  assert.deepEqual(result, {
    ready: true,
    automation: false,
    botKind: undefined,
    error: false
  });
});

test("detectBrowserAutomationWith fails closed on detector errors", async () => {
  const result = await detectBrowserAutomationWith(async () => {
    throw new Error("boom");
  });
  assert.deepEqual(result, {
    ready: true,
    automation: false,
    botKind: undefined,
    error: true
  });
});
