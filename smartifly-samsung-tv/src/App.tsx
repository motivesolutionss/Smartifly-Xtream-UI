import { Suspense, lazy, useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Sidebar } from "./components/common/Sidebar";
import { Login } from "./features/auth/Login";
import { Onboarding } from "./features/auth/Onboarding";
import { Activation } from "./features/auth/Activation";
import { playlistStorage } from "./storage/playlistStorage";
import { usePlayerStore } from "./store/playerStore";
import { initializeServices } from "./services";
import { useFocusActions } from "./providers/useFocus";
import { useTvBack } from "./hooks/useTvBack";
import { registerTizenRemoteKeys } from "./utils/tizenInput";
import { useLiveTvStore } from "./store/liveTvStore";
import { useAdaptiveProfile } from "./hooks/useAdaptiveProfile";
import { useProfileStore } from "./store/profileStore";
import { useSettingsStore } from "./store/settingsStore";
import { contentCategoryStorage } from "./storage/contentCategoryStorage";
import { Loader } from "./components/ui/Loader";
import {
  getHomeBootstrapSnapshotQueryKey,
  hasHomeSnapshotSeedAvailable,
  hasFreshHomeSnapshotAvailable,
  preloadHomeSnapshot,
} from "./features/home/useHomeSnapshot";
import type { PersistedHomeSnapshot } from "./storage/homeSnapshotStorage";
import type { UserProfile } from "./storage/profileStorage";
import { createPerfTrace } from "./utils/perfTrace";
import { logger } from "./utils/logger";
import { markStartupMarker } from "./utils/startupMarkers";
import "./App.css";

let homePreloadPromise: Promise<typeof import("./features/home/Home")> | null = null;
const HOME_PREPARATION_TIMEOUT_MS = 7000;

const preloadHomeScreen = () => {
  if (!homePreloadPromise) {
    homePreloadPromise = import("./features/home/Home");
  }
  return homePreloadPromise;
};

const Home = lazy(async () => {
  const module = await preloadHomeScreen();
  return { default: module.Home };
});

const LiveTv = lazy(async () => {
  const module = await import("./features/live-tv/LiveTv");
  return { default: module.LiveTv };
});

const Vod = lazy(async () => {
  const module = await import("./features/vod/Vod");
  return { default: module.Vod };
});

const Series = lazy(async () => {
  const module = await import("./features/series/Series");
  return { default: module.Series };
});

const Library = lazy(async () => {
  const module = await import("./features/library/Library");
  return { default: module.Library };
});

const Search = lazy(async () => {
  const module = await import("./features/search/Search");
  return { default: module.Search };
});

const Settings = lazy(async () => {
  const module = await import("./features/settings/Settings");
  return { default: module.Settings };
});

const Player = lazy(async () => {
  const module = await import("./features/player/Player");
  return { default: module.Player };
});

const Profiles = lazy(async () => {
  const module = await import("./features/profile/Profiles");
  return { default: module.Profiles };
});

type ScreenId =
  | "HOME"
  | "LIVE"
  | "VOD"
  | "SERIES"
  | "LIBRARY"
  | "SEARCH"
  | "SETTINGS";

const DEFAULT_FOCUS_BY_SCREEN: Record<ScreenId, string> = {
  HOME: "hero-play",
  LIVE: "live-search-input-wrapper",
  VOD: "vod-search-input-wrapper",
  SERIES: "series-search-input-wrapper",
  LIBRARY: "library-tab-FAVORITES",
  SEARCH: "search-input",
  SETTINGS: "settings-nav-account",
};

const SEARCH_INPUT_FOCUS_BY_SCREEN: Partial<Record<ScreenId, string>> = {
  LIVE: "live-search-input-wrapper",
  VOD: "vod-search-input-wrapper",
  SERIES: "series-search-input-wrapper",
  SEARCH: "search-input",
};

const normalizeScreenMemoryFocusId = (
  screen: ScreenId,
  focusedId: string | null
) => {
  if (!focusedId) return null;

  const searchInputFocusId = SEARCH_INPUT_FOCUS_BY_SCREEN[screen] ?? null;
  if (
    searchInputFocusId &&
    (focusedId.startsWith("search-sug-") || focusedId.startsWith("tvkb-key-"))
  ) {
    return searchInputFocusId;
  }

  if (screen === "VOD" && focusedId.startsWith("card-vod-")) {
    const categoryId = contentCategoryStorage.getVodLastCategoryId();
    return categoryId ? `vod-cat-${categoryId}` : DEFAULT_FOCUS_BY_SCREEN.VOD;
  }

  if (screen === "SERIES" && focusedId.startsWith("card-series-")) {
    const categoryId = contentCategoryStorage.getSeriesLastCategoryId();
    return categoryId ? `series-cat-${categoryId}` : DEFAULT_FOCUS_BY_SCREEN.SERIES;
  }

  return focusedId;
};

