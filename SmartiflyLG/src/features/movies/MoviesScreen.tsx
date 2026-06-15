import { type KeyboardEvent, type MutableRefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BrowsePosterArt } from '../../components/BrowsePosterArt';
import { createXtreamApi, type XtreamCategory, type XtreamMovie } from '../../services/api';
import {
  browseCategories,
  browseCategory,
  browseCategoryActive,
  browseCategoryCount,
  browseCategoryCountActive,
  browseContent,
  browseGrid,
  browseContentHeader,
  browseGridHeader,
  browseGridHeaderHint,
  browseGridScroll,
  browseGridTitle,
  browseHint,
  browseMetaItem,
  browseLabel,
  browseLoading,
  browseLoadingSpinner,
  browseMeta,
  browseScreenBase,
  browseSidebar,
  browseSidebarHeader,
  cardDebugOverlay,
  contentScreen,
  getCategoryItemStyle,
  mergeStyle,
  movieCard,
  movieCardActive
} from '../../styles/lgTvStyles';
import { useAppStore } from '../../store/appStore';

type MovieCategory = {
  id: string;
  name: string;
  count: number;
};

type MovieCard = {
  id: string;
  name: string;
  streamId: number;
  artwork?: string;
  categoryId: string;
  rating?: string;
  year?: string;
  accent: string;
};

const posterAccents = [
  'linear-gradient(180deg, #f5d06a 0%, #b54d21 100%)',
  'linear-gradient(180deg, #dfe7f2 0%, #6e7f92 100%)',
  'linear-gradient(180deg, #ff4c46 0%, #981015 100%)',
  'linear-gradient(180deg, #b9d4ff 0%, #163561 100%)',
  'linear-gradient(180deg, #f1b15a 0%, #72290c 100%)'
];

const MOVIE_BATCH_SIZE = 15;
const MOVIE_BATCH_PREFETCH = 3;

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

function ensureCardCount(items: MovieCard[], minLength: number) {
  if (items.length === 0 || items.length >= minLength) {
    return items.slice(0, minLength);
  }

  const repeated = [...items];
  let duplicateIndex = 0;

  while (repeated.length < minLength) {
    for (const item of items) {
      if (repeated.length >= minLength) {
        break;
      }

      repeated.push({
        ...item,
        id: `${item.id}-dup-${duplicateIndex}-${repeated.length}`
      });
    }

    duplicateIndex += 1;
  }

  return repeated;
}

function getMovieYear(movie: XtreamMovie) {
  const raw = movie.added || movie.tmdb_id || movie.rating;
  if (!raw) {
    return '';
  }

  const parsed = String(raw).split('-')[0];
  return parsed.length === 4 ? parsed : '';
}

