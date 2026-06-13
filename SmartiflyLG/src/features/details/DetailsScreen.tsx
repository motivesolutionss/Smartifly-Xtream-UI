import { type CSSProperties, type KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  createXtreamApi,
  type XtreamMovie,
  type XtreamMovieInfo,
  type XtreamSeries,
  type XtreamSeriesEpisode,
  type XtreamSeriesInfo
} from '../../services/api';
import {
  contentScreen,
  detailsActions,
  detailsBackdrop,
  detailsBackdropAmbient,
  detailsBackdropCinematic,
  detailsBackdropVisibleStyle,
  detailsButton,
  detailsButtonFocused,
  detailsButtonGhost,
  detailsButtonIcon,
  detailsButtonLight,
  detailsButtonPrimary,
  detailsButtonSecondary,
  detailsContent,
  detailsCopyBlock,
  detailsDescription,
  detailsEmpty,
  detailsEmptyTitle,
  detailsEpisodeArt,
  detailsEpisodeCard,
  detailsEpisodeCardActive,
  detailsEpisodeCopy,
  detailsEpisodeDescription,
  detailsEpisodeEyebrow,
  detailsEpisodeFallback,
  detailsEpisodeGrid,
  detailsEpisodeImg,
  detailsEpisodeTitle,
  detailsEyebrow,
  detailsEyebrowPart,
  detailsFactCard,
  detailsFactCardFirst,
  detailsFactLabel,
  detailsFacts,
  detailsFactValue,
  detailsEpisodeCardWrap,
  detailsMetaItem,
  detailsSeriesBlock,
  detailsHero,
  detailsHint,
  detailsMeta,
  detailsOverlay,
  detailsOverlayCorner,
  detailsPoster,
  detailsPosterFallback,
  detailsPosterImg,
  detailsScreen,
  detailsSeasonChip,
  detailsSeasonChipActive,
  detailsSeasonRow,
  detailsSectionCopy,
  detailsSectionHeader,
  detailsSectionTitle,
  detailsSeriesPanel,
  detailsSimilar,
  detailsSimilarRow,
  detailsTile,
  detailsTileActive,
  detailsTileArt,
  detailsTileFallback,
  detailsTileImg,
  detailsTileLabel,
  detailsTitle,
  mergeStyle
} from '../../styles/lgTvStyles';
import { useAppStore } from '../../store/appStore';
import { scrollIntoViewCompat, scrollToTopCompat, closestCompat, legacyChromiumBrowser } from '../../utils/legacyBrowser';
import {
  buildMovieInfoCacheKey,
  buildSeriesInfoCacheKey,
  DETAILS_CACHE_TTL_MS,
  readFreshCacheValue,
  writeCacheValue
} from '../../services/cacheService';
import useWatchlistStore, { buildWatchlistKey, buildWatchlistScope } from '../../store/watchlistStore';
import useWatchHistoryStore from '../../store/watchHistoryStore';
import { formatFallbackTitle } from '../../utils/fallbackText';

type DetailCard = {
  id: string;
  title: string;
  artwork?: string;
  kind: 'movie' | 'series';
  categoryId?: string;
};

type DetailState = {
  title: string;
  description: string;
  posterUrl?: string;
  backdropUrl?: string;
  year?: string;
  rating?: string;
  genre?: string;
  cast?: string;
  director?: string;
  trailerUrl?: string;
  containerExtension?: string;
};

type DetailSeason = {
  id: string;
  name: string;
  episodeCount: number;
};

type DetailEpisode = {
  id: string;
  seasonId: string;
  title: string;
  artwork?: string;
  fallbackArtwork?: string;
  duration?: string;
  episodeNumber?: number;
  description?: string;
  extension?: string;
  streamId?: number;
};

type DetailFocusId = 'back' | 'play' | 'save' | 'trailer' | 'close-trailer' | `season:${string}` | `episode:${string}` | `similar:${string}`;


function pickImage(...values: Array<string | string[] | undefined>) {
  for (const value of values) {
    if (Array.isArray(value)) {
      for (const entry of value) {
        if (typeof entry === 'string' && entry.trim().length > 0) {
          return entry;
        }
      }
      continue;
    }

    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }
  }

  return undefined;
}

function getYearFromValue(value?: string | number | null) {
  if (!value) {
    return '';
  }

  const parsed = String(value).split('-')[0];
  return parsed.length === 4 ? parsed : '';
}

function getPlaybackExtensions(extension?: string | null) {
  const normalized = extension?.trim().toLowerCase();
  const extensions = [normalized, 'mkv', 'mp4'].filter(
    (value, index, all): value is string => Boolean(value) && all.indexOf(value) === index
  );

  return {
    primary: extensions[0] || 'mkv',
    fallbacks: extensions.slice(1)
  };
}

