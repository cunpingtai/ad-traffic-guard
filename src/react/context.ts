"use client";

import { createContext } from "react";
import type { AdEligibilityResult } from "../core/types.js";

export interface AdTrafficGuardContextValue {
  result: AdEligibilityResult;
  trackPageView(): void;
  evaluate(): AdEligibilityResult;
}

export const AdTrafficGuardContext = createContext<AdTrafficGuardContextValue | null>(null);
