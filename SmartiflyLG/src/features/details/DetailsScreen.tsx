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

type DetailFocusId = 'back' | 'play' | 'save' | `season:${string}` | `episode:${string}` | `similar:${string}`;

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

function getEpisodeNumber(value?: string | number | null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
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
};

function ArtworkWithFallback({
  title,
  artwork,
  fallbackArtwork,
  imageStyle,
  fallbackStyle,
  fallbackWords = 4,
  fallbackChars = 34,
  preferFallbackArtwork = false
}: ArtworkWithFallbackProps) {
  const [currentSrc, setCurrentSrc] = useState<string | undefined>(artwork);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setCurrentSrc(preferFallbackArtwork && fallbackArtwork?.trim() ? fallbackArtwork : artwork);
    setImageFailed(false);
  }, [artwork, fallbackArtwork, preferFallbackArtwork]);

  useEffect(() => {
    const primaryArtwork = artwork?.trim();
    const fallbackSource = fallbackArtwork?.trim();

    if (!preferFallbackArtwork || !primaryArtwork) {
      return;
    }

    if (fallbackSource && primaryArtwork === fallbackSource) {
      return;
    }

    let cancelled = false;
    const probe = new Image();

    probe.decoding = 'async';
    probe.onload = () => {
      if (!cancelled) {
        setCurrentSrc(primaryArtwork);
      }
    };
    probe.onerror = () => {
      if (!cancelled && !fallbackSource) {
        setImageFailed(true);
      }
    };
    probe.src = primaryArtwork;

    return () => {
      cancelled = true;
      probe.onload = null;
      probe.onerror = null;
    };
  }, [artwork, fallbackArtwork, preferFallbackArtwork]);

  const showImage = Boolean(currentSrc?.trim()) && !imageFailed;

  return showImage ? (
    <img
      src={currentSrc}
      alt=""
      style={imageStyle}
      onError={() => {
        if (fallbackArtwork?.trim() && currentSrc !== fallbackArtwork) {
          setCurrentSrc(fallbackArtwork);
          return;
        }

        setImageFailed(true);
      }}
    />
  ) : (
    <div style={fallbackStyle}>{formatFallbackTitle(title, fallbackWords, fallbackChars)}</div>
  );
}

