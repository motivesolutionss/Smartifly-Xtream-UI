import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getShortEpgQueryOptionsWithOverrides,
  type ParsedShortEpgItem,
} from "../epgQuery";

export type ParsedProgram = {
  title: string;
  description?: string;
  startMs: number;
  endMs: number;
  progress: number;
  next: ParsedProgram[];
};

type UseEpgOptions = {
  enabled?: boolean;
  refetchInterval?: number | false;
  refreshClock?: boolean;
};

export const useEpg = (streamId: string, options: UseEpgOptions = {}) => {
  const { enabled = !!streamId, refetchInterval, refreshClock = true } = options;
  const { data: epgList, isLoading } = useQuery<ParsedShortEpgItem[]>(
    getShortEpgQueryOptionsWithOverrides(streamId, {
      enabled,
      refetchInterval,
    })
  );

  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!refreshClock) return;
    const id = window.setInterval(() => setNowMs(Date.now()), 60 * 1000);
    return () => window.clearInterval(id);
  }, [refreshClock]);

  const normalisedPrograms = useMemo(() => epgList ?? [], [epgList]);

  const currentProgram = useMemo<ParsedProgram | null>(() => {
    const current = normalisedPrograms.find(
      (program) => nowMs >= program.startMs && nowMs < program.endMs
    );
    if (!current) return null;

    const duration = current.endMs - current.startMs;
    const elapsed = Math.max(0, nowMs - current.startMs);
    const progress = duration > 0 ? Math.min(100, (elapsed / duration) * 100) : 0;

    const next = normalisedPrograms
      .filter((program) => program.startMs >= nowMs)
      .slice(0, 3)
      .map((program) => ({
        title: program.title,
        description: program.description,
        startMs: program.startMs,
        endMs: program.endMs,
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

  const nextPrograms = useMemo(() => currentProgram?.next ?? [], [currentProgram]);

  return {
    currentProgram,
    nextPrograms,
    epgList: epgList ?? [],
    isLoading,
  };
};
