"use client";

import {
  type PropsWithChildren,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { createAdTrafficGuard } from "../core/guard.js";
import type { AdTrafficGuardConfig } from "../core/types.js";
import { AdTrafficGuardContext } from "./context.js";

export interface AdTrafficGuardProviderProps extends PropsWithChildren {
  config?: Partial<AdTrafficGuardConfig>;
  /**
   * Pass the current pathname (or another route key) in SPA frameworks.
   * Changing it records another page view for frequency analysis.
   */
  routeKey?: string;
}

export function AdTrafficGuardProvider({
  children,
  config,
  routeKey
}: AdTrafficGuardProviderProps) {
  const configKey = JSON.stringify(config ?? {}, (_key, value) =>
    value instanceof RegExp ? value.toString() : value
  );

  const controller = useMemo(
    () => createAdTrafficGuard(config),
    // configKey intentionally represents all serializable config fields.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [configKey]
  );

  const [result, setResult] = useState(controller.getSnapshot());

  useEffect(() => {
    const unsubscribe = controller.subscribe(setResult);
    controller.start();
    setResult(controller.getSnapshot());
    return () => {
      unsubscribe();
      controller.stop();
    };
  }, [controller]);

  const previousRouteKey = useRef<string | undefined>(routeKey);

  useEffect(() => {
    if (routeKey === undefined) return;

    if (previousRouteKey.current !== undefined && previousRouteKey.current !== routeKey) {
      controller.trackPageView();
    }

    previousRouteKey.current = routeKey;
  }, [controller, routeKey]);

  const value = useMemo(
    () => ({
      result,
      trackPageView: () => controller.trackPageView(),
      evaluate: () => controller.evaluate()
    }),
    [controller, result]
  );

  return (
    <AdTrafficGuardContext.Provider value={value}>
      {children}
    </AdTrafficGuardContext.Provider>
  );
}