function buildMovieRecommendations(
  categoryMovies: XtreamMovie[],
  allMovies: XtreamMovie[],
  currentMovieId: number,
  limit: number
) {
  const merged = new Map<number, XtreamMovie>();

  for (const movie of categoryMovies) {
    if (movie.stream_id !== currentMovieId && !merged.has(movie.stream_id)) {
      merged.set(movie.stream_id, movie);
    }
  }

  if (merged.size < limit) {
    for (const movie of allMovies) {
      if (movie.stream_id === currentMovieId || merged.has(movie.stream_id)) {
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

function parseMovieInfo(info: XtreamMovieInfo, fallback: DetailState): DetailState {
  const movieInfo = info.info ?? {};
  return {
    title: movieInfo.name?.trim() || fallback.title,
    description: movieInfo.plot?.trim() || fallback.description,
    posterUrl: pickImage(movieInfo.movie_image, fallback.posterUrl, movieInfo.backdrop_path),
    backdropUrl: pickImage(movieInfo.backdrop_path, fallback.backdropUrl, movieInfo.movie_image),
    year: getYearFromValue(movieInfo.releasedate) || fallback.year,
    rating: movieInfo.rating?.trim() || fallback.rating,
    genre: movieInfo.genre?.split(',')[0]?.trim() || fallback.genre,
    cast: movieInfo.cast?.trim() || fallback.cast,
    director: movieInfo.director?.trim() || fallback.director,
    trailerUrl: movieInfo.youtube_trailer?.trim() || fallback.trailerUrl,
    containerExtension: info.movie_data?.container_extension?.trim() || fallback.containerExtension
  };
}

function parseSeriesInfo(info: XtreamSeriesInfo, fallback: DetailState): DetailState {
  const seriesInfo = info.info ?? {};
  return {
    title: seriesInfo.name?.trim() || fallback.title,
    description: seriesInfo.plot?.trim() || fallback.description,
    posterUrl: pickImage(seriesInfo.cover, fallback.posterUrl, seriesInfo.backdrop_path),
    backdropUrl: pickImage(seriesInfo.backdrop_path, fallback.backdropUrl, seriesInfo.cover),
    year: getYearFromValue(seriesInfo.releaseDate) || fallback.year,
    rating: seriesInfo.rating?.trim() || fallback.rating,
    genre: seriesInfo.genre?.split(',')[0]?.trim() || fallback.genre,
    cast: seriesInfo.cast?.trim() || fallback.cast,
    director: seriesInfo.director?.trim() || fallback.director,
    trailerUrl: seriesInfo.youtube_trailer?.trim() || fallback.trailerUrl
  };
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

function DetailsScreen() {
  const session = useAppStore((state) => state.session);
  const selectedContent = useAppStore((state) => state.selectedContent);
  const detailReturnDestination = useAppStore((state) => state.detailReturnDestination);
  const closeContentDetails = useAppStore((state) => state.closeContentDetails);
  const openContentDetails = useAppStore((state) => state.openContentDetails);
  const openPlayback = useAppStore((state) => state.openPlayback);
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
  const watchlistScope = useMemo(
    () => buildWatchlistScope(session?.portalCode, session?.username),
    [session?.portalCode, session?.username]
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
    setFocusId('play');
  }, [selectedContent?.id]);

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
          const [infoResult, categoryMoviesResult, allMoviesResult] = await Promise.allSettled([
            api.getMovieInfo(activeUsername, activePassword, activeContent.contentId),
            api.getVodStreams(activeUsername, activePassword, activeContent.categoryId),
            api.getVodStreams(activeUsername, activePassword)
          ]);

          if (cancelled) {
            return;
          }

          const info = infoResult.status === 'fulfilled' ? infoResult.value : null;
          const categoryMovies = categoryMoviesResult.status === 'fulfilled' ? categoryMoviesResult.value : [];
          const allMovies = allMoviesResult.status === 'fulfilled' ? allMoviesResult.value : [];

          const nextDetail = info ? parseMovieInfo(info, fallback) : fallback;
          const nextSimilar = buildMovieRecommendations(categoryMovies, allMovies, activeContent.contentId, 10);

          setDetail(nextDetail);
          setSimilar(nextSimilar);
          setSeriesInfo(null);
          setSelectedSeason('');
        } else {
          const [infoResult, similarResult] = await Promise.allSettled([
            api.getSeriesInfo(activeUsername, activePassword, activeContent.contentId),
            api.getSeries(activeUsername, activePassword, activeContent.categoryId)
          ]);

          if (cancelled) {
            return;
          }

          const info = infoResult.status === 'fulfilled' ? infoResult.value : null;
          const series = similarResult.status === 'fulfilled' ? similarResult.value : [];

          const nextDetail = info ? parseSeriesInfo(info, fallback) : fallback;
          setDetail(nextDetail);
          setSimilar([]);
          setSeriesInfo(info);
          const seasonIds = getSeriesSeasonOptions(info).map((season) => season.id);
          setSelectedSeason((current) => (seasonIds.includes(current) ? current : seasonIds[0] || ''));
        }
      } catch {
        if (!cancelled) {
          setDetail(fallback);
          setSimilar([]);
          setSeriesInfo(null);
          setSelectedSeason('');
          setHasError(true);
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
  }, [portalBaseUrl, password, selectedContent, username]);

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

  if (heroArt !== prevHeroArt || selectedContent?.id !== prevContentId) {
    setBackdropReady(false);
    setBackdropFailed(false);
    setPrevHeroArt(heroArt);
    setPrevContentId(selectedContent?.id);
  }

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
    const node = focusRefs.current[focusId];
    node?.scrollIntoView({
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
      const extension = detail?.containerExtension || 'mp4';
      const streamUrl = api.getVodStreamUrl(username, password, selectedContent.contentId, extension);
      const progress = useWatchHistoryStore.getState().getProgress('movie', selectedContent.contentId);
      const resumePosition = progress && !progress.completed ? progress.position : undefined;

      openPlayback({
        id: `movie-${selectedContent.contentId}`,
        kind: 'movie',
        title,
        description: detail?.description || selectedContent.description,
        posterUrl,
        backdropUrl,
        streamUrl,
        resumePosition,
        returnDestination: 'details'
      });
      return;
    }

    if (selectedSeasonEpisodes.length === 0) {
      setStatusMessage('No episode is available for playback yet');
      return;
    }

    const episode = selectedSeasonEpisodes[0];
    const episodeId = episode.streamId || Number(episode.id.replace('episode-', '')) || selectedContent.contentId;
    const extension = episode.extension || 'mp4';
    const streamUrl = api.getSeriesStreamUrl(username, password, episodeId, extension);
    const progress = useWatchHistoryStore.getState().getProgress('series', episodeId);
    const resumePosition = progress && !progress.completed ? progress.position : undefined;

    openPlayback({
      id: episode.id,
      kind: 'series',
      title,
      episodeTitle: episode.title,
      description: episode.description || detail?.description || selectedContent.description,
      posterUrl: episode.artwork || posterUrl,
      backdropUrl,
      streamUrl,
      resumePosition,
      returnDestination: 'details'
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
    const extension = episode.extension || 'mp4';
    const streamUrl = api.getSeriesStreamUrl(username, password, episodeId, extension);
    const progress = useWatchHistoryStore.getState().getProgress('series', episodeId);
    const resumePosition = progress && !progress.completed ? progress.position : undefined;

    openPlayback({
      id: episode.id,
      kind: 'series',
      title,
      episodeTitle: episode.title,
      description: episode.description || detail?.description || selectedContent.description,
      posterUrl: episode.artwork || posterUrl,
      backdropUrl,
      streamUrl,
      resumePosition,
      returnDestination: 'details'
    });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
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
          focusContent('save');
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
        focusContent('play');
      }
      return;
    }

    if (focusId.startsWith('episode:')) {
      const currentEpisodeId = focusId.slice('episode:'.length);
      const currentEpisodeIndex = selectedSeasonEpisodes.findIndex((episode) => episode.id === currentEpisodeId);
      const columns = 4;
      const rowCount = Math.max(1, Math.ceil(selectedSeasonEpisodes.length / columns));

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        const previousIndex =
          currentEpisodeIndex > 0 ? currentEpisodeIndex - 1 : selectedSeasonEpisodes.length - 1;
        focusEpisodeAt(previousIndex);
        return;
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        const nextIndex =
          currentEpisodeIndex + 1 < selectedSeasonEpisodes.length ? currentEpisodeIndex + 1 : 0;
        focusEpisodeAt(nextIndex);
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        if (currentEpisodeIndex < columns) {
          focusContent(`season:${selectedSeason || visibleSeasonOptions[0]?.id || ''}`);
          return;
        }

        const col = currentEpisodeIndex % columns;
        const targetRow = Math.floor(currentEpisodeIndex / columns) - 1;
        let nextIndex = targetRow * columns + col;
        while (nextIndex >= selectedSeasonEpisodes.length) {
          nextIndex -= columns;
        }
        focusEpisodeAt(nextIndex);
        return;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        const col = currentEpisodeIndex % columns;
        const currentRow = Math.floor(currentEpisodeIndex / columns);
        const isLastRow = currentRow >= rowCount - 1;

        if (!isLastRow) {
          let nextIndex = (currentRow + 1) * columns + col;
          while (nextIndex >= selectedSeasonEpisodes.length) {
            nextIndex -= columns;
          }
          focusEpisodeAt(nextIndex);
          return;
        }

        if (similar.length > 0) {
          focusSimilarAt(Math.min(Math.floor(currentEpisodeIndex / columns), similar.length - 1));
        }
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

        focusContent('play');
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
        style={mergeStyle(
          detailsHero,
          selectedContent.kind === 'movie' ? { minHeight: '580px' } : { minHeight: '640px' }
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
          <div style={detailsPoster}>
            <ArtworkWithFallback
              title={selectedContent.title}
              artwork={posterArt}
              imageStyle={detailsPosterImg}
              fallbackStyle={detailsPosterFallback}
              fallbackWords={4}
              fallbackChars={34}
            />
          </div>

          <div style={detailsCopyBlock}>
            <div style={detailsEyebrow}>
              <span style={detailsEyebrowPart}>{selectedContent.kind === 'movie' ? 'Movie' : 'Series'}</span>
              <span>{selectedContent.kind === 'movie' ? 'Top pick' : 'Featured series'}</span>
            </div>

            <h1 style={detailsTitle}>{detail?.title ?? selectedContent.title}</h1>

            <div style={detailsMeta}>
              {metaBits.map((item) => (
                <span key={item} style={detailsMetaItem}>
                  {item}
                </span>
              ))}
            </div>

            <p style={detailsDescription}>
              {loading ? 'Loading details...' : detail?.description || selectedContent.description || 'No description available.'}
            </p>

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
                    title: selectedContent.title,
                    subtitle: selectedContent.description,
                    image: selectedContent.posterUrl || selectedContent.backdropUrl,
                    rating: selectedContent.rating,
                    year: selectedContent.year,
                    data: selectedContent
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

            <div style={detailsFacts}>
              <div style={mergeStyle(detailsFactCard, detailsFactCardFirst)}>
                <span style={detailsFactLabel}>Director</span>
                <strong style={detailsFactValue}>{detail?.director || '—'}</strong>
              </div>
              <div style={detailsFactCard}>
                <span style={detailsFactLabel}>Cast</span>
                <strong style={detailsFactValue}>{detail?.cast || '—'}</strong>
              </div>
            </div>

            {selectedContent.kind === 'series' ? (
              <div style={detailsSeriesPanel}>
                {visibleSeasonOptions.length > 0 ? (
                  <>
                    <div style={mergeStyle(detailsSectionHeader, detailsSeriesBlock)}>
                      <h2 style={detailsSectionTitle}>Seasons</h2>
                      <p style={detailsSectionCopy}>{visibleSeasonOptions.length} seasons</p>
                    </div>

                    <div className="lg-details-scroll-x" style={detailsSeasonRow} role="tablist" aria-label="Series seasons">
                      {visibleSeasonOptions.map((season, index) => {
                        const seasonFocusId = `season:${season.id}` as DetailFocusId;
                        const isSelected = selectedSeason === season.id;
                        const isFocused = focusId === seasonFocusId;
                        const isActive = isSelected || isFocused;

                        return (
                          <button
                            key={season.id}
                            ref={registerFocusRef(seasonFocusId)}
                            type="button"
                            role="tab"
                            aria-selected={isSelected}
                            style={mergeStyle(detailsSeasonChip, isActive && detailsSeasonChipActive)}
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
                                focusContent('save');
                              }
                            }}
                          >
                            <span>{season.name}</span>
                          </button>
                        );
                      })}
                    </div>

                    <div style={mergeStyle(detailsSectionHeader, detailsSeriesBlock)}>
                      <h2 style={detailsSectionTitle}>Episodes</h2>
                      <p style={detailsSectionCopy}>{selectedSeasonEpisodes.length} titles</p>
                    </div>

                    {selectedSeasonEpisodes.length > 0 ? (
                      <div style={detailsEpisodeGrid}>
                        {selectedSeasonEpisodes.map((episode) => {
                          const episodeFocusId = `episode:${episode.id}` as DetailFocusId;
                          const isFocused = focusId === episodeFocusId;

                          const episodeId = episode.streamId || Number(episode.id.replace('episode-', '')) || selectedContent.contentId;
                          const progressKey = `${session?.portalCode || 'default'}::${session?.username?.trim().toLowerCase() || 'guest'}::${selectedProfile?.id || 'primary'}::series::${episodeId}`;
                          const progressInfo = watchHistory[progressKey];

                          return (
                            <div key={episode.id} style={detailsEpisodeCardWrap}>
                              <button
                                ref={registerFocusRef(episodeFocusId)}
                                type="button"
                                style={mergeStyle(detailsEpisodeCard, isFocused && detailsEpisodeCardActive)}
                                onFocus={() => setFocusId(episodeFocusId)}
                                onClick={() => handleEpisodePlay(episode)}
                                onKeyDown={(event) => {
                                  if (event.key === 'Enter') {
                                    event.preventDefault();
                                    handleEpisodePlay(episode);
                                  }
                                }}
                              >
                                <div style={detailsEpisodeArt}>
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
                                      <div style={{
                                        width: `${progressInfo.progress}%`,
                                        height: '100%',
                                        backgroundColor: '#e50914'
                                      }} />
                                    </div>
                                  )}
                                </div>
                                <div style={detailsEpisodeCopy}>
                                  <div style={detailsEpisodeEyebrow}>
                                    <span>{episode.episodeNumber ? `Episode ${episode.episodeNumber}` : 'Episode'}</span>
                                    {episode.duration ? <span>{episode.duration}</span> : null}
                                  </div>
                                  <strong style={detailsEpisodeTitle}>{episode.title}</strong>
                                  {episode.description ? <p style={detailsEpisodeDescription}>{episode.description}</p> : null}
                                </div>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p style={detailsHint}>This series has no episodes uploaded yet.</p>
                    )}
                  </>
                ) : (
                  <p style={detailsHint}>This series has no episodes uploaded yet.</p>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {selectedContent.kind === 'movie' ? (
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
    </section>
  );
}

export default DetailsScreen;
