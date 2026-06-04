import { avplayAdapter } from "./avplayAdapter";
import { mapPlaybackError } from "./playbackErrors";
import type { PlayerState, PlayerStateSnapshot } from "./playerState";
import { logger } from "../utils/logger";

type PlayerListener = (snapshot: PlayerStateSnapshot) => void;
type CurrentTimeListener = (seconds: number) => void;

type PlayStreamOptions = {
  startPositionSeconds?: number;
  contentType?: "live" | "vod" | "series";
  displayRect?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
};

const PREPARE_TIMEOUT_MS: Record<NonNullable<PlayStreamOptions["contentType"]>, number> = {
  live: 20_000,
  vod: 30_000,
  series: 30_000,
};

const AVPLAY_CAPS_STORAGE_KEY = "smartifly_avplay_caps";

type AvplayCapabilities = {
  customHeader: boolean | null;
  bufferTuning: boolean | null;
  adaptiveInfo: boolean | null;
};

const readPersistedAvplayCapabilities = (): AvplayCapabilities | null => {
  try {
    const raw = window.sessionStorage.getItem(AVPLAY_CAPS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AvplayCapabilities>;
    return {
      customHeader:
        typeof parsed.customHeader === "boolean" ? parsed.customHeader : null,
      bufferTuning:
        typeof parsed.bufferTuning === "boolean" ? parsed.bufferTuning : null,
      adaptiveInfo:
        typeof parsed.adaptiveInfo === "boolean" ? parsed.adaptiveInfo : null,
    };
  } catch {
    return null;
  }
};

const persistAvplayCapabilities = (caps: AvplayCapabilities) => {
  try {
    window.sessionStorage.setItem(AVPLAY_CAPS_STORAGE_KEY, JSON.stringify(caps));
  } catch {
    // Ignore storage failures in restricted runtimes.
  }
};

export class PlayerController {
  private static instance: PlayerController;
  private snapshot: PlayerStateSnapshot = { state: "IDLE" };
  private listeners = new Set<PlayerListener>();
  private currentTimeListeners = new Set<CurrentTimeListener>();
  private playRequestId = 0;
  private isReleasing = false;
  private supportsCustomHeader: boolean | null = null;
  private supportsBufferTuning: boolean | null = null;
  private supportsAdaptiveInfo: boolean | null = null;

  private constructor() {
    const persistedCaps = readPersistedAvplayCapabilities();
    if (!persistedCaps) return;
    this.supportsCustomHeader = persistedCaps.customHeader;
    this.supportsBufferTuning = persistedCaps.bufferTuning;
    this.supportsAdaptiveInfo = persistedCaps.adaptiveInfo;
  }

  static getInstance(): PlayerController {
    if (!PlayerController.instance) {
      PlayerController.instance = new PlayerController();
    }
    return PlayerController.instance;
  }

  subscribe(listener: PlayerListener) {
    this.listeners.add(listener);
    listener(this.snapshot);
    return () => this.listeners.delete(listener);
  }

  subscribeCurrentTime(listener: CurrentTimeListener) {
    this.currentTimeListeners.add(listener);
    return () => this.currentTimeListeners.delete(listener);
  }

  async playStream(url: string, options: PlayStreamOptions = {}) {
    const requestId = ++this.playRequestId;
    const startedAt = performance.now();
    let didObserveStartupReady = false;
    let resolveStartupReady: (() => void) | null = null;
    const startupReadySignal = new Promise<void>((resolve) => {
      resolveStartupReady = resolve;
    });
    const markStartupReady = (reason: string) => {
      if (didObserveStartupReady) return;
      didObserveStartupReady = true;
      logger.debug("AVPlay startup readiness observed", { requestId, reason });
      resolveStartupReady?.();
      resolveStartupReady = null;
    };
    if (!avplayAdapter.isAvailable()) {
      this.updateState("ERROR", "Samsung AVPlay is not available");
      throw mapPlaybackError(new Error("Samsung AVPlay is not available"));
    }

    try {
      logger.info("Player startup initiated", { requestId, url });
      this.updateState("LOADING", undefined, requestId);

      // Always release cleanly before opening a new stream.
      this.release({ silent: true });

      logger.debug("AVPlay open", { requestId });
      avplayAdapter.open(url);

      // Apply optional streaming optimisations (all wrapped in try/catch internally).
      this.applyOptionalOptimizations(options);

      // Register event listeners before prepareAsync so we don't miss early events.
      avplayAdapter.setListener({
        onbufferingstart: () => {
          logger.debug("AVPlay onbufferingstart", { requestId });
          this.updateState("BUFFERING", undefined, requestId);
        },
        onbufferingcomplete: () => {
          logger.debug("AVPlay onbufferingcomplete", { requestId });
          this.updateState("PLAYING", undefined, requestId);
          markStartupReady("onbufferingcomplete");
        },
        onstreamcompleted: () => {
          logger.debug("AVPlay onstreamcompleted", { requestId });
          this.updateState("ENDED", undefined, requestId);
        },
        oncurrentplaytime: (currentTimeMs) => {
          const seconds = Number(currentTimeMs) / 1000;
          if (!Number.isFinite(seconds) || seconds < 0) return;
          if (seconds > 0) {
            markStartupReady("oncurrentplaytime");
          }
          this.currentTimeListeners.forEach((listener) => listener(seconds));
        },
        onerror: (error) => {
          logger.error("AVPlay onerror callback", { requestId, error });
          const appError = mapPlaybackError(error);
          this.updateState("ERROR", appError.message, requestId);
        },
      });

      logger.debug("AVPlay prepareAsync starting", { requestId });
      const contentType = options.contentType ?? "vod";
      await Promise.race([
        this.prepareWithTimeout(PREPARE_TIMEOUT_MS[contentType] ?? 25_000),
        startupReadySignal,
      ]);
      logger.debug("AVPlay startup barrier resolved", {
        requestId,
        elapsedMs: Math.round(performance.now() - startedAt),
        source: didObserveStartupReady ? "playback-event" : "prepareAsync",
      });

      // setDisplayRect AFTER prepare — some Tizen emulator builds require this order.
      const displayRect = this.resolveDisplayRect(options.displayRect);
      logger.debug("AVPlay setDisplayRect", { requestId, displayRect });
      avplayAdapter.setDisplayRect(
        displayRect.x,
        displayRect.y,
        displayRect.width,
        displayRect.height
      );

      this.updateState("READY", undefined, requestId);

      logger.debug("AVPlay play", { requestId });
      avplayAdapter.play();

      if (
        typeof options.startPositionSeconds === "number" &&
        Number.isFinite(options.startPositionSeconds) &&
        options.startPositionSeconds > 0
      ) {
        try {
          avplayAdapter.seekTo(options.startPositionSeconds * 1000);
        } catch (error) {
          logger.warn("Unable to resume AVPlay stream at saved position", error);
        }
      }

      this.updateState("PLAYING", undefined, requestId);
      logger.info("Playback started", {
        requestId,
        elapsedMs: Math.round(performance.now() - startedAt),
      });
    } catch (error) {
      const appError = mapPlaybackError(error);
      logger.error("Playback startup failed", {
        requestId,
        elapsedMs: Math.round(performance.now() - startedAt),
        message: appError.message,
        error: appError.originalError ?? error,
      });
      this.updateState("ERROR", appError.message, requestId);
      throw appError;
    }
  }

  private async prepareWithTimeout(timeoutMs: number) {
    let timer: number | null = null;
    try {
      await Promise.race([
        avplayAdapter.prepareAsync(),
        new Promise<void>((_, reject) => {
          timer = window.setTimeout(() => {
            reject(new Error("Playback startup timed out"));
          }, timeoutMs);
        }),
      ]);
    } finally {
      if (timer !== null) {
        window.clearTimeout(timer);
      }
    }
  }

  private resolveDisplayRect(
    displayRect?: PlayStreamOptions["displayRect"]
  ): NonNullable<PlayStreamOptions["displayRect"]> {
    const fallback = {
      x: 0,
      y: 0,
      width: Math.max(1, Math.round(window.innerWidth || 1)),
      height: Math.max(1, Math.round(window.innerHeight || 1)),
    };

    if (!displayRect) return fallback;

    const width = Math.max(1, Math.round(displayRect.width));
    const height = Math.max(1, Math.round(displayRect.height));

    return {
      x: Math.max(0, Math.round(displayRect.x)),
      y: Math.max(0, Math.round(displayRect.y)),
      width: Number.isFinite(width) ? width : fallback.width,
      height: Number.isFinite(height) ? height : fallback.height,
    };
  }

  private applyOptionalOptimizations(options: PlayStreamOptions) {
    // Favor smoother playback over minimal latency, especially in the Tizen emulator
    // where shallow buffers tend to produce visible jitter.
    const bufferTimeMs = options.contentType === "live" ? 12000 : 6000;

    if (this.supportsCustomHeader !== false) {
      try {
        avplayAdapter.setStreamingProperty("SET_HTTP_CUSTOM_HEADER", "User-Agent: Smartifly/1.0");
        this.supportsCustomHeader = true;
        this.persistCapabilities();
      } catch (error) {
        this.supportsCustomHeader = false;
        this.persistCapabilities();
        logger.warn("AVPlay custom header is not supported on this device", error);
      }
    }

    if (this.supportsBufferTuning !== false) {
      try {
        avplayAdapter.setBufferTime(bufferTimeMs);
        this.supportsBufferTuning = true;
        this.persistCapabilities();
      } catch (error) {
        this.supportsBufferTuning = false;
        this.persistCapabilities();
        logger.warn("AVPlay buffer tuning is not supported on this device", error);
      }
    }

    if (this.supportsAdaptiveInfo !== false) {
      try {
        avplayAdapter.setAdaptiveInfo(true);
        this.supportsAdaptiveInfo = true;
        this.persistCapabilities();
      } catch (error) {
        this.supportsAdaptiveInfo = false;
        this.persistCapabilities();
        logger.warn("AVPlay adaptive info is not supported on this device", error);
      }
    }
  }

  private persistCapabilities() {
    persistAvplayCapabilities({
      customHeader: this.supportsCustomHeader,
      bufferTuning: this.supportsBufferTuning,
      adaptiveInfo: this.supportsAdaptiveInfo,
    });
  }

  pause() {
    avplayAdapter.pause();
    this.updateState("PAUSED");
  }

  resume() {
    avplayAdapter.play();
    this.updateState("PLAYING");
  }

  release(options: { silent?: boolean } = {}) {
    if (!avplayAdapter.isAvailable()) {
      if (!options.silent) this.updateState("IDLE");
      return;
    }

    if (this.isReleasing) return;
    this.isReleasing = true;
    try {
      if (!options.silent) this.updateState("RELEASING");
      avplayAdapter.stop();
      avplayAdapter.close();
    } catch {
      // Some Samsung firmware throws when release is called before open.
    } finally {
      if (!options.silent) this.updateState("IDLE");
      this.isReleasing = false;
    }
  }

  getState() {
    return this.snapshot.state;
  }

  private updateState(state: PlayerState, errorMessage?: string, requestId?: number) {
    if (typeof requestId === "number" && requestId !== this.playRequestId) {
      return;
    }
    this.snapshot = { state, errorMessage };
    this.listeners.forEach((listener) => listener(this.snapshot));
  }
}

export const playerController = PlayerController.getInstance();
