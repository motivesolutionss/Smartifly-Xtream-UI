import { avplayAdapter } from "./avplayAdapter";
import { mapPlaybackError } from "./playbackErrors";
import type { PlayerState, PlayerStateSnapshot } from "./playerState";
import { logger } from "../utils/logger";

type PlayerListener = (snapshot: PlayerStateSnapshot) => void;

type PlayStreamOptions = {
  startPositionSeconds?: number;
  contentType?: "live" | "vod" | "series";
};

export class PlayerController {
  private static instance: PlayerController;
  private snapshot: PlayerStateSnapshot = { state: "IDLE" };
  private listeners = new Set<PlayerListener>();
  private playRequestId = 0;
  private isReleasing = false;

  private constructor() {}

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

  async playStream(url: string, options: PlayStreamOptions = {}) {
    const requestId = ++this.playRequestId;
    const startedAt = performance.now();
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
        },
        onstreamcompleted: () => {
          logger.debug("AVPlay onstreamcompleted", { requestId });
          this.updateState("ENDED", undefined, requestId);
        },
        onerror: (error) => {
          logger.error("AVPlay onerror callback", { requestId, error });
          const appError = mapPlaybackError(error);
          this.updateState("ERROR", appError.message, requestId);
        },
      });

      logger.debug("AVPlay prepareAsync starting", { requestId });
      await this.prepareWithTimeout(20000);
      logger.debug("AVPlay prepareAsync resolved", {
        requestId,
        elapsedMs: Math.round(performance.now() - startedAt),
      });

      // setDisplayRect AFTER prepare — some Tizen emulator builds require this order.
      avplayAdapter.setDisplayRect(0, 0, window.innerWidth, window.innerHeight);

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

  private applyOptionalOptimizations(options: PlayStreamOptions) {
    const bufferTimeMs = options.contentType === "live" ? 5000 : 3000;

    try {
      avplayAdapter.setStreamingProperty("SET_HTTP_CUSTOM_HEADER", "User-Agent: Smartifly/1.0");
    } catch (error) {
      logger.warn("AVPlay custom header is not supported on this device", error);
    }

    try {
      avplayAdapter.setBufferTime(bufferTimeMs);
    } catch (error) {
      logger.warn("AVPlay buffer tuning is not supported on this device", error);
    }

    try {
      avplayAdapter.setAdaptiveInfo(true);
    } catch (error) {
      logger.warn("AVPlay adaptive info is not supported on this device", error);
    }
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
