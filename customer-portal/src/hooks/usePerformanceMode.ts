"use client";

import { useMemo } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useReducedMotion } from "framer-motion";

export function usePerformanceMode() {
  const isMobile = useIsMobile();
  const prefersReducedMotion = useReducedMotion();

  const forceLiteMode = useMemo(() => {
    if (typeof window === "undefined") return false;

    const params = new URLSearchParams(window.location.search);
    const queryValue = params.get("tv") ?? params.get("lite");
    const storedValue = window.localStorage.getItem("smartifly-lite-mode");

    return queryValue === "1" || queryValue === "true" || storedValue === "1" || storedValue === "true";
  }, []);

  const isTV = useMemo(() => {
    if (typeof window === "undefined") return false;
    return /SmartTV|GoogleTV|AppleTV|AndroidTV|HbbTV|Tizen|Web0S|webOS|LGBrowser|Netflix|Opera TV|Roku|Viera|CastTV|Sling|PlayStation|Xbox|FireTV|AFTS/i.test(
      navigator.userAgent
    );
  }, []);

  const isLowPowerDevice = useMemo(() => {
    if (typeof window === "undefined") return false;

    const deviceMemory = "deviceMemory" in navigator
      ? (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? null
      : null;
    const hardwareConcurrency = navigator.hardwareConcurrency ?? null;

    return (deviceMemory !== null && deviceMemory <= 4) ||
      (hardwareConcurrency !== null && hardwareConcurrency <= 4);
  }, []);

  const useLiteEffects = forceLiteMode || isTV || isLowPowerDevice;

  return useMemo(
    () => ({
      forceLiteMode,
      isMobile,
      isTV,
      isLowPowerDevice,
      prefersReducedMotion,
      useLiteEffects,
      reduceMotion: isMobile || prefersReducedMotion || useLiteEffects,
    }),
    [forceLiteMode, isMobile, isLowPowerDevice, isTV, prefersReducedMotion, useLiteEffects]
  );
}