const ScreenFallback = ({ overlay = false }: { overlay?: boolean }) => (
  <div className={overlay ? "screen-loader screen-loader-overlay" : "screen-loader"}>
    <Loader size={72} />
    <p className="screen-loader-label">Loading Smartifly...</p>
  </div>
);

function App() {
  const [activeScreen, setActiveScreen] = useState<ScreenId>("HOME");
  const [isLoginView, setIsLoginView] = useState(false);
  const [isActivationView, setIsActivationView] = useState(false);
  const [isPreparingHome, setIsPreparingHome] = useState(false);
  const [hasPlaylist, setHasPlaylist] = useState<boolean>(() => {
    markStartupMarker("app_start");
    const activePlaylist = playlistStorage.getActivePlaylist();
    if (activePlaylist) {
      const { serverUrl, username, password } = activePlaylist;
      initializeServices(serverUrl, username, password);
      return true;
    }
    return false;
  });

  const activeProfile = useProfileStore((state) => state.activeProfile);
  const selectProfile = useProfileStore((state) => state.selectProfile);
  const rehydrateForPlaylist = useProfileStore((state) => state.rehydrateForPlaylist);
  const rehydrateSettingsForScope = useSettingsStore((store) => store.rehydrateForScope);
  const queryClient = useQueryClient();
  const { activePlaybackItem, setActivePlaybackItem } = usePlayerStore();
  const appBootTraceRef = useRef(
    createPerfTrace("app_boot", {
      initialHasPlaylist: hasPlaylist,
    })
  );
  const hasClosedAppBootTraceRef = useRef(false);

  // Auto-adaptive visual profile is useful for content browsing, but during
  // playback it becomes an extra per-frame observer competing with the player.
  useAdaptiveProfile(!activePlaybackItem);

  const { getFocusedId, setFocus, subscribe } = useFocusActions();
  const focusedIdRef = useRef<string | null>(getFocusedId());
  const liveReturnFocusId = useLiveTvStore((state) => state.returnFocusId);
  const setLiveReturnFocusId = useLiveTvStore((state) => state.setReturnFocusId);
  const focusByScreenRef = useRef<Record<ScreenId, string | null>>({
    HOME: null,
    LIVE: null,
    VOD: null,
    SERIES: null,
    LIBRARY: null,
    SEARCH: null,
    SETTINGS: null,
  });
  const pendingScreenFocusRef = useRef<string | null>(null);
  const playbackReturnFocusRef = useRef<string | null>(null);
  const homeTransitionRequestRef = useRef(0);
  const lastRestoredScreenRef = useRef<ScreenId | null>(null);
  const wasMainAppRouteReadyRef = useRef(false);
  const isMainAppRouteReady =
    hasPlaylist &&
    activeProfile !== null &&
    !isPreparingHome &&
    !activePlaybackItem;

  useEffect(() => {
    focusedIdRef.current = getFocusedId();

    return subscribe(() => {
      const nextFocusedId = getFocusedId();
      focusedIdRef.current = nextFocusedId;

      if (activePlaybackItem) return;
      if (!nextFocusedId) return;
      if (nextFocusedId.startsWith("nav-") || nextFocusedId.startsWith("epg-")) return;

      focusByScreenRef.current[activeScreen] = normalizeScreenMemoryFocusId(
        activeScreen,
        nextFocusedId
      );
    });
  }, [activePlaybackItem, activeScreen, getFocusedId, subscribe]);

  const handleLoginSuccess = () => {
    setHasPlaylist(true);
    setIsPreparingHome(false);
    rehydrateForPlaylist();
    selectProfile(null); // Force profile selection only after logging in to the server
    setActiveScreen("HOME");
  };

  const handleProfileSelected = useCallback((profile: UserProfile) => {
    const activePlaylistId = playlistStorage.getActivePlaylistId();
    const shouldSkipPreparation = hasFreshHomeSnapshotAvailable(
      queryClient,
      activePlaylistId,
      profile.id
    );
    const hasSeedSnapshot = hasHomeSnapshotSeedAvailable(
      queryClient,
      activePlaylistId,
      profile.id
    );

    setActiveScreen("HOME");
    setIsPreparingHome(!shouldSkipPreparation && !hasSeedSnapshot);
    pendingScreenFocusRef.current = DEFAULT_FOCUS_BY_SCREEN.HOME;
    setFocus(DEFAULT_FOCUS_BY_SCREEN.HOME);
  }, [queryClient]);

  useEffect(() => {
    registerTizenRemoteKeys();

    // Prevent native browser window/viewport scroll shifting on focus
    const handleScroll = () => {
      if (window.scrollY !== 0 || window.scrollX !== 0) {
        window.scrollTo(0, 0);
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (!appBootTraceRef.current.isClosed()) {
        appBootTraceRef.current.end({
          status: "unmounted",
          metricName: "app_boot_total_ms",
        });
      }
    };
  }, []);

  useEffect(() => {
    if (hasClosedAppBootTraceRef.current || appBootTraceRef.current.isClosed()) {
      return;
    }

    const initialRoute = !hasPlaylist
      ? isActivationView
        ? "activation"
        : isLoginView
          ? "login"
          : "onboarding"
      : activeProfile === null
        ? "profiles"
        : isPreparingHome
          ? "home_preparing"
          : activePlaybackItem
            ? "player"
            : activeScreen.toLowerCase();

    const frameId = window.requestAnimationFrame(() => {
      if (hasClosedAppBootTraceRef.current || appBootTraceRef.current.isClosed()) {
        return;
      }

      hasClosedAppBootTraceRef.current = true;
      appBootTraceRef.current.end({
        status: "initial_route_ready",
        metricName: "app_boot_total_ms",
        slowAboveMs: 350,
        data: {
          initialRoute,
        },
      });
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [
    activePlaybackItem,
    activeProfile,
    activeScreen,
    hasPlaylist,
    isActivationView,
    isLoginView,
    isPreparingHome,
  ]);

  useEffect(() => {
    if (!hasPlaylist || !activeProfile) return;
    rehydrateSettingsForScope();
  }, [activeProfile?.id, hasPlaylist, rehydrateSettingsForScope]);

  const handleNavigate = useCallback(
    (nextScreen: ScreenId) => {
      const currentFocusedId = focusedIdRef.current;
      if (
        currentFocusedId &&
        !currentFocusedId.startsWith("nav-") &&
        !currentFocusedId.startsWith("epg-")
      ) {
        focusByScreenRef.current[activeScreen] = normalizeScreenMemoryFocusId(
          activeScreen,
          currentFocusedId
        );
      }

      const nextFocusId =
        focusByScreenRef.current[nextScreen] ?? DEFAULT_FOCUS_BY_SCREEN[nextScreen];

      if (nextScreen === activeScreen) {
        setFocus(nextFocusId);
        return;
      }

      pendingScreenFocusRef.current = nextFocusId;
      setActiveScreen(nextScreen);
    },
    [activeScreen, setFocus]
  );

  useEffect(() => {
    if (!activePlaybackItem) return;
    if (playbackReturnFocusRef.current) return;

    const currentFocusedId = focusedIdRef.current;
    const fallbackFocusId =
      focusByScreenRef.current[activeScreen] ?? DEFAULT_FOCUS_BY_SCREEN[activeScreen];
    const candidateFocusId =
      currentFocusedId &&
      !currentFocusedId.startsWith("nav-") &&
      !currentFocusedId.startsWith("player-") &&
      !currentFocusedId.startsWith("top-")
        ? currentFocusedId
        : fallbackFocusId;

    playbackReturnFocusRef.current = candidateFocusId;
  }, [activePlaybackItem, activeScreen]);

  useEffect(() => {
    const becameReady = isMainAppRouteReady && !wasMainAppRouteReadyRef.current;
    wasMainAppRouteReadyRef.current = isMainAppRouteReady;

    if (!isMainAppRouteReady) {
      return;
    }

    const hasPendingRestore = pendingScreenFocusRef.current !== null;
    const screenChangedSinceLastRestore = lastRestoredScreenRef.current !== activeScreen;

    if (!becameReady && !hasPendingRestore && !screenChangedSinceLastRestore) {
      return;
    }

    const restoreId =
      pendingScreenFocusRef.current ??
      focusByScreenRef.current[activeScreen] ??
      DEFAULT_FOCUS_BY_SCREEN[activeScreen];
    const currentFocusedId = focusedIdRef.current;

    logger.debug("app_focus_restore_requested", {
      activeScreen,
      focusedId: currentFocusedId,
      pendingScreenFocusId: pendingScreenFocusRef.current,
        rememberedScreenFocusId: focusByScreenRef.current[activeScreen],
        restoreId,
      });

    lastRestoredScreenRef.current = activeScreen;

    if (currentFocusedId?.startsWith("nav-") && !restoreId.startsWith("nav-")) {
      setFocus(null);
    }

    const animationFrame = window.requestAnimationFrame(() => {
      pendingScreenFocusRef.current = null;
      setFocus(restoreId);
    });

    return () => window.cancelAnimationFrame(animationFrame);
  }, [activeScreen, isMainAppRouteReady, setFocus]);

  useEffect(() => {
    if (activeProfile !== null) return;
    setIsPreparingHome(false);
  }, [activeProfile]);

  useEffect(() => {
    if (!isPreparingHome || !activeProfile) return;

    const transitionRequestId = homeTransitionRequestRef.current + 1;
    homeTransitionRequestRef.current = transitionRequestId;
    const activePlaylistId = playlistStorage.getActivePlaylistId();
    let isCancelled = false;
    let timeoutId = 0;
    markStartupMarker("home_bootstrap_start", {
      profileId: activeProfile.id,
    });
    const timeoutPromise = new Promise<"timeout">((resolve) => {
      timeoutId = window.setTimeout(() => resolve("timeout"), HOME_PREPARATION_TIMEOUT_MS);
    });
    const preloadPromise = Promise.allSettled([
      preloadHomeScreen(),
      preloadHomeSnapshot(queryClient, activePlaylistId, activeProfile.id),
    ]);

    void preloadPromise.then(() => {
      if (isCancelled || homeTransitionRequestRef.current !== transitionRequestId) {
        return;
      }

      queryClient.getQueryData<PersistedHomeSnapshot>(
        getHomeBootstrapSnapshotQueryKey(activePlaylistId, activeProfile.id)
      );
    });

    void Promise.race([preloadPromise, timeoutPromise]).finally(() => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
      if (!isCancelled && homeTransitionRequestRef.current === transitionRequestId) {
        setIsPreparingHome(false);
      }
    });

    return () => {
      isCancelled = true;
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [activeProfile, isPreparingHome, queryClient]);

  useTvBack(
    () => {
      if (activePlaybackItem) return;
      
      if (!hasPlaylist) {
        if (isActivationView) {
          setIsActivationView(false);
          return;
        }
        if (isLoginView) {
          setIsLoginView(false);
          return;
        }
        return;
      }

      if (activeScreen === "HOME") return;
      setActiveScreen("HOME");
    },
    !activePlaybackItem
  );

  // Auth Flow
  if (!hasPlaylist) {
    if (isActivationView) {
      return (
        <Activation
          onBack={() => setIsActivationView(false)}
          onSuccess={handleLoginSuccess}
        />
      );
    }
    if (!isLoginView) {
      return (
        <Onboarding 
          onSignIn={() => setIsLoginView(true)} 
          onCreateAccount={() => setIsActivationView(true)} 
        />
      );
    }
    return (
      <Login 
        onSuccess={handleLoginSuccess} 
        onBack={() => setIsLoginView(false)} 
      />
    );
  }

  // Profile Selection Flow
  if (activeProfile === null) {
    return (
      <Suspense fallback={<ScreenFallback />}>
        <Profiles onSelectProfile={handleProfileSelected} />
      </Suspense>
    );
  }

  if (isPreparingHome) {
    return (
      <div className="screen-loader screen-loader-transition">
        <Loader size={72} />
        <div className="screen-loader-copy">
          <p className="screen-loader-title">Welcome, {activeProfile.name}</p>
          <p className="screen-loader-label">Preparing your Home screen...</p>
        </div>
      </div>
    );
  }

  if (activePlaybackItem) {
    return (
      <Suspense fallback={<ScreenFallback overlay />}>
        <Player
          onBack={() => {
            const targetFocusId =
              liveReturnFocusId ??
              playbackReturnFocusRef.current ??
              focusByScreenRef.current[activeScreen] ??
              DEFAULT_FOCUS_BY_SCREEN[activeScreen];

            pendingScreenFocusRef.current = targetFocusId;
            playbackReturnFocusRef.current = null;
            setLiveReturnFocusId(null);
            setFocus(targetFocusId);
            setActivePlaybackItem(null);
          }}
        />
      </Suspense>
    );
  }

  const renderScreen = () => {
    switch (activeScreen) {
      case "HOME":
        return <Home onNavigate={handleNavigate} setFocus={setFocus} />;
      case "LIVE":
        return <LiveTv />;
      case "VOD":
        return <Vod />;
      case "SERIES":
        return <Series />;
      case "SEARCH":
        return <Search />;
      case "LIBRARY":
        return <Library />;
      case "SETTINGS":
        return <Settings />;
      default:
        return (
          <div className="placeholder-content">
            <h1 className="display-large">Welcome</h1>
            <p className="body-large text-tertiary">
              Select a category from the sidebar to start.
            </p>
          </div>
        );
    }
  };

  return (
    <div className="app-container">
      <Sidebar activeId={activeScreen} onNavigate={handleNavigate} />

      <main className="main-content">
        <section className="page-body">
          <Suspense fallback={<ScreenFallback />}>
            {renderScreen()}
          </Suspense>
        </section>
      </main>
    </div>
  );
}

export default App;
