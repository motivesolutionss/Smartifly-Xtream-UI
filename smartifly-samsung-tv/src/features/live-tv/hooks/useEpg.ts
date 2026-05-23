import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { services } from "../../../services";
import type { AppEpgItem } from "../../../types/appModels";
import { parseTimestampToSeconds } from "../epgTime";

// ─── Shared parsed program model ─────────────────────────────────────────────
// Used by both the mini-guide strip in LiveTv.tsx and the EpgGrid modal.
export type ParsedProgram = {
  title: string;
  description?: string;
  /** Unix timestamp in milliseconds (for display / Date construction). */
  startMs: number;
  endMs: number;
  /** Playback progress 0–100. Only meaningful for the current program. */
  progress: number;
  /** Convenience: next programs sorted by start time. */
  next: ParsedProgram[];
};

// ─── Internal normalised form (no circular refs) ──────────────────────────────
type NormalisedProgram = {
  title: string;
  description?: string;
  startMs: number;
  endMs: number;
};

const normalise = (items: AppEpgItem[]): NormalisedProgram[] => {
  const mapped = items.map((item) => {
    const startSeconds = parseTimestampToSeconds(item.start);
    const endSeconds = parseTimestampToSeconds(item.end);
    if (startSeconds <= 0 || endSeconds <= 0 || endSeconds <= startSeconds) return null;
    const prog: NormalisedProgram = {
      title: item.title || "No Program Info",
      description: item.description,
      startMs: startSeconds * 1000,
      endMs: endSeconds * 1000,
    };
    return prog;
  });
  return mapped.filter((item): item is NormalisedProgram => item !== null).sort((a, b) => a.startMs - b.startMs);
};

export const useEpg = (streamId: string) => {
  const { data: epgList, isLoading } = useQuery<AppEpgItem[]>({
    queryKey: ["epg", streamId],
    queryFn: () => services.content.getShortEpg(streamId),
    enabled: !!streamId,
    retry: 1,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    placeholderData: (previousData) => previousData,
  });

  // Update "now" every minute — use a ref-based approach to avoid stale closures.
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 60 * 1000);
    return () => window.clearInterval(id);
  }, []);

  const normalisedPrograms = useMemo(
    () => normalise(epgList ?? []),
    [epgList]
  );

  const currentProgram = useMemo<ParsedProgram | null>(() => {
    const current = normalisedPrograms.find(
      (p) => nowMs >= p.startMs && nowMs < p.endMs
    );
    if (!current) return null;

    const duration = current.endMs - current.startMs;
    const elapsed = Math.max(0, nowMs - current.startMs);
    const progress = duration > 0 ? Math.min(100, (elapsed / duration) * 100) : 0;

    const next = normalisedPrograms
      .filter((p) => p.startMs >= nowMs)
      .slice(0, 3)
      .map((p) => ({
        title: p.title,
        description: p.description,
        startMs: p.startMs,
        endMs: p.endMs,
        progress: 0,
        next: [],
      }));

    return {
      title: current.title,
      description: current.description,
      startMs: current.startMs,
      endMs: current.endMs,
      progress,
      next,
    };
  }, [normalisedPrograms, nowMs]);

  // Convenience: next programs (up to 3) relative to now.
  const nextPrograms = useMemo(
    () => currentProgram?.next ?? [],
    [currentProgram]
  );

  return {
    currentProgram,
    nextPrograms,
    epgList: epgList ?? [],
    isLoading,
  };
};
