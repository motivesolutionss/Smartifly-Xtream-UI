import { AppError } from "../types/errors";
import { logger } from "../utils/logger";

type HlsInstance = {
  attachMedia: (element: HTMLMediaElement) => void;
  loadSource: (url: string) => void;
  destroy: () => void;
  on: (event: string, listener: (...args: unknown[]) => void) => void;
};

type HlsConstructor = {
  new (config?: Record<string, unknown>): HlsInstance;
  isSupported: () => boolean;
  Events: {
    ERROR: string;
    MANIFEST_PARSED: string;
  };
};

type MpegTsPlayer = {
  attachMediaElement: (element: HTMLMediaElement) => void;
  detachMediaElement: () => void;
  load: () => void;
  play: () => Promise<void> | void;
  pause: () => void;
  destroy: () => void;
  on: (event: string, listener: (...args: unknown[]) => void) => void;
};

type MpegTsModule = {
  isSupported: () => boolean;
  createPlayer: (
    source: { type: string; isLive?: boolean; url: string },
    config?: Record<string, unknown>
  ) => MpegTsPlayer;
  Events: {
    ERROR: string;
  };
};

type BrowserPlaybackEngine = {
  name: string;
  destroy: () => void;
};

type PlaybackContentType = "live" | "vod" | "series";

const isTizenBrowserRuntime = () =>
  typeof navigator !== "undefined" && /tizen/i.test(navigator.userAgent);

const START_TIMEOUT_MS = 15000;
const LIVE_BUFFER_PROFILE = {
  hls: {
    lowLatencyMode: false,
    backBufferLength: 120,
    maxBufferLength: 45,
    maxBufferHole: 1.5,
    liveSyncDurationCount: 5,
    liveMaxLatencyDurationCount: 15,
    maxLiveSyncPlaybackRate: 1.0,
  },
  mpegts: {
    isLive: true,
    enableWorker: true,
    enableStashBuffer: true,
    stashInitialSize: 2 * 1024 * 1024,
    lazyLoad: false,
    autoCleanupSourceBuffer: true,
    autoCleanupMaxBackwardDuration: 45,
    autoCleanupMinBackwardDuration: 15,
    liveBufferLatencyChasing: false,
    liveSync: true,
    liveSyncMaxLatency: 8,
    liveSyncTargetLatency: 3.5,
    liveSyncPlaybackRate: 1.0,
  },
} as const;

const ON_DEMAND_BUFFER_PROFILE = {
  hls: {
    lowLatencyMode: false,
    backBufferLength: 90,
    maxBufferLength: 90,
    maxBufferHole: 0.5,
  },
  mpegts: {
    isLive: false,
    enableWorker: true,
    enableStashBuffer: true,
    stashInitialSize: 1024 * 1024,
    lazyLoad: true,
    autoCleanupSourceBuffer: true,
    autoCleanupMaxBackwardDuration: 120,
    autoCleanupMinBackwardDuration: 30,
  },
} as const;

const hlsMimeTypes = [
  "application/vnd.apple.mpegurl",
  "application/x-mpegURL",
  "audio/mpegurl",
];

const getUrlExtension = (url: string) => {
  const pathname = new URL(url, window.location.href).pathname.toLowerCase();
  const match = pathname.match(/\.([a-z0-9]+)$/);
  return match?.[1] || "";
};

const mediaErrorMessage = (video: HTMLMediaElement) => {
  const code = video.error?.code;
  switch (code) {
    case MediaError.MEDIA_ERR_ABORTED:
      return "Playback was aborted before the stream could start.";
    case MediaError.MEDIA_ERR_NETWORK:
      return "The browser could not reach the stream media.";
    case MediaError.MEDIA_ERR_DECODE:
      return "The browser could not decode this stream.";
    case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
      return "This stream container or codec is not supported in this browser.";
    default:
      return "The browser could not start this stream.";
  }
};

const canPlayNativeHls = (video: HTMLMediaElement) =>
  hlsMimeTypes.some((type) => video.canPlayType(type) !== "");

const canPlayNativeTransportStream = (video: HTMLMediaElement) =>
  video.canPlayType("video/mp2t") !== "" || video.canPlayType("video/MP2T") !== "";

const buildHlsProfile = (isLivePlayback: boolean) => ({
  ...(isLivePlayback ? LIVE_BUFFER_PROFILE.hls : ON_DEMAND_BUFFER_PROFILE.hls),
  // Tizen browser engines tend to behave better with less worker indirection.
  enableWorker: !isTizenBrowserRuntime(),
});

const buildMpegTsProfile = (isLivePlayback: boolean) => ({
  ...(isLivePlayback ? LIVE_BUFFER_PROFILE.mpegts : ON_DEMAND_BUFFER_PROFILE.mpegts),
  // The emulator's JS engine is usually steadier without demux workers.
  enableWorker: !isTizenBrowserRuntime(),
});

const waitForUsablePlayback = (video: HTMLVideoElement, timeoutMs = START_TIMEOUT_MS) =>
  new Promise<void>((resolve, reject) => {
    let settled = false;
    let timer: number | null = null;

    const cleanup = () => {
      video.removeEventListener("playing", handleReady);
      video.removeEventListener("canplay", handleReady);
      video.removeEventListener("error", handleError);
      if (timer !== null) window.clearTimeout(timer);
    };

    const settle = (callback: () => void) => {
      if (settled) return;
      settled = true;
      cleanup();
      callback();
    };

    function handleReady() {
      settle(resolve);
    }

    function handleError() {
      settle(() => reject(new Error(mediaErrorMessage(video))));
    }

    video.addEventListener("playing", handleReady);
    video.addEventListener("canplay", handleReady);
    video.addEventListener("error", handleError);

    timer = window.setTimeout(() => {
      settle(() => reject(new Error("Playback startup timed out in this browser.")));
    }, timeoutMs);
  });

