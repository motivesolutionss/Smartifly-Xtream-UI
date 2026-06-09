import { type KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BrowsePosterArt } from '../../components/BrowsePosterArt';
import { createXtreamApi, type XtreamSeries } from '../../services/api';
import {
  browseCategories,
  browseCategory,
  browseCategoryActive,
  browseCategoryCount,
  browseCategoryCountActive,
  browseContent,
  browseContentHeader,
  browseGrid,
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

type SeriesCategory = {
  id: string;
  name: string;
  count: number;
};

type SeriesCard = {
  id: string;
  name: string;
  seriesId: number;
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

const SERIES_BATCH_SIZE = 15;
const SERIES_BATCH_PREFETCH = 3;

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

function getSeriesYear(series: XtreamSeries) {
  const raw = series.releaseDate || series.last_modified || series.rating;
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

type SeriesScreenProps = {
  onRequestSidebarFocus: () => void;
  contentFocusToken: number;
  onContentRegionChange: (region: 'categories' | 'cards') => void;
};

function SeriesScreen({ onRequestSidebarFocus, contentFocusToken, onContentRegionChange }: SeriesScreenProps) {
  const session = useAppStore((state) => state.session);
  const currentDestination = useAppStore((state) => state.currentDestination);
  const openContentDetails = useAppStore((state) => state.openContentDetails);
  const storedCategoryId = useAppStore((state) => state.seriesCategoryId);
  const storedFocusId = useAppStore((state) => state.seriesFocusId);
  const storedLastFocusedCardId = useAppStore((state) => state.seriesLastFocusedCardId);
  const setSeriesBrowseState = useAppStore((state) => state.setSeriesBrowseState);
  const [categories, setCategories] = useState<SeriesCategory[]>([]);
  const [seriesItems, setSeriesItems] = useState<SeriesCard[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState(storedCategoryId);
  const [focusId, setFocusId] = useState(storedFocusId);
  const [visibleCount, setVisibleCount] = useState(SERIES_BATCH_SIZE);
  const [isLoading, setIsLoading] = useState(false);
  const categoryRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const cardRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const lastFocusedSeriesId = useRef<string | null>(storedLastFocusedCardId || null);
  const pendingRestoreFocusId = useRef<string>(storedFocusId);

  useEffect(() => {
    const username = session?.username?.trim();
    const password = session?.userInfo?.password?.trim();
    const portalBaseUrl = session?.portalBaseUrl?.trim();

    if (!username || !password || !portalBaseUrl) {
      setCategories([]);
      setSeriesItems([]);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    const api = createXtreamApi(portalBaseUrl);

    async function loadSeries() {
      setIsLoading(true);
      try {
        const [categoriesResult, seriesResult] = await Promise.allSettled([
          api.getSeriesCategories(username, password),
          api.getSeries(username, password)
        ]);

        if (cancelled) {
          return;
        }

        const seriesCategories = categoriesResult.status === 'fulfilled' ? categoriesResult.value : [];
        const series = seriesResult.status === 'fulfilled' ? seriesResult.value : [];

        const sortedSeries = sortByScore(series, (item) => {
          const modified = item.last_modified ? Date.parse(String(item.last_modified)) : 0;
          const rating = Number(item.rating_5based || 0);
          return (Number.isFinite(modified) ? modified : 0) + rating * 1000;
        });

        const mappedSeries = sortedSeries.map<SeriesCard>((item, index) => ({
          id: `series-${item.series_id}`,
          name: item.name,
          seriesId: item.series_id,
          artwork: pickImage(item.cover, item.backdrop_path),
          categoryId: item.category_id || '0',
          rating: item.rating ? String(item.rating) : item.rating_5based ? String(item.rating_5based) : '',
          year: getSeriesYear(item),
          accent: posterAccents[index % posterAccents.length]
        }));

        const counts = mappedSeries.reduce<Record<string, number>>((acc, item) => {
          acc[item.categoryId] = (acc[item.categoryId] || 0) + 1;
          return acc;
        }, {});

        const nextCategories: SeriesCategory[] = seriesCategories
          .filter((category) => counts[category.category_id] > 0)
          .map((category) => ({
            id: category.category_id,
            name: category.category_name,
            count: counts[category.category_id] || 0
          }));

        const defaultCategoryId = nextCategories[0]?.id || '';
        const nextSelectedCategoryId = nextCategories.some((category) => category.id === storedCategoryId)
          ? storedCategoryId
          : defaultCategoryId;
        const nextFocusId = (() => {
          if (storedFocusId.startsWith('category:')) {
            const categoryId = storedFocusId.slice('category:'.length);
            if (nextCategories.some((category) => category.id === categoryId)) {
              return storedFocusId;
            }
          }

          if (storedFocusId.startsWith('card:')) {
            const storedCardId = storedFocusId.slice('card:'.length);
            const storedCard = mappedSeries.find((item) => item.id === storedCardId);
            if (storedCard && storedCard.categoryId === nextSelectedCategoryId) {
              return storedFocusId;
            }
          }

          return nextSelectedCategoryId ? `category:${nextSelectedCategoryId}` : '';
        })();

        setCategories(nextCategories);
        setSeriesItems(mappedSeries);
        setSelectedCategoryId(nextSelectedCategoryId);
        setFocusId(nextFocusId);
        pendingRestoreFocusId.current = nextFocusId;
      } catch {
        if (!cancelled) {
          setCategories([]);
          setSeriesItems([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadSeries();

    return () => {
      cancelled = true;
    };
  }, [session?.portalBaseUrl, session?.userInfo?.password, session?.username]);

  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === selectedCategoryId) ?? categories[0] ?? null,
    [categories, selectedCategoryId]
  );

  const selectedSeries = useMemo(() => {
    return selectedCategoryId ? seriesItems.filter((item) => item.categoryId === selectedCategoryId) : seriesItems;
  }, [seriesItems, selectedCategoryId]);

  const visibleSeries = useMemo(() => {
    return selectedSeries.slice(0, visibleCount);
  }, [selectedSeries, visibleCount]);

  const expandVisibleSeries = useCallback(
    (focusedIndex?: number) => {
      if (selectedSeries.length <= visibleCount) {
        return;
      }

      if (typeof focusedIndex === 'number' && focusedIndex < visibleCount - SERIES_BATCH_PREFETCH) {
        return;
      }

      setVisibleCount((current) => Math.min(current + SERIES_BATCH_SIZE, selectedSeries.length));
    },
    [selectedSeries.length, visibleCount]
  );

  const featuredSeries = useMemo(() => {
    const focusedSeriesId = parseFocusId(focusId);
    if (focusedSeriesId) {
      const focusedSeries = visibleSeries.find((item) => item.id === focusedSeriesId);
      if (focusedSeries) {
        return focusedSeries;
      }
    }

    return visibleSeries[0] ?? seriesItems[0] ?? null;
  }, [focusId, seriesItems, visibleSeries]);

  useEffect(() => {
    const focusedSeriesId = parseFocusId(focusId);
    if (focusedSeriesId) {
      lastFocusedSeriesId.current = focusedSeriesId;
    }
  }, [focusId]);

  useEffect(() => {
    setSeriesBrowseState({
      categoryId: selectedCategoryId,
      focusId,
      lastFocusedCardId: lastFocusedSeriesId.current ?? ''
    });
  }, [focusId, selectedCategoryId, setSeriesBrowseState]);

  useEffect(() => {
    if (currentDestination !== 'series' || !pendingRestoreFocusId.current) {
      return;
    }

    const restoreFocusId = pendingRestoreFocusId.current;
    const focusedSeriesId = parseFocusId(restoreFocusId);
    if (focusedSeriesId) {
      const focusedSeriesIndex = selectedSeries.findIndex((item) => item.id === focusedSeriesId);
      if (focusedSeriesIndex >= 0 && focusedSeriesIndex >= visibleCount) {
        setVisibleCount(Math.min(Math.ceil((focusedSeriesIndex + 1) / SERIES_BATCH_SIZE) * SERIES_BATCH_SIZE, selectedSeries.length));
        return;
      }

      const cardNode = cardRefs.current[`card:${focusedSeriesId}`];
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
  }, [categories, currentDestination, focusId, selectedCategoryId, selectedSeries, visibleCount, visibleSeries]);

  useEffect(() => {
    const categoryNode = categoryRefs.current[`category:${selectedCategoryId}`];
    if (categoryNode) {
      onContentRegionChange('categories');
      setFocusId(`category:${selectedCategoryId}`);
      categoryNode.focus();
    }
  }, [contentFocusToken, onContentRegionChange, selectedCategoryId]);

  useEffect(() => {
    setVisibleCount(SERIES_BATCH_SIZE);
  }, [selectedCategoryId]);

  useEffect(() => {
    const focusedSeriesId = parseFocusId(focusId);
    if (!focusedSeriesId) {
      return;
    }

    const focusedIndex = selectedSeries.findIndex((item) => item.id === focusedSeriesId);
    if (focusedIndex < 0) {
      return;
    }

    if (focusedIndex >= visibleCount - SERIES_BATCH_PREFETCH && visibleCount < selectedSeries.length) {
      expandVisibleSeries(focusedIndex);
    }
  }, [expandVisibleSeries, focusId, selectedSeries, selectedSeries.length, visibleCount]);

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
      const rememberedSeriesId = lastFocusedSeriesId.current;
      const rememberedSeries =
        visibleSeries.find((item) => item.id === rememberedSeriesId) ?? visibleSeries[0];
      if (rememberedSeries) {
        setFocusId(`card:${rememberedSeries.id}`);
        cardRefs.current[`card:${rememberedSeries.id}`]?.focus();
      }
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

  const handleCardKeyDown = (event: KeyboardEvent<HTMLButtonElement>, seriesIndex: number) => {
    const columns = 5;
    const rowCount = Math.max(1, Math.ceil(visibleSeries.length / columns));

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      if (seriesIndex === 0 && selectedCategoryId) {
        setFocusId(`category:${selectedCategoryId}`);
        categoryRefs.current[`category:${selectedCategoryId}`]?.focus();
        return;
      }

      const previousSeries = visibleSeries[seriesIndex - 1] ?? visibleSeries[visibleSeries.length - 1];
      if (previousSeries) {
        expandVisibleSeries(seriesIndex - 1);
        setFocusId(`card:${previousSeries.id}`);
        cardRefs.current[`card:${previousSeries.id}`]?.focus();
      }
      return;
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      const nextSeries = visibleSeries[seriesIndex + 1] ?? visibleSeries[0];
      if (nextSeries) {
        expandVisibleSeries(seriesIndex + 1);
        setFocusId(`card:${nextSeries.id}`);
        cardRefs.current[`card:${nextSeries.id}`]?.focus();
      }
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      const col = seriesIndex % columns;
      const targetRow = seriesIndex - columns >= 0 ? Math.floor(seriesIndex / columns) - 1 : rowCount - 1;
      let nextIndex = targetRow * columns + col;
      while (nextIndex >= visibleSeries.length) {
        nextIndex -= columns;
      }
      if (nextIndex < 0) {
        nextIndex = visibleSeries.length - 1;
      }

      const nextSeries = visibleSeries[nextIndex];
      if (nextSeries) {
        expandVisibleSeries(nextIndex);
        setFocusId(`card:${nextSeries.id}`);
        cardRefs.current[`card:${nextSeries.id}`]?.focus();
      }
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const col = seriesIndex % columns;
      const targetRow = seriesIndex + columns < visibleSeries.length ? Math.floor(seriesIndex / columns) + 1 : 0;
      let nextIndex = targetRow * columns + col;
      while (nextIndex >= visibleSeries.length) {
        nextIndex -= columns;
      }

      const nextSeries = visibleSeries[nextIndex];
      if (nextSeries) {
        expandVisibleSeries(nextIndex);
        setFocusId(`card:${nextSeries.id}`);
        cardRefs.current[`card:${nextSeries.id}`]?.focus();
      }
    }
  };

  return (
    <section
      className="lg-browse-scroll"
      style={mergeStyle(contentScreen, browseScreenBase)}
      aria-label="Smartifly series"
    >
      <aside style={browseSidebar} aria-label="Series categories">
        <div style={browseSidebarHeader}>
          <p style={browseLabel}>Series</p>
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

      <section style={browseContent} aria-label="Series grid">
        <div style={mergeStyle(browseGridHeader, browseContentHeader)}>
          <div>
            <p style={browseLabel}>{selectedCategory?.name ?? 'Series'}</p>
            <h2 style={browseGridTitle}>{featuredSeries?.name ?? 'Browse series'}</h2>
            <div style={browseMeta}>
              {featuredSeries?.year ? <span style={browseMetaItem}>{featuredSeries.year}</span> : null}
              {featuredSeries?.rating ? <span style={browseMetaItem}>{featuredSeries.rating}</span> : null}
            </div>
          </div>
          <p style={mergeStyle(browseHint, browseGridHeaderHint)}>
            {isLoading ? 'Loading titles...' : visibleSeries.length > 0 ? `${visibleSeries.length} titles` : 'No titles loaded'}
          </p>
        </div>

        <div className="lg-browse-scroll" style={browseGridScroll}>
          {isLoading ? (
            <div style={browseLoading} role="status" aria-live="polite">
              <div style={browseLoadingSpinner} aria-hidden="true" />
              <p>Loading series...</p>
            </div>
          ) : (
          <div style={browseGrid}>
            {visibleSeries.map((item, index) => {
              const isFocused = focusId === `card:${item.id}`;

              return (
                <button
                  key={item.id}
                  type="button"
                  ref={(node) => {
                    cardRefs.current[`card:${item.id}`] = node;
                  }}
                  style={mergeStyle(movieCard, isFocused && movieCardActive)}
                  onClick={() => {
                    openContentDetails(
                      {
                        id: item.id,
                        contentId: Number(item.id.replace(/^series-/, '')),
                        kind: 'series',
                        title: item.name,
                        categoryId: item.categoryId,
                        posterUrl: item.artwork,
                        backdropUrl: item.artwork,
                        description: item.name,
                        year: item.year,
                        rating: item.rating
                      },
                      currentDestination
                    );
                  }}
                  onFocus={() => {
                    expandVisibleSeries(index);
                    setFocusId(`card:${item.id}`);
                    onContentRegionChange('cards');
                  }}
                  onMouseEnter={() => {
                    setFocusId(`card:${item.id}`);
                    onContentRegionChange('cards');
                  }}
                  onKeyDown={(event) => handleCardKeyDown(event, index)}
                >
                  <BrowsePosterArt
                    artwork={item.artwork}
                    name={item.name}
                    accent={item.accent}
                    badge={item.rating || 'HD'}
                  />
                  {import.meta.env.DEV ? (
                    <div style={cardDebugOverlay}>
                      <span>ID: {item.seriesId}</span>
                      <span>EXT: series</span>
                      <span>IMG: {truncateDebugValue(item.artwork)}</span>
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

export default SeriesScreen;
