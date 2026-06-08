import { Suspense, lazy, useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Sidebar } from "./components/common/Sidebar";
import { Login } from "./features/auth/Login";
import { Onboarding } from "./features/auth/Onboarding";
import { Activation } from "./features/auth/Activation";
import { playlistStorage } from "./storage/playlistStorage";
import { usePlayerStore } from "./store/playerStore";
import { initializeServices } from "./services";
import { useFocus } from "./providers/useFocus";
import { useTvBack } from "./hooks/useTvBack";
import { registerTizenRemoteKeys } from "./utils/tizenInput";
import { useLiveTvStore } from "./store/liveTvStore";
import { useAdaptiveProfile } from "./hooks/useAdaptiveProfile";
import { useProfileStore } from "./store/profileStore";
import { useSettingsStore } from "./store/settingsStore";
import { contentCategoryStorage } from "./storage/contentCategoryStorage";
import { recentlyWatchedStorage } from "./storage/recentlyWatchedStorage";
import { useBudgetedImagePreload } from "./hooks/useBudgetedImagePreload";
import { Loader } from "./components/ui/Loader";
import {
  getHomePreparationImageUrls,
  hasFreshHomeSnapshotInCache,
  preloadHomeSnapshot,
} from "./features/home/useHomeSnapshot";
import type { PersistedHomeSnapshot } from "./storage/homeSnapshotStorage";
import type { UserProfile } from "./storage/profileStorage";
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
  const [homePreparationImageUrls, setHomePreparationImageUrls] = useState<string[]>([]);
  const [hasPlaylist, setHasPlaylist] = useState<boolean>(() => {
    const activePlaylist = playlistStorage.getActivePlaylist();
    if (activePlaylist) {
      const { serverUrl, username, password } = activePlaylist;
      initializeServices(serverUrl, username, password);
      return true;
    }
    return false;
  });

  const { activeProfile, selectProfile, rehydrateForPlaylist } = useProfileStore();
  const rehydrateSettingsForScope = useSettingsStore((store) => store.rehydrateForScope);
  const queryClient = useQueryClient();
  const { activePlaybackItem, setActivePlaybackItem } = usePlayerStore();

  useBudgetedImagePreload(homePreparationImageUrls, {
    enabled: isPreparingHome,
    maxConcurrent: 3,
    maxUrls: 18,
  });

  // Auto-adaptive visual profile is useful for content browsing, but during
  // playback it becomes an extra per-frame observer competing with the player.
  useAdaptiveProfile(!activePlaybackItem);

  const { focusedId, setFocus } = useFocus();
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

  const handleLoginSuccess = () => {
    setHasPlaylist(true);
    setIsPreparingHome(false);
    rehydrateForPlaylist();
    selectProfile(null); // Force profile selection only after logging in to the server
    setActiveScreen("HOME");
  };

  const handleProfileSelected = useCallback((profile: UserProfile) => {
    const activePlaylistId = playlistStorage.getActivePlaylistId();
    const shouldSkipPreparation = hasFreshHomeSnapshotInCache(
      queryClient,
      activePlaylistId,
      profile.id
    );

    setActiveScreen("HOME");
    setIsPreparingHome(!shouldSkipPreparation);
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
    };
  }, []);

  useEffect(() => {
    if (!hasPlaylist || !activeProfile) return;
    rehydrateSettingsForScope();
  }, [activeProfile?.id, hasPlaylist, rehydrateSettingsForScope]);

  const handleNavigate = useCallback(
    (nextScreen: ScreenId) => {
      if (focusedId && !focusedId.startsWith("nav-") && !focusedId.startsWith("epg-")) {
        focusByScreenRef.current[activeScreen] = normalizeScreenMemoryFocusId(
          activeScreen,
          focusedId
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
    [activeScreen, focusedId, setFocus]
  );

  useEffect(() => {
    if (!focusedId) return;
    if (activePlaybackItem) return;
    if (focusedId.startsWith("nav-") || focusedId.startsWith("epg-")) return;

    focusByScreenRef.current[activeScreen] = normalizeScreenMemoryFocusId(
      activeScreen,
      focusedId
    );
  }, [activePlaybackItem, activeScreen, focusedId]);

  useEffect(() => {
    if (!activePlaybackItem) return;
    if (playbackReturnFocusRef.current) return;

    const fallbackFocusId =
      focusByScreenRef.current[activeScreen] ?? DEFAULT_FOCUS_BY_SCREEN[activeScreen];
    const candidateFocusId =
      focusedId &&
      !focusedId.startsWith("nav-") &&
      !focusedId.startsWith("player-") &&
      !focusedId.startsWith("top-")
        ? focusedId
        : fallbackFocusId;

    playbackReturnFocusRef.current = candidateFocusId;
  }, [activePlaybackItem, activeScreen, focusedId]);

  useEffect(() => {
    if (!hasPlaylist) return;
    if (activePlaybackItem) return;

    const restoreId =
      pendingScreenFocusRef.current ??
      focusByScreenRef.current[activeScreen] ??
      DEFAULT_FOCUS_BY_SCREEN[activeScreen];

    if (focusedId?.startsWith("nav-") && !restoreId.startsWith("nav-")) {
      setFocus(null);
    }

    const animationFrame = window.requestAnimationFrame(() => {
      pendingScreenFocusRef.current = null;
      setFocus(restoreId);
    });

    return () => window.cancelAnimationFrame(animationFrame);
  }, [activePlaybackItem, activeScreen, hasPlaylist, setFocus]);

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

      const preparedSnapshot = queryClient.getQueryData<PersistedHomeSnapshot>([
        "home-snapshot",
        activePlaylistId,
        activeProfile.id,
      ]);
      const continueWatching = recentlyWatchedStorage.getContinueWatching();
      setHomePreparationImageUrls(
        getHomePreparationImageUrls(preparedSnapshot, continueWatching)
      );
    });

    void Promise.race([preloadPromise, timeoutPromise]).finally(() => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
      if (!isCancelled && homeTransitionRequestRef.current === transitionRequestId) {
        setIsPreparingHome(false);
        setHomePreparationImageUrls([]);
      }
    });

    return () => {
      isCancelled = true;
      setHomePreparationImageUrls([]);
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