function truncateDebugValue(value: string | undefined, maxLength = 42) {
  if (!value) {
    return 'n/a';
  }

  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}...` : value;
}

function parseFocusId(focusId: string) {
  if (!focusId.startsWith('card:')) {
    return null;
  }

  return focusId.slice('card:'.length);
}

function focusMovie(
  movie: MovieCard | undefined,
  setFocusId: (value: string) => void,
  cardRefs: MutableRefObject<Record<string, HTMLButtonElement | null>>
) {
  if (!movie) {
    return;
  }

  setFocusId(`card:${movie.id}`);
  cardRefs.current[`card:${movie.id}`]?.focus();
}

function focusCategory(
  categoryId: string,
  setFocusId: (value: string) => void,
  categoryRefs: MutableRefObject<Record<string, HTMLButtonElement | null>>
) {
  setFocusId(`category:${categoryId}`);
  categoryRefs.current[`category:${categoryId}`]?.focus();
}

function buildMovieCatalog(
  vodCategories: XtreamCategory[],
  vodStreams: XtreamMovie[],
  storedCategoryId: string,
  storedFocusId: string
) {
  const sortedMovies = sortByScore(vodStreams, (movie) => {
    const added = movie.added ? Date.parse(String(movie.added)) : 0;
    const rating = Number(movie.rating_5based || 0);
    return (Number.isFinite(added) ? added : 0) + rating * 1000;
  });

  const mappedMovies = sortedMovies.map<MovieCard>((movie, index) => ({
    id: `movie-${movie.stream_id}`,
    name: movie.name,
    streamId: movie.stream_id,
    artwork: pickImage(movie.backdrop_path, movie.stream_icon, movie.direct_source),
    categoryId: movie.category_id || '0',
    rating: movie.rating_5based ? String(movie.rating_5based) : '',
    year: getMovieYear(movie),
    accent: posterAccents[index % posterAccents.length]
  }));

  const counts = mappedMovies.reduce<Record<string, number>>((acc, movie) => {
    acc[movie.categoryId] = (acc[movie.categoryId] || 0) + 1;
    return acc;
  }, {});

  const categories: MovieCategory[] = vodCategories
    .filter((category) => counts[category.category_id] > 0)
    .map((category) => ({
      id: category.category_id,
      name: category.category_name,
      count: counts[category.category_id] || 0
    }));

  const defaultCategoryId = categories[0]?.id || '';
  const selectedCategoryId = categories.some((category) => category.id === storedCategoryId)
    ? storedCategoryId
    : defaultCategoryId;
  const focusId = (() => {
    if (storedFocusId.startsWith('category:')) {
      const categoryId = storedFocusId.slice('category:'.length);
      if (categories.some((category) => category.id === categoryId)) {
        return storedFocusId;
      }
    }

    if (storedFocusId.startsWith('card:')) {
      const storedCardId = storedFocusId.slice('card:'.length);
      const storedCard = mappedMovies.find((movie) => movie.id === storedCardId);
      if (storedCard && storedCard.categoryId === selectedCategoryId) {
        return storedFocusId;
      }
    }

    return selectedCategoryId ? `category:${selectedCategoryId}` : '';
  })();

  return {
    categories,
    movies: mappedMovies,
    selectedCategoryId,
    focusId
  };
}

type MoviesScreenProps = {
  onRequestSidebarFocus: () => void;
  contentFocusToken: number;
  onContentRegionChange: (region: 'categories' | 'cards') => void;
};

function MoviesScreen({ onRequestSidebarFocus, contentFocusToken, onContentRegionChange }: MoviesScreenProps) {
  const session = useAppStore((state) => state.session);
  const currentDestination = useAppStore((state) => state.currentDestination);
  const openContentDetails = useAppStore((state) => state.openContentDetails);
  const storedCategoryId = useAppStore((state) => state.moviesCategoryId);
  const storedFocusId = useAppStore((state) => state.moviesFocusId);
  const storedLastFocusedCardId = useAppStore((state) => state.moviesLastFocusedCardId);
  const setMoviesBrowseState = useAppStore((state) => state.setMoviesBrowseState);
  const moviesCatalog = useAppStore((state) => state.moviesCatalog);
  const setMoviesCatalog = useAppStore((state) => state.setMoviesCatalog);

  const [categories, setCategories] = useState<MovieCategory[]>(() => moviesCatalog?.categories ?? []);
  const [movies, setMovies] = useState<MovieCard[]>(() => moviesCatalog?.movies ?? []);
  const [selectedCategoryId, setSelectedCategoryId] = useState(() => moviesCatalog?.selectedCategoryId ?? storedCategoryId);
  const [focusId, setFocusId] = useState(() => moviesCatalog?.focusId ?? storedFocusId);
  const [visibleCount, setVisibleCount] = useState(MOVIE_BATCH_SIZE);
  const [isLoading, setIsLoading] = useState(() => !moviesCatalog);
  const categoryRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const cardRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const lastFocusedMovieId = useRef<string | null>(storedLastFocusedCardId || null);
  const pendingRestoreFocusId = useRef<string>(moviesCatalog?.focusId ?? storedFocusId);

  useEffect(() => {
    const username = session?.username?.trim();
    const password = session?.userInfo?.password?.trim();
    const portalBaseUrl = session?.portalBaseUrl?.trim();

    if (!username || !password || !portalBaseUrl) {
      setCategories([]);
      setMovies([]);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    const api = createXtreamApi(portalBaseUrl);

    async function loadMovies() {
      if (!moviesCatalog) {
        setIsLoading(true);
      }
      try {
        const [categoriesResult, moviesResult] = await Promise.allSettled([
          api.getVodCategories(username, password),
          api.getVodStreams(username, password)
        ]);

        if (cancelled) {
          return;
        }

        const vodCategories = categoriesResult.status === 'fulfilled' ? categoriesResult.value : [];
        const vodStreams = moviesResult.status === 'fulfilled' ? moviesResult.value : [];
        const nextCatalog = buildMovieCatalog(vodCategories, vodStreams, storedCategoryId, storedFocusId);

        setCategories(nextCatalog.categories);
        setMovies(nextCatalog.movies);
        setSelectedCategoryId(nextCatalog.selectedCategoryId);
        setFocusId(nextCatalog.focusId);
        pendingRestoreFocusId.current = nextCatalog.focusId;
      } catch {
        if (!cancelled && !moviesCatalog) {
          setCategories([]);
          setMovies([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadMovies();

    return () => {
      cancelled = true;
    };
  }, [session?.portalBaseUrl, session?.userInfo?.password, session?.username]);

  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === selectedCategoryId) ?? categories[0] ?? null,
    [categories, selectedCategoryId]
  );

  const selectedMovies = useMemo(() => {
    return selectedCategoryId ? movies.filter((movie) => movie.categoryId === selectedCategoryId) : movies;
  }, [movies, selectedCategoryId]);

  const visibleMovies = useMemo(() => {
    return selectedMovies.slice(0, visibleCount);
  }, [selectedMovies, visibleCount]);
  const hasCatalogContent = categories.length > 0 && movies.length > 0;

  const expandVisibleMovies = useCallback(
    (focusedIndex?: number) => {
      if (selectedMovies.length <= visibleCount) {
        return;
      }

      if (typeof focusedIndex === 'number' && focusedIndex < visibleCount - MOVIE_BATCH_PREFETCH) {
        return;
      }

      setVisibleCount((current) => Math.min(current + MOVIE_BATCH_SIZE, selectedMovies.length));
    },
    [selectedMovies.length, visibleCount]
  );

  const featuredMovie = useMemo(() => {
    const focusedMovieId = parseFocusId(focusId);
    if (focusedMovieId) {
      const focusedMovie = visibleMovies.find((movie) => movie.id === focusedMovieId);
      if (focusedMovie) {
        return focusedMovie;
      }
    }

    return visibleMovies[0] ?? movies[0] ?? null;
  }, [focusId, movies, visibleMovies]);

  useEffect(() => {
    const focusedMovieId = parseFocusId(focusId);
    if (focusedMovieId) {
      lastFocusedMovieId.current = focusedMovieId;
    }
  }, [focusId]);

  useEffect(() => {
    setMoviesBrowseState({
      categoryId: selectedCategoryId,
      focusId,
      lastFocusedCardId: lastFocusedMovieId.current ?? ''
    });
  }, [focusId, selectedCategoryId, setMoviesBrowseState]);

  useEffect(() => {
    if (categories.length > 0 && movies.length > 0) {
      setMoviesCatalog({
        categories,
        movies,
        selectedCategoryId,
        focusId
      });
    }
  }, [categories, movies, selectedCategoryId, focusId, setMoviesCatalog]);

  useEffect(() => {
    if (currentDestination !== 'movies' || !pendingRestoreFocusId.current) {
      return;
    }

    const restoreFocusId = pendingRestoreFocusId.current;
    const focusedMovieId = parseFocusId(restoreFocusId);
    if (focusedMovieId) {
      const focusedMovieIndex = selectedMovies.findIndex((movie) => movie.id === focusedMovieId);
      if (focusedMovieIndex >= 0 && focusedMovieIndex >= visibleCount) {
        setVisibleCount(Math.min(Math.ceil((focusedMovieIndex + 1) / MOVIE_BATCH_SIZE) * MOVIE_BATCH_SIZE, selectedMovies.length));
        return;
      }

      const cardNode = cardRefs.current[`card:${focusedMovieId}`];
      if (cardNode && document.activeElement !== cardNode) {
        cardNode.focus();
        pendingRestoreFocusId.current = '';
        return;
      }
    }

    const categoryFocusId = restoreFocusId.startsWith('category:') ? restoreFocusId : `category:${selectedCategoryId}`;
    const categoryNode = categoryRefs.current[categoryFocusId];
    if (categoryNode && document.activeElement !== categoryNode) {
      categoryNode.focus();
      pendingRestoreFocusId.current = '';
    }
  }, [categories, currentDestination, focusId, selectedCategoryId, selectedMovies, visibleCount, visibleMovies]);

  useEffect(() => {
    if (pendingRestoreFocusId.current.startsWith('card:')) {
      return;
    }

    const categoryNode = categoryRefs.current[`category:${selectedCategoryId}`];
    if (categoryNode) {
      onContentRegionChange('categories');
      setFocusId(`category:${selectedCategoryId}`);
      categoryNode.focus();
    }
  }, [contentFocusToken, onContentRegionChange, selectedCategoryId]);

  useEffect(() => {
    setVisibleCount(MOVIE_BATCH_SIZE);
  }, [selectedCategoryId]);

  useEffect(() => {
    const focusedMovieId = parseFocusId(focusId);
    if (!focusedMovieId) {
      return;
    }

    const focusedIndex = selectedMovies.findIndex((movie) => movie.id === focusedMovieId);
    if (focusedIndex < 0) {
      return;
    }

    if (focusedIndex >= visibleCount - MOVIE_BATCH_PREFETCH && visibleCount < selectedMovies.length) {
      expandVisibleMovies(focusedIndex);
    }
  }, [expandVisibleMovies, focusId, selectedMovies, selectedMovies.length, visibleCount]);

  const handleCategoryKeyDown = (event: KeyboardEvent<HTMLButtonElement>, categoryIndex: number) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const nextCategory = categories[Math.min(categoryIndex + 1, categories.length - 1)];
      if (nextCategory) {
        setFocusId(`category:${nextCategory.id}`);
        categoryRefs.current[`category:${nextCategory.id}`]?.focus();
      }
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      const nextCategory = categories[Math.max(categoryIndex - 1, 0)];
      if (nextCategory) {
        setFocusId(`category:${nextCategory.id}`);
        categoryRefs.current[`category:${nextCategory.id}`]?.focus();
      }
      return;
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      onRequestSidebarFocus();
      return;
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      const rememberedMovieId = lastFocusedMovieId.current;
      const rememberedMovie =
        visibleMovies.find((movie) => movie.id === rememberedMovieId) ?? visibleMovies[0];
      focusMovie(rememberedMovie, setFocusId, cardRefs);
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      const selectedCategory = categories[categoryIndex];
      if (selectedCategory) {
        setSelectedCategoryId(selectedCategory.id);
        setFocusId(`category:${selectedCategory.id}`);
      }
    }
  };

  const handleCardKeyDown = (event: KeyboardEvent<HTMLButtonElement>, movieIndex: number) => {
    const columns = 5;
    const rowCount = Math.max(1, Math.ceil(visibleMovies.length / columns));

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      if (movieIndex === 0 && selectedCategoryId) {
        focusCategory(selectedCategoryId, setFocusId, categoryRefs);
        return;
      }

      const previousMovie = visibleMovies[movieIndex - 1] ?? visibleMovies[visibleMovies.length - 1];
      expandVisibleMovies(movieIndex - 1);
      focusMovie(previousMovie, setFocusId, cardRefs);
      return;
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      const nextMovie = visibleMovies[movieIndex + 1] ?? visibleMovies[0];
      expandVisibleMovies(movieIndex + 1);
      focusMovie(nextMovie, setFocusId, cardRefs);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      const col = movieIndex % columns;
      const targetRow = movieIndex - columns >= 0 ? Math.floor(movieIndex / columns) - 1 : rowCount - 1;
      let nextIndex = targetRow * columns + col;
      while (nextIndex >= visibleMovies.length) {
        nextIndex -= columns;
      }
      if (nextIndex < 0) {
        nextIndex = visibleMovies.length - 1;
      }
      expandVisibleMovies(nextIndex);
      focusMovie(visibleMovies[nextIndex], setFocusId, cardRefs);
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const col = movieIndex % columns;
      const targetRow = movieIndex + columns < visibleMovies.length ? Math.floor(movieIndex / columns) + 1 : 0;
      let nextIndex = targetRow * columns + col;
      while (nextIndex >= visibleMovies.length) {
        nextIndex -= columns;
      }
      expandVisibleMovies(nextIndex);
      focusMovie(visibleMovies[nextIndex], setFocusId, cardRefs);
    }
  };

  return (
    <section
      className="lg-browse-scroll"
      style={mergeStyle(contentScreen, browseScreenBase)}
      aria-label="Smartifly movies"
    >
      <aside style={browseSidebar} aria-label="Movie categories">
        <div style={browseSidebarHeader}>
          <p style={browseLabel}>Movies</p>
        </div>

        <div className="lg-browse-scroll" style={browseCategories}>
          {categories.map((category, index) => {
            const isSelected = selectedCategoryId === category.id;
            const isFocused = focusId === `category:${category.id}`;
            const isActive = isSelected || isFocused;

            return (
              <button
                key={category.id}
                type="button"
                ref={(node) => {
                  categoryRefs.current[`category:${category.id}`] = node;
                }}
                style={getCategoryItemStyle(isFocused, isSelected)}
                onClick={() => {
                  setSelectedCategoryId(category.id);
                  setFocusId(`category:${category.id}`);
                  onContentRegionChange('categories');
                }}
                onMouseEnter={() => {
                  setFocusId(`category:${category.id}`);
                  onContentRegionChange('categories');
                }}
                onFocus={() => {
                  setFocusId(`category:${category.id}`);
                  onContentRegionChange('categories');
                }}
                onKeyDown={(event) => handleCategoryKeyDown(event, index)}
              >
                {(isSelected || isFocused) && (
                  <span
                    aria-hidden="true"
                    style={{
                      position: 'absolute',
                      left: '0',
                      top: '14px',
                      bottom: '14px',
                      width: '4px',
                      borderRadius: '999px',
                      background: '#ff2438'
                    }}
                  />
                )}
                <span style={{ 
                  color: isFocused ? '#07090e' : '#ffffff', 
                  fontSize: '18px', 
                  fontWeight: 800,
                  paddingLeft: '6px'
                }}>
                  {category.name}
                </span>
                <span style={{ 
                  color: isFocused ? 'rgba(7, 9, 14, 0.65)' : 'rgba(255, 255, 255, 0.45)', 
                  fontSize: '13px', 
                  fontWeight: 700,
                  paddingRight: '6px'
                }}>
                  {category.count}
                </span>
              </button>
            );
          })}
        </div>
      </aside>

      <section style={browseContent} aria-label="Movie grid">
        <div style={mergeStyle(browseGridHeader, browseContentHeader)}>
          <div>
            <p style={browseLabel}>{selectedCategory?.name ?? 'Movies'}</p>
            <h2 style={browseGridTitle}>{featuredMovie?.name ?? 'Browse movies'}</h2>
            <div style={browseMeta}>
              {featuredMovie?.year ? <span style={browseMetaItem}>{featuredMovie.year}</span> : null}
              {featuredMovie?.rating ? <span style={browseMetaItem}>{featuredMovie.rating}</span> : null}
            </div>
          </div>
          <p style={mergeStyle(browseHint, browseGridHeaderHint)}>
            {isLoading && !hasCatalogContent
              ? 'Loading titles...'
              : isLoading
                ? 'Refreshing titles...'
                : visibleMovies.length > 0
                  ? `${visibleMovies.length} titles`
                  : 'No titles loaded'}
          </p>
        </div>

        <div className="lg-browse-scroll" style={browseGridScroll}>
          {isLoading && !hasCatalogContent ? (
            <div style={browseLoading} role="status" aria-live="polite">
              <div style={browseLoadingSpinner} aria-hidden="true" />
              <p>Loading movies...</p>
            </div>
          ) : (
          <div style={browseGrid}>
            {visibleMovies.map((movie, index) => {
              const isFocused = focusId === `card:${movie.id}`;

              return (
                <button
                  key={movie.id}
                  type="button"
                  ref={(node) => {
                    cardRefs.current[`card:${movie.id}`] = node;
                  }}
                  style={mergeStyle(movieCard, isFocused && movieCardActive)}
                  onClick={() => {
                    openContentDetails(
                      {
                        id: movie.id,
                        contentId: Number(movie.id.replace(/^movie-/, '')),
                        kind: 'movie',
                        title: movie.name,
                        categoryId: movie.categoryId,
                        posterUrl: movie.artwork,
                        backdropUrl: movie.artwork,
                        description: movie.name,
                        year: movie.year,
                        rating: movie.rating
                      },
                      currentDestination
                    );
                  }}
                  onFocus={() => {
                    expandVisibleMovies(index);
                    setFocusId(`card:${movie.id}`);
                    onContentRegionChange('cards');
                  }}
                  onMouseEnter={() => {
                    setFocusId(`card:${movie.id}`);
                    onContentRegionChange('cards');
                  }}
                  onKeyDown={(event) => handleCardKeyDown(event, index)}
                >
                  <BrowsePosterArt
                    artwork={movie.artwork}
                    name={movie.name}
                    accent={movie.accent}
                    badge={movie.rating || 'HD'}
                  />
                  {import.meta.env.DEV ? (
                    <div style={cardDebugOverlay}>
                      <span>ID: {movie.streamId}</span>
                      <span>EXT: auto</span>
                      <span>IMG: {truncateDebugValue(movie.artwork)}</span>
                    </div>
                  ) : null}
                </button>
              );
            })}
          </div>
          )}
        </div>
      </section>
    </section>
  );
}

export default MoviesScreen;
