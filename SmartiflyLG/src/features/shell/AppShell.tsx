import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import HomeScreen from '../home/HomeScreen';
import DetailsScreen from '../details/DetailsScreen';
import LiveScreen from '../live/LiveScreen';
import MoviesScreen from '../movies/MoviesScreen';
import SeriesScreen from '../series/SeriesScreen';
import SettingsScreen from '../settings/SettingsScreen';
import SearchScreen from '../search/SearchScreen';
import WatchlistScreen from '../watchlist/WatchlistScreen';
import PlayerScreen from '../player/PlayerScreen';
import { useSpatialNav } from '../../hooks/useSpatialNav';
import { contentScreen, eyebrow, heroCopy, mergeStyle, placeholderScreen, placeholderTitle } from '../../styles/lgTvStyles';
import { type AppDestination, useAppStore } from '../../store/appStore';
import { PRESET_AVATARS } from '../profiles/ProfileSelectionScreen';
import { legacyChromiumBrowser, scrollIntoViewCompat } from '../../utils/legacyBrowser';

type SidebarItem = {
  id: AppDestination;
  label: string;
  icon: 'home' | 'live' | 'movies' | 'series' | 'search' | 'watchlist';
};

const sidebarItems: SidebarItem[] = [
  { id: 'home', label: 'Home', icon: 'home' },
  { id: 'live', label: 'Live TV', icon: 'live' },
  { id: 'movies', label: 'Movies', icon: 'movies' },
  { id: 'series', label: 'Series', icon: 'series' },
  { id: 'search', label: 'Search', icon: 'search' },
  { id: 'watchlist', label: 'Watchlist', icon: 'watchlist' }
];

const destinations: Array<{ id: AppDestination; label: string; description: string }> = [
  { id: 'home', label: 'Home', description: 'Landing screen and featured rails' },
  { id: 'movies', label: 'Movies', description: 'Movie catalog shell coming next' },
  { id: 'series', label: 'Series', description: 'Series catalog shell coming next' },
  { id: 'live', label: 'Live TV', description: 'Channel guide shell coming next' },
  { id: 'search', label: 'Search', description: 'Search experience shell coming next' },
  { id: 'watchlist', label: 'Watchlist', description: 'Watchlist shell coming next' },
  { id: 'settings', label: 'Settings', description: 'Settings shell coming next' }
];

function PlaceholderScreen({
  title,
  description
}: {
  title: string;
  description: string;
}) {
  return (
    <section style={mergeStyle(contentScreen, placeholderScreen)} aria-label={title}>
      <p style={eyebrow}>Destination</p>
      <h1 style={placeholderTitle}>{title}</h1>
      <p style={heroCopy}>{description}</p>
    </section>
  );
}

function NavIcon({
  name,
  className
}: {
  name: SidebarItem['icon'] | 'settings';
  className?: string;
}) {
  const commonProps = {
    className,
    viewBox: '0 0 24 24',
    width: '30px',
    height: '30px',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const
  };

  switch (name) {
    case 'home':
      return (
        <svg {...commonProps} aria-hidden="true">
          <path d="M3 11.5L12 4l9 7.5" />
          <path d="M5.5 10.5V20h13V10.5" />
        </svg>
      );
    case 'live':
      return (
        <svg {...commonProps} aria-hidden="true">
          <rect x="4" y="6" width="16" height="12" rx="2.5" />
          <path d="M9 9.5h6" />
          <path d="M7.5 14.5h9" />
        </svg>
      );
    case 'movies':
      return (
        <svg {...commonProps} aria-hidden="true">
          <rect x="4" y="6" width="16" height="12" rx="2.5" />
          <path d="M4 9h16" />
          <path d="M8 6v12" />
          <path d="M12 6v12" />
          <path d="M16 6v12" />
        </svg>
      );
    case 'series':
      return (
        <svg {...commonProps} aria-hidden="true">
          <rect x="4" y="5" width="16" height="14" rx="2.5" />
          <path d="M8 8.5h8" />
          <path d="M8 12h8" />
          <path d="M8 15.5h5" />
        </svg>
      );
    case 'search':
      return (
        <svg {...commonProps} aria-hidden="true">
          <circle cx="10.5" cy="10.5" r="5.5" />
          <path d="M15 15l4 4" />
        </svg>
      );
    case 'watchlist':
      return (
        <svg {...commonProps} aria-hidden="true">
          <path d="M12 18.3l-6.7-6.1a4.2 4.2 0 0 1 0-6.2 4.5 4.5 0 0 1 6.7.4 4.5 4.5 0 0 1 6.7-.4 4.2 4.2 0 0 1 0 6.2L12 18.3z" />
        </svg>
      );
    case 'settings':
    default:
      return (
        <svg {...commonProps} aria-hidden="true">
          <circle cx="12" cy="12" r="3.2" />
          <path d="M19.2 12a7.4 7.4 0 0 0-.1-1l2-1.5-2-3.5-2.4.8a7.5 7.5 0 0 0-1.7-1l-.4-2.5H9.4L9 5.8a7.5 7.5 0 0 0-1.7 1L4.9 6.6l-2 3.5 2 1.5a7.4 7.4 0 0 0 0 2l-2 1.5 2 3.5 2.4-.8c.5.4 1.1.7 1.7 1l.4 2.5h4.8l.4-2.5c.6-.3 1.2-.6 1.7-1l2.4.8 2-3.5-2-1.5c.1-.3.1-.7.1-1z" />
        </svg>
      );
  }
}

