"use client";

import { useMemo } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useReducedMotion } from "framer-motion";

export function usePerformanceMode() {
  const isMobile = useIsMobile();
  const prefersReducedMotion = useReducedMotion();

  return useMemo(
    () => ({
      isMobile,
      prefersReducedMotion,
      reduceMotion: isMobile || prefersReducedMotion,
    }),
    [isMobile, prefersReducedMotion]
  );
}

