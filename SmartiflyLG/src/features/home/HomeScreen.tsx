import { type KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';
import { createXtreamApi } from '../../services/api';
import { useAppStore } from '../../store/appStore';
import { buildLivePlaybackRequest } from '../live/livePlayback';
import { buildResumePlaybackRequest } from '../player/buildResumePlayback';
import { cardDebugOverlay } from '../../styles/lgTvStyles';
import { fallbackHero, type ChannelItem, type RailSection, type HeroItem } from './homeBootstrap';
import useWatchHistoryStore, { buildWatchHistoryScope } from '../../store/watchHistoryStore';
import { SafeCardImage } from '../../components/SafeCardImage';
import { scrollIntoViewCompat } from '../../utils/legacyBrowser';

/** Sized for 10-foot UI on webOS (avoid clamp/grid; fixed px). */
const HOME_RAIL_CARD = {
  poster: { width: 268, height: 402, railHeight: 448 },
  live: { width: 440, height: 248, railHeight: 294 }
} as const;

const RAIL_SCROLLBAR_HIDE = 34;
const RAIL_CARD_GAP = 22;

/** Taller featured banner on TV (was 580px in first inline pass). */
const HOME_HERO_MIN_HEIGHT = 700;

const HOME_HERO_SHELL_BACKGROUND =
  'radial-gradient(circle at 72% 42%, rgba(229, 9, 20, 0.08), transparent 22%), linear-gradient(90deg, #050608 0%, #050608 100%)';

const HOME_HERO_ART_PANEL = {
  left: 0,
  background:
    'radial-gradient(circle at 68% 40%, rgba(229, 9, 20, 0.06), transparent 38%), #050608'
} as const;

/** Dark left for copy, clear right for photo, soft bottom into rails. */
const HOME_HERO_OVERLAY_BACKGROUND =
  'linear-gradient(90deg, rgba(5, 6, 8, 0.96) 0%, rgba(5, 6, 8, 0.88) 22%, rgba(5, 6, 8, 0.62) 42%, rgba(5, 6, 8, 0.12) 70%, transparent 100%), linear-gradient(180deg, rgba(5, 6, 8, 0) 0%, rgba(5, 6, 8, 0.2) 60%, #050608 100%)';

const HOME_HERO_BACKDROP_IMAGE = {
  objectFit: 'cover' as const,
  objectPosition: '78% 15%',
  filter: 'saturate(1.08) brightness(0.78) contrast(1.06)',
  transform: 'none',
  opacity: 0.94
};

const HOME_HERO_LIVE_LOGO_IMAGE = {
  objectFit: 'contain' as const,
  objectPosition: 'center center',
  filter: 'saturate(1.05) brightness(0.88) contrast(1.04)',
  transform: 'scale(1)',
  opacity: 1
};

function makeFocusId(railId: string, itemId: string) {
  return `rail:${railId}:${itemId}`;
}

function parseFocusId(focusId: string) {
  if (!focusId.startsWith('rail:')) {
    return null;
  }

  const [, railId, itemId] = focusId.split(':');
  if (!railId || !itemId) {
    return null;
  }

  return { railId, itemId };
}

function hasFocusTarget(focusId: string, rails: RailSection[]) {
  if (focusId === 'play' || focusId === 'info') {
    return true;
  }

  const parsed = parseFocusId(focusId);
  if (!parsed) {
    return false;
  }

  const rail = rails.find((entry) => entry.id === parsed.railId);
  if (!rail) {
    return false;
  }

  return rail.items.some((item) => item.id === parsed.itemId);
}

function truncateDebugValue(value: string | undefined, maxLength = 42) {
  if (!value) {
    return 'n/a';
  }

  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}...` : value;
}

function getDebugExtension(item: ChannelItem) {
  if (item.kind === 'live') {
    return 'm3u8';
  }

  if (item.kind === 'series') {
    return 'series';
  }

  return item.containerExtension || 'auto';
}

type HomeScreenProps = {
  isActive: boolean;
  onRequestSidebarFocus: () => void;
};

function HomeScreen({ isActive, onRequestSidebarFocus }: HomeScreenProps) {
  const session = useAppStore((state) => state.session);
  const selectedProfile = useAppStore((state) => state.selectedProfile);
  const currentDestination = useAppStore((state) => state.currentDestination);
  const homeFocusId = useAppStore((state) => state.homeFocusId);
  const openContentDetails = useAppStore((state) => state.openContentDetails);
  const openPlayback = useAppStore((state) => state.openPlayback);
  const setCurrentDestination = useAppStore((state) => state.setCurrentDestination);
  const setHomeFocusId = useAppStore((state) => state.setHomeFocusId);
  const setStatusMessage = useAppStore((state) => state.setStatusMessage);
  const homeBootstrapData = useAppStore((state) => state.homeBootstrapData);
  const bootstrapStatus = useAppStore((state) => state.bootstrapStatus);
  const [focusId, setFocusId] = useState<'play' | 'info' | string>(homeFocusId === 'info' ? 'info' : homeFocusId);
  const elementRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const heroSectionRef = useRef<HTMLElement | null>(null);
  const lastTopRailFocusId = useRef<string>('');
  const lastHeroFocusId = useRef<'play' | 'info'>(homeFocusId === 'info' ? 'info' : 'play');
  const [heroImageFailed, setHeroImageFailed] = useState(false);
  const [failedHeroIds, setFailedHeroIds] = useState<Set<string>>(new Set());

  const candidates = homeBootstrapData?.heroCandidates ?? [];

  const activeCandidates = useMemo(() => {
    return candidates.filter((item) => !failedHeroIds.has(item.id));
  }, [candidates, failedHeroIds]);

  const [chosenHero, setChosenHero] = useState<HeroItem | null>(null);

  useEffect(() => {
    if (activeCandidates.length > 0) {
      if (!chosenHero || !activeCandidates.some((c) => c.id === chosenHero.id)) {
        const randomIndex = Math.floor(Math.random() * activeCandidates.length);
        setChosenHero(activeCandidates[randomIndex]);
        setHeroImageFailed(false);
      }
    } else {
      setChosenHero(homeBootstrapData?.hero ?? fallbackHero);
    }
  }, [activeCandidates, chosenHero, homeBootstrapData]);

  const heroItem = chosenHero ?? fallbackHero;
  const heroHasArtwork = Boolean(heroItem.artwork && !heroImageFailed);
  const heroImagePresentation =
    heroItem.kind === 'live' ? HOME_HERO_LIVE_LOGO_IMAGE : HOME_HERO_BACKDROP_IMAGE;

  const watchHistory = useWatchHistoryStore((state) => state.history);
  const continueWatchingItems = useMemo(() => {
    const scope = buildWatchHistoryScope(
      session?.portalCode,
      session?.username,
      selectedProfile?.id
    );

    return Object.values(watchHistory)
      .filter((item) => item.id.startsWith(scope))
      .filter((item) => !item.completed && item.progress > 0)
      .sort((a, b) => b.lastWatched - a.lastWatched)
      .slice(0, 8);
  }, [selectedProfile?.id, session?.portalCode, session?.username, watchHistory]);

  const rails = useMemo(() => {
    const rawRails = homeBootstrapData?.rails ?? [];
    if (continueWatchingItems.length === 0) {
      return rawRails;
    }

    const continueRail = {
      id: 'continue-watching',
      title: 'Continue Watching',
      kind: 'movie',
      items: continueWatchingItems.map((item) => ({
        id: `continue-${item.type}-${item.streamId}`,
        contentId: item.streamId,
        name: item.title,
        artwork: item.thumbnail || '',
        kind: (item.type === 'series' ? 'series' : 'movie') as any,
        fallbackLabel: item.title.slice(0, 2).toUpperCase(),
        accent: '#e50914',
        containerExtension: item.containerExtension,
        data: item
      }))
    };

    return [continueRail, ...rawRails] as RailSection[];
  }, [homeBootstrapData?.rails, continueWatchingItems]);
  const notice = homeBootstrapData?.notice ?? (
      bootstrapStatus === 'loading'
      ? {
          title: 'Loading home content',
          body: 'Fetching hero, live channels, series, and movie rails.'
        }
      : null
  );

  const focusedRailItem = useMemo(() => {
    const parsed = parseFocusId(focusId);
    if (!parsed) {
      return null;
    }

    const rail = rails.find((entry) => entry.id === parsed.railId);
    if (!rail) {
      return null;
    }

    return rail.items.find((item) => item.id === parsed.itemId) ?? null;
  }, [focusId, rails]);

  useEffect(() => {
    setFocusId(homeFocusId === 'info' ? 'info' : homeFocusId);
  }, [homeFocusId]);

  useEffect(() => {
    setHomeFocusId(focusId);
  }, [focusId, setHomeFocusId]);

  useEffect(() => {
    if (focusId === 'play' || focusId === 'info') {
      lastHeroFocusId.current = focusId;
    }
  }, [focusId]);

  useEffect(() => {
    const parsed = parseFocusId(focusId);
    if (!parsed || rails[0]?.id !== parsed.railId) {
      return;
    }

    lastTopRailFocusId.current = focusId;
  }, [focusId, rails]);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    if (focusId.startsWith('rail:') && rails.length === 0) {
      return;
    }

    if (!hasFocusTarget(focusId, rails)) {
      if (focusId !== 'play') {
        setFocusId('play');
      }
      return;
    }

    const activeElement = elementRefs.current[focusId];
    if (activeElement && document.activeElement !== activeElement) {
      activeElement.focus();
    }

    if (focusId === 'play' || focusId === 'info') {
      scrollIntoViewCompat(heroSectionRef.current, {
        block: 'start',
        inline: 'nearest'
      });
    }
  }, [focusId, isActive, rails]);

  const handleHeroInfo = () => {
    if (heroItem.kind === 'live') {
      setCurrentDestination('live');
      return;
    }

    if (!heroItem.contentId) {
      setStatusMessage('Content details are not ready yet');
      return;
    }

    openContentDetails(
      {
        id: heroItem.id,
        contentId: heroItem.contentId,
        kind: heroItem.kind,
        title: heroItem.title,
        categoryId: heroItem.categoryId,
        posterUrl: heroItem.artwork,
        backdropUrl: heroItem.artwork,
        description: heroItem.description
      },
      currentDestination === 'details' || currentDestination === 'player' ? 'home' : currentDestination
    );
  };

  const handleHeroPlay = async () => {
    const username = session?.username?.trim();
    const password = session?.userInfo?.password?.trim();
    const portalBaseUrl = session?.portalBaseUrl?.trim();

    if (!username || !password || !portalBaseUrl || !heroItem.contentId) {
      setStatusMessage('Playback is not ready yet');
      return;
    }

    const api = createXtreamApi(portalBaseUrl);

    if (heroItem.kind === 'live') {
      openPlayback({
        id: heroItem.id,
        kind: 'live',
        title: heroItem.title,
        description: heroItem.description,
        posterUrl: heroItem.artwork,
        backdropUrl: heroItem.artwork,
        streamUrl: api.getLiveStreamUrl(username, password, heroItem.contentId, 'm3u8'),
        returnDestination: 'home'
      });
      return;
    }

    if (heroItem.kind === 'movie') {
      openPlayback({
        id: heroItem.id,
        kind: 'movie',
        title: heroItem.title,
        description: heroItem.description,
        posterUrl: heroItem.artwork,
        backdropUrl: heroItem.artwork,
        streamUrl: api.getVodStreamUrl(username, password, heroItem.contentId, heroItem.containerExtension || 'mp4'),
        returnDestination: 'home',
        streamId: heroItem.contentId,
        containerExtension: heroItem.containerExtension || 'mp4'
      });
      return;
    }

    try {
      const info = await api.getSeriesInfo(username, password, heroItem.contentId);
      const seasonIds = Object.keys(info.episodes ?? {}).sort((a, b) => Number(a) - Number(b));
      const firstSeasonWithEpisodes = seasonIds.find((seasonId) => (info.episodes?.[seasonId] ?? []).length > 0);
      const firstEpisode = firstSeasonWithEpisodes ? info.episodes?.[firstSeasonWithEpisodes]?.[0] : undefined;
      const episodeId = firstEpisode?.stream_id || Number(firstEpisode?.id || 0);

      if (!firstEpisode || !episodeId) {
        setStatusMessage('No episode is available for playback yet');
        return;
      }

      openPlayback({
        id: `episode-${firstEpisode.id || episodeId}`,
        kind: 'series',
        title: heroItem.title,
        episodeTitle: firstEpisode.title?.trim() || undefined,
        description: firstEpisode.plot?.trim() || firstEpisode.info?.plot?.trim() || heroItem.description,
        posterUrl: firstEpisode.info?.movie_image?.trim() || heroItem.artwork,
        backdropUrl: heroItem.artwork,
        streamUrl: api.getSeriesStreamUrl(username, password, episodeId, firstEpisode.container_extension?.trim() || 'mp4'),
        returnDestination: 'home',
        streamId: episodeId,
        seriesId: heroItem.contentId,
        seasonNumber: Number(firstSeasonWithEpisodes) || 1,
        episodeNumber: Number(firstEpisode.episode_num || 0) || 1,
        containerExtension: firstEpisode.container_extension?.trim() || 'mp4'
      });
    } catch {
      setStatusMessage('Series playback is not ready yet');
    }
  };

  const handleRailActivate = async (rail: RailSection, item: ChannelItem) => {
    const username = session?.username?.trim();
    const password = session?.userInfo?.password?.trim();
    const portalBaseUrl = session?.portalBaseUrl?.trim();

    if (!username || !password || !portalBaseUrl) {
      setStatusMessage('Playback is not ready yet');
      return;
    }

    if (rail.id === 'continue-watching') {
      const progress = (item as any).data as WatchProgress;
      if (progress) {
        const playback = await buildResumePlaybackRequest({
          progress,
          session,
          returnDestination: 'home'
        });

        if (!playback) {
          setStatusMessage('Resume playback is not ready yet');
          return;
        }

        openPlayback(playback);
        return;
      }
    }

    if (rail.kind === 'live') {
      const playback = buildLivePlaybackRequest({
        username,
        password,
        portalBaseUrl,
        channels: rail.items.map((entry) => ({
          id: entry.id,
          title: entry.name,
          streamId: entry.contentId,
          artwork: entry.artwork
        })),
        selectedChannelId: item.id,
        returnDestination: 'home'
      });

      if (!playback) {
        setStatusMessage('Live playback is not ready yet');
        return;
      }

      openPlayback(playback);
      return;
    }

    openContentDetails(
      {
        id: item.id,
        contentId: item.contentId,
        kind: item.kind as 'series' | 'movie',
        title: item.name,
        categoryId: item.categoryId,
        posterUrl: item.artwork,
        backdropUrl: item.artwork,
        description: item.name
      },
      currentDestination === 'details' || currentDestination === 'player' ? 'home' : currentDestination
    );
  };

  const onContentKeyDown = (event: KeyboardEvent<HTMLButtonElement>, currentFocusId: string) => {
    if (currentFocusId === 'play') {
      if (event.key === 'Enter') {
        event.preventDefault();
        void handleHeroPlay();
        return;
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        setFocusId('info');
        return;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        if (lastTopRailFocusId.current && hasFocusTarget(lastTopRailFocusId.current, rails)) {
          setFocusId(lastTopRailFocusId.current);
        } else if (rails[0]?.items[0]) {
          setFocusId(makeFocusId(rails[0].id, rails[0].items[0].id));
        }
        return;
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        onRequestSidebarFocus();
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        onRequestSidebarFocus();
      }

      return;
    }

    if (currentFocusId === 'info') {
      if (event.key === 'Enter') {
        event.preventDefault();
        handleHeroInfo();
        return;
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        setFocusId('play');
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        onRequestSidebarFocus();
        return;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        if (lastTopRailFocusId.current && hasFocusTarget(lastTopRailFocusId.current, rails)) {
          setFocusId(lastTopRailFocusId.current);
        } else if (rails[0]?.items[1]) {
          setFocusId(makeFocusId(rails[0].id, rails[0].items[1].id));
        } else if (rails[0]?.items[0]) {
          setFocusId(makeFocusId(rails[0].id, rails[0].items[0].id));
        }
        return;
      }

      return;
    }

    const parsed = parseFocusId(currentFocusId);
    if (!parsed) {
      return;
    }

    const currentRailIndex = rails.findIndex((rail) => rail.id === parsed.railId);
    if (currentRailIndex === -1) {
      return;
    }

    const currentRail = rails[currentRailIndex];
    const currentItemIndex = currentRail.items.findIndex((item) => item.id === parsed.itemId);
    if (currentItemIndex === -1) {
      return;
    }

    const currentItem = currentRail.items[currentItemIndex];

    if (event.key === 'Enter') {
      event.preventDefault();
      void handleRailActivate(currentRail, currentItem);
      return;
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      if (currentItemIndex === 0) {
        if (currentRailIndex === 0) {
          onRequestSidebarFocus();
          return;
        }

        const previousRail = rails[currentRailIndex - 1];
        const previousIndex = Math.min(currentItemIndex, previousRail.items.length - 1);
        const previousItem = previousRail.items[previousIndex];
        if (previousItem) {
          setFocusId(makeFocusId(previousRail.id, previousItem.id));
        }
        return;
      }

      const previousItem = currentRail.items[currentItemIndex - 1];
      if (previousItem) {
        setFocusId(makeFocusId(currentRail.id, previousItem.id));
      }
      return;
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      const nextIndex = Math.min(currentItemIndex + 1, currentRail.items.length - 1);
      const nextItem = currentRail.items[nextIndex];
      if (nextItem) {
        setFocusId(makeFocusId(currentRail.id, nextItem.id));
      }
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (currentRailIndex === 0) {
        lastTopRailFocusId.current = currentFocusId;
        setFocusId(lastHeroFocusId.current);
        return;
      }

      const previousRail = rails[currentRailIndex - 1];
      const previousIndex = Math.min(currentItemIndex, previousRail.items.length - 1);
      const previousItem = previousRail.items[previousIndex];
      if (previousItem) {
        setFocusId(makeFocusId(previousRail.id, previousItem.id));
      }
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const nextRail = rails[currentRailIndex + 1];
      if (!nextRail) {
        return;
      }

      const nextIndex = Math.min(currentItemIndex, nextRail.items.length - 1);
      const nextItem = nextRail.items[nextIndex];
      if (nextItem) {
        setFocusId(makeFocusId(nextRail.id, nextItem.id));
      }
    }
  };

  return (
    <section
      className="content-screen lg-home"
      aria-label="Smartifly home"
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
        gap: '20px',
        overflowY: 'hidden',
        padding: '0 0 12px'
      }}
    >
      <section
        ref={(node) => {
          heroSectionRef.current = node;
        }}
        className="lg-home__hero"
        style={{
          position: 'relative',
          minHeight: `${HOME_HERO_MIN_HEIGHT}px`,
          overflow: 'hidden',
          background: HOME_HERO_SHELL_BACKGROUND
        }}
      >
        <div
          className="lg-home__hero-art"
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            left: HOME_HERO_ART_PANEL.left,
            zIndex: 0,
            overflow: 'hidden',
            background: HOME_HERO_ART_PANEL.background
          }}
        >
          {heroHasArtwork ? (
            <img
              src={heroItem.artwork}
              alt=""
              loading="eager"
              fetchPriority="high"
              decoding="async"
              onError={() => {
                setHeroImageFailed(true);
                if (heroItem.id !== 'fallback-hero') {
                  setFailedHeroIds((prev) => {
                    const next = new Set(prev);
                    next.add(heroItem.id);
                    return next;
                  });
                }
              }}
              style={{
                position: 'absolute',
                top: 0,
                right: 0,
                bottom: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: heroImagePresentation.objectFit,
                objectPosition: heroImagePresentation.objectPosition,
                filter: heroImagePresentation.filter,
                transform: heroImagePresentation.transform,
                opacity: heroImagePresentation.opacity
              }}
            />
          ) : null}
          <div
            className="lg-home__hero-overlay"
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
              background: HOME_HERO_OVERLAY_BACKGROUND,
              pointerEvents: 'none'
            }}
          />
          {!heroHasArtwork ? (
            <div
              className="lg-home__lockmark"
              style={{
                position: 'relative',
                width: '144px',
                height: '198px',
                marginLeft: 'auto',
                marginTop: '78px',
                marginRight: '212px',
                borderRadius: '74px 74px 20px 20px',
                background: 'linear-gradient(180deg, rgba(41, 68, 124, 0.72) 0%, rgba(22, 33, 62, 0.24) 100%)',
                opacity: 0.82,
                filter: 'blur(1px)'
              }}
            />
          ) : null}
        </div>

        <div
          className="lg-home__hero-copy"
          style={{
            position: 'relative',
            zIndex: 1,
            width: '100%',
            maxWidth: '920px',
            padding: '96px 58px 28px',
            display: 'flex',
            flexDirection: 'column',
            boxSizing: 'border-box'
          }}
        >
          <img
            src="./assets/smartifly_icon.png"
            alt="Smartifly"
            style={{
              width: '280px',
              height: 'auto',
              marginBottom: '24px',
              marginLeft: '-8px',
              display: 'block',
              filter: 'drop-shadow(0 4px 10px rgba(0, 0, 0, 0.6))'
            }}
          />
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', marginBottom: '14px' }}>
            <span
              className="lg-home__badge"
              style={{
                padding: '5px 10px',
                borderRadius: '8px',
                background: '#e50914',
                color: '#ffffff',
                fontSize: '11px',
                lineHeight: 1,
                fontWeight: 900,
                letterSpacing: '0.5px',
                textTransform: 'uppercase'
              }}
            >
              {heroItem.badge}
            </span>
            <span
              style={{
                color: '#e50914',
                fontSize: '20px',
                fontWeight: 700,
                marginLeft: '12px'
              }}
            >
              {heroItem.section}
            </span>
          </div>

          <h1
            style={{
              margin: '0 0 14px',
              color: '#ffffff',
              fontSize: '62px',
              lineHeight: 0.95,
              letterSpacing: '-1.8px',
              fontWeight: 900,
              textShadow: '0 4px 18px rgba(0, 0, 0, 0.75), 0 1px 2px rgba(0, 0, 0, 0.4)'
            }}
          >
            {heroItem.title}
          </h1>

          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              flexWrap: 'wrap',
              marginBottom: '14px',
              color: 'rgba(255, 255, 255, 0.74)',
              fontSize: '14px',
              fontWeight: 700
            }}
          >
            {heroItem.meta.map((item, index) => (
              <span
                key={`${item}-${index}`}
                style={
                  index === heroItem.meta.length - 1
                    ? {
                        padding: '6px 12px',
                        borderRadius: '10px',
                        background: 'rgba(255, 255, 255, 0.14)',
                        color: 'rgba(255, 255, 255, 0.9)',
                        fontSize: '12px',
                        fontWeight: 800,
                        letterSpacing: '0.4px',
                        marginRight: '10px',
                        marginBottom: '4px'
                      }
                    : {
                        marginRight: '10px',
                        marginBottom: '4px'
                      }
                }
              >
                {item}
              </span>
            ))}
          </div>

          <p
            style={{
              margin: '0 0 18px',
              maxWidth: '840px',
              color: 'rgba(255, 255, 255, 0.9)',
              fontSize: '19px',
              lineHeight: 1.45,
              fontWeight: 400
            }}
          >
            {heroItem.description}
          </p>

          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              ref={(node) => {
                elementRefs.current.play = node;
              }}
              onFocus={() => setFocusId('play')}
              onMouseEnter={() => setFocusId('play')}
              onClick={() => {
                void handleHeroPlay();
              }}
              onKeyDown={(event) => onContentKeyDown(event, 'play')}
              style={{
                minWidth: '160px',
                height: '58px',
                marginRight: '14px',
                marginBottom: '8px',
                padding: '0 20px',
                border: 0,
                borderRadius: '16px',
                display: 'inline-flex',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                fontWeight: 800,
                background: 'linear-gradient(180deg, #ff2438 0%, #b40e1d 100%)',
                color: '#ffffff',
                WebkitAppearance: 'none',
                appearance: 'none',
                boxShadow: focusId === 'play'
                  ? '0 0 0 3px rgba(255, 255, 255, 0.94), 0 18px 34px rgba(0, 0, 0, 0.28)'
                  : 'inset 0 0 0 1px rgba(255, 255, 255, 0.2), 0 14px 28px rgba(229, 9, 20, 0.25)'
              }}
            >
              <span
                style={{
                  width: '28px',
                  height: '28px',
                  marginRight: '12px',
                  borderRadius: '999px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                  fontWeight: 900,
                  flex: '0 0 28px',
                  color: '#ffffff'
                }}
              >
                ▶
              </span>
              <span>Play</span>
            </button>

            <button
              type="button"
              ref={(node) => {
                elementRefs.current.info = node;
              }}
              onFocus={() => setFocusId('info')}
              onMouseEnter={() => setFocusId('info')}
              onClick={handleHeroInfo}
              onKeyDown={(event) => onContentKeyDown(event, 'info')}
              style={{
                minWidth: '160px',
                height: '58px',
                marginRight: '14px',
                marginBottom: '8px',
                padding: '0 20px',
                border: 0,
                borderRadius: '16px',
                display: 'inline-flex',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                fontWeight: 800,
                background: 'rgba(70, 56, 30, 0.46)',
                color: 'rgba(255, 255, 255, 0.92)',
                WebkitAppearance: 'none',
                appearance: 'none',
                boxShadow: focusId === 'info'
                  ? '0 0 0 3px rgba(255, 255, 255, 0.94), 0 18px 34px rgba(0, 0, 0, 0.28)'
                  : 'none'
              }}
            >
              <span
                style={{
                  width: '28px',
                  height: '28px',
                  marginRight: '12px',
                  borderRadius: '999px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                  fontWeight: 900,
                  flex: '0 0 28px',
                  background: 'rgba(0, 0, 0, 0.62)',
                  color: '#ffffff'
                }}
              >
                i
              </span>
              <span>More Info</span>
            </button>
          </div>
        </div>
      </section>

      <section className="lg-home__rails" aria-label="Home sections">
        {rails.map((rail, railIndex) => {
          const isLiveRail = rail.kind === 'live';
          const isLandscape = isLiveRail || rail.id === 'continue-watching';
          const cardSize = isLandscape ? HOME_RAIL_CARD.live : HOME_RAIL_CARD.poster;

          return (
          <section
            key={rail.id}
            aria-label={rail.title}
            style={{
              display: 'flex',
              flexDirection: 'column',
              marginBottom: '22px',
              minHeight: `${cardSize.railHeight + 48}px`
            }}
          >
            <div style={{ marginBottom: '10px' }}>
              <h2
                style={{
                  margin: 0,
                  marginLeft: '24px',
                  color: '#ffffff',
                  fontSize: '30px',
                  lineHeight: 1.06,
                  fontWeight: 800
                }}
              >
                {rail.title}
              </h2>
            </div>

            <div
              style={{
                overflow: 'hidden',
                height: `${cardSize.railHeight}px`,
                minHeight: `${cardSize.railHeight}px`,
                boxSizing: 'border-box'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  flexWrap: 'nowrap',
                  alignItems: 'flex-start',
                  overflowX: 'auto',
                  overflowY: 'hidden',
                  height: `${cardSize.railHeight + RAIL_SCROLLBAR_HIDE}px`,
                  boxSizing: 'border-box',
                  paddingTop: '16px',
                  paddingLeft: '24px',
                  paddingRight: '24px',
                  paddingBottom: `${RAIL_SCROLLBAR_HIDE}px`,
                  scrollPaddingLeft: '60px',
                  scrollPaddingRight: '150px'
                }}
              >
              {rail.items.map((item, itemIndex) => {
                const contentFocusId = makeFocusId(rail.id, item.id);
                const isFocused = focusId === contentFocusId;
                const isLast = itemIndex === rail.items.length - 1;
                const isPriorityArtwork = railIndex === 0 && itemIndex < 8;

                return (
                  <button
                    key={item.id}
                    type="button"
                    ref={(node) => {
                      elementRefs.current[contentFocusId] = node;
                    }}
                    onFocus={() => setFocusId(contentFocusId)}
                    onMouseEnter={() => setFocusId(contentFocusId)}
                    onClick={() => {
                      void handleRailActivate(rail, item);
                    }}
                    onKeyDown={(event) => onContentKeyDown(event, contentFocusId)}
                    style={{
                      flex: '0 0 auto',
                      width: `${cardSize.width}px`,
                      height: `${cardSize.height}px`,
                      marginRight: isLast ? '60px' : `${RAIL_CARD_GAP}px`,
                      scrollMarginLeft: '60px',
                      scrollMarginRight: '150px',
                      boxSizing: 'border-box',
                      padding: 0,
                      border: 0,
                      borderRadius: '20px',
                      background: 'transparent',
                      display: 'block',
                      overflow: 'hidden',
                      color: '#ffffff',
                      textAlign: 'left',
                      outline: 'none',
                      WebkitAppearance: 'none',
                      appearance: 'none',
                      transform: isFocused ? 'translateY(-6px) scale(1.015) translateZ(0)' : 'translateZ(0)',
                      boxShadow: isFocused ? '0 22px 42px rgba(0, 0, 0, 0.3), 0 0 0 3px rgba(255, 255, 255, 0.86)' : 'none'
                    }}
                  >
                    <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          width: '100%',
                          height: '100%',
                          borderRadius: 'inherit',
                          overflow: 'hidden'
                      }}
                    >
                      <div
                        style={{
                          position: 'relative',
                          width: '100%',
                          height: `${cardSize.height}px`,
                          borderRadius: 'inherit',
                          overflow: 'hidden',
                          background: isLiveRail
                            ? 'linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(240, 240, 240, 0.98) 100%)'
                            : 'linear-gradient(180deg, rgba(18, 20, 24, 0.9) 0%, rgba(8, 9, 12, 0.96) 100%)'
                        }}
                      >
                        <SafeCardImage
                          src={item.artwork || ''}
                          isLiveRail={isLiveRail}
                          name={item.name}
                          accent={item.accent}
                          fallback={null}
                          priority={isPriorityArtwork}
                        />

                        {/* Play Button Overlay (Continue Watching cards only) */}
                        {rail.id === 'continue-watching' && (
                          <div style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            width: '46px',
                            height: '46px',
                            borderRadius: '999px',
                            backgroundColor: isFocused ? '#E50914' : 'rgba(0, 0, 0, 0.55)',
                            border: isFocused ? 'none' : '2.2px solid rgba(255, 255, 255, 0.85)',
                            boxShadow: isFocused ? '0 0 16px rgba(229, 9, 20, 0.6)' : 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.22s ease-in-out',
                            zIndex: 16,
                            pointerEvents: 'none'
                          }}>
                            <svg viewBox="0 0 24 24" width="22" height="22" fill="#ffffff" style={{ marginLeft: '2px' }}>
                              <polygon points="8 5 19 12 8 19" />
                            </svg>
                          </div>
                        )}

                        {/* Content Type Badge (Movie/Series) in the top-right corner (Continue Watching cards only) */}
                        {rail.id === 'continue-watching' && (
                          <span style={{
                            position: 'absolute',
                            top: '12px',
                            right: '12px',
                            backgroundColor: 'rgba(0, 0, 0, 0.65)',
                            color: '#FFFFFF',
                            fontSize: '10px',
                            fontWeight: 800,
                            letterSpacing: '0.06em',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            textTransform: 'uppercase',
                            zIndex: 16,
                            backdropFilter: 'blur(4px)',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.3)'
                          }}>
                            {item.kind === 'series' ? 'Series' : 'Movie'}
                          </span>
                        )}

                        {rail.id === 'continue-watching' && (
                          <div style={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            height: '70px',
                            background: 'linear-gradient(0deg, rgba(0, 0, 0, 0.95) 0%, rgba(0, 0, 0, 0.6) 60%, transparent 100%)',
                            padding: '0 14px 10px 14px',
                            zIndex: 15,
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'flex-end',
                            gap: '2px',
                            boxSizing: 'border-box'
                          }}>
                            <span style={{
                              color: '#ffffff',
                              fontSize: '15px',
                              fontWeight: 900,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              textShadow: '0 1px 2px rgba(0, 0, 0, 0.9)'
                            }}>
                              {((item as any).data as WatchProgress | undefined)?.title || item.name}
                            </span>
                            {(((item as any).data as WatchProgress | undefined)?.type === 'series') && (
                              <span style={{
                                color: 'rgba(255, 255, 255, 0.76)',
                                fontSize: '12px',
                                fontWeight: 700,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                textShadow: '0 1px 2px rgba(0, 0, 0, 0.9)'
                              }}>
                                {(((item as any).data as WatchProgress | undefined)?.seasonNumber) && (((item as any).data as WatchProgress | undefined)?.episodeNumber)
                                  ? `S${((item as any).data as WatchProgress).seasonNumber}:E${((item as any).data as WatchProgress).episodeNumber} - ${((item as any).data as WatchProgress).episodeTitle || ''}`
                                  : ((item as any).data as WatchProgress | undefined)?.episodeTitle || ''}
                              </span>
                            )}
                            <div style={{
                              width: '100%',
                              height: '4px',
                              backgroundColor: 'rgba(255, 255, 255, 0.3)',
                              borderRadius: '2px',
                              overflow: 'hidden',
                              marginTop: '4px'
                            }}>
                              <div style={{
                                width: `${Math.min(100, Math.max(0, (((item as any).data as WatchProgress | undefined)?.progress || 0)))}%`,
                                height: '100%',
                                backgroundColor: '#e50914'
                              }} />
                            </div>
                          </div>
                        )}
                        <div style={cardDebugOverlay}>
                          <span>ID: {item.contentId}</span>
                          <span>EXT: {getDebugExtension(item)}</span>
                          <span>IMG: {truncateDebugValue(item.artwork)}</span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
              {/* Spacer to prevent WebKit scroll clipping and ensure the last card is fully visible */}
              <div style={{ flex: '0 0 auto', width: '120px', height: '10px' }} />
              </div>
            </div>
          </section>
          );
        })}

        {rails.length === 0 ? (
          <div className="lg-home__empty-state" role="status" aria-live="polite">
            <p className="eyebrow">Home</p>
            <h2>{notice?.title ?? 'No rails loaded yet'}</h2>
            <p>{notice?.body ?? 'Load a portal to populate the home rails.'}</p>
          </div>
        ) : null}
      </section>
    </section>
  );
}

export default HomeScreen;
