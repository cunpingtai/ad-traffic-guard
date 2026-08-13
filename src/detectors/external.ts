import type {
  AdEligibilitySignals,
  ExternalAdTrafficSignals
} from "../core/types.js";

type MergeableSignals = Pick<
  AdEligibilitySignals,
  | "knownBot"
  | "browserAutomation"
  | "browserAutomationReady"
  | "browserAutomationError"
  | "cfBotScore"
  | "verifiedBot"
>;

/**
 * Merge optional server/CDN signals into client-collected detector signals.
 * `verifiedBot` implies `knownBot` for ad eligibility (never serve ads to verified crawlers).
 */
export function mergeExternalSignals(
  base: MergeableSignals,
  external: ExternalAdTrafficSignals = {}
): MergeableSignals {
  const verifiedBot = Boolean(external.verifiedBot || base.verifiedBot);
  const knownBot = Boolean(external.knownBot || base.knownBot || verifiedBot);

  return {
    ...base,
    knownBot,
    verifiedBot,
    cfBotScore:
      external.cfBotScore !== undefined ? external.cfBotScore : base.cfBotScore
  };
}
