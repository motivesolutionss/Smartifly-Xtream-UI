import { useCallback, useEffect, useRef, useState } from "react";
import { Sidebar } from "./components/common/Sidebar";
import { Login } from "./features/auth/Login";
import { Onboarding } from "./features/auth/Onboarding";
import { Activation } from "./features/auth/Activation";
import { Home } from "./features/home/Home";
import { LiveTv } from "./features/live-tv/LiveTv";
import { Vod } from "./features/vod/Vod";
import { Series } from "./features/series/Series";
import { Library } from "./features/library/Library";
import { Search } from "./features/search/Search";
import { Settings } from "./features/settings/Settings";
import { Player } from "./features/player/Player";
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
import { Profiles } from "./features/profile/Profiles";
import "./App.css";

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

function App() {
  const [activeScreen, setActiveScreen] = useState<ScreenId>("HOME");
  const [isLoginView, setIsLoginView] = useState(false);
  const [isActivationView, setIsActivationView] = useState(false);
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

  // Auto-adaptive visual profile (reduces effects on low-end Tizen hardware).
  useAdaptiveProfile();

  const { activePlaybackItem, setActivePlaybackItem } = usePlayerStore();
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

  const handleLoginSuccess = () => {
    setHasPlaylist(true);
    rehydrateForPlaylist();
    selectProfile(null); // Force profile selection only after logging in to the server
    setActiveScreen("HOME");
  };

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
        focusByScreenRef.current[activeScreen] = focusedId;
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

    focusByScreenRef.current[activeScreen] = focusedId;
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
      return <Activation onBack={() => setIsActivationView(false)} />;
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
      <Profiles 
        onSelectProfile={() => {
          setActiveScreen("HOME");
        }} 
      />
    );
  }

  const renderScreen = () => {
    switch (activeScreen) {
      case "HOME":
        return <Home onNavigate={handleNavigate} />;
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
    <div className={`app-container ${focusedId?.startsWith("nav-") ? "sidebar-expanded" : ""}`}>
      {activePlaybackItem && (
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
      )}
      
      <Sidebar activeId={activeScreen} onNavigate={handleNavigate} />

      <main className="main-content">
        <section className="page-body">
          {renderScreen()}
        </section>
      </main>
    </div>
  );
}

export default App;
