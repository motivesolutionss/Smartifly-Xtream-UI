import { type KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';
import { createXtreamApi, type XtreamLiveStream, type XtreamMovie, type XtreamSeries } from '../../services/api';
import {
  browseLabel,
  contentScreen,
  liveChannelCardArt,
  liveChannelCardImg,
  mergeStyle,
  movieCardArt,
  movieCardFallback,
  movieCardFallbackSpan,
  movieCardFallbackStrong,
  movieCardImg,
  searchCopy,
  searchEmpty,
  searchEmptyCopy,
  searchEmptyTitle,
  searchHeader,
  searchHelper,
  searchHelperAccent,
  searchInput,
  searchInputFocused,
  searchInputShell,
  searchRail,
  searchRailCard,
  searchRailCardActive,
  searchRailCardCopy,
  searchRailCardCopyLive,
  searchRailCardLive,
  searchRailCardMeta,
  searchRailCardTitle,
  searchRailEmpty,
  searchRailTrack,
  searchResults,
  searchScreen,
  searchSidebar,
  searchSidebarBack,
  searchSidebarBackFocused,
  searchTitle,
  tvKey,
  tvKeyAccent,
  tvKeyAccentFocused,
  tvKeyboard,
  tvKeyboardRow,
  tvKeyFocused,
  tvKeySpanStyle
} from '../../styles/lgTvStyles';
import { useAppStore } from '../../store/appStore';
import { buildLivePlaybackRequest } from '../live/livePlayback';
import { SafeCardImage } from '../../components/SafeCardImage';
import { legacyChromiumBrowser } from '../../utils/legacyBrowser';


type SearchItem = {
  id: string;
  kind: 'movie' | 'series' | 'live';
  title: string;
  artwork?: string;
  categoryId?: string;
  year?: string;
  rating?: string;
  description?: string;
  accent: string;
};

type KeyboardKey =
  | { action: 'char'; label: string; value?: string; span?: number }
  | { action: 'shift'; label: string; span?: number }
  | { action: 'backspace'; label: string; span?: number }
  | { action: 'space'; label: string; span?: number }
  | { action: 'clear'; label: string; span?: number }
  | { action: 'search'; label: string; span?: number };

const resultAccents = [
  'linear-gradient(180deg, #f4c14d 0%, #8f1b19 100%)',
  'linear-gradient(180deg, #ffffff 0%, #d6d6d6 34%, #8f0f13 35%, #f1f1f1 100%)',
  'linear-gradient(180deg, #d61010 0%, #c41616 100%)',
  'linear-gradient(180deg, #d80000 0%, #0f3ba8 100%)',
  'linear-gradient(180deg, #f50014 0%, #db0012 100%)'
];

const keyboardLayout = [
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', '-'],
  ['shift', 'z', 'x', 'c', 'v', 'b', 'n', 'm', '.', 'backspace']
] as const;

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

function sortByScore<T>(items: T[], score: (item: T) => number) {
  return [...items].sort((a, b) => score(b) - score(a));
}

function getYearFromValue(value?: string | number | null) {
  if (!value) {
    return '';
  }

  const parsed = String(value).split('-')[0];
  return parsed.length === 4 ? parsed : '';
}

function formatRating(value?: string | number | null) {
  if (!value) {
    return '';
  }
  const parsed = parseFloat(String(value));
  if (isNaN(parsed)) {
    return String(value);
  }
  // Standardize 100-based or 50-based ratings down to a 10-based scale if needed, or format normal ones.
  const standard = parsed > 10 ? parsed / 10 : parsed;
  return standard.toFixed(1);
}

function getInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return '?';
  }

  return words
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');
}

function buildKeyboardRows(shifted: boolean) {
  const alphaRows = keyboardLayout.map((row) =>
    row.map<KeyboardKey>((entry) => {
      if (entry === 'shift') {
        return { action: 'shift', label: shifted ? '↓' : '↑' };
      }

      if (entry === 'backspace') {
        return { action: 'backspace', label: 'DEL' };
      }

      const label = shifted ? entry.toUpperCase() : entry;
      return { action: 'char', label, value: label };
    })
  );

  return [
    ...alphaRows,
    [
      { action: 'clear', label: 'CLEAR', span: 3 },
      { action: 'space', label: 'SPACE', span: 4 },
      { action: 'search', label: 'SEARCH', span: 3 }
    ]
  ];
}

