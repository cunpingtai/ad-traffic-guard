"use client";

import { useContext } from "react";
import { AdTrafficGuardContext } from "./context.js";

export function useAdEligibility() {
  const context = useContext(AdTrafficGuardContext);
  if (!context) {
    throw new Error("useAdEligibility must be used inside <AdTrafficGuardProvider>.");
  }
  return context;
}
