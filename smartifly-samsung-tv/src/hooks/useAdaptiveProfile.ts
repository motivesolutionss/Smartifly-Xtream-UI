import { useEffect, useRef } from "react";
import { PERF_REDUCED_CLASS } from "../utils/performanceTier";

/**
 * useAdaptiveProfile
 *
 * Monitors runtime frame-rate and toggles the `perf-reduced` class on
 * `document.documentElement` when the device is under pressure.
 *
 * CSS rules scoped to `:global(.perf-reduced)` disable blur, shadows,
 * transitions, and gradient backgrounds to keep the UI smooth on low-end
 * Samsung TV hardware.
 *
 * Strategy:
 *  - Sample frame deltas over a rolling window.
 *  - If the median frame time exceeds SLOW_FRAME_THRESHOLD_MS for
 *    SLOW_FRAME_COUNT consecutive samples, switch to reduced mode.
 *  - If the median drops back below FAST_FRAME_THRESHOLD_MS for
 *    FAST_FRAME_COUNT consecutive samples, restore full visuals.
 */

const SLOW_FRAME_THRESHOLD_MS = 40; // ~25 fps
const FAST_FRAME_THRESHOLD_MS = 28; // ~35 fps
const SAMPLE_WINDOW = 10;
const SLOW_FRAME_COUNT = 6;
const FAST_FRAME_COUNT = 8;
export const useAdaptiveProfile = (enabled: boolean = true) => {
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const samplesRef = useRef<number[]>([]);
  const slowStreakRef = useRef(0);
  const fastStreakRef = useRef(0);
  const isReducedRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      document.documentElement.classList.remove(PERF_REDUCED_CLASS);
      return;
    }

    const tick = (now: number) => {
      if (lastTimeRef.current !== null) {
        const delta = now - lastTimeRef.current;

        // Keep a rolling window of samples.
        samplesRef.current.push(delta);
        if (samplesRef.current.length > SAMPLE_WINDOW) {
          samplesRef.current.shift();
        }

        if (samplesRef.current.length === SAMPLE_WINDOW) {
          const sorted = [...samplesRef.current].sort((a, b) => a - b);
          const median = sorted[Math.floor(SAMPLE_WINDOW / 2)];

          if (median > SLOW_FRAME_THRESHOLD_MS) {
            slowStreakRef.current += 1;
            fastStreakRef.current = 0;
          } else if (median < FAST_FRAME_THRESHOLD_MS) {
            fastStreakRef.current += 1;
            slowStreakRef.current = 0;
          } else {
            // In the middle band — don't change streaks.
          }

          if (!isReducedRef.current && slowStreakRef.current >= SLOW_FRAME_COUNT) {
            isReducedRef.current = true;
            document.documentElement.classList.add(PERF_REDUCED_CLASS);
          } else if (isReducedRef.current && fastStreakRef.current >= FAST_FRAME_COUNT) {
            isReducedRef.current = false;
            document.documentElement.classList.remove(PERF_REDUCED_CLASS);
          }
        }
      }

      lastTimeRef.current = now;
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      // Always restore full visuals on unmount.
      document.documentElement.classList.remove(PERF_REDUCED_CLASS);
    };
  }, [enabled]);
};
