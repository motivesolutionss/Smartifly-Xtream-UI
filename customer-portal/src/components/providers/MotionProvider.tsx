"use client";

import { MotionConfig } from "framer-motion";
import { usePerformanceMode } from "@/hooks/usePerformanceMode";

export function MotionProvider({ children }: { children: React.ReactNode }) {
  const { reduceMotion } = usePerformanceMode();

  return (
    <MotionConfig reducedMotion={reduceMotion ? "always" : "never"}>
      {children}
    </MotionConfig>
  );
}

