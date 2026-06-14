"use client";

import { useEffect } from "react";
import { MotionConfig } from "framer-motion";
import { usePerformanceMode } from "@/hooks/usePerformanceMode";

export function MotionProvider({ children }: { children: React.ReactNode }) {
  const { reduceMotion, useLiteEffects, forceLiteMode } = usePerformanceMode();

  useEffect(() => {
    if (reduceMotion) {
      document.documentElement.classList.add("reduce-motion");
    } else {
      document.documentElement.classList.remove("reduce-motion");
    }

    if (useLiteEffects) {
      document.documentElement.classList.add("performance-lite");
    } else {
      document.documentElement.classList.remove("performance-lite");
    }

    if (forceLiteMode) {
      document.documentElement.classList.add("performance-tv");
    } else {
      document.documentElement.classList.remove("performance-tv");
    }
  }, [forceLiteMode, reduceMotion, useLiteEffects]);

  return (
    <MotionConfig reducedMotion={reduceMotion ? "always" : "never"}>
      {children}
    </MotionConfig>
  );
}