const tryPlay = async (video: HTMLVideoElement) => {
  try {
    await video.play();
  } catch (error) {
    if (error instanceof DOMException && error.name === "NotAllowedError") {
      logger.warn("Browser blocked autoplay with sound; stream is loaded but paused");
      return;
    }
    throw error;
  }
};

const loadHlsConstructor = async () => {
  const module = await import("hls.js");
  return module.default as unknown as HlsConstructor;
};

const loadMpegTsModule = async () => {
  const module = await import("mpegts.js");
  return (module.default ?? module) as unknown as MpegTsModule;
};

export const browserPlaybackAdapter = {
  activeEngine: null as BrowserPlaybackEngine | null,

  reset(video?: HTMLVideoElement | null) {
    if (this.activeEngine) {
      logger.debug("Destroying browser playback engine", this.activeEngine.name);
      this.activeEngine.destroy();
      this.activeEngine = null;
    }

    if (!video) return;
    video.pause();
    video.removeAttribute("src");
    video.load();
  },

  async play(
    url: string,
    video: HTMLVideoElement,
    options: { contentType?: PlaybackContentType } = {}
  ) {
    this.reset(video);

    const extension = getUrlExtension(url);
    const isLivePlayback = options.contentType === "live";
    logger.info("Browser playback startup initiated", {
      extension,
      contentType: options.contentType ?? "vod",
      url,
    });

    if (extension === "m3u8") {
      if (canPlayNativeHls(video)) {
        await this.playNative(url, video);
        return;
      }

      const Hls = await loadHlsConstructor();
      if (!Hls.isSupported()) {
        throw new AppError(
          "PLAYBACK_FAILED",
          "HLS streams are not supported in this browser."
        );
      }

      await this.playWithHls(url, video, Hls, isLivePlayback);
      return;
    }

    if (extension === "ts") {
      const shouldPreferNativeTransportStream =
        isTizenBrowserRuntime() && canPlayNativeTransportStream(video);

      if (shouldPreferNativeTransportStream) {
        await this.playNative(url, video);
        return;
      }

      const mpegts = await loadMpegTsModule();
      if (mpegts.isSupported()) {
        await this.playWithMpegTs(url, video, mpegts, isLivePlayback);
        return;
      }

      if (canPlayNativeTransportStream(video)) {
        await this.playNative(url, video);
        return;
      }

      throw new AppError(
        "PLAYBACK_FAILED",
        "MPEG-TS live streams are not supported in this browser."
      );
    }

    await this.playNative(url, video);
  },

  async playNative(url: string, video: HTMLVideoElement) {
    video.src = url;
    video.load();
    const ready = waitForUsablePlayback(video);
    await tryPlay(video);
    await ready;
  },

  async playWithHls(
    url: string,
    video: HTMLVideoElement,
    Hls: HlsConstructor,
    isLivePlayback: boolean
  ) {
    logger.info("Browser playback engine selected", {
      engine: "hls.js",
      profile: isLivePlayback ? "stable-live" : "stable-vod",
    });

    const hls = new Hls(buildHlsProfile(isLivePlayback));

    this.activeEngine = {
      name: "hls.js",
      destroy: () => hls.destroy(),
    };

    const ready = waitForUsablePlayback(video);
    const fatalError = new Promise<never>((_, reject) => {
      hls.on(Hls.Events.ERROR, (_event, data) => {
        const details =
          typeof data === "object" && data !== null && "details" in data
            ? String(data.details)
            : "Unknown HLS error";
        const fatal =
          typeof data === "object" && data !== null && "fatal" in data
            ? Boolean(data.fatal)
            : false;
        logger.warn("hls.js playback warning", { details, fatal });
        if (fatal) reject(new Error(details));
      });
    });

    hls.attachMedia(video);
    hls.loadSource(url);
    await tryPlay(video);
    await Promise.race([ready, fatalError]);
  },

  async playWithMpegTs(
    url: string,
    video: HTMLVideoElement,
    mpegts: MpegTsModule,
    isLivePlayback: boolean
  ) {
    logger.info("Browser playback engine selected", {
      engine: "mpegts.js",
      profile: isLivePlayback ? "stable-live" : "stable-vod",
    });

    const player = mpegts.createPlayer(
      { type: "mpegts", isLive: isLivePlayback, url },
      buildMpegTsProfile(isLivePlayback)
    );

    this.activeEngine = {
      name: "mpegts.js",
      destroy: () => {
        player.pause();
        player.detachMediaElement();
        player.destroy();
      },
    };

    const ready = waitForUsablePlayback(video);
    const fatalError = new Promise<never>((_, reject) => {
      player.on(mpegts.Events.ERROR, (type, detail) => {
        logger.warn("mpegts.js playback failed", { type, detail });
        reject(new Error(`${String(type)} ${String(detail)}`.trim()));
      });
    });

    player.attachMediaElement(video);
    player.load();
    await player.play();
    await Promise.race([ready, fatalError]);
  },
};
