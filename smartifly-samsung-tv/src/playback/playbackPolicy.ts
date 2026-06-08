import type { PlaybackContentType } from "../services/interfaces/playbackService";

export type PlaybackEngineKind = "browser" | "avplay";

export const BROWSER_POSITION_POLL_INTERVAL_MS = 1000;
export const AVPLAY_DURATION_POLL_INTERVAL_MS = 4000;
export const AVPLAY_VISIBLE_PROGRESS_COMMIT_INTERVAL_MS = 250;
export const AVPLAY_BACKGROUND_PROGRESS_COMMIT_INTERVAL_MS = 5000;
export const PROGRESS_PERSIST_INTERVAL_MS = 30000;
export const PROGRESS_PERSIST_MIN_STEP_SECONDS = 20;
export const MIN_RESUME_PERSIST_SECONDS = 10;
export const AVPLAY_HEARTBEAT_INTERVAL_MS = 2500;
export const PLAYER_JANK_SAMPLE_INTERVAL_MS = 5000;
export const PLAYER_JANK_SLOW_FRAME_MS = 34;
export const PLAYER_JANK_SEVERE_FRAME_MS = 67;
export const PLAYER_LONG_TASK_LOG_THRESHOLD_MS = 100;
export const PLAYER_LONG_TASK_LOG_COOLDOWN_MS = 3000;
export const STALL_RECOVERY_THRESHOLD_MS = 8000;
export const MAX_STALL_RECOVERY_ATTEMPTS = 2;
export const PLAYBACK_URL_RETRY_DELAY_MS = 300;
export const AVPLAY_START_RETRY_DELAY_MS = 450;
export const UP_NEXT_AUTOPLAY_FALLBACK_THRESHOLD_SECONDS = 1;

const VOD_SERIES_EXTENSION_FALLBACKS = ["mp4", "mkv", "m3u8", "ts"] as const;

const normalizeExtension = (value?: string) =>
  value?.replace(/^\./, "").trim().toLowerCase() || "";

const buildExtensionCandidates = (extensions: Array<string | undefined>) => {
  const unique = new Set<string>();
  for (const value of extensions) {
    const normalized = normalizeExtension(value);
    if (!normalized) continue;
    unique.add(normalized);
  }
  return Array.from(unique);
};

type PlaybackCandidateOptions = {
  contentType: PlaybackContentType;
  extension?: string;
  liveExtension?: string;
  engine: PlaybackEngineKind;
};

export const getPlaybackExtensionCandidates = ({
  contentType,
  extension,
  liveExtension,
  engine,
}: PlaybackCandidateOptions) => {
  if (contentType === "live") {
    const preferred = normalizeExtension(liveExtension) || normalizeExtension(extension) || "ts";

    if (engine === "browser") {
      if (preferred === "ts") {
        return buildExtensionCandidates(["ts", "m3u8"]);
      }
      if (preferred === "m3u8") {
        return buildExtensionCandidates(["m3u8", "ts"]);
      }
      return buildExtensionCandidates([preferred, "m3u8", "ts"]);
    }

    if (preferred === "m3u8") {
      return buildExtensionCandidates(["m3u8", "ts"]);
    }
    if (preferred === "ts") {
      return buildExtensionCandidates(["ts", "m3u8"]);
    }
    return buildExtensionCandidates([preferred, "ts", "m3u8"]);
  }

  return buildExtensionCandidates([extension, ...VOD_SERIES_EXTENSION_FALLBACKS]);
};

export const getBrowserBufferingDelayMs = (contentType: PlaybackContentType) =>
  contentType === "live" ? 1250 : 350;