function getEpisodeNumber(value?: string | number | null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getEpisodeTag(seasonId: string, episodeNumber?: number) {
  const seasonNumber = Number(seasonId);
  const seasonPart = Number.isFinite(seasonNumber) && seasonNumber > 0
    ? `S${String(seasonNumber).padStart(2, '0')}`
    : 'S--';
  const episodePart = episodeNumber
    ? `E${String(episodeNumber).padStart(2, '0')}`
    : 'EP';

  return `${seasonPart}${episodePart}`;
}

function getEpisodeCardTitle(title: string, seriesTitle?: string) {
  const rawTitle = title.trim();
  if (!rawTitle) {
    return 'Episode';
  }

  let normalized = rawTitle;
  const trimmedSeriesTitle = seriesTitle?.trim();

  if (trimmedSeriesTitle) {
    const seriesPattern = new RegExp(`^${escapeRegExp(trimmedSeriesTitle)}\\s*[-:|]\\s*`, 'i');
    normalized = normalized.replace(seriesPattern, '').trim();
  }

  normalized = normalized
    .replace(/^\s*S\d{1,2}E\d{1,2}\s*[-:|]?\s*/i, '')
    .replace(/^\s*Episode\s+\d+\s*[-:|]?\s*/i, '')
    .trim();

  return normalized || rawTitle;
}

function mapMovieSimilar(item: XtreamMovie): DetailCard {
  return {
    id: `movie-${item.stream_id}`,
    title: item.name,
    artwork: pickImage(item.backdrop_path, item.stream_icon, item.direct_source),
    kind: 'movie',
    categoryId: item.category_id
  };
}

function mapSeriesSimilar(item: XtreamSeries): DetailCard {
  return {
    id: `series-${item.series_id}`,
    title: item.name,
    artwork: pickImage(item.cover, item.backdrop_path),
    kind: 'series',
    categoryId: item.category_id
  };
}

function mapSeriesEpisode(item: XtreamSeriesEpisode, seasonId: string, fallbackArtwork?: string): DetailEpisode {
  const episodeNumber = getEpisodeNumber(item.episode_num);
  const rawId = String(item.id || item.stream_id || `${seasonId}-${episodeNumber || item.title}`).trim();
  const primaryArtwork = pickImage(item.info?.movie_image);
  const fallbackEpisodeArtwork = pickImage(fallbackArtwork);

  return {
    id: `episode-${rawId}`,
    seasonId,
    title: item.title?.trim() || `Episode ${episodeNumber || ''}`.trim() || 'Episode',
    artwork: primaryArtwork || fallbackEpisodeArtwork,
    fallbackArtwork: fallbackEpisodeArtwork,
    duration: item.info?.duration?.trim(),
    episodeNumber,
    description: item.plot?.trim() || item.info?.plot?.trim(),
    extension: item.container_extension?.trim(),
    streamId: item.stream_id
  };
}

type ArtworkWithFallbackProps = {
  title: string;
  artwork?: string;
  fallbackArtwork?: string;
  imageStyle: CSSProperties;
  fallbackStyle: CSSProperties;
  fallbackWords?: number;
  fallbackChars?: number;
  preferFallbackArtwork?: boolean;
  showTitle?: boolean;
};

function ArtworkWithFallback({
  title,
  artwork,
  fallbackArtwork,
  imageStyle,
  fallbackStyle,
  fallbackWords = 4,
  fallbackChars = 34,
  preferFallbackArtwork = false,
  showTitle = true
}: ArtworkWithFallbackProps) {
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setLoadedSrc(null);
    setHasError(false);

    const primarySrc = artwork?.trim();
    const backupSrc = fallbackArtwork?.trim();

    // Determine target URL to try loading first
    const initialTarget = preferFallbackArtwork && backupSrc ? backupSrc : primarySrc;

    if (!initialTarget) {
      setHasError(true);
      return;
    }

    let active = true;

    // Single-request image probe
    const probe = new Image();
    probe.src = initialTarget;
    probe.decoding = 'async';
    probe.onload = () => {
      if (!active) return;
      setLoadedSrc(initialTarget);

      // If we initially loaded the fallback, and there is a primary artwork, probe it too
      if (preferFallbackArtwork && initialTarget === backupSrc && primarySrc && primarySrc !== backupSrc) {
        const primaryProbe = new Image();
        primaryProbe.src = primarySrc;
        primaryProbe.decoding = 'async';
        primaryProbe.onload = () => {
          if (active) {
            setLoadedSrc(primarySrc);
          }
        };
        primaryProbe.onerror = () => {
          // If primary fails, we keep the backup loadedSrc
        };
      }
    };
    probe.onerror = () => {
      if (!active) return;

      // If initial target failed, and it was the primary, try the backup
      if (initialTarget === primarySrc && backupSrc && backupSrc !== primarySrc) {
        const backupProbe = new Image();
        backupProbe.src = backupSrc;
        backupProbe.decoding = 'async';
        backupProbe.onload = () => {
          if (active) {
            setLoadedSrc(backupSrc);
          }
        };
        backupProbe.onerror = () => {
          if (active) {
            setHasError(true);
          }
        };
      } else {
        setHasError(true);
      }
    };

    return () => {
      active = false;
      probe.onload = null;
      probe.onerror = null;
    };
  }, [artwork, fallbackArtwork, preferFallbackArtwork]);

  const width = imageStyle.width || '100%';
  const height = imageStyle.height || '100%';
  const borderRadius = imageStyle.borderRadius || fallbackStyle.borderRadius || 'inherit';

  // Automatically determine if this is a large poster card or a small grid/similar/episode card
  const isLargePoster = imageStyle.height && parseInt(imageStyle.height.toString()) > 350;

  return (
    <div style={{ position: 'relative', width, height, overflow: 'hidden', borderRadius }}>
      {/* 1. Instant Fallback Background Layer - Premium three-tone slate to deep black gradient */}
      {!loadedSrc && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            background: 'linear-gradient(to bottom, #23293B 0%, #171B26 50%, #0B0D13 100%)',
            zIndex: 1
          }}
        />
      )}

      {/* 2. Fallback Title/Text/Icon Layer */}
      {!loadedSrc && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: isLargePoster ? '32px' : '16px',
            textAlign: 'center',
            boxSizing: 'border-box',
            zIndex: 3
          }}
        >
          {/* Custom Clapperboard SVG - Size fits the card context */}
          <svg
            viewBox="0 0 24 24"
            width={isLargePoster ? '56' : '36'}
            height={isLargePoster ? '56' : '36'}
            fill="none"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ marginBottom: showTitle ? '14px' : '0' }}
          >
            <rect x="3" y="7" width="18" height="13" rx="2" ry="2" stroke="rgba(255, 255, 255, 0.6)" />
            <path d="M3 11h18" stroke="rgba(255, 255, 255, 0.6)" />
            <path d="M6 7l3-3" stroke="#E50914" strokeWidth="2" />
            <path d="M11 7l3-3" stroke="#E50914" strokeWidth="2" />
            <path d="M16 7l3-3" stroke="#E50914" strokeWidth="2" />
            <polygon
              points={isLargePoster ? '10.5 13 15 15.5 10.5 18' : '11 13.5 15 15.5 11 17.5'}
              fill="#E50914"
              stroke="#E50914"
              strokeWidth="1"
            />
          </svg>

          {/* Conditional Title Text Wrapping */}
          {showTitle && (
            <strong
              style={{
                color: '#FFFFFF',
                fontSize: isLargePoster ? '22px' : '14px',
                lineHeight: 1.3,
                fontWeight: 700,
                textAlign: 'center',
                wordBreak: 'break-word',
                letterSpacing: '-0.01em',
                maxWidth: '100%',
                display: '-webkit-box',
                WebkitBoxOrient: 'vertical',
                WebkitLineClamp: isLargePoster ? 3 : 2,
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              {formatFallbackTitle(title, fallbackWords, fallbackChars)}
            </strong>
          )}
        </div>
      )}

      {/* 3. High-Quality Loaded Image */}
      {loadedSrc && (
        <img
          src={loadedSrc}
          alt=""
          style={mergeStyle(imageStyle, {
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            width: '100%',
            height: '100%',
            opacity: 1,
            transition: 'opacity 0.22s ease-in-out',
            zIndex: 4
          })}
        />
      )}
    </div>
  );
}

function buildMovieRecommendations(
  categoryMovies: XtreamMovie[],
  allMovies: XtreamMovie[],
  currentMovieId: number,
  limit: number
) {
  const merged = new Map<number, XtreamMovie>();
  const safeCategoryMovies = Array.isArray(categoryMovies) ? categoryMovies : [];
  const safeAllMovies = Array.isArray(allMovies) ? allMovies : [];

  for (const movie of safeCategoryMovies) {
    if (movie && movie.stream_id !== currentMovieId && !merged.has(movie.stream_id)) {
      merged.set(movie.stream_id, movie);
    }
  }

  if (merged.size < limit) {
    for (const movie of safeAllMovies) {
      if (!movie || movie.stream_id === currentMovieId || merged.has(movie.stream_id)) {
        continue;
      }

      merged.set(movie.stream_id, movie);
      if (merged.size >= limit) {
        break;
      }
    }
  }

  return Array.from(merged.values()).slice(0, limit).map(mapMovieSimilar);
}

function safeTrim(value: any): string {
  if (value === undefined || value === null) {
    return '';
  }
  return String(value).trim();
}

function parseMovieInfo(info: XtreamMovieInfo, fallback: DetailState): DetailState {
  const movieInfo = info.info ?? {};
  return {
    title: safeTrim(movieInfo.name) || fallback.title,
    description: safeTrim(movieInfo.plot) || fallback.description,
    posterUrl: pickImage(movieInfo.movie_image, fallback.posterUrl, movieInfo.backdrop_path),
    backdropUrl: pickImage(movieInfo.backdrop_path, fallback.backdropUrl, movieInfo.movie_image),
    year: getYearFromValue(movieInfo.releasedate) || fallback.year,
    rating: safeTrim(movieInfo.rating) || fallback.rating,
    genre: safeTrim(movieInfo.genre).split(',')[0]?.trim() || fallback.genre,
    cast: safeTrim(movieInfo.cast) || fallback.cast,
    director: safeTrim(movieInfo.director) || fallback.director,
    trailerUrl: safeTrim(movieInfo.youtube_trailer) || fallback.trailerUrl,
    containerExtension: safeTrim(info.movie_data?.container_extension) || fallback.containerExtension
  };
}

function parseSeriesInfo(info: XtreamSeriesInfo, fallback: DetailState): DetailState {
  const seriesInfo = info.info ?? {};
  return {
    title: safeTrim(seriesInfo.name) || fallback.title,
    description: safeTrim(seriesInfo.plot) || fallback.description,
    posterUrl: pickImage(seriesInfo.cover, fallback.posterUrl, seriesInfo.backdrop_path),
    backdropUrl: pickImage(seriesInfo.backdrop_path, fallback.backdropUrl, seriesInfo.cover),
    year: getYearFromValue(seriesInfo.releaseDate) || fallback.year,
    rating: safeTrim(seriesInfo.rating) || fallback.rating,
    genre: safeTrim(seriesInfo.genre).split(',')[0]?.trim() || fallback.genre,
    cast: safeTrim(seriesInfo.cast) || fallback.cast,
    director: safeTrim(seriesInfo.director) || fallback.director,
    trailerUrl: safeTrim(seriesInfo.youtube_trailer) || fallback.trailerUrl
  };
}