function AppShell() {
  const currentDestination = useAppStore((state) => state.currentDestination);
  const sidebarDestination = useAppStore((state) => state.sidebarDestination);
  const sidebarFocusTarget = useAppStore((state) => state.sidebarFocusTarget);
  const selectedPlayback = useAppStore((state) => state.selectedPlayback);
  const setCurrentDestination = useAppStore((state) => state.setCurrentDestination);
  const setSidebarFocusTarget = useAppStore((state) => state.setSidebarFocusTarget);
  const closePlayback = useAppStore((state) => state.closePlayback);
  const closeContentDetails = useAppStore((state) => state.closeContentDetails);
  const selectedProfile = useAppStore((state) => state.selectedProfile);
  const openProfileSelectionFromHome = useAppStore((state) => state.openProfileSelectionFromHome);
  const navRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [focusRegion, setFocusRegion] = useState<'sidebar' | 'content'>('sidebar');
  const [showExitPrompt, setShowExitPrompt] = useState(false);
  const [exitPromptFocus, setExitPromptFocus] = useState<'cancel' | 'exit'>('cancel');
  const [moviesContentFocusToken, setMoviesContentFocusToken] = useState(0);
  const [seriesContentFocusToken, setSeriesContentFocusToken] = useState(0);
  const [liveContentFocusToken, setLiveContentFocusToken] = useState(0);
  const [moviesContentRegion, setMoviesContentRegion] = useState<'categories' | 'cards'>('categories');
  const [seriesContentRegion, setSeriesContentRegion] = useState<'categories' | 'cards'>('categories');
  const [liveContentRegion, setLiveContentRegion] = useState<'categories' | 'cards'>('categories');
  const exitPromptRefs = useRef<Record<'cancel' | 'exit', HTMLButtonElement | null>>({
    cancel: null,
    exit: null
  });
  const isContentDestination = focusRegion === 'content';
  const sidebarRouteIds = ['home', 'live', 'movies', 'series', 'search', 'watchlist'] as const;
  const getSidebarFocusTarget = () => {
    if (currentDestination === 'settings') {
      return 'settings';
    }

    if (sidebarRouteIds.includes(currentDestination as (typeof sidebarRouteIds)[number])) {
      return currentDestination;
    }

    if (sidebarRouteIds.includes(sidebarDestination as (typeof sidebarRouteIds)[number])) {
      return sidebarDestination;
    }

    return 'home';
  };

  const focusOrder = useMemo(
    () => ['profile', ...sidebarItems.map((destination) => destination.id), 'settings'] as const,
    []
  );
  const activateSidebarItem = (focused: string) => {
    if (focused === 'profile') {
      openProfileSelectionFromHome();
      setCurrentDestination('home');
      setSidebarFocusTarget('profile');
      setFocusRegion('sidebar');
      setFocusId('profile');
      return;
    }

    if (focused === 'settings') {
      setCurrentDestination('settings');
      setSidebarFocusTarget('settings');
      setFocusRegion('content');
      return;
    }

    if (sidebarRouteIds.includes(focused as (typeof sidebarRouteIds)[number])) {
      setCurrentDestination(focused as AppDestination);
      setSidebarFocusTarget(focused as AppDestination);
      setFocusRegion('content');
      if (focused === 'movies') {
        setMoviesContentFocusToken((token) => token + 1);
        setMoviesContentRegion('categories');
      }
      if (focused === 'series') {
        setSeriesContentFocusToken((token) => token + 1);
        setSeriesContentRegion('categories');
      }
      if (focused === 'live') {
        setLiveContentFocusToken((token) => token + 1);
        setLiveContentRegion('categories');
      }
    }
  };

  const closeExitPrompt = () => {
    setShowExitPrompt(false);
    setExitPromptFocus('cancel');
    setFocusRegion('sidebar');
    setFocusId('home');
  };

  const exitApp = () => {
    if (typeof window.close === 'function') {
      window.close();
    }
  };

  const handleAppBack = () => {
    if (showExitPrompt) {
      closeExitPrompt();
      return;
    }

    if (currentDestination === 'player') {
      closePlayback();
      return;
    }

    if (currentDestination === 'details') {
      closeContentDetails();
      return;
    }

    if (focusRegion === 'content') {
      if (currentDestination === 'movies') {
        if (moviesContentRegion === 'cards') {
          setMoviesContentRegion('categories');
          setMoviesContentFocusToken((token) => token + 1);
          return;
        }

        setFocusRegion('sidebar');
        setFocusId(getSidebarFocusTarget());
        return;
      }

      if (currentDestination === 'series') {
        if (seriesContentRegion === 'cards') {
          setSeriesContentRegion('categories');
          setSeriesContentFocusToken((token) => token + 1);
          return;
        }

        setFocusRegion('sidebar');
        setFocusId(getSidebarFocusTarget());
        return;
      }

      if (currentDestination === 'live') {
        if (liveContentRegion === 'cards') {
          setLiveContentRegion('categories');
          setLiveContentFocusToken((token) => token + 1);
          return;
        }

        setFocusRegion('sidebar');
        setFocusId(getSidebarFocusTarget());
        return;
      }

      if (currentDestination === 'settings') {
        setFocusRegion('sidebar');
        setFocusId('settings');
        return;
      }

      const nextTarget = getSidebarFocusTarget();
      setCurrentDestination(nextTarget);
      setFocusRegion('sidebar');
      setFocusId(nextTarget);
      return;
    }

    if (currentDestination === 'settings') {
      setCurrentDestination('home');
      setFocusId('home');
      return;
    }

    if (currentDestination !== 'home') {
      setCurrentDestination('home');
      setFocusId('home');
      return;
    }

    if (focusRegion === 'sidebar' && currentDestination === 'home') {
      setShowExitPrompt(true);
      setExitPromptFocus('cancel');
    }
  };

  const { focusId, setFocusId } = useSpatialNav<string>({
    enabled: focusRegion === 'sidebar',
    focusOrder,
    initialFocusId:
      sidebarFocusTarget,
    onBack: handleAppBack,
    onEnter: activateSidebarItem
  });

  useEffect(() => {
    if (focusRegion !== 'sidebar' || !focusId) {
      return;
    }

    navRefs.current[focusId]?.focus();
  }, [focusId, focusRegion]);

  useEffect(() => {
    if (!showExitPrompt) {
      return;
    }

    exitPromptRefs.current[exitPromptFocus]?.focus();
  }, [exitPromptFocus, showExitPrompt]);

  useEffect(() => {
    if (focusRegion !== 'sidebar' || !focusId) {
      return;
    }

    scrollIntoViewCompat(navRefs.current[focusId], {
      block: 'nearest',
      inline: 'nearest'
    });
  }, [focusId, focusRegion]);

  const handleSidebarKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (showExitPrompt) {
      return;
    }

    if (focusRegion !== 'sidebar' || focusOrder.length === 0) {
      return;
    }

    const currentIndex = focusOrder.indexOf(focusId);
    if (currentIndex === -1) {
      return;
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      event.stopPropagation();
      if (focusId === currentDestination) {
        setFocusRegion('content');
        if (currentDestination === 'movies') {
          setMoviesContentRegion('categories');
          setMoviesContentFocusToken((token) => token + 1);
        }
        if (currentDestination === 'series') {
          setSeriesContentRegion('categories');
          setSeriesContentFocusToken((token) => token + 1);
        }
        if (currentDestination === 'live') {
          setLiveContentRegion('categories');
          setLiveContentFocusToken((token) => token + 1);
        }
      }
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      event.stopPropagation();
      const nextId = focusOrder[(currentIndex + 1) % focusOrder.length];
      setFocusId(nextId);
      navRefs.current[nextId]?.focus();
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      event.stopPropagation();
      const nextId = focusOrder[(currentIndex - 1 + focusOrder.length) % focusOrder.length];
      setFocusId(nextId);
      navRefs.current[nextId]?.focus();
      return;
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
      activateSidebarItem(focusId);
      return;
    }

    if (
      event.key === 'Backspace' ||
      event.key === 'Escape' ||
      event.key === 'GoBack' ||
      event.keyCode === 461
    ) {
      event.preventDefault();
      event.stopPropagation();
      handleAppBack();
    }
  };

  useEffect(() => {
    const onRemoteBack = (event: KeyboardEvent) => {
      if (event.key !== 'GoBack' && event.keyCode !== 461) {
        return;
      }

      if (currentDestination === 'search') {
        // Let SearchScreen handle its own two-step back key behavior
        return;
      }

      if (focusRegion === 'sidebar' && !showExitPrompt) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      handleAppBack();
    };

    window.addEventListener('keydown', onRemoteBack, true);
    return () => window.removeEventListener('keydown', onRemoteBack, true);
  }, [focusRegion, handleAppBack, showExitPrompt, currentDestination]);

  useEffect(() => {
    if (!showExitPrompt) {
      return;
    }

    const onExitPromptKeyDown = (event: KeyboardEvent) => {
      if (
        event.key === 'ArrowLeft' ||
        event.key === 'ArrowRight' ||
        event.key === 'ArrowUp' ||
        event.key === 'ArrowDown'
      ) {
        event.preventDefault();
        setExitPromptFocus((current) => (current === 'cancel' ? 'exit' : 'cancel'));
        return;
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        if (exitPromptFocus === 'exit') {
          exitApp();
          return;
        }

        closeExitPrompt();
        return;
      }

      if (
        event.key === 'Backspace' ||
        event.key === 'Escape' ||
        event.key === 'GoBack' ||
        event.keyCode === 461
      ) {
        event.preventDefault();
        closeExitPrompt();
      }
    };

    window.addEventListener('keydown', onExitPromptKeyDown, true);
    return () => window.removeEventListener('keydown', onExitPromptKeyDown, true);
  }, [exitPromptFocus, showExitPrompt]);

  const activeDestination = destinations.find((destination) => destination.id === currentDestination) ?? destinations[0];
  const isPlayerActive = currentDestination === 'player';
  const isSidebarHidden = currentDestination === 'player' || currentDestination === 'details';
  const sidebarClassName = 'sidebar';
  const sidebarRailClassName = focusRegion === 'sidebar' ? 'sidebar__rail expanded' : 'sidebar__rail';
  const isSidebarExpanded = focusRegion === 'sidebar';

  return (
    <main
      className={isSidebarHidden ? 'app-shell authenticated-shell player-active' : 'app-shell authenticated-shell'}
      style={{
        width: '100vw',
        height: '100vh',
        background: '#030406',
        overflow: 'hidden',
        position: 'relative'
      }}
    >
      {!isSidebarHidden ? (
        <aside
          className={sidebarClassName}
          aria-label="Primary navigation"
          onKeyDownCapture={handleSidebarKeyDown}
          style={{
            position: 'fixed',
            left: '16px',
            top: '50%',
            transform: 'translateY(-50%)',
            height: '760px',
            bottom: 'auto',
            width: isSidebarExpanded ? '240px' : '76px',
            zIndex: 10,
            padding: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 0,
            background: 'transparent',
            borderRight: 0,
            boxShadow: 'none',
            transformOrigin: 'left center',
            overflow: 'visible',
            transition: 'width 220ms cubic-bezier(0.25, 1, 0.5, 1)'
          }}
        >
          <div
            className={sidebarRailClassName}
            style={{
              width: '100%',
              height: '100%',
              padding: isSidebarExpanded ? '24px 14px' : '24px 10px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              gap: isSidebarExpanded ? '16px' : '12px',
              background: isSidebarExpanded ? 'rgba(10, 12, 18, 0.92)' : 'rgba(10, 12, 18, 0.78)',
              backdropFilter: legacyChromiumBrowser ? 'none' : 'blur(20px)',
              WebkitBackdropFilter: legacyChromiumBrowser ? 'none' : 'blur(20px)',
              borderRadius: isSidebarExpanded ? '24px' : '38px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              boxShadow: legacyChromiumBrowser ? '0 10px 28px rgba(0, 0, 0, 0.42)' : '0 16px 48px rgba(0, 0, 0, 0.65)',
              overflowY: 'hidden',
              transition: 'background 220ms ease, width 220ms cubic-bezier(0.25, 1, 0.5, 1), padding 220ms ease, border-radius 220ms ease',
              transformOrigin: 'left center',
              boxSizing: 'border-box'
            }}
          >


              <button
                type="button"
                className={focusId === 'profile' ? 'sidebar__profile active' : 'sidebar__profile'}
                onMouseEnter={() => setFocusId('profile')}
                onFocus={() => setFocusId('profile')}
                onClick={() => activateSidebarItem('profile')}
                ref={(node) => {
                  navRefs.current.profile = node;
                }}
                style={{
                  position: 'relative',
                  border: 0,
                  borderRadius: '12px',
                  background: focusId === 'profile' ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                  color: '#ffffff',
                  width: '100%',
                  minHeight: '62px',
                  padding: isSidebarExpanded ? '0 12px' : '0 8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: isSidebarExpanded ? 'flex-start' : 'center',
                  gap: 0,
                  textAlign: 'left',
                  overflow: 'hidden',
                  outline: 'none',
                  boxShadow: focusId === 'profile'
                    ? '0 8px 24px rgba(0, 0, 0, 0.45), inset 0 0 0 1px rgba(255,255,255,0.1)'
                    : 'none',
                  transform: focusId === 'profile' ? 'scale(1.04) translateX(2px)' : 'none',
                  transition: 'background 120ms ease, color 120ms ease, transform 180ms cubic-bezier(0.25, 1, 0.5, 1), box-shadow 120ms ease'
                }}
              >
                {focusId === 'profile' ? (
                  <span
                    aria-hidden="true"
                    style={{
                      position: 'absolute',
                      left: '4px',
                      top: '12px',
                      bottom: '12px',
                      width: '3px',
                      borderRadius: '999px',
                      background: '#ff2438'
                    }}
                  />
                ) : null}
                <span
                  className="sidebar__profile-avatar"
                  aria-hidden="true"
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '8px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: selectedProfile?.avatarSeed && PRESET_AVATARS[selectedProfile.avatarSeed]
                       ? 'transparent'
                      : 'linear-gradient(180deg, #ff2438 0%, #991220 100%)',
                    color: '#ffffff',
                    fontSize: '14px',
                    fontWeight: 900,
                    flex: '0 0 42px',
                    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.3)',
                    overflow: 'hidden'
                  }}
                >
                  {selectedProfile?.avatarSeed && PRESET_AVATARS[selectedProfile.avatarSeed] ? (
                    PRESET_AVATARS[selectedProfile.avatarSeed]()
                  ) : (
                    selectedProfile?.avatarSeed ? selectedProfile.avatarSeed.slice(0, 2).toUpperCase() : 'PR'
                  )}
                </span>
                <span
                  className="sidebar__profile-copy"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    marginLeft: isSidebarExpanded ? '14px' : '0',
                    opacity: isSidebarExpanded ? 1 : 0,
                    maxWidth: isSidebarExpanded ? '130px' : '0',
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                    transform: isSidebarExpanded ? 'translateX(0)' : 'translateX(-8px)',
                    gap: '2px',
                    transition: 'opacity 150ms ease, max-width 150ms ease, transform 180ms ease'
                  }}
                >
                  <strong style={{ color: '#ffffff', fontSize: '17px', fontWeight: 800 }}>
                    {selectedProfile?.name || 'Profile'}
                  </strong>
                  <small style={{ color: 'rgba(255, 255, 255, 0.54)', fontSize: '11px', fontWeight: 700 }}>
                    {selectedProfile?.isKids ? 'Kids profile' : 'Primary profile'}
                  </small>
                </span>
              </button>

              <div
                style={{
                  height: '1px',
                  width: '100%',
                  background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1) 20%, rgba(255, 255, 255, 0.1) 80%, transparent)',
                  margin: '6px 0'
                }}
              />

              <nav
                className="sidebar__nav"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  alignItems: 'stretch',
                  width: '100%',
                  justifyContent: 'flex-start',
                  paddingTop: '0',
                  flex: 'none'
                }}
              >
                {sidebarItems.map((destination) => {
                  const isFocused = focusId === destination.id;
                  const isActive = currentDestination === destination.id;
                  const className = [
                    'nav-item',
                    isActive ? 'selected' : '',
                    isFocused ? 'focused' : ''
                  ].filter(Boolean).join(' ');

                  return (
                    <button
                      key={destination.id}
                      type="button"
                      ref={(node) => {
                        navRefs.current[destination.id] = node;
                      }}
                      className={className}
                      onMouseEnter={() => setFocusId(destination.id)}
                      onFocus={() => {
                        setFocusId(destination.id);
                      }}
                      onClick={() => activateSidebarItem(destination.id)}
                      style={{
                        position: 'relative',
                        border: 0,
                        borderRadius: '12px',
                        background: isFocused ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                        color: (isFocused || isActive)
                          ? '#ffffff'
                          : 'rgba(255, 255, 255, 0.45)',
                        width: '100%',
                        minHeight: '52px',
                        padding: isSidebarExpanded ? '0 12px' : '0 8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: isSidebarExpanded ? 'flex-start' : 'center',
                        gap: 0,
                        overflow: 'hidden',
                        outline: 'none',
                        boxShadow: isFocused
                          ? '0 8px 24px rgba(0, 0, 0, 0.45), inset 0 0 0 1px rgba(255,255,255,0.1)'
                          : 'none',
                        transform: isFocused ? 'scale(1.04) translateX(2px)' : 'none',
                        transition: 'background 120ms ease, color 120ms ease, transform 180ms cubic-bezier(0.25, 1, 0.5, 1), box-shadow 120ms ease'
                      }}
                    >
                      {isActive ? (
                        <span
                          aria-hidden="true"
                          style={{
                            position: 'absolute',
                            left: '4px',
                            top: '12px',
                            bottom: '12px',
                            width: '3px',
                            borderRadius: '999px',
                            background: '#ff2438'
                          }}
                        />
                      ) : isFocused ? (
                        <span
                          aria-hidden="true"
                          style={{
                            position: 'absolute',
                            left: '4px',
                            top: '12px',
                            bottom: '12px',
                            width: '3px',
                            borderRadius: '999px',
                            background: '#ff2438'
                          }}
                        />
                      ) : null}
                      <span
                        className="nav-item__icon"
                        aria-hidden="true"
                        style={{
                          width: '30px',
                          height: '30px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          lineHeight: 1,
                          flex: '0 0 30px',
                          color: 'inherit'
                        }}
                      >
                        <NavIcon name={destination.icon} />
                      </span>
                      <span
                        className="nav-item__label"
                        style={{
                          marginLeft: isSidebarExpanded ? '14px' : '0',
                          opacity: isSidebarExpanded ? 1 : 0,
                          maxWidth: isSidebarExpanded ? '130px' : '0',
                          overflow: 'hidden',
                          whiteSpace: 'nowrap',
                          transform: isSidebarExpanded ? 'translateX(0)' : 'translateX(-8px)',
                          fontSize: '17px',
                          fontWeight: 700,
                          transition: 'opacity 150ms ease, max-width 150ms ease, transform 180ms ease'
                        }}
                      >
                        {destination.label}
                      </span>
                    </button>
                  );
                })}
              </nav>
            <div
              style={{
                height: '1px',
                width: '100%',
                background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1) 20%, rgba(255, 255, 255, 0.1) 80%, transparent)',
                margin: '6px 0'
              }}
            />

            <button
              type="button"
              className={focusId === 'settings' ? 'sidebar__footer-item focused' : 'sidebar__footer-item'}
              onMouseEnter={() => setFocusId('settings')}
              onFocus={() => setFocusId('settings')}
              onClick={() => activateSidebarItem('settings')}
              ref={(node) => {
                navRefs.current.settings = node;
              }}
              style={{
                position: 'relative',
                border: 0,
                borderRadius: '12px',
                background: focusId === 'settings' ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                color: (focusId === 'settings' || currentDestination === 'settings')
                  ? '#ffffff'
                  : 'rgba(255, 255, 255, 0.45)',
                width: '100%',
                minHeight: '52px',
                padding: isSidebarExpanded ? '0 12px' : '0 8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: isSidebarExpanded ? 'flex-start' : 'center',
                gap: 0,
                overflow: 'hidden',
                outline: 'none',
                boxShadow: focusId === 'settings'
                  ? '0 8px 24px rgba(0, 0, 0, 0.45), inset 0 0 0 1px rgba(255,255,255,0.1)'
                  : 'none',
                transform: focusId === 'settings' ? 'scale(1.04) translateX(2px)' : 'none',
                transition: 'background 120ms ease, color 120ms ease, transform 180ms cubic-bezier(0.25, 1, 0.5, 1), box-shadow 120ms ease'
              }}
            >
              {currentDestination === 'settings' ? (
                <span
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    left: '4px',
                    top: '12px',
                    bottom: '12px',
                    width: '3px',
                    borderRadius: '999px',
                    background: '#ff2438'
                  }}
                />
              ) : focusId === 'settings' ? (
                <span
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    left: '4px',
                    top: '12px',
                    bottom: '12px',
                    width: '3px',
                    borderRadius: '999px',
                    background: '#ff2438'
                  }}
                />
              ) : null}
              <span
                className="nav-item__icon"
                aria-hidden="true"
                style={{
                  width: '30px',
                  height: '30px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  lineHeight: 1,
                  flex: '0 0 30px',
                  color: 'inherit'
                }}
              >
                <NavIcon name="settings" />
              </span>
              <span
                className="nav-item__label"
                style={{
                  marginLeft: isSidebarExpanded ? '14px' : '0',
                  opacity: isSidebarExpanded ? 1 : 0,
                  maxWidth: isSidebarExpanded ? '130px' : '0',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  transform: isSidebarExpanded ? 'translateX(0)' : 'translateX(-8px)',
                  fontSize: '17px',
                  fontWeight: 700,
                  transition: 'opacity 150ms ease, max-width 150ms ease, transform 180ms ease'
                }}
              >
                Settings
              </span>
            </button>
          </div>
        </aside>
      ) : null}

      <div
        className={isSidebarHidden ? 'shell-content shell-content--player' : 'shell-content'}
        style={{
          minWidth: 0,
          height: '100%',
          padding: 0,
          position: 'relative',
          zIndex: 1,
          marginLeft: isSidebarHidden ? 0 : '92px'
        }}
      >
        {currentDestination === 'home' ? (
          <HomeScreen
            isActive={isContentDestination}
            onRequestSidebarFocus={() => {
              setFocusRegion('sidebar');
              setFocusId(getSidebarFocusTarget());
            }}
          />
        ) : currentDestination === 'movies' ? (
        <MoviesScreen
          onRequestSidebarFocus={() => {
            setFocusRegion('sidebar');
            setFocusId(getSidebarFocusTarget());
          }}
          contentFocusToken={moviesContentFocusToken}
          onContentRegionChange={setMoviesContentRegion}
        />
      ) : currentDestination === 'series' ? (
        <SeriesScreen
          onRequestSidebarFocus={() => {
            setFocusRegion('sidebar');
            setFocusId(getSidebarFocusTarget());
          }}
          contentFocusToken={seriesContentFocusToken}
          onContentRegionChange={setSeriesContentRegion}
        />
        ) : currentDestination === 'live' ? (
        <LiveScreen
          onRequestSidebarFocus={() => {
            setFocusRegion('sidebar');
            setFocusId(getSidebarFocusTarget());
          }}
          contentFocusToken={liveContentFocusToken}
          onContentRegionChange={setLiveContentRegion}
        />
        ) : currentDestination === 'search' ? (
          <SearchScreen
            isActive={isContentDestination}
            onRequestSidebarFocus={() => {
              setFocusRegion('sidebar');
              setFocusId(getSidebarFocusTarget());
            }}
          />
        ) : currentDestination === 'details' ? (
          <DetailsScreen />
        ) : currentDestination === 'player' ? (
          <PlayerScreen key={`${selectedPlayback?.id ?? 'player'}:${selectedPlayback?.streamUrl ?? 'empty'}`} />
        ) : currentDestination === 'watchlist' ? (
          <WatchlistScreen
            isActive={isContentDestination}
            onRequestSidebarFocus={() => {
              setFocusRegion('sidebar');
              setFocusId(getSidebarFocusTarget());
            }}
          />
        ) : currentDestination === 'settings' ? (
          <SettingsScreen
            isActive={isContentDestination}
            onRequestSidebarFocus={() => {
              setFocusRegion('sidebar');
              setFocusId(getSidebarFocusTarget());
            }}
          />
        ) : (
          <PlaceholderScreen title={activeDestination.label} description={activeDestination.description} />
        )}
      </div>

      {showExitPrompt ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Exit Smartifly"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(3, 4, 6, 0.72)',
            backdropFilter: legacyChromiumBrowser ? 'none' : 'blur(8px)'
          }}
        >
          <div
            style={{
              width: '560px',
              maxWidth: 'calc(100vw - 64px)',
              borderRadius: '28px',
              padding: '32px',
              background: 'linear-gradient(180deg, rgba(16, 19, 25, 0.98) 0%, rgba(10, 13, 18, 0.98) 100%)',
              boxShadow: '0 28px 80px rgba(0,0,0,0.45), inset 0 0 0 1px rgba(255,255,255,0.05)'
            }}
          >
            <p
              style={{
                margin: 0,
                color: '#f5d06a',
                fontSize: '12px',
                fontWeight: 800,
                letterSpacing: '2px',
                textTransform: 'uppercase'
              }}
            >
              Exit Confirmation
            </p>
            <h2 style={{ margin: '16px 0 10px', fontSize: '34px', lineHeight: 1.08, fontWeight: 800 }}>
              Exit Smartifly?
            </h2>
            <p style={{ margin: 0, color: 'rgba(231,236,244,0.76)', fontSize: '18px', lineHeight: 1.55 }}>
              Press Exit to close the app, or Cancel to stay on Home.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginTop: '28px' }}>
              {(['cancel', 'exit'] as const).map((action) => {
                const isFocused = exitPromptFocus === action;
                const isExit = action === 'exit';

                return (
                  <button
                    key={action}
                    type="button"
                    ref={(node) => {
                      exitPromptRefs.current[action] = node;
                    }}
                    onFocus={() => setExitPromptFocus(action)}
                    onMouseEnter={() => setExitPromptFocus(action)}
                    onClick={() => {
                      if (isExit) {
                        exitApp();
                        return;
                      }

                      closeExitPrompt();
                    }}
                    style={{
                      minHeight: '68px',
                      border: 0,
                      borderRadius: '18px',
                      background: isExit
                        ? 'linear-gradient(180deg, rgba(126, 31, 52, 0.96), rgba(97, 20, 37, 0.98))'
                        : isFocused
                          ? '#242c3d'
                          : '#1d2331',
                      color: '#ffffff',
                      fontSize: '20px',
                      fontWeight: 800,
                      boxShadow: isFocused
                        ? '0 0 0 2px rgba(255,255,255,0.16), 0 12px 22px rgba(0,0,0,0.24)'
                        : 'inset 0 -1px 0 rgba(255,255,255,0.02)',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    {isExit ? 'Exit' : 'Cancel'}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

export default AppShell;