function mapMovie(item: XtreamMovie, index: number): SearchItem {
  return {
    id: `movie-${item.stream_id}`,
    kind: 'movie',
    title: item.name,
    artwork: pickImage(item.backdrop_path, item.stream_icon, item.direct_source),
    categoryId: item.category_id,
    year: getYearFromValue(item.added),
    rating: item.rating_5based ? String(item.rating_5based) : item.rating || '',
    description: item.plot || item.genre || '',
    accent: resultAccents[index % resultAccents.length]
  };
}

function mapSeries(item: XtreamSeries, index: number): SearchItem {
  return {
    id: `series-${item.series_id}`,
    kind: 'series',
    title: item.name,
    artwork: pickImage(item.cover, item.backdrop_path),
    categoryId: item.category_id,
    year: getYearFromValue(item.releaseDate),
    rating: item.rating_5based ? String(item.rating_5based) : item.rating ? String(item.rating) : '',
    description: item.plot || item.genre || '',
    accent: resultAccents[index % resultAccents.length]
  };
}

function mapLive(item: XtreamLiveStream, index: number): SearchItem {
  return {
    id: `live-${item.stream_id}`,
    kind: 'live',
    title: item.name,
    artwork: pickImage(item.stream_icon, item.direct_source),
    categoryId: item.category_id,
    year: '',
    rating: '',
    description: '',
    accent: resultAccents[index % resultAccents.length]
  };
}

function trimRail<T>(items: T[]) {
  return items.length > 12 ? items.slice(0, 12) : items;
}

function isTvBackKey(event: { key: string; keyCode?: number }) {
  return (
    event.key === 'Backspace' ||
    event.key === 'Escape' ||
    event.key === 'GoBack' ||
    event.keyCode === 461
  );
}

type SearchScreenProps = {
  isActive: boolean;
  onRequestSidebarFocus: () => void;
};

