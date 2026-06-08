import type { PlaybackContentType } from "../services/interfaces/playbackService";
import { logger } from "../utils/logger";
import { perfMetrics } from "../utils/perfMetrics";
import type { PlaybackEngineKind } from "./playbackPolicy";

type PlaybackMetricsContext = {
  streamId: string;
  contentType: PlaybackContentType;
  engine: PlaybackEngineKind;
};

type PlaybackAttemptContext = PlaybackMetricsContext & {
  extension?: string;
  attempt?: number;
  totalAttempts?: number;
};

const recordStartupDuration = (
  metric: string,
  durationMs: number,
  data: Record<string, unknown>
) => {
  if (!perfMetrics.enabled) return;
  perfMetrics.recordDuration(metric, durationMs, {
    slowAboveMs: 3000,
    data,
  });
};

export const playbackMetrics = {
  requested(context: PlaybackMetricsContext) {
    logger.info("playback_requested", context);
  },

  extensionCandidatesResolved(
    context: PlaybackMetricsContext & { candidates: string[] }
  ) {
    logger.info("url_resolved", context);
    logger.info("Playback extension candidates resolved", {
      streamId: context.streamId,
      contentType: context.contentType,
      playerEngine: context.engine,
      candidates: context.candidates,
    });
  },

  engineSelected(
    context: PlaybackAttemptContext & { startupMs: number }
  ) {
    recordStartupDuration("playback_startup_ms", context.startupMs, context);
    logger.info("engine_selected", context);
    logger.info("Playback extension selected for stream", {
      streamId: context.streamId,
      contentType: context.contentType,
      playerEngine: context.engine,
      extension: context.extension,
      attempt: context.attempt,
      totalAttempts: context.totalAttempts,
      startupMs: context.startupMs,
    });
  },

  urlResolved(
    context: PlaybackAttemptContext & { resolveMs: number }
  ) {
    recordStartupDuration("playback_url_resolve_ms", context.resolveMs, context);
    logger.debug("url_resolved_extension", context);
  },

  extensionAttemptFailed(
    context: PlaybackAttemptContext & { startupMs: number; error: unknown }
  ) {
    logger.warn("Playback extension attempt failed", {
      streamId: context.streamId,
      contentType: context.contentType,
      playerEngine: context.engine,
      extension: context.extension,
      attempt: context.attempt,
      totalAttempts: context.totalAttempts,
      startupMs: context.startupMs,
      error: context.error,
    });
  },
};