function getYouTubeEmbedUrl(urlOrId?: string): string | null {
  if (!urlOrId) return null;
  const trimmed = urlOrId.trim();
  if (!trimmed) return null;

  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return `https://www.youtube-nocookie.com/embed/${trimmed}?autoplay=1${typeof window !== 'undefined' && window.location.origin ? `&origin=${encodeURIComponent(window.location.origin)}` : ''}`;
  }

  const ytRegexes = [
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i,
    /embed\/([^"&?\/\s]{11})/i
  ];

  for (const regex of ytRegexes) {
    const match = trimmed.match(regex);
    if (match && match[1]) {
      return `https://www.youtube-nocookie.com/embed/${match[1]}?autoplay=1${typeof window !== 'undefined' && window.location.origin ? `&origin=${encodeURIComponent(window.location.origin)}` : ''}`;
    }
  }

  return null;
}

function getYouTubeVideoId(urlOrId?: string): string | null {
  if (!urlOrId) return null;
  const trimmed = urlOrId.trim();
  if (!trimmed) return null;

  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  const ytRegexes = [
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i,
    /embed\/([^"&?\/\s]{11})/i
  ];

  for (const regex of ytRegexes) {
    const match = trimmed.match(regex);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

type DetailsBackdropMode = 'none' | 'ambient' | 'cinematic';

function getDetailsBackdropMode(
  heroArt: string | undefined,
  posterArt: string | undefined,
  backdropUrl: string | undefined,
  failed: boolean
): DetailsBackdropMode {
  if (!heroArt?.trim() || failed) {
    return 'none';
  }

  const hero = heroArt.trim();
  const backdrop = backdropUrl?.trim();
  const poster = posterArt?.trim();

  if (backdrop && poster && backdrop !== poster && hero === backdrop) {
    return 'cinematic';
  }

  if (!backdrop || !poster || backdrop === poster || hero === poster) {
    return 'ambient';
  }

  return 'cinematic';
}

function getSeriesSeasonOptions(info: XtreamSeriesInfo | null): DetailSeason[] {
  const episodes = info?.episodes ?? {};
  const seasonMeta = new Map((info?.seasons ?? []).map((season) => [String(season.season_number), season]));
  const seasonIds = Array.from(
    new Set<string>([
      ...Object.keys(episodes),
      ...(info?.seasons ?? []).map((season) => String(season.season_number))
    ])
  ).sort((a, b) => Number(a) - Number(b));

  return seasonIds.map((seasonId) => {
    const meta = seasonMeta.get(seasonId);
    const seasonEpisodes = episodes[seasonId] ?? [];

    return {
      id: seasonId,
      name: meta?.name?.trim() || `Season ${seasonId}`,
      episodeCount: meta?.episode_count ?? seasonEpisodes.length
    };
  });
}

function getCachedMoviesFromStore(): XtreamMovie[] {
  const store = useAppStore.getState();

  if (Array.isArray(store.cachedMovies) && store.cachedMovies.length > 0) {
    return store.cachedMovies;
  }

  const bootstrapData = store.homeBootstrapData;
  if (!bootstrapData || !Array.isArray(bootstrapData.rails)) {
    return [];
  }

  const movies: XtreamMovie[] = [];
  const seenIds = new Set<number>();

  for (const rail of bootstrapData.rails) {
    if (rail && rail.kind === 'movie' && Array.isArray(rail.items)) {
      for (const item of rail.items) {
        const streamId = item.contentId;
        if (streamId && !seenIds.has(streamId)) {
          seenIds.add(streamId);
          movies.push({
            num: 0,
            name: item.name || 'Movie Title',
            stream_type: 'movie',
            stream_id: streamId,
            stream_icon: item.artwork || '',
            category_id: item.categoryId || '',
            backdrop_path: item.artwork ? [item.artwork] : []
          });
        }
      }
    }
  }

  return movies;
}

function getCachedMovieInfo(portalCode: string | undefined, username: string | undefined, streamId: number) {
  if (!portalCode || !username || !streamId) {
    return null;
  }

  return readFreshCacheValue<XtreamMovieInfo>(buildMovieInfoCacheKey(portalCode, username, streamId));
}

function getCachedSeriesInfo(portalCode: string | undefined, username: string | undefined, seriesId: number) {
  if (!portalCode || !username || !seriesId) {
    return null;
  }

  return readFreshCacheValue<XtreamSeriesInfo>(buildSeriesInfoCacheKey(portalCode, username, seriesId));
}

function DetailsScreen() {
  const session = useAppStore((state) => state.session);
  const selectedContent = useAppStore((state) => state.selectedContent);
  const detailReturnDestination = useAppStore((state) => state.detailReturnDestination);
  const detailsFocusId = useAppStore((state) => state.detailsFocusId);
  const detailsSelectedSeasonId = useAppStore((state) => state.detailsSelectedSeasonId);
  const closeContentDetails = useAppStore((state) => state.closeContentDetails);
  const openContentDetails = useAppStore((state) => state.openContentDetails);
  const openPlayback = useAppStore((state) => state.openPlayback);
  const setDetailsReturnState = useAppStore((state) => state.setDetailsReturnState);
  const clearDetailsReturnState = useAppStore((state) => state.clearDetailsReturnState);
  const setStatusMessage = useAppStore((state) => state.setStatusMessage);
  const watchlistEntries = useWatchlistStore((state) => state.entries);
  const toggleFavorite = useWatchlistStore((state) => state.toggleFavorite);
  const selectedProfile = useAppStore((state) => state.selectedProfile);
  const watchHistory = useWatchHistoryStore((state) => state.history);
  const [detail, setDetail] = useState<DetailState | null>(null);
  const [similar, setSimilar] = useState<DetailCard[]>([]);
  const [seriesInfo, setSeriesInfo] = useState<XtreamSeriesInfo | null>(null);
  const [selectedSeason, setSelectedSeason] = useState('');
  const [loading, setLoading] = useState(true);
  const [trailerEmbedUrl, setTrailerEmbedUrl] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);
  const [focusId, setFocusId] = useState<DetailFocusId>('play');
  const [backdropReady, setBackdropReady] = useState(false);
  const [backdropFailed, setBackdropFailed] = useState(false);
  const [prevHeroArt, setPrevHeroArt] = useState<string | undefined>(undefined);
  const [prevContentId, setPrevContentId] = useState<string | number | undefined>(undefined);
  const focusRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const username = session?.username?.trim();
  const password = session?.userInfo?.password?.trim();
  const portalBaseUrl = session?.portalBaseUrl?.trim();
  const portalCode = session?.portalCode?.trim();
  const watchlistScope = useMemo(
    () => buildWatchlistScope(session?.portalCode, session?.username, selectedProfile?.id),
    [selectedProfile?.id, session?.portalCode, session?.username]
  );
  const selectedFavoriteKey = useMemo(() => {
    if (!selectedContent) {
      return '';
    }

    return buildWatchlistKey(watchlistScope, selectedContent.kind, selectedContent.contentId || selectedContent.id);
  }, [selectedContent, watchlistScope]);
  const isSaved = useMemo(
    () => watchlistEntries.some((entry) => entry.key === selectedFavoriteKey),
    [selectedFavoriteKey, watchlistEntries]
  );

  const registerFocusRef = (id: string) => (node: HTMLButtonElement | null) => {
    if (node) {
      focusRefs.current[id] = node;
      return;
    }

    delete focusRefs.current[id];
  };

  useEffect(() => {
    const content = selectedContent;
    if (!content || !username || !password || !portalBaseUrl) {
      setDetail(null);
      setSimilar([]);
      setSeriesInfo(null);
      setSelectedSeason('');
      setLoading(false);
      return;
    }

    // Reset details screen to loading state and point focus to Back button immediately
    setDetail(null);
    setSimilar([]);
    setSeriesInfo(null);
    setSelectedSeason('');
    setLoading(true);
    setFocusId('back');

    const activeUsername = username;
    const activePassword = password;
    const activePortalUrl = portalBaseUrl;
    const activeContent = content;

    let cancelled = false;
    const api = createXtreamApi(activePortalUrl);

    const fallback: DetailState = {
      title: activeContent.title,
      description: activeContent.description || 'No description available.',
      posterUrl: activeContent.posterUrl,
      backdropUrl: activeContent.backdropUrl,
      year: activeContent.year,
      rating: activeContent.rating
    };

    async function loadDetails() {
      try {
        setLoading(true);
        setHasError(false);

        if (activeContent.kind === 'movie') {
          const cachedMovieInfo = getCachedMovieInfo(portalCode, activeUsername, activeContent.contentId);
          const [infoResult, categoryMoviesResult, allMoviesResult] = await Promise.allSettled([
            cachedMovieInfo
              ? Promise.resolve(cachedMovieInfo)
              : api.getMovieInfo(activeUsername, activePassword, activeContent.contentId),
            api.getVodStreams(activeUsername, activePassword, activeContent.categoryId),
            api.getVodStreams(activeUsername, activePassword)
          ]);

          if (cancelled) {
            return;
          }

          const info = infoResult.status === 'fulfilled' ? infoResult.value : null;
          let categoryMovies = categoryMoviesResult.status === 'fulfilled' ? categoryMoviesResult.value : [];
          let allMovies = allMoviesResult.status === 'fulfilled' ? allMoviesResult.value : [];

          if (info && !cachedMovieInfo) {
            writeCacheValue(buildMovieInfoCacheKey(portalCode || '', activeUsername, activeContent.contentId), info, DETAILS_CACHE_TTL_MS);
          }

          // If the allMovies list failed or is empty, use global cache fallback
          if (!Array.isArray(allMovies) || allMovies.length === 0) {
            allMovies = getCachedMoviesFromStore();
          }

          // If categoryMovies failed or is empty, try to get it from cached movies
          if (!Array.isArray(categoryMovies) || categoryMovies.length === 0) {
            categoryMovies = allMovies.filter((m) => m.category_id === activeContent.categoryId);
          }

          const nextDetail = info ? parseMovieInfo(info, fallback) : fallback;
          const nextSimilar = buildMovieRecommendations(categoryMovies, allMovies, activeContent.contentId, 10);

          setDetail(nextDetail);
          setSimilar(nextSimilar);
          setSeriesInfo(null);
          setSelectedSeason('');
          setFocusId('play');

          if (!info) {
            setHasError(true);
          }
        } else {
          const cachedSeriesInfo = getCachedSeriesInfo(portalCode, activeUsername, activeContent.contentId);
          const [infoResult, similarResult] = await Promise.allSettled([
            cachedSeriesInfo
              ? Promise.resolve(cachedSeriesInfo)
              : api.getSeriesInfo(activeUsername, activePassword, activeContent.contentId),
            api.getSeries(activeUsername, activePassword, activeContent.categoryId)
          ]);

          if (cancelled) {
            return;
          }

          const info = infoResult.status === 'fulfilled' ? infoResult.value : null;
          const series = similarResult.status === 'fulfilled' ? similarResult.value : [];

          if (info && !cachedSeriesInfo) {
            writeCacheValue(buildSeriesInfoCacheKey(portalCode || '', activeUsername, activeContent.contentId), info, DETAILS_CACHE_TTL_MS);
          }

          const nextDetail = info ? parseSeriesInfo(info, fallback) : fallback;
          setDetail(nextDetail);
          setSimilar([]);
          setSeriesInfo(info);
          const seasonIds = getSeriesSeasonOptions(info).map((season) => season.id);
          const restoredSeasonId =
            detailsSelectedSeasonId && seasonIds.includes(detailsSelectedSeasonId)
              ? detailsSelectedSeasonId
              : '';
          setSelectedSeason((current) => restoredSeasonId || (seasonIds.includes(current) ? current : seasonIds[0] || ''));
          setFocusId(
            detailsFocusId && detailsFocusId.startsWith('episode:')
              ? (detailsFocusId as DetailFocusId)
              : 'play'
          );

          if (!info) {
            setHasError(true);
          }
        }
      } catch (err) {
        console.error('[DEBUG] loadDetails error:', err);
        if (!cancelled) {
          setDetail(fallback);
          setSimilar([]);
          setSeriesInfo(null);
          setSelectedSeason('');
          setHasError(true);
          setFocusId('play');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadDetails();

    return () => {
      cancelled = true;
    };
  }, [detailsFocusId, detailsSelectedSeasonId, portalBaseUrl, password, selectedContent, username]);

  const seasonOptions = useMemo(() => getSeriesSeasonOptions(seriesInfo), [seriesInfo]);
  const visibleSeasonOptions = useMemo(
    () => seasonOptions.filter((season) => (seriesInfo?.episodes?.[season.id] ?? []).length > 0),
    [seasonOptions, seriesInfo]
  );
  const heroArt = detail?.backdropUrl || selectedContent?.backdropUrl || detail?.posterUrl || selectedContent?.posterUrl;
  const posterArt = detail?.posterUrl || selectedContent?.posterUrl || detail?.backdropUrl || selectedContent?.backdropUrl;
  const resolvedBackdropUrl = detail?.backdropUrl || selectedContent?.backdropUrl;
  const episodeFallbackArt = detail?.posterUrl || selectedContent?.posterUrl || detail?.backdropUrl || selectedContent?.backdropUrl;
  const detailsBackdropMode = getDetailsBackdropMode(heroArt, posterArt, resolvedBackdropUrl, backdropFailed);

  useEffect(() => {
    if (heroArt !== prevHeroArt || selectedContent?.id !== prevContentId) {
      setBackdropReady(false);
      setBackdropFailed(false);
      setPrevHeroArt(heroArt);
      setPrevContentId(selectedContent?.id);
    }
  }, [heroArt, prevHeroArt, selectedContent?.id, prevContentId]);

  // Automatically sync/update favorite with full metadata (e.g. backdropUrl) once fetched
  useEffect(() => {
    if (detail && isSaved && selectedContent) {
      const currentFavorite = watchlistEntries.find((entry) => entry.key === selectedFavoriteKey);
      const nextTitle = detail.title || selectedContent.title;
      const nextSubtitle = detail.description || selectedContent.description;
      const nextImage = detail.posterUrl || selectedContent.posterUrl || selectedContent.backdropUrl;
      const nextRating = detail.rating || selectedContent.rating;
      const nextYear = detail.year || selectedContent.year;
      
      // Update once when the lean saved metadata is out of sync.
      if (
        currentFavorite?.title !== nextTitle ||
        currentFavorite?.subtitle !== nextSubtitle ||
        currentFavorite?.image !== nextImage ||
        currentFavorite?.rating !== nextRating ||
        currentFavorite?.year !== nextYear
      ) {
        useWatchlistStore.getState().addFavorite({
          key: selectedFavoriteKey,
          scope: watchlistScope,
          kind: selectedContent.kind,
          entityId: String(selectedContent.contentId),
          title: nextTitle,
          subtitle: nextSubtitle,
          image: nextImage,
          rating: nextRating,
          year: nextYear
        });
      }
    }
  }, [detail, isSaved, selectedContent, selectedFavoriteKey, watchlistScope, watchlistEntries]);

  const selectedSeasonEpisodes = useMemo(() => {
    if (selectedContent?.kind !== 'series' || !selectedSeason || !seriesInfo?.episodes) {
      return [];
    }

    const rawEpisodes = seriesInfo.episodes[selectedSeason] ?? [];
    return rawEpisodes.map((episode) => mapSeriesEpisode(episode, selectedSeason, episodeFallbackArt));
  }, [episodeFallbackArt, selectedContent?.kind, selectedSeason, seriesInfo]);

  const metaBits = useMemo(() => {
    if (!detail) {
      return [];
    }

    return [detail.year, detail.rating, detail.genre].filter(Boolean) as string[];
  }, [detail]);

  useEffect(() => {
    if (selectedContent?.kind !== 'series') {
      return;
    }

    if (visibleSeasonOptions.length === 0) {
      setSelectedSeason('');
      return;
    }

    setSelectedSeason((current) =>
      visibleSeasonOptions.some((season) => season.id === current) ? current : visibleSeasonOptions[0].id
    );
  }, [visibleSeasonOptions, selectedContent?.kind, selectedContent?.id]);

  useEffect(() => {
    const node = focusRefs.current[focusId];
    if (node && document.activeElement !== node) {
      node.focus();
    }
  }, [focusId, selectedContent?.id, visibleSeasonOptions.length, selectedSeasonEpisodes.length, similar.length]);

  useEffect(() => {
    if (trailerEmbedUrl) {
      setFocusId('close-trailer');
    }
  }, [trailerEmbedUrl]);

  useEffect(() => {
    const node = focusRefs.current[focusId];
    if (!node) return;

    const isHeroElement = !!closestCompat(node, '.lg-details-hero');
    if (isHeroElement) {
      const scrollContainer = closestCompat(node, '.lg-details-scroll');
      if (scrollContainer) {
        scrollToTopCompat(scrollContainer, 0);
        return;
      }
    }

    scrollIntoViewCompat(node, {
      block: 'center',
      inline: 'nearest',
      behavior: 'auto'
    });
  }, [focusId]);

  const focusContent = (nextFocusId: DetailFocusId) => {
    setFocusId(nextFocusId);
    const node = focusRefs.current[nextFocusId];
    node?.focus();
  };

  const focusSeasonAt = (index: number) => {
    const season = visibleSeasonOptions[index];
    if (!season) {
      return;
    }

    focusContent(`season:${season.id}`);
  };

  const focusEpisodeAt = (index: number) => {
    const episode = selectedSeasonEpisodes[index];
    if (!episode) {
      return;
    }

    focusContent(`episode:${episode.id}`);
  };

  const focusSimilarAt = (index: number) => {
    const item = similar[index];
    if (!item) {
      return;
    }

    focusContent(`similar:${item.id}`);
  };

  const handlePlay = () => {
    if (!selectedContent || !session || !username || !password || !portalBaseUrl) {
      setStatusMessage('Playback is not ready yet');
      return;
    }

    const api = createXtreamApi(portalBaseUrl);
    const title = detail?.title ?? selectedContent.title;
    const backdropUrl = detail?.backdropUrl || selectedContent.backdropUrl || detail?.posterUrl || selectedContent.posterUrl;
    const posterUrl = detail?.posterUrl || selectedContent.posterUrl || detail?.backdropUrl || selectedContent.backdropUrl;

    if (selectedContent.kind === 'movie') {
      const extensions = getPlaybackExtensions(detail?.containerExtension);
      const streamUrl = api.getVodStreamUrl(username, password, selectedContent.contentId, extensions.primary);
      const progress = useWatchHistoryStore.getState().getProgress('movie', selectedContent.contentId);
      const resumePosition = progress && !progress.completed ? progress.position : undefined;

      clearDetailsReturnState();

      openPlayback({
        id: `movie-${selectedContent.contentId}`,
        kind: 'movie',
        title,
        description: detail?.description || selectedContent.description,
        posterUrl,
        backdropUrl,
        streamUrl,
        fallbackUrls: extensions.fallbacks.map((extension) => api.getVodStreamUrl(username, password, selectedContent.contentId, extension)),
        resumePosition,
        returnDestination: 'details',
        streamId: selectedContent.contentId,
        containerExtension: extensions.primary
      });
      return;
    }

    if (selectedSeasonEpisodes.length === 0) {
      setStatusMessage('No episode is available for playback yet');
      return;
    }

    const episode = selectedSeasonEpisodes[0];
    const episodeId = episode.streamId || Number(episode.id.replace('episode-', '')) || selectedContent.contentId;
    const extensions = getPlaybackExtensions(episode.extension);
    const streamUrl = api.getSeriesStreamUrl(username, password, episodeId, extensions.primary);
    const progress = useWatchHistoryStore.getState().getProgress('series', episodeId);
    const resumePosition = progress && !progress.completed ? progress.position : undefined;

    clearDetailsReturnState();

    openPlayback({
      id: episode.id,
      kind: 'series',
      title,
      episodeTitle: episode.title,
      description: episode.description || detail?.description || selectedContent.description,
      posterUrl: episode.artwork || posterUrl,
      backdropUrl,
      streamUrl,
      fallbackUrls: extensions.fallbacks.map((extension) => api.getSeriesStreamUrl(username, password, episodeId, extension)),
      resumePosition,
      returnDestination: 'details',
      streamId: episodeId,
      seriesId: selectedContent.contentId,
      seasonNumber: Number(selectedSeason) || 1,
      episodeNumber: episode.episodeNumber || 1,
      containerExtension: extensions.primary
    });
  };

  const handleEpisodePlay = (episode: DetailEpisode) => {
    if (!selectedContent || selectedContent.kind !== 'series' || !session || !username || !password || !portalBaseUrl) {
      setStatusMessage('Playback is not ready yet');
      return;
    }

    const api = createXtreamApi(portalBaseUrl);
    const title = detail?.title ?? selectedContent.title;
    const backdropUrl = detail?.backdropUrl || selectedContent.backdropUrl || detail?.posterUrl || selectedContent.posterUrl;
    const posterUrl = detail?.posterUrl || selectedContent.posterUrl || detail?.backdropUrl || selectedContent.backdropUrl;
    const episodeId = episode.streamId || Number(episode.id.replace('episode-', '')) || selectedContent.contentId;
    const extensions = getPlaybackExtensions(episode.extension);
    const streamUrl = api.getSeriesStreamUrl(username, password, episodeId, extensions.primary);
    const progress = useWatchHistoryStore.getState().getProgress('series', episodeId);
    const resumePosition = progress && !progress.completed ? progress.position : undefined;

    setDetailsReturnState({
      focusId: `episode:${episode.id}`,
      selectedSeasonId: episode.seasonId
    });

    openPlayback({
      id: episode.id,
      kind: 'series',
      title,
      episodeTitle: episode.title,
      description: episode.description || detail?.description || selectedContent.description,
      posterUrl: episode.artwork || posterUrl,
      backdropUrl,
      streamUrl,
      fallbackUrls: extensions.fallbacks.map((extension) => api.getSeriesStreamUrl(username, password, episodeId, extension)),
      resumePosition,
      returnDestination: 'details',
      streamId: episodeId,
      seriesId: selectedContent.contentId,
      seasonNumber: Number(episode.seasonId) || Number(selectedSeason) || 1,
      episodeNumber: episode.episodeNumber || 1,
      containerExtension: extensions.primary
    });
  };

  const handleWatchTrailer = () => {
    if (!detail?.trailerUrl) {
      setStatusMessage('Trailer is not available');
      return;
    }

    const youtubeEmbed = getYouTubeEmbedUrl(detail.trailerUrl);
    if (youtubeEmbed) {
      const youtubeId = getYouTubeVideoId(detail.trailerUrl);
      const isWebOS = /web0s|webos/i.test(navigator.userAgent) || typeof (window as any).PalmSystem !== 'undefined';

      if (youtubeId && isWebOS && (window as any).WebOSServiceBridge) {
        try {
          const bridge = new (window as any).WebOSServiceBridge();
          bridge.onservicecallback = (msg: string) => {
            try {
              const res = JSON.parse(msg);
              if (!res.returnValue) {
                console.warn('Native YouTube launch returned false, attempting to launch webOS system browser');
                try {
                  const browserBridge = new (window as any).WebOSServiceBridge();
                  browserBridge.call('luna://com.webos.service.applicationmanager/launch', JSON.stringify({
                    id: 'com.webos.app.browser',
                    params: {
                      target: `https://www.youtube.com/watch?v=${youtubeId}`
                    }
                  }));
                } catch (browserErr) {
                  console.error('Failed calling webOS browser launch, falling back to iframe:', browserErr);
                  setTrailerEmbedUrl(youtubeEmbed);
                }
              }
            } catch (e) {
              setTrailerEmbedUrl(youtubeEmbed);
            }
          };
          bridge.call('luna://com.webos.service.applicationmanager/launch', JSON.stringify({
            id: 'youtube.leanback.v4',
            params: {
              contentId: `v=${youtubeId}`
            }
          }));
        } catch (err) {
          console.error('Failed calling native YouTube launch, falling back to iframe:', err);
          setTrailerEmbedUrl(youtubeEmbed);
        }
      } else {
        setTrailerEmbedUrl(youtubeEmbed);
      }
    } else {
      if (!selectedContent || !session || !username || !password || !portalBaseUrl) {
        setStatusMessage('Playback is not ready yet');
        return;
      }

      const title = detail.title || selectedContent.title;
      const posterUrl = detail.posterUrl || selectedContent.posterUrl || selectedContent.backdropUrl;
      const backdropUrl = detail.backdropUrl || selectedContent.backdropUrl || detail.posterUrl || selectedContent.posterUrl;

      clearDetailsReturnState();

      openPlayback({
        id: `${selectedContent.kind}-trailer-${selectedContent.contentId}`,
        kind: 'movie',
        title: `${title} - Trailer`,
        description: `Trailer for ${title}`,
        posterUrl,
        backdropUrl,
        streamUrl: detail.trailerUrl,
        returnDestination: 'details',
        streamId: selectedContent.contentId
      });
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (trailerEmbedUrl) {
      if (event.key === 'Escape' || event.key === 'Backspace') {
        event.preventDefault();
        setTrailerEmbedUrl(null);
        setFocusId('trailer');
      }
      return;
    }
    const content = selectedContent;

    if (event.key === 'Escape' || event.key === 'Backspace') {
      event.preventDefault();
      closeContentDetails();
      return;
    }

    if (!content) {
      return;
    }

    if (focusId === 'back') {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        focusContent('save');
        return;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        if (detail?.trailerUrl) {
          focusContent('trailer');
          return;
        }
        if (content.kind === 'series' && visibleSeasonOptions.length > 0) {
          focusSeasonAt(0);
          return;
        }

        if (similar.length > 0) {
          focusSimilarAt(0);
        }
      }
      return;
    }

    if (focusId === 'play') {
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        focusContent('save');
        return;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        if (detail?.trailerUrl) {
          focusContent('trailer');
          return;
        }
        if (content.kind === 'series' && visibleSeasonOptions.length > 0) {
          focusSeasonAt(0);
          return;
        }

        if (similar.length > 0) {
          focusSimilarAt(0);
        }
      }
      return;
    }

    if (focusId === 'save') {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        focusContent('play');
        return;
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        focusContent('back');
        return;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        if (detail?.trailerUrl) {
          focusContent('trailer');
          return;
        }
        if (content.kind === 'series' && visibleSeasonOptions.length > 0) {
          focusSeasonAt(0);
          return;
        }

        if (similar.length > 0) {
          focusSimilarAt(0);
        }
      }
      return;
    }

    if (focusId === 'trailer') {
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        focusContent('play');
        return;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        if (content.kind === 'series' && visibleSeasonOptions.length > 0) {
          focusSeasonAt(0);
          return;
        }

        if (similar.length > 0) {
          focusSimilarAt(0);
        }
      }
      return;
    }

    if (focusId.startsWith('season:')) {
      const currentSeasonId = focusId.slice('season:'.length);
      const currentSeasonIndex = visibleSeasonOptions.findIndex((season) => season.id === currentSeasonId);

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        if (currentSeasonIndex <= 0) {
          focusContent('trailer');
          return;
        }

        focusSeasonAt(currentSeasonIndex - 1);
        return;
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        const nextSeason = visibleSeasonOptions[currentSeasonIndex + 1];
        if (nextSeason) {
          focusSeasonAt(currentSeasonIndex + 1);
        }
        return;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        focusEpisodeAt(0);
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        if (detail?.trailerUrl) {
          focusContent('trailer');
        } else {
          focusContent('play');
        }
      }
      return;
    }

    if (focusId.startsWith('episode:')) {
      const currentEpisodeId = focusId.slice('episode:'.length);
      const currentEpisodeIndex = selectedSeasonEpisodes.findIndex((episode) => episode.id === currentEpisodeId);

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        if (currentEpisodeIndex <= 0) {
          focusContent('trailer');
          return;
        }
        focusEpisodeAt(currentEpisodeIndex - 1);
        return;
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        if (currentEpisodeIndex < selectedSeasonEpisodes.length - 1) {
          focusEpisodeAt(currentEpisodeIndex + 1);
        }
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        const currentSeasonIndex = visibleSeasonOptions.findIndex((s) => s.id === selectedSeason);
        focusSeasonAt(currentSeasonIndex >= 0 ? currentSeasonIndex : 0);
        return;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        // Keep focus within episodes as it is the bottom-most list for series
        return;
      }
      return;
    }

    if (focusId.startsWith('similar:')) {
      const currentSimilarId = focusId.slice('similar:'.length);
      const currentSimilarIndex = similar.findIndex((item) => item.id === currentSimilarId);

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        if (currentSimilarIndex <= 0) {
          if (content.kind === 'series' && selectedSeasonEpisodes.length > 0) {
            focusEpisodeAt(Math.min(selectedSeasonEpisodes.length - 1, currentSimilarIndex));
          } else {
            focusContent('back');
          }
          return;
        }

        focusSimilarAt(currentSimilarIndex - 1);
        return;
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        const nextSimilar = similar[currentSimilarIndex + 1];
        if (nextSimilar) {
          focusSimilarAt(currentSimilarIndex + 1);
        }
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        if (content.kind === 'series' && selectedSeasonEpisodes.length > 0) {
          focusEpisodeAt(Math.min(currentSimilarIndex, selectedSeasonEpisodes.length - 1));
          return;
        }

        if (detail?.trailerUrl) {
          focusContent('trailer');
        } else {
          focusContent('play');
        }
      }
    }
  };

  if (!selectedContent) {
    return (
      <section
        className="lg-details-scroll"
        style={mergeStyle(contentScreen, detailsScreen)}
        aria-label="Content details"
      >
        <div style={detailsEmpty}>
          <h1 style={detailsEmptyTitle}>No content selected</h1>
          <button type="button" style={mergeStyle(detailsButton, detailsButtonLight)} onClick={closeContentDetails}>
            Back
          </button>
        </div>
      </section>
    );
  }

  return (
    <section
      className="lg-details-scroll"
      style={mergeStyle(contentScreen, detailsScreen)}
      aria-label={`${selectedContent.title} details`}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div
        className="lg-details-hero"
        style={mergeStyle(
          detailsHero,
          detail?.trailerUrl ? { minHeight: '820px' } : { minHeight: '580px' }
        )}
      >
        <div style={detailsBackdrop}>
          {detailsBackdropMode !== 'none' && heroArt ? (
            <img
              key={heroArt}
              src={heroArt}
              alt=""
              style={mergeStyle(
                detailsBackdropMode === 'ambient' ? detailsBackdropAmbient : detailsBackdropCinematic,
                detailsBackdropVisibleStyle(backdropReady)
              )}
              onLoad={() => setBackdropReady(true)}
              onError={() => {
                setBackdropFailed(true);
                setBackdropReady(false);
              }}
            />
          ) : null}
          <div style={detailsOverlay} />
          <div style={detailsOverlayCorner} />
        </div>

        <div style={detailsContent}>
          <div style={{ display: 'flex', flexDirection: 'column', width: '320px', marginRight: '32px', flexShrink: 0 }}>
            <div style={mergeStyle(detailsPoster, { width: '320px', height: '480px', marginRight: 0, marginBottom: '24px' })}>
              <ArtworkWithFallback
                title={selectedContent.title}
                artwork={posterArt}
                imageStyle={detailsPosterImg}
                fallbackStyle={detailsPosterFallback}
                fallbackWords={4}
                fallbackChars={34}
                showTitle={false}
              />
            </div>

            {!loading && detail?.trailerUrl ? (
              <div style={{ display: 'flex', flexDirection: 'column', marginTop: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#E50914', display: 'inline-block', boxShadow: '0 0 8px #E50914', marginRight: '8px' }} />
                  <strong style={{
                    color: 'rgba(255, 255, 255, 0.75)',
                    fontSize: '14px',
                    fontWeight: 900,
                    letterSpacing: '1.2px',
                    textTransform: 'uppercase'
                  }}>Trailer</strong>
                </div>
                
                <button
                  ref={registerFocusRef('trailer')}
                  type="button"
                  style={mergeStyle(
                    {
                      position: 'relative',
                      width: '320px',
                      height: '180px',
                      borderRadius: '16px',
                      border: '3px solid rgba(255, 255, 255, 0.22)',
                      backgroundColor: 'rgba(255, 255, 255, 0.08)',
                      overflow: 'hidden',
                      outline: 'none',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.22s cubic-bezier(0.25, 0.8, 0.25, 1)',
                      boxSizing: 'border-box'
                    },
                    focusId === 'trailer' && {
                      borderColor: '#E50914',
                      transform: 'scale(1.05)'
                    }
                  )}
                  onFocus={() => setFocusId('trailer')}
                  onClick={() => handleWatchTrailer()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleWatchTrailer();
                    }
                  }}
                >
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: focusId === 'trailer' ? 0.95 : 0.82, zIndex: 1, transition: 'opacity 0.2s ease' }}>
                    <ArtworkWithFallback
                      title="Trailer"
                      artwork={detail?.backdropUrl || selectedContent.backdropUrl || detail?.posterUrl || selectedContent.posterUrl}
                      imageStyle={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      fallbackStyle={{ width: '100%', height: '100%' }}
                    />
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(0deg, rgba(2, 3, 6, 0.7) 0%, rgba(2, 3, 6, 0.1) 100%)' }} />
                  </div>

                  <div style={{
                    position: 'relative',
                    zIndex: 2,
                    width: '56px',
                    height: '56px',
                    borderRadius: '999px',
                    backgroundColor: '#E50914',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    boxShadow: focusId === 'trailer' ? '0 0 20px rgba(229, 9, 20, 0.8)' : '0 4px 12px rgba(0, 0, 0, 0.4)',
                    transition: 'all 0.22s cubic-bezier(0.25, 0.8, 0.25, 1)',
                    transform: focusId === 'trailer' ? 'scale(1.15)' : 'scale(1)'
                  }}>
                    <svg viewBox="0 0 24 24" width="26" height="26" fill="#ffffff" style={{ marginLeft: '3px' }}>
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>

                  <div style={{
                    position: 'absolute',
                    bottom: '12px',
                    left: '12px',
                    zIndex: 2,
                    backgroundColor: 'rgba(2, 3, 6, 0.72)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    padding: '6px 14px',
                    borderRadius: '20px',
                    border: '1px solid rgba(255, 255, 255, 0.16)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)'
                  }}>
                    <strong style={{
                      color: '#ffffff',
                      fontSize: '13px',
                      fontWeight: 900,
                      letterSpacing: '0.6px',
                      textTransform: 'uppercase'
                    }}>
                      Watch Trailer
                    </strong>
                  </div>
                </button>
              </div>
            ) : null}
          </div>

          <div style={detailsCopyBlock}>
            <div style={detailsEyebrow}>
              <span style={detailsEyebrowPart}>{selectedContent.kind === 'movie' ? 'Movie' : 'Series'}</span>
              <span>{selectedContent.kind === 'movie' ? 'Top pick' : 'Featured series'}</span>
            </div>

            <h1 style={detailsTitle}>{detail?.title ?? selectedContent.title}</h1>

            {!loading ? (
              <>
                <div style={detailsMeta}>
                  {metaBits.map((item) => (
                    <span key={item} style={detailsMetaItem}>
                      {item}
                    </span>
                  ))}
                </div>

                {(() => {
                  const rawDesc = detail?.description?.trim() || selectedContent.description?.trim() || '';
                  const title = selectedContent.title?.trim() || '';
                  
                  const isGeneric = 
                    !rawDesc || 
                    rawDesc === '—' || 
                    rawDesc === 'No description available.' || 
                    rawDesc === 'Plot summary is not available for this title.' ||
                    rawDesc === title;

                  return (
                    <p
                      style={mergeStyle(
                        detailsDescription,
                        isGeneric && {
                          color: 'rgba(255, 255, 255, 0.45)',
                          fontStyle: 'italic'
                        }
                      )}
                    >
                      {isGeneric
                        ? 'Plot summary is not available for this title.'
                        : rawDesc}
                    </p>
                  );
                })()}

                {hasError ? (
                  <p style={detailsHint}>Details loaded with a fallback because the info endpoint was not available.</p>
                ) : null}

                <div style={detailsActions}>
                  <button
                    ref={registerFocusRef('play')}
                    type="button"
                    style={mergeStyle(
                      detailsButton,
                      detailsButtonPrimary,
                      focusId === 'play' && detailsButtonFocused
                    )}
                    onFocus={() => setFocusId('play')}
                    onClick={() => handlePlay()}
                  >
                    Play
                  </button>
                  <button
                    ref={registerFocusRef('save')}
                    type="button"
                    style={mergeStyle(
                      detailsButton,
                      detailsButtonSecondary,
                      focusId === 'save' && detailsButtonFocused
                    )}
                    onFocus={() => setFocusId('save')}
                    onClick={() => {
                      if (!selectedContent) {
                        return;
                      }

                      toggleFavorite({
                        key: selectedFavoriteKey,
                        scope: watchlistScope,
                        kind: selectedContent.kind,
                        entityId: String(selectedContent.contentId),
                        title: detail?.title || selectedContent.title,
                        subtitle: detail?.description || selectedContent.description,
                        image: detail?.posterUrl || selectedContent.posterUrl || selectedContent.backdropUrl,
                        backdrop: detail?.backdropUrl || selectedContent.backdropUrl || selectedContent.posterUrl,
                        rating: detail?.rating || selectedContent.rating,
                        year: detail?.year || selectedContent.year
                      });

                      setStatusMessage(isSaved ? 'Removed from favorites' : 'Added to favorites');
                    }}
                  >
                    <span style={detailsButtonIcon} aria-hidden="true">
                      <svg viewBox="0 0 24 24" width="1em" height="1em" fill={isSaved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 18.3l-6.7-6.1a4.2 4.2 0 0 1 0-6.2 4.5 4.5 0 0 1 6.7.4 4.5 4.5 0 0 1 6.7-.4 4.2 4.2 0 0 1 0 6.2L12 18.3z" />
                      </svg>
                    </span>
                    <span>{isSaved ? 'Added to Favorites' : 'Add to Favorites'}</span>
                  </button>
                  <button
                    ref={registerFocusRef('back')}
                    type="button"
                    style={mergeStyle(
                      detailsButton,
                      detailsButtonGhost,
                      focusId === 'back' && detailsButtonFocused
                    )}
                    onFocus={() => setFocusId('back')}
                    onClick={closeContentDetails}
                  >
                    Back
                  </button>
                </div>

                {(() => {
                  const rawDirector = detail?.director?.trim();
                  const hasDirector = rawDirector && rawDirector !== '—' && rawDirector !== '';
                  const rawCast = detail?.cast?.trim();
                  const hasCast = rawCast && rawCast !== '—' && rawCast !== '';

                  return (
                    <div style={detailsFacts}>
                      <div style={mergeStyle(detailsFactCard, detailsFactCardFirst)}>
                        <span style={detailsFactLabel}>Director</span>
                        <strong
                          style={mergeStyle(
                            detailsFactValue,
                            !hasDirector && { color: 'rgba(255, 255, 255, 0.45)', fontWeight: 500 }
                          )}
                        >
                          {hasDirector ? rawDirector : 'Not Available'}
                        </strong>
                      </div>
                      <div style={detailsFactCard}>
                        <span style={detailsFactLabel}>Cast</span>
                        <strong
                          style={mergeStyle(
                            detailsFactValue,
                            !hasCast && { color: 'rgba(255, 255, 255, 0.45)', fontWeight: 500 }
                          )}
                        >
                          {hasCast ? rawCast : 'Not Available'}
                        </strong>
                      </div>
                    </div>
                  );
                })()}

              </>
            ) : (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'flex-start',
                height: '340px',
                marginTop: '16px'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: '24px'
                }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '999px',
                    border: '4px solid rgba(255, 255, 255, 0.08)',
                    borderTopColor: '#E50914',
                    animation: 'spin 1s linear infinite',
                    boxShadow: '0 0 24px rgba(229, 9, 20, 0.15)',
                    marginRight: '20px'
                  }} />
                  <p style={{
                    color: 'rgba(255, 255, 255, 0.55)',
                    fontSize: '20px',
                    fontWeight: '500',
                    margin: 0
                  }}>
                    Loading details...
                  </p>
                </div>

                <div style={{ marginTop: '12px' }}>
                  <button
                    ref={registerFocusRef('back')}
                    type="button"
                    style={mergeStyle(
                      detailsButton,
                      detailsButtonGhost,
                      focusId === 'back' && detailsButtonFocused
                    )}
                    onFocus={() => setFocusId('back')}
                    onClick={closeContentDetails}
                  >
                    Back
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {!loading && selectedContent.kind === 'series' && visibleSeasonOptions.length > 0 ? (
        <section style={mergeStyle(detailsSimilar, { marginBottom: '40px' })} aria-label="Seasons and Episodes">
          <div style={mergeStyle(detailsSectionHeader, { marginBottom: '16px' })}>
            <h2 style={detailsSectionTitle}>Seasons</h2>
            <p style={detailsSectionCopy}>{visibleSeasonOptions.length} seasons</p>
          </div>

          <div className="lg-details-scroll-x" style={detailsSeasonRow} role="tablist" aria-label="Series seasons">
            {visibleSeasonOptions.map((season, index) => {
              const seasonFocusId = `season:${season.id}` as DetailFocusId;
              const isSelected = selectedSeason === season.id;
              const isFocused = focusId === seasonFocusId;


              return (
                <button
                  key={season.id}
                  ref={registerFocusRef(seasonFocusId)}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  style={mergeStyle(
                    detailsSeasonChip,
                    isSelected && {
                      background: '#E50914',
                      borderColor: '#E50914',
                      color: '#ffffff'
                    },
                    isFocused && {
                      transform: 'scale(1.06) translateY(-2px)',
                      borderColor: '#ffffff',
                      boxShadow: '0 0 0 3px #ffffff, 0 12px 28px rgba(0, 0, 0, 0.6)'
                    }
                  )}
                  onFocus={() => {
                    setFocusId(seasonFocusId);
                  }}
                  onClick={() => setSelectedSeason(season.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      setSelectedSeason(season.id);
                    }
                    if (event.key === 'ArrowDown') {
                      event.preventDefault();
                      focusEpisodeAt(0);
                    }
                    if (event.key === 'ArrowLeft' && index === 0) {
                      event.preventDefault();
                      focusContent('trailer');
                    }
                  }}
                >
                  <span>{season.name}</span>
                </button>
              );
            })}
          </div>

          <div style={mergeStyle(detailsSectionHeader, detailsSeriesBlock, { marginTop: '24px', marginBottom: '16px' })}>
            <h2 style={detailsSectionTitle}>Episodes</h2>
            <p style={detailsSectionCopy}>{selectedSeasonEpisodes.length} titles</p>
          </div>

          {selectedSeasonEpisodes.length > 0 ? (
            <div className="lg-details-scroll-x" style={detailsSeasonRow}>
              {selectedSeasonEpisodes.map((episode, index) => {
                const episodeFocusId = `episode:${episode.id}` as DetailFocusId;
                const isFocused = focusId === episodeFocusId;
                const episodeTag = getEpisodeTag(episode.seasonId, episode.episodeNumber);
                const episodeCardTitle = getEpisodeCardTitle(episode.title, detail?.title || selectedContent.title);

                const episodeId = episode.streamId || Number(episode.id.replace('episode-', '')) || selectedContent.contentId;
                const progressKey = `${session?.portalCode || 'default'}::${session?.username?.trim().toLowerCase() || 'guest'}::${selectedProfile?.id || 'primary'}::series::${episodeId}`;
                const progressInfo = watchHistory[progressKey];

                return (
                  <div key={episode.id} style={{ width: '320px', flexShrink: 0, marginRight: '20px', boxSizing: 'border-box' }}>
                    <button
                      ref={registerFocusRef(episodeFocusId)}
                      type="button"
                      style={mergeStyle(
                        detailsEpisodeCard,
                        {
                          width: '100%',
                          background: 'rgba(255, 255, 255, 0.02)',
                          border: '2px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: '16px',
                          transition: 'all 0.22s cubic-bezier(0.25, 0.8, 0.25, 1)',
                          transform: isFocused ? 'scale(1.04)' : 'scale(1)',
                          borderColor: isFocused ? 'rgba(255, 255, 255, 0.92)' : 'rgba(255, 255, 255, 0.08)',
                          boxShadow: isFocused ? '0 12px 28px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.92)' : 'none'
                        }
                      )}
                      onFocus={() => setFocusId(episodeFocusId)}
                      onClick={() => handleEpisodePlay(episode)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          handleEpisodePlay(episode);
                        }
                        if (event.key === 'ArrowLeft' && index === 0) {
                          event.preventDefault();
                          focusContent('trailer');
                        }
                        if (event.key === 'ArrowUp') {
                          event.preventDefault();
                          focusSeasonAt(visibleSeasonOptions.findIndex((s) => s.id === selectedSeason));
                        }
                      }}
                    >
                      <div style={mergeStyle(detailsEpisodeArt, { height: '160px', borderRadius: '14px 14px 0 0', position: 'relative' })}>
                        <ArtworkWithFallback
                          title={episode.title}
                          artwork={episode.artwork}
                          fallbackArtwork={episode.fallbackArtwork}
                          imageStyle={detailsEpisodeImg}
                          fallbackStyle={detailsEpisodeFallback}
                          fallbackWords={4}
                          fallbackChars={28}
                          preferFallbackArtwork
                        />
                        <div
                          style={{
                            position: 'absolute',
                            left: 0,
                            right: 0,
                            bottom: 0,
                            padding: '32px 14px 10px',
                            background: 'linear-gradient(180deg, rgba(2, 3, 6, 0) 0%, rgba(2, 3, 6, 0.88) 100%)',
                            zIndex: 4,
                            pointerEvents: 'none'
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '12px',
                              color: 'rgba(255, 255, 255, 0.9)',
                              fontSize: '12px',
                              fontWeight: 900,
                              letterSpacing: '0.9px',
                              textTransform: 'uppercase'
                            }}
                          >
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {episode.episodeNumber ? `Episode ${episode.episodeNumber}` : episodeTag}
                            </span>
                            {episode.duration ? (
                              <span
                                style={{
                                  flexShrink: 0,
                                  fontVariantNumeric: 'tabular-nums',
                                  color: 'rgba(255, 255, 255, 0.82)'
                                }}
                              >
                                {episode.duration}
                              </span>
                            ) : null}
                          </div>
                        </div>
                        {progressInfo && progressInfo.progress > 0 && !progressInfo.completed && (
                          <div style={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            height: '4px',
                            backgroundColor: 'rgba(255, 255, 255, 0.3)',
                            zIndex: 10
                          }}>
                            <div style={{ width: `${progressInfo.progress}%`, height: '100%', backgroundColor: '#e50914' }} />
                          </div>
                        )}
                      </div>
                      <div style={mergeStyle(detailsEpisodeCopy, { padding: '12px 14px 16px', display: 'flex', flexDirection: 'column' })}>
                        <strong
                          style={mergeStyle(detailsEpisodeTitle, {
                            display: 'block',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'normal',
                            marginBottom: '6px',
                            minHeight: '24px',
                            lineHeight: 1.24,
                            fontSize: '17px',
                            color: isFocused ? '#e50914' : '#ffffff'
                          })}
                        >
                          {episodeCardTitle}
                        </strong>
                        {episode.description ? (
                          <p
                            style={mergeStyle(detailsEpisodeDescription, {
                              display: 'block',
                              minHeight: '38px',
                              overflow: 'visible',
                              margin: 0,
                              color: 'rgba(255, 255, 255, 0.72)',
                              lineHeight: 1.32,
                              whiteSpace: 'normal'
                            })}
                          >
                            {episode.description}
                          </p>
                        ) : (
                          <div style={{ minHeight: '38px' }} />
                        )}
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <p style={detailsHint}>This series has no episodes uploaded yet.</p>
          )}
        </section>
      ) : null}

      {!loading && selectedContent.kind === 'movie' ? (
        <section style={detailsSimilar} aria-label="More movies">
          <div style={detailsSectionHeader}>
            <h2 style={detailsSectionTitle}>More Movies</h2>
            <p style={detailsSectionCopy}>{similar.length} titles</p>
          </div>

          <div className="lg-details-scroll-x" style={detailsSimilarRow}>
            {similar.map((item) => (
              <button
                key={item.id}
                ref={registerFocusRef(`similar:${item.id}`)}
                type="button"
                style={mergeStyle(detailsTile, focusId === `similar:${item.id}` && detailsTileActive)}
                onFocus={() => setFocusId(`similar:${item.id}`)}
                onClick={() => openContentDetails(
                  {
                    id: item.id,
                    contentId: Number(item.id.split('-').pop() || 0),
                    kind: item.kind,
                    title: item.title,
                    categoryId: item.categoryId,
                    posterUrl: item.artwork,
                    backdropUrl: item.artwork
                  },
                  detailReturnDestination
                )}
                onKeyDown={(event) => {
                  if (event.key === 'ArrowLeft' && similar.indexOf(item) === 0) {
                    event.preventDefault();
                    focusContent('back');
                  }
                }}
                >
                  <div style={detailsTileArt}>
                    <ArtworkWithFallback
                      title={item.title}
                      artwork={item.artwork}
                      imageStyle={detailsTileImg}
                      fallbackStyle={detailsTileFallback}
                      fallbackWords={4}
                      fallbackChars={30}
                    />
                  </div>
                  <span style={detailsTileLabel}>{item.title}</span>
                </button>
            ))}
          </div>
        </section>
      ) : null}

      {trailerEmbedUrl ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Watch Trailer"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0, 0, 0, 0.9)',
            backdropFilter: legacyChromiumBrowser ? 'none' : 'blur(12px)',
            WebkitBackdropFilter: legacyChromiumBrowser ? 'none' : 'blur(12px)'
          }}
        >
          <div
            style={{
              position: 'relative',
              width: '1280px',
              height: '720px',
              borderRadius: '20px',
              overflow: 'hidden',
              backgroundColor: '#000000',
              border: '4px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 24px 72px rgba(0, 0, 0, 0.8), 0 0 40px rgba(229, 9, 20, 0.2)'
            }}
          >
            {typeof window !== 'undefined' && window.location.protocol === 'file:' ? (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '40px',
                  boxSizing: 'border-box',
                  textAlign: 'center',
                  background: 'linear-gradient(135deg, #1e2230 0%, #0d0f14 100%)',
                  color: '#ffffff'
                }}
              >
                <svg
                  viewBox="0 0 24 24"
                  width="80"
                  height="80"
                  fill="none"
                  stroke="#E50914"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ marginBottom: '24px' }}
                >
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <h2 style={{ fontSize: '28px', fontWeight: 800, margin: '0 0 12px 0', color: '#ffffff' }}>
                  YouTube Player Restricted
                </h2>
                <p style={{ fontSize: '18px', color: 'rgba(255, 255, 255, 0.7)', lineHeight: 1.5, maxWidth: '800px', margin: '0 0 24px 0' }}>
                  YouTube blocks video embeds from local files (<code>file://</code> protocol) for security, resulting in <strong>Error 153</strong>.
                </p>
                <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.04)', borderRadius: '12px', padding: '24px', border: '1px solid rgba(255, 255, 255, 0.08)', textAlign: 'left', width: '100%', maxWidth: '640px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 12px 0', textTransform: 'uppercase', letterSpacing: '1px', color: '#E50914' }}>
                    How to enable YouTube trailers:
                  </h3>
                  <ol style={{ fontSize: '16px', color: 'rgba(255, 255, 255, 0.8)', paddingLeft: '20px', margin: 0, lineHeight: 1.6 }}>
                    <li>Run the local server: <code style={{ color: '#00E676' }}>node dev-server.mjs</code></li>
                    <li>Package the hosted app wrapper: <code style={{ color: '#00E676' }}>npm run webos:package:hosted</code></li>
                    <li>Install the hosted version to the emulator/TV.</li>
                    <li>Launch the hosted version (it runs over HTTP on port 4173).</li>
                  </ol>
                </div>
              </div>
            ) : (
              <iframe
                src={trailerEmbedUrl}
                referrerPolicy="strict-origin-when-cross-origin"
                title="YouTube video player"
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none'
                }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                tabIndex={-1}
              />
            )}
          </div>

          <button
            ref={registerFocusRef('close-trailer')}
            type="button"
            onFocus={() => setFocusId('close-trailer')}
            onClick={() => {
              setTrailerEmbedUrl(null);
              setFocusId('trailer');
            }}
            style={mergeStyle(
              {
              marginTop: '24px',
              padding: '14px 28px',
              borderRadius: '16px',
              border: '2px solid rgba(255, 255, 255, 0.2)',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              color: '#ffffff',
              fontSize: '20px',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
              outline: 'none',
              boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
              transition: 'all 0.18s cubic-bezier(0.25, 1, 0.5, 1)'
              },
              focusId === 'close-trailer' && {
                transform: 'scale(1.05)',
                backgroundColor: '#E50914',
                borderColor: '#E50914',
                boxShadow: '0 0 24px rgba(229, 9, 20, 0.5)'
              }
            )}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)';
              e.currentTarget.style.backgroundColor = '#E50914';
              e.currentTarget.style.borderColor = '#E50914';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
            }}
          >
            <span style={{
              backgroundColor: '#ffffff',
              color: '#000000',
              padding: '3px 8px',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 900,
              textTransform: 'uppercase',
              marginRight: '12px'
            }}>Back</span>
            <span>Close Trailer</span>
          </button>
        </div>
      ) : null}
    </section>
  );
}

export default DetailsScreen;