function SearchScreen({ isActive, onRequestSidebarFocus }: SearchScreenProps) {
  const session = useAppStore((state) => state.session);
  const openContentDetails = useAppStore((state) => state.openContentDetails);
  const openPlayback = useAppStore((state) => state.openPlayback);
  const setStatusMessage = useAppStore((state) => state.setStatusMessage);
  const setCurrentDestination = useAppStore((state) => state.setCurrentDestination);
  const currentDestination = useAppStore((state) => state.currentDestination);
  const query = useAppStore((state) => state.searchQuery);
  const setSearchQuery = useAppStore((state) => state.setSearchQuery);
  const searchFocusId = useAppStore((state) => state.searchFocusId);
  const setSearchFocusId = useAppStore((state) => state.setSearchFocusId);
  const homeBootstrapData = useAppStore((state) => state.homeBootstrapData);
  const [debouncedQuery, setDebouncedQuery] = useState(() => query.trim().toLowerCase());

  const [movies, setMovies] = useState<SearchItem[]>([]);
  const [series, setSeries] = useState<SearchItem[]>([]);
  const [live, setLive] = useState<SearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isShifted, setIsShifted] = useState(false);
  const [keyboardRow, setKeyboardRow] = useState(0);
  const [keyboardCol, setKeyboardCol] = useState(0);
  const queryRef = useRef<HTMLButtonElement | null>(null);
  const keyboardRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const cardRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const searchResultsRef = useRef<HTMLDivElement | null>(null);
  const [focusId, setFocusId] = useState<'query' | string>(searchFocusId || 'query');
  const keyboardRows = useMemo(() => buildKeyboardRows(isShifted), [isShifted]);

  const username = session?.username?.trim();
  const password = session?.userInfo?.password?.trim();
  const portalBaseUrl = session?.portalBaseUrl?.trim();

  const filteredMovies = useMemo(() => {
    const source = debouncedQuery
      ? movies.filter((item) => {
          const haystack = [item.title, item.year, item.rating, item.description].filter(Boolean).join(' ').toLowerCase();
          return haystack.includes(debouncedQuery);
        })
      : movies;

    return trimRail(source);
  }, [debouncedQuery, movies]);

  const filteredSeries = useMemo(() => {
    const source = debouncedQuery
      ? series.filter((item) => {
          const haystack = [item.title, item.year, item.rating, item.description].filter(Boolean).join(' ').toLowerCase();
          return haystack.includes(debouncedQuery);
        })
      : series;

    return trimRail(source);
  }, [debouncedQuery, series]);

  const filteredLive = useMemo(() => {
    const source = debouncedQuery
      ? live.filter((item) => {
          const haystack = [item.title, item.categoryId].filter(Boolean).join(' ').toLowerCase();
          return haystack.includes(debouncedQuery);
        })
      : live;

    return trimRail(source);
  }, [debouncedQuery, live]);

  const railSections = useMemo(() => {
    if (!debouncedQuery) {
      if (!homeBootstrapData?.rails) {
        return [];
      }

      const moviesRail = homeBootstrapData.rails.find(
        (rail) => rail.kind === 'movie' && rail.id !== 'trending-for-you'
      );
      const seriesRail = homeBootstrapData.rails.find(
        (rail) => rail.kind === 'series'
      );
      const liveRail = homeBootstrapData.rails.find(
        (rail) => rail.kind === 'live'
      );

      const suggestionsRails = [];
      if (moviesRail) {
        suggestionsRails.push(moviesRail);
      }
      if (seriesRail) {
        suggestionsRails.push(seriesRail);
      }
      if (liveRail) {
        suggestionsRails.push(liveRail);
      }

      return suggestionsRails.map((rail) => ({
        id: rail.id,
        label: rail.title,
        kind: rail.kind,
        items: rail.items.map((item) => ({
          id: item.id,
          kind: item.kind,
          title: item.name,
          artwork: item.artwork,
          categoryId: item.categoryId,
          containerExtension: item.containerExtension,
          accent: item.accent,
          year: '',
          rating: '',
          description: ''
        }))
      }));
    }

    return [
      { id: 'movies', label: 'Movies', kind: 'movie' as const, items: filteredMovies },
      { id: 'series', label: 'Series', kind: 'series' as const, items: filteredSeries },
      { id: 'live', label: 'Live Channels', kind: 'live' as const, items: filteredLive }
    ];
  }, [debouncedQuery, homeBootstrapData, filteredMovies, filteredSeries, filteredLive]);

  const handlePlayLiveChannel = (item: SearchItem) => {
    const usernameVal = session?.username?.trim();
    const passwordVal = session?.userInfo?.password?.trim();
    const portalUrlVal = session?.portalBaseUrl?.trim();

    if (!usernameVal || !passwordVal || !portalUrlVal) {
      setStatusMessage('Missing live playback session');
      return;
    }

    const activeLiveItems = railSections
      .filter((s) => s.kind === 'live')
      .flatMap((s) => s.items);

    const playback = buildLivePlaybackRequest({
      username: usernameVal,
      password: passwordVal,
      portalBaseUrl: portalUrlVal,
      channels: activeLiveItems.map((entry) => ({
        id: entry.id,
        title: entry.title,
        streamId: Number(entry.id.split('-').pop() || 0),
        artwork: entry.artwork
      })),
      selectedChannelId: item.id,
      returnDestination: 'search'
    });

    if (!playback) {
      setStatusMessage('Missing live stream URL');
      return;
    }

    setStatusMessage(`Playing ${item.title}`);
    openPlayback(playback);
  };

  useEffect(() => {
    setFocusId(searchFocusId || 'query');
  }, [searchFocusId]);

  useEffect(() => {
    setKeyboardRow((current) => Math.min(current, keyboardRows.length - 1));
  }, [keyboardRows.length]);

  useEffect(() => {
    setKeyboardCol((current) => {
      const rowLength = keyboardRows[keyboardRow]?.length ?? 1;
      return Math.min(current, rowLength - 1);
    });
  }, [keyboardRow, keyboardRows]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(query.trim().toLowerCase());
      searchResultsRef.current?.scrollTo({ top: 0 });
    }, 220);

    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const usernameValue = username;
    const passwordValue = password;
    const portalValue = portalBaseUrl;

    if (!usernameValue || !passwordValue || !portalValue) {
      setMovies([]);
      setSeries([]);
      setLive([]);
      return;
    }

    if (!debouncedQuery) {
      setMovies([]);
      setSeries([]);
      setLive([]);
      return;
    }

    let cancelled = false;
    const api = createXtreamApi(portalValue);

    async function loadCatalog() {
      try {
        setLoading(true);
        const [movieResult, seriesResult, liveResult] = await Promise.allSettled([
          api.getVodStreams(usernameValue, passwordValue),
          api.getSeries(usernameValue, passwordValue),
          api.getLiveStreams(usernameValue, passwordValue)
        ]);

        if (cancelled) {
          return;
        }

        const movieItems = movieResult.status === 'fulfilled' ? movieResult.value : [];
        const seriesItems = seriesResult.status === 'fulfilled' ? seriesResult.value : [];
        const liveItems = liveResult.status === 'fulfilled' ? liveResult.value : [];

        const mappedMovies = sortByScore(movieItems, (movie) => {
          const added = movie.added ? Date.parse(String(movie.added)) : 0;
          const rating = Number(movie.rating_5based || 0);
          return (Number.isFinite(added) ? added : 0) + rating * 1000;
        }).map(mapMovie);

        const mappedSeries = sortByScore(seriesItems, (item) => {
          const modified = item.last_modified ? Date.parse(String(item.last_modified)) : 0;
          const rating = Number(item.rating_5based || 0);
          return (Number.isFinite(modified) ? modified : 0) + rating * 1000;
        }).map(mapSeries);

        const mappedLive = sortByScore(liveItems, (item) => Number(item.num) || 0).map(mapLive);

        setMovies(mappedMovies);
        setSeries(mappedSeries);
        setLive(mappedLive);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadCatalog();

    return () => {
      cancelled = true;
    };
  }, [password, portalBaseUrl, username, debouncedQuery]);

  useEffect(() => {
    if (currentDestination !== 'search' || !isActive) {
      return;
    }

    if (focusId.startsWith('card:')) {
      const node = cardRefs.current[focusId];
      if (node) {
        if (document.activeElement !== node) {
          node.focus();
        }

        node.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'auto' });
        return;
      }

      // If the targeted card is temporarily missing during mounting/loading,
      // only reset focus to query if loading has finished and the item is genuinely gone.
      const parts = focusId.split(':');
      const sectionId = parts[1];
      const cardIndex = Number(parts[2]);
      const section = railSections.find((s) => s.id === sectionId);
      const items = section ? section.items : [];
      if (!loading) {
        if (items.length === 0 || cardIndex >= items.length) {
          queryRef.current?.focus();
          setFocusId('query');
          setSearchFocusId('query');
        }
      }
      return;
    }

    if (focusId.startsWith('keyboard:')) {
      const node = keyboardRefs.current[focusId];
      if (node) {
        if (document.activeElement !== node) {
          node.focus();
        }
        return;
      }
    }

    if (focusId === 'query') {
      queryRef.current?.focus();
      return;
    }

    queryRef.current?.focus();
    setFocusId('query');
    setSearchFocusId('query');
  }, [currentDestination, focusId, loading, setSearchFocusId, isActive, railSections]);

  const focusKeyboardKey = (row: number, col: number) => {
    const nextRow = Math.max(0, Math.min(row, keyboardRows.length - 1));
    const nextCol = Math.max(0, Math.min(col, (keyboardRows[nextRow]?.length ?? 1) - 1));
    const nextFocusId = `keyboard:${nextRow}:${nextCol}`;

    setKeyboardRow(nextRow);
    setKeyboardCol(nextCol);
    setFocusId(nextFocusId);
    setSearchFocusId(nextFocusId);
    keyboardRefs.current[nextFocusId]?.focus();
  };

  const getRailFocusId = (sectionId: string, index: number) => `card:${sectionId}:${index}`;

  const focusFirstAvailableRail = () => {
    const targetSection = railSections.findIndex((section) => section.items.length > 0);
    if (targetSection >= 0) {
      focusRailCard(targetSection, 0);
    }
  };

  const focusRailCard = (sectionIndex: number, index: number) => {
    const section = railSections[sectionIndex];
    if (!section || section.items.length === 0) {
      return;
    }

    const nextIndex = Math.max(0, Math.min(index, section.items.length - 1));
    const nextId = getRailFocusId(section.id, nextIndex);
    setFocusId(nextId);
    setSearchFocusId(nextId);
    cardRefs.current[nextId]?.focus();
  };

  const focusQueryField = (scrollToTop = true) => {
    queryRef.current?.focus();
    setFocusId('query');
    setSearchFocusId('query');

    if (scrollToTop) {
      searchResultsRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSearchBack = () => {
    if (focusId === 'query') {
      onRequestSidebarFocus();
      return;
    }

    focusQueryField();
  };

  const findSectionInDirection = (startIndex: number, direction: -1 | 1) => {
    let index = startIndex;

    while (index >= 0 && index < railSections.length) {
      if (railSections[index]?.items.length > 0) {
        return index;
      }

      index += direction;
    }

    return -1;
  };

  const handleQueryKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (isTvBackKey(event)) {
      event.preventDefault();
      handleSearchBack();
      return;
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      onRequestSidebarFocus();
      return;
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      focusFirstAvailableRail();
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      focusKeyboardKey(0, 0);
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      focusKeyboardKey(0, 0);
    }
  };

  const activateKeyboardKey = (key: KeyboardKey) => {
    if (key.action === 'char') {
      setSearchQuery(query + (key.value ?? key.label));
      return;
    }

    if (key.action === 'space') {
      setSearchQuery(query + ' ');
      return;
    }

    if (key.action === 'backspace') {
      setSearchQuery(query.slice(0, -1));
      return;
    }

    if (key.action === 'clear') {
      setSearchQuery('');
      return;
    }

    if (key.action === 'shift') {
      setIsShifted((current) => !current);
      return;
    }

    focusFirstAvailableRail();
  };

  const handleKeyboardKeyDown = (event: KeyboardEvent<HTMLButtonElement>, rowIndex: number, colIndex: number) => {
    const currentRow = keyboardRows[rowIndex] ?? [];

    if (isTvBackKey(event)) {
      event.preventDefault();
      focusQueryField();
      return;
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      if (colIndex === 0) {
        onRequestSidebarFocus();
        return;
      }

      focusKeyboardKey(rowIndex, colIndex - 1);
      return;
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      if (colIndex === currentRow.length - 1) {
        focusFirstAvailableRail();
        return;
      }

      focusKeyboardKey(rowIndex, colIndex + 1);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (rowIndex === 0) {
        queryRef.current?.focus();
        setFocusId('query');
        setSearchFocusId('query');
        return;
      }

      focusKeyboardKey(rowIndex - 1, colIndex);
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (rowIndex === keyboardRows.length - 1) {
        focusFirstAvailableRail();
        return;
      }

      focusKeyboardKey(rowIndex + 1, colIndex);
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      const key = keyboardRows[rowIndex]?.[colIndex];
      if (key) {
        activateKeyboardKey(key);
      }
    }
  };

  const handleCardKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    sectionIndex: number,
    cardIndex: number
  ) => {
    const section = railSections[sectionIndex];

    if (isTvBackKey(event)) {
      event.preventDefault();
      focusQueryField();
      return;
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      if (cardIndex === 0) {
        const targetRow = Math.min(sectionIndex, keyboardRows.length - 1);
        const row = keyboardRows[targetRow] ?? [];
        const lastCol = Math.max(0, row.length - 1);
        focusKeyboardKey(targetRow, lastCol);
        return;
      }

      focusRailCard(sectionIndex, cardIndex - 1);
      return;
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      focusRailCard(sectionIndex, cardIndex + 1);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      const targetSection = findSectionInDirection(sectionIndex - 1, -1);
      if (targetSection < 0) {
        focusQueryField();
        return;
      }

      focusRailCard(targetSection, cardIndex);
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const targetSection = findSectionInDirection(sectionIndex + 1, 1);
      if (targetSection < 0) {
        return;
      }

      focusRailCard(targetSection, cardIndex);
      return;
    }

    if (event.key === 'Enter' && section) {
      event.preventDefault();
      const item = section.items[cardIndex];
      if (!item) {
        return;
      }

      if (item.kind === 'live') {
        handlePlayLiveChannel(item);
        return;
      }

      openContentDetails(
        {
          id: item.id,
          contentId: Number(item.id.split('-').pop() || 0),
          kind: item.kind,
          title: item.title,
          categoryId: item.categoryId,
          posterUrl: item.artwork,
          backdropUrl: item.artwork,
          year: item.year,
          rating: item.rating
        },
        'search'
      );
    }
  };

  return (
    <section style={mergeStyle(contentScreen, searchScreen)} aria-label="Smartifly search">
      <aside style={searchSidebar}>
        <div style={searchHeader}>
          <p style={browseLabel}>Search</p>
          <h1 style={searchTitle}>Find titles fast</h1>
          <p style={searchCopy}>
            Search across your loaded movies and series catalog. Results update as you type.
          </p>
        </div>

        <div style={searchInputShell}>
          <button
            ref={queryRef}
            type="button"
            onKeyDown={handleQueryKeyDown}
            onClick={() => focusKeyboardKey(0, 0)}
            onFocus={() => {
              setFocusId('query');
              setSearchFocusId('query');
            }}
            style={mergeStyle(searchInput, focusId === 'query' && searchInputFocused)}
            aria-label="Search query field"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '10px', verticalAlign: 'middle', display: 'inline-block' }}>
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            {query || 'Type a title, genre, or year'}
          </button>
        </div>

        <div style={{ marginTop: '8px' }}>
          <div style={tvKeyboard} role="group" aria-label="On-screen keyboard">
            {keyboardRows.map((row, rowIndex) => (
              <div style={{ ...tvKeyboardRow, marginTop: rowIndex === 0 ? 0 : '5px' }} key={`search-row-${rowIndex}`}>
                {row.map((key, colIndex) => {
                  const keyId = `keyboard:${rowIndex}:${colIndex}`;
                  const isFocused = focusId === keyId;
                  const isAccent = key.action === 'search';

                  return (
                    <button
                      key={keyId}
                      ref={(node) => {
                        keyboardRefs.current[keyId] = node;
                      }}
                      type="button"
                      style={
                        legacyChromiumBrowser
                          ? {
                              ...mergeStyle(
                                tvKey,
                                isAccent && tvKeyAccent,
                                isFocused && (isAccent ? tvKeyAccentFocused : tvKeyFocused)
                              ),
                              width: `calc(((100% - 54px) / 10) * ${key.span || 1} + ${(key.span || 1) - 1} * 6px)`,
                              marginRight: colIndex === row.length - 1 ? '0px' : '6px',
                              transform: 'none',
                              transition: 'none'
                            }
                          : mergeStyle(
                              tvKey,
                              tvKeySpanStyle(key.span),
                              isAccent && tvKeyAccent,
                              isFocused && (isAccent ? tvKeyAccentFocused : tvKeyFocused)
                            )
                      }
                      onFocus={() => {
                        setFocusId(keyId);
                        setSearchFocusId(keyId);
                        setKeyboardRow(rowIndex);
                        setKeyboardCol(colIndex);
                      }}
                      onClick={() => activateKeyboardKey(key)}
                      onKeyDown={(event) => handleKeyboardKeyDown(event, rowIndex, colIndex)}
                    >
                      {key.label}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        <div style={searchHelper}>
          <span>[←] Menu</span>
          <span>•</span>
          <span>[↵] Select</span>
          <span>•</span>
          <span>[↑/↓] Navigate</span>
        </div>
      </aside>

      <div ref={searchResultsRef} className="lg-browse-scroll" style={searchResults}>
        {debouncedQuery && (filteredMovies.length === 0 && filteredSeries.length === 0 && filteredLive.length === 0) ? (
          <div style={searchEmpty}>
            <h3 style={searchEmptyTitle}>No results yet</h3>
            <p style={searchEmptyCopy}>Try a title, actor, year, or genre keyword.</p>
          </div>
        ) : null}

        {railSections.map((section, sectionIndex) => (
          <section style={searchRail} key={section.id} aria-label={section.label}>
            <div>
              <p style={browseLabel}>{section.label}</p>
            </div>

            {section.items.length === 0 ? (
              <div style={searchRailEmpty}>No {section.label.toLowerCase()} match.</div>
            ) : (
              <div
                className="lg-browse-scroll"
                style={mergeStyle(
                  searchRailTrack,
                  section.kind === 'live' && { gridAutoColumns: '440px' }
                )}
              >
                {section.items.map((item, itemIndex) => {
                  const cardId = `card:${section.id}:${itemIndex}`;
                  const isFocused = focusId === cardId;
                  const isLive = section.kind === 'live';
                  const cardWidth = isLive ? 440 : 268;
                  const cardHeight = isLive ? 248 : 402;
                  const sharedDetails = {
                    id: item.id,
                    contentId: Number(item.id.split('-').pop() || 0),
                    kind: item.kind === 'live' ? 'movie' : item.kind,
                    title: item.title,
                    categoryId: item.categoryId,
                    posterUrl: item.artwork,
                    backdropUrl: item.artwork,
                    year: item.year,
                    rating: item.rating
                  };

                  return (
                    <div
                      key={item.id}
                      style={{
                        width: `${cardWidth}px`,
                        minWidth: `${cardWidth}px`,
                        maxWidth: `${cardWidth}px`,
                        flexShrink: 0,
                        marginRight: '18px',
                        boxSizing: 'border-box'
                      }}
                    >
                      <button
                        ref={(node) => {
                          cardRefs.current[cardId] = node;
                        }}
                        type="button"
                        style={mergeStyle(
                          searchRailCard,
                          {
                            width: '100%',
                            minWidth: '100%',
                            maxWidth: '100%',
                            height: isLive ? '248px' : 'auto',
                            display: 'flex',
                            flexDirection: 'column',
                            marginRight: 0,
                            flexShrink: 0
                          },
                          isFocused && searchRailCardActive
                        )}
                        onFocus={() => {
                          setFocusId(cardId);
                          setSearchFocusId(cardId);
                        }}
                        onClick={() => {
                          if (isLive) {
                            handlePlayLiveChannel(item);
                          } else {
                            openContentDetails(sharedDetails, 'search');
                          }
                        }}
                        onKeyDown={(event) => handleCardKeyDown(event, sectionIndex, itemIndex)}
                      >
                        <div
                          style={{
                            position: 'relative',
                            width: '100%',
                            minWidth: '100%',
                            maxWidth: '100%',
                            height: `${cardHeight}px`,
                            borderRadius: '20px',
                            overflow: 'hidden',
                            background: isLive
                              ? 'linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(240, 240, 240, 0.98) 100%)'
                              : 'linear-gradient(180deg, rgba(18, 20, 24, 0.9) 0%, rgba(8, 9, 12, 0.96) 100%)'
                          }}
                        >
                          <SafeCardImage
                            src={item.artwork || ''}
                            isLiveRail={isLive}
                            name={item.title}
                            accent={item.accent || ''}
                            fallback={null}
                          />
                        </div>

                        {!isLive && (
                          <div style={searchRailCardCopy}>
                            <strong style={mergeStyle(searchRailCardTitle, { opacity: isFocused ? 1 : 0.82, transition: 'opacity 0.22s' })}>
                              {item.title}
                            </strong>
                            <div style={mergeStyle(searchRailCardMeta, { color: isFocused ? 'rgba(255, 255, 255, 0.88)' : 'rgba(255, 255, 255, 0.54)', transition: 'color 0.22s' })}>
                              {item.year ? <span>{item.year}</span> : null}
                              {item.year && item.rating ? <span style={{ color: 'rgba(255, 255, 255, 0.3)' }}>•</span> : null}
                              {item.rating ? (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                  <span style={{ color: '#E50914' }}>★</span> {formatRating(item.rating)}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        )}
                      </button>
                    </div>
                  );

                })}
              </div>
            )}
          </section>
        ))}
      </div>
    </section>
  );
}

export default SearchScreen;
