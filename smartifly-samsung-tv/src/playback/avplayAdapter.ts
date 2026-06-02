import { AppError } from "../types/errors";
import { logger } from "../utils/logger";

type AvPlayListener = Record<string, (...args: unknown[]) => void>;

type AvPlayLike = {
  open?(url: string): void;
  close?(): void;
  stop?(): void;
  play?(): void;
  pause?(): void;
  seekTo?(milliseconds: number): void;
  getDuration?(): number;
  prepareAsync?(onSuccess: () => void, onError: (error: unknown) => void): void;
  setDisplayRect?(x: number, y: number, width: number, height: number): void;
  setListener?(listener: AvPlayListener): void;
  setStreamingProperty?(type: string, value: string): void;
  getTotalTrackInfo?(): unknown[];
  setSelectTrack?(trackType: string, trackIndex: number): void;
  getCurrentTime?(): number;
};

declare global {
  interface Window {
    webapi?: {
      avplay?: AvPlayLike;
    };
  }
}

const getAvPlay = () => {
  const avplay = window.webapi?.avplay;
  if (!avplay) {
    throw new AppError("PLAYBACK_FAILED", "Samsung AVPlay is not available");
  }
  return avplay;
};

const runAvPlay = (label: string, operation: (avplay: AvPlayLike) => void) => {
  try {
    operation(getAvPlay());
  } catch (error) {
    logger.error(`AVPlay ${label} failed`, error);
    throw error;
  }
};

const requireMethod = <K extends keyof AvPlayLike>(avplay: AvPlayLike, method: K) => {
  const fn = avplay[method];
  if (typeof fn !== "function") {
    throw new AppError("PLAYBACK_FAILED", `AVPlay ${String(method)} is unavailable on this TV`);
  }
  return fn as (...args: unknown[]) => unknown;
};

/**
 * Returns true only when AVPlay is present AND its core methods are callable.
 * The Tizen emulator sometimes exposes `window.webapi.avplay` as a stub object
 * where methods exist but are no-ops or throw immediately. We probe `open` and
 * `prepareAsync` to distinguish a real AVPlay surface from a dead stub.
 */
const probeAvPlayAvailability = (): boolean => {
  if (typeof window === "undefined") return false;
  const avplay = window.webapi?.avplay;
  if (!avplay) return false;
  // Must have at minimum open + prepareAsync + play to be usable
  return (
    typeof avplay.open === "function" &&
    typeof avplay.prepareAsync === "function" &&
    typeof avplay.play === "function"
  );
};

export const avplayAdapter = {
  isAvailable: probeAvPlayAvailability,
  supportsSeeking: () => {
    try {
      return typeof getAvPlay().seekTo === "function";
    } catch {
      return false;
    }
  },
  supportsTrackSelection: () => {
    try {
      return typeof getAvPlay().setSelectTrack === "function";
    } catch {
      return false;
    }
  },

  open: (url: string) =>
    runAvPlay("open", (avplay) => {
      requireMethod(avplay, "open")(url);
    }),

  setDisplayRect: (x: number, y: number, width: number, height: number) =>
    runAvPlay("setDisplayRect", (avplay) => {
      requireMethod(avplay, "setDisplayRect")(x, y, width, height);
    }),

  prepareAsync: () =>
    new Promise<void>((resolve, reject) => {
      runAvPlay("prepareAsync", (avplay) => {
        requireMethod(avplay, "prepareAsync")(resolve, reject);
      });
    }),

  play: () =>
    runAvPlay("play", (avplay) => {
      requireMethod(avplay, "play")();
    }),

  pause: () =>
    runAvPlay("pause", (avplay) => {
      requireMethod(avplay, "pause")();
    }),

  stop: () =>
    runAvPlay("stop", (avplay) => {
      requireMethod(avplay, "stop")();
    }),

  close: () =>
    runAvPlay("close", (avplay) => {
      requireMethod(avplay, "close")();
    }),

  setListener: (callbacks: AvPlayListener) =>
    runAvPlay("setListener", (avplay) => {
      requireMethod(avplay, "setListener")(callbacks);
    }),

  setStreamingProperty: (type: string, value: string) =>
    runAvPlay("setStreamingProperty", (avplay) => {
      requireMethod(avplay, "setStreamingProperty")(type, value);
    }),

  setBufferTime: (timeMs: number) =>
    runAvPlay("setBufferTime", (avplay) => {
      // AVPlay streaming property values for buffer are in milliseconds.
      // Use the correct property key format for Tizen AVPlay.
      const fn = requireMethod(avplay, "setStreamingProperty");
      fn("PLAYER_BUFFER_FOR_PLAY", String(timeMs));
      fn("PLAYER_BUFFER_FOR_RESUME", String(timeMs));
    }),

  setAdaptiveInfo: (enable: boolean) =>
    runAvPlay("setAdaptiveInfo", (avplay) => {
      // Enables adaptive bit rate
      const fn = requireMethod(avplay, "setStreamingProperty");
      fn("ADAPTIVE_INFO", enable ? "1" : "0");
    }),

  getCurrentTime: () => {
    const avplay = getAvPlay();
    if (!avplay.getCurrentTime) {
      throw new AppError("PLAYBACK_FAILED", "Current playback time is unavailable");
    }
    return avplay.getCurrentTime();
  },

  getDuration: () => {
    const avplay = getAvPlay();
    if (!avplay.getDuration) {
      throw new AppError("PLAYBACK_FAILED", "Playback duration is unavailable");
    }
    return avplay.getDuration();
  },

  seekTo: (milliseconds: number) =>
    runAvPlay("seekTo", (avplay) => {
      if (!avplay.seekTo) {
        throw new AppError("PLAYBACK_FAILED", "Seeking is unavailable on this device");
      }
      avplay.seekTo(Math.max(0, Math.floor(milliseconds)));
    }),

  getTotalTrackInfo: () => {
    const avplay = getAvPlay();
    return avplay.getTotalTrackInfo?.() || [];
  },

  selectTrack: (trackType: string, trackIndex: number) =>
    runAvPlay("selectTrack", (avplay) => {
      if (!avplay.setSelectTrack) {
        throw new AppError("PLAYBACK_FAILED", "Track selection is unavailable on this device");
      }
      avplay.setSelectTrack(trackType, trackIndex);
    }),
};
