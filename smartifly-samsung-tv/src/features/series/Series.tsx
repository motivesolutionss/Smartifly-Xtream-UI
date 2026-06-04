import React, { useMemo, useState, useRef, useEffect, useCallback } from "react";
import { useSeriesContent } from "./hooks/useSeriesContent";
import { Focusable } from "../../components/tv/Focusable";
import { VirtualGrid } from "../../components/tv/VirtualGrid";
import { ErrorView } from "../../components/common/ErrorView";
import { EmptyState } from "../../components/common/EmptyState";
import { useFocus } from "../../providers/useFocus";
import { SeriesCard } from "./components/SeriesCard";
import { SeriesDetails } from "./SeriesDetails";
import type { AppSeries } from "../../types/appModels";
import { useNetworkStatus } from "../../hooks/useNetworkStatus";
import { TvKeyboard } from "../../components/ui/TvKeyboard";
import { useTvBack } from "../../hooks/useTvBack";
import { searchStorage } from "../../storage/searchStorage";
import { contentCategoryStorage } from "../../storage/contentCategoryStorage";
import { logger } from "../../utils/logger";
import { perfMetrics } from "../../utils/perfMetrics";
import {
  getGridAnchorScrollTop,
  getGridPreloadRange,
  sliceImagePreloadUrls,
  useBudgetedImagePreload,
} from "../../hooks/useBudgetedImagePreload";
import styles from "./Series.module.css";

const CATEGORY_ROW_HEIGHT = 80;
const GRID_ITEM_HEIGHT = 392;
const GRID_ITEM_WIDTH = 251;
const GRID_GAP = 24;
const GRID_COLUMNS_BROWSE = 5;
const GRID_COLUMNS_SEARCH = 4;
const GRID_ROW_STRIDE = GRID_ITEM_HEIGHT + GRID_GAP;
const GRID_IMAGE_PRELOAD_OVERSCAN_ROWS = 0;
const CATEGORY_SCROLL_THRESHOLD = 10;
const CATEGORY_SCROLL_INSET = 14;

const SeriesSkeleton: React.FC = () => {
  return (
    <div className={styles.skeletonGrid}>
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={`series-skeleton-${i}`} className={styles.skeletonContainer}>
          <div className={`${styles.skeletonCard} ${styles.skeletonPulse}`} />
          <div className={`${styles.skeletonTitle} ${styles.skeletonPulse}`} />
        </div>
      ))}
    </div>
  );
};

const parseSeriesTitle = (title: string) => {
  let cleanTitle = title;
  let year: string | null = null;
  let resolution: string | null = null;

  const yearMatch = title.match(/\b(19\d\d|20\d\d)\b/);
  if (yearMatch) {
    year = yearMatch[1];
    cleanTitle = cleanTitle.replace(new RegExp(`\\(?\\[?\\b${year}\\b\\]?\\)?`, 'g'), '');
  }

  const qualityMatch = title.match(/\b(4K|UHD|FHD|1080p|720p|HD)\b/i);
  if (qualityMatch) {
    resolution = qualityMatch[1].toUpperCase();
    cleanTitle = cleanTitle.replace(new RegExp(`\\(?\\[?\\b${qualityMatch[1]}\\b\\]?\\)?`, 'g'), '');
  }

  cleanTitle = cleanTitle
    .replace(/\(\s*\)|\[\s*\]/g, "")
    .replace(/[().[\]]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\s*[.\-_]\s*$/g, "")
    .trim();

  return { cleanTitle, year, resolution };
};

const getCategoryScrollTarget = (
  currentScrollTop: number,
  viewportHeight: number,
  itemIndex: number
) => {
  const itemTop = itemIndex * CATEGORY_ROW_HEIGHT;
  const itemBottom = itemTop + CATEGORY_ROW_HEIGHT;
  const viewBottom = currentScrollTop + viewportHeight;

  if (itemTop < currentScrollTop + CATEGORY_SCROLL_THRESHOLD) {
    return Math.max(0, itemTop - CATEGORY_SCROLL_INSET);
  }

  if (itemBottom > viewBottom - CATEGORY_SCROLL_THRESHOLD) {
    return Math.max(0, itemBottom - viewportHeight + CATEGORY_SCROLL_INSET);
  }

  return null;
};

export const Series: React.FC = () => {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>(
    () => contentCategoryStorage.getSeriesLastCategoryId() ?? undefined
  );
  const [focusedCategoryId, setFocusedCategoryId] = useState<string | undefined>(
    () => contentCategoryStorage.getSeriesLastCategoryId() ?? undefined
  );
  const [selectedSeriesId, setSelectedSeriesId] = useState<string | null>(null);
  const [focusedSeriesId, setFocusedSeriesId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>(() =>
    searchStorage.getRecentSearches()
  );

  const suggestions = useMemo(() => {
    const combined = [...recentSearches];
    const defaults = ["Action", "Sci-Fi", "Drama", "Comedy", "Thriller"];
    for (const d of defaults) {
      if (combined.length >= 5) break;
      if (!combined.some(item => item.toLowerCase() === d.toLowerCase())) {
        combined.push(d);
      }
    }
    return combined;
  }, [recentSearches]);

  const {
    categories,
    series,
    isLoading,
    isFetchingSeries,
    isError,
    errorMessage,
    prefetchCategory,
    refetch,
  } = useSeriesContent(selectedCategoryId);

  const { focusedId, setFocus } = useFocus();

  useTvBack(() => {
    if (isSearching) {
      setIsSearching(false);
      setFocus("series-search-input-wrapper");
    } else if (searchQuery) {
      setSearchQuery("");
      setFocus("series-search-input-wrapper");
    }
  }, isSearching || Boolean(searchQuery));
  const { status: networkStatus } = useNetworkStatus();
  const savedCategoryId = contentCategoryStorage.getSeriesLastCategoryId() ?? undefined;
  const effectiveSelectedCategoryId = useMemo(() => {
    if (categories.length === 0) {
      return selectedCategoryId ?? savedCategoryId;
    }
    if (selectedCategoryId && categories.some((cat) => cat.id === selectedCategoryId)) {
      return selectedCategoryId;
    }
    if (savedCategoryId && categories.some((cat) => cat.id === savedCategoryId)) {
      return savedCategoryId;
    }
    return categories[0]?.id;
  }, [categories, savedCategoryId, selectedCategoryId]);
  const effectiveFocusedCategoryId = useMemo(() => {
    if (categories.length === 0) {
      return focusedCategoryId ?? effectiveSelectedCategoryId;
    }
    if (focusedCategoryId && categories.some((cat) => cat.id === focusedCategoryId)) {
      return focusedCategoryId;
    }
    return effectiveSelectedCategoryId;
  }, [categories, effectiveSelectedCategoryId, focusedCategoryId]);

  const activeCategoryName = useMemo(() => {
    const targetId = effectiveSelectedCategoryId;
    if (!targetId) return categories[0]?.name ?? "Series";
    return categories.find((c) => c.id === targetId)?.name ?? "Series";
  }, [effectiveSelectedCategoryId, categories]);

  const focusedSeries = useMemo(() => {
    return series.find((s) => s.id === focusedSeriesId);
  }, [series, focusedSeriesId]);

  const seriesMeta = useMemo(() => {
    if (!focusedSeries) return null;
    return parseSeriesTitle(focusedSeries.title);
  }, [focusedSeries]);

  const filteredSeries = useMemo(() => {
    if (!searchQuery) return series;
    const lowerQuery = searchQuery.toLowerCase();
    return series.filter((s) => s.title.toLowerCase().includes(lowerQuery));
  }, [series, searchQuery]);

  const gridColumns = isSearching ? GRID_COLUMNS_SEARCH : GRID_COLUMNS_BROWSE;

  const sidebarFocusedRef = useRef(true);
  const lastClickedSeriesIdRef = useRef<string | null>(null);
  const pendingGridFocusRef = useRef(false);
  const categorySwitchStartRef = useRef<number | null>(null);
  const firstGridRenderStartRef = useRef<number>(0);
  const [gridScrollMemory] = useState(() => new Map<string, number>());

  const categoryOptions = useMemo(() => categories, [categories]);

  const activeCategoryKey = useMemo(
    () => `${effectiveSelectedCategoryId ?? "__none__"}|${isSearching ? "search" : "browse"}`,
    [effectiveSelectedCategoryId, isSearching]
  );

  const resolveGridFocusSeriesId = useCallback(
    (categoryId: string | undefined) => {
      if (filteredSeries.length === 0) return null;

      if (focusedSeriesId && filteredSeries.some((s) => s.id === focusedSeriesId)) {
        return focusedSeriesId;
      }

      const scrollKey = `${categoryId ?? "__none__"}|${isSearching ? "search" : "browse"}`;
      const scrollTop = gridScrollMemory.get(scrollKey) ?? 0;
      const firstVisibleRow = Math.max(0, Math.floor(scrollTop / GRID_ROW_STRIDE));
      const firstVisibleIndex = Math.min(
        filteredSeries.length - 1,
        firstVisibleRow * gridColumns
      );

      return filteredSeries[firstVisibleIndex]?.id ?? filteredSeries[0].id;
    },
    [filteredSeries, focusedSeriesId, gridColumns, gridScrollMemory, isSearching]
  );

  useEffect(() => {
    if (!effectiveSelectedCategoryId) return;
    if (savedCategoryId === effectiveSelectedCategoryId) return;
    contentCategoryStorage.setSeriesLastCategoryId(effectiveSelectedCategoryId);
  }, [effectiveSelectedCategoryId, savedCategoryId]);

  // ── Dynamic Resolution-Independent Viewport Measurements ───────────────────
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const [gridHeight, setGridHeight] = useState(window.innerHeight - 140);
  const [sidebarHeight, setSidebarHeight] = useState(800);
  const [categoryScrollTop, setCategoryScrollTop] = useState(0);
  const visibleCategoryStartIndex = useMemo(
    () => Math.max(0, Math.floor(categoryScrollTop / CATEGORY_ROW_HEIGHT) - 3),
    [categoryScrollTop]
  );
  const visibleCategoryEndIndex = useMemo(
    () =>
      Math.min(
        categoryOptions.length,
        Math.ceil((categoryScrollTop + sidebarHeight) / CATEGORY_ROW_HEIGHT) + 3
      ),
    [categoryOptions.length, categoryScrollTop, sidebarHeight]
  );
  const categoryListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (firstGridRenderStartRef.current === 0) {
      firstGridRenderStartRef.current = performance.now();
    }
  }, []);

  useEffect(() => {
    if (!gridContainerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setGridHeight(Math.max(200, entry.contentRect.height));
      }
    });
    observer.observe(gridContainerRef.current);
    return () => observer.disconnect();
  }, [selectedSeriesId, isSearching]);

  useEffect(() => {
    if (!categoryListRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setSidebarHeight(Math.max(300, entry.contentRect.height));
      }
    });
    observer.observe(categoryListRef.current);
    return () => observer.disconnect();
  }, [selectedSeriesId, isSearching]);

  // Sync scroll position when category list mounts (e.g., coming back from keyboard)
  useEffect(() => {
    if (!categoryListRef.current || isSearching) return;
    categoryListRef.current.scrollTop = categoryScrollTop;
  }, [categoryScrollTop, isSearching]);

  useEffect(() => {
    if (firstGridRenderStartRef.current === Number.POSITIVE_INFINITY) return;
    if (isLoading || isFetchingSeries) return;

    const durationMs = Math.max(
      1,
      Math.round(performance.now() - firstGridRenderStartRef.current)
    );
    logger.info(`Series grid first render in ${durationMs}ms`, {
      seriesCount: filteredSeries.length,
    });
    perfMetrics.recordDuration("series_grid_first_render_ms", durationMs, {
      slowAboveMs: 400,
      data: { seriesCount: filteredSeries.length },
    });
    firstGridRenderStartRef.current = Number.POSITIVE_INFINITY;
  }, [filteredSeries.length, isFetchingSeries, isLoading]);

  useEffect(() => {
    if (!effectiveSelectedCategoryId) return;
    if (categorySwitchStartRef.current === null) return;
    if (isFetchingSeries) return;

    const switchDuration = Math.round(performance.now() - categorySwitchStartRef.current);
    logger.debug(`Series category switch completed in ${switchDuration}ms`, {
      categoryId: effectiveSelectedCategoryId,
      seriesCount: filteredSeries.length,
    });
    perfMetrics.recordDuration("series_category_switch_ms", switchDuration, {
      slowAboveMs: 250,
      data: {
        categoryId: effectiveSelectedCategoryId,
        seriesCount: filteredSeries.length,
      },
    });
    categorySwitchStartRef.current = null;
  }, [effectiveSelectedCategoryId, filteredSeries.length, isFetchingSeries]);

  // ── Eagerly preload top 12 series poster images to prevent visually jarring pops ──

  // ── Restore focus when returning from SeriesDetails ──────────────────────────
  useEffect(() => {
    if (selectedSeriesId || filteredSeries.length === 0) return;

    const rememberedId = lastClickedSeriesIdRef.current;
    if (!rememberedId) return;
    const targetId =
      rememberedId && filteredSeries.some((s) => s.id === rememberedId)
        ? rememberedId
        : resolveGridFocusSeriesId(effectiveSelectedCategoryId);

    if (!targetId) {
      lastClickedSeriesIdRef.current = null;
      return;
    }

    sidebarFocusedRef.current = false;
    setFocusedSeriesId(targetId);

    let secondFrame = 0;
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        setFocus(`card-series-${targetId}`);
      });
    });

    lastClickedSeriesIdRef.current = null;
    return () => {
      window.cancelAnimationFrame(firstFrame);
      if (secondFrame) window.cancelAnimationFrame(secondFrame);
    };
  }, [effectiveSelectedCategoryId, selectedSeriesId, filteredSeries, resolveGridFocusSeriesId, setFocus]);

  // ── Trigger auto focus into grid when categories load after Enter click ──
  useEffect(() => {
    if (pendingGridFocusRef.current && filteredSeries.length > 0) {
      pendingGridFocusRef.current = false;
      const targetSeriesId = resolveGridFocusSeriesId(effectiveSelectedCategoryId);
      if (!targetSeriesId) return;

      sidebarFocusedRef.current = false;
      const frameId = window.requestAnimationFrame(() => {
        setFocus(`card-series-${targetSeriesId}`);
      });
      return () => window.cancelAnimationFrame(frameId);
    }
  }, [effectiveSelectedCategoryId, filteredSeries, resolveGridFocusSeriesId, setFocus]);

  // ── Category Sidebar Virtualization state & refs ────────────────────────────
  const handleCategoryListScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setCategoryScrollTop(e.currentTarget.scrollTop);
  }, []);

  // Scroll category list to keep active/focused category visible
  useEffect(() => {
    if (!categoryListRef.current || categoryOptions.length === 0) return;
    const focusedCatId = focusedId?.startsWith("series-cat-")
      ? focusedId.replace("series-cat-", "")
      : (effectiveSelectedCategoryId || effectiveFocusedCategoryId || categoryOptions[0]?.id);
    if (!focusedCatId) return;
    const idx = categoryOptions.findIndex((c) => c.id === focusedCatId);
    if (idx < 0) return;

    const nextScrollTop = getCategoryScrollTarget(
      categoryListRef.current.scrollTop,
      categoryListRef.current.clientHeight,
      idx
    );

    if (nextScrollTop !== null && categoryListRef.current.scrollTop !== nextScrollTop) {
      categoryListRef.current.scrollTop = nextScrollTop;
    }
  }, [categoryOptions, effectiveFocusedCategoryId, effectiveSelectedCategoryId, focusedId, isSearching]);

  // ── Initial Focus ───────────────────────────────────────────────────────────
  const hasInitializedFocusRef = useRef(false);
  useEffect(() => {
    if (categories.length === 0) return;
    if (hasInitializedFocusRef.current) return;
    hasInitializedFocusRef.current = true;

    const frameId = window.requestAnimationFrame(() => {
      const initialCategoryId = effectiveSelectedCategoryId || categoryOptions[0]?.id;
      if (initialCategoryId) {
        setFocus(`series-cat-${initialCategoryId}`);
      }
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [categories, categoryOptions, effectiveSelectedCategoryId, setFocus]);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleCategoryFocus = useCallback(
    (categoryId: string | undefined) => {
      prefetchCategory(categoryId);
      setFocusedCategoryId(categoryId);

      if (sidebarFocusedRef.current) return;
      sidebarFocusedRef.current = true;

      const targetId = effectiveSelectedCategoryId || categoryOptions[0]?.id;
      if (categoryId && targetId && categoryId !== targetId) {
        window.requestAnimationFrame(() => {
          setFocus(`series-cat-${targetId}`);
        });
      }
    },
    [categoryOptions, effectiveSelectedCategoryId, prefetchCategory, setFocus]
  );

  const handleCategoryEnter = useCallback((categoryId: string | undefined) => {
    if (effectiveSelectedCategoryId !== categoryId) {
      categorySwitchStartRef.current = performance.now();
      pendingGridFocusRef.current = true;
      setFocusedSeriesId(null);
      setSelectedCategoryId(categoryId);
      setFocusedCategoryId(categoryId);
      contentCategoryStorage.setSeriesLastCategoryId(categoryId ?? null);
      return;
    }

    if (filteredSeries.length > 0) {
      sidebarFocusedRef.current = false;
      const targetSeriesId = resolveGridFocusSeriesId(categoryId);
      if (!targetSeriesId) return;
      setFocus(`card-series-${targetSeriesId}`);
    }
  }, [effectiveSelectedCategoryId, filteredSeries, resolveGridFocusSeriesId, setFocus]);

  const handleCategoryKeyDown = useCallback(
    (e: React.KeyboardEvent, categoryId: string | undefined, categoryIndex: number) => {
      if (e.key === "ArrowUp") {
        if (categoryIndex === 0) {
          e.preventDefault();
          setFocus("series-search-input-wrapper");
        }
      } else if (e.key === "ArrowRight") {
        e.preventDefault();

        const targetCategoryId = effectiveSelectedCategoryId ?? categoryId ?? categoryOptions[0]?.id;
        if (!targetCategoryId || filteredSeries.length === 0) {
          return;
        }

        sidebarFocusedRef.current = false;
        const targetSeriesId = resolveGridFocusSeriesId(targetCategoryId);
        if (!targetSeriesId) return;
        setFocusedSeriesId(targetSeriesId);
        setFocus(`card-series-${targetSeriesId}`);
      }
    },
    [categoryOptions, effectiveSelectedCategoryId, filteredSeries, resolveGridFocusSeriesId, setFocus]
  );

  const handleSeriesFocus = useCallback((seriesId: string) => {
    sidebarFocusedRef.current = false;
    setFocusedSeriesId(seriesId);
  }, []);

  const handleSeriesClick = useCallback((seriesItem: AppSeries) => {
    lastClickedSeriesIdRef.current = seriesItem.id;
    setSelectedSeriesId(seriesItem.id);
  }, []);

  const focusedGridIndex = useMemo(
    () => (focusedSeriesId ? filteredSeries.findIndex((s) => s.id === focusedSeriesId) : -1),
    [filteredSeries, focusedSeriesId]
  );

  const initialGridScrollTop = gridScrollMemory.get(activeCategoryKey) ?? 0;
  const imagePreloadAnchorScrollTop = getGridAnchorScrollTop({
    focusedIndex: focusedGridIndex,
    columns: gridColumns,
    rowStride: GRID_ROW_STRIDE,
    fallbackScrollTop: initialGridScrollTop,
  });
  const imagePreloadRange = getGridPreloadRange({
    itemCount: filteredSeries.length,
    columns: gridColumns,
    rowStride: GRID_ROW_STRIDE,
    viewportHeight: gridHeight,
    anchorScrollTop: imagePreloadAnchorScrollTop,
    overscanRows: GRID_IMAGE_PRELOAD_OVERSCAN_ROWS,
  });
  const visiblePosterPreloadUrls = useMemo(
    () =>
      sliceImagePreloadUrls(
        filteredSeries,
        (seriesItem) => seriesItem.posterUrl,
        imagePreloadRange.startIndex,
        imagePreloadRange.endIndex
      ),
    [
      filteredSeries,
      imagePreloadRange.endIndex,
      imagePreloadRange.startIndex,
    ]
  );

  useBudgetedImagePreload(
    visiblePosterPreloadUrls,
    {
      enabled: networkStatus === "online" && !isSearching,
      maxConcurrent: 1,
      maxUrls: 6,
    }
  );

  if (selectedSeriesId) {
    return (
      <SeriesDetails
        seriesId={selectedSeriesId}
        categoryName={activeCategoryName}
        onBack={() => setSelectedSeriesId(null)}
      />
    );
  }

  if (isError) {
    return (
      <ErrorView
        message={errorMessage || "Unable to load series. Please try again."}
        onRetry={() => refetch()}
        showBackToLogin
      />
    );
  }

  return (
    <div className={`${styles.container} ${isSearching ? styles.containerSearching : ""}`}>
      {/* ── Non-blocking network status banner ──────────────────────────────── */}
      {networkStatus !== "online" && (
        <div
          className={`${styles.networkBanner} ${
            networkStatus === "offline" ? styles.networkBannerOffline : styles.networkBannerDegraded
          }`}
        >
          {networkStatus === "offline"
            ? "You are currently offline. Some categories or series might not be loadable."
            : "Slow or unstable connection detected. Playback performance might be degraded."}
        </div>
      )}

      {/* ── Left Category Sidebar / Search Keyboard ─────────────────────────── */}
      <aside className={`${styles.sidebar} ${isSearching ? styles.sidebarSearching : ""}`}>
        {isSearching ? (
          <div className={styles.keyboardContainer}>
            <div className={styles.keyboardHeader}>
              <h2 className={styles.keyboardTitle}>Search</h2>
              <span className={styles.keyboardMeta}>Filter in {activeCategoryName}</span>
            </div>
            <div className={styles.keyboardPreview}>
              <svg
                className={`${styles.searchIcon} ${searchQuery ? styles.searchIconActive : ""}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <span className={styles.keyboardPreviewText}>
                {searchQuery || <span className={styles.keyboardPlaceholder}>Type here...</span>}
              </span>
              <div className={styles.keyboardCursor} />
            </div>

            {/* dynamic suggestions list */}
            {suggestions.length > 0 && (
              <div className={styles.suggestionsContainer}>
                <span className={styles.suggestionsTitle}>QUICK SUGGESTIONS</span>
                <div className={styles.suggestionsList}>
                  {suggestions.map((sug, sugIndex) => (
                    <Focusable
                      key={`search-sug-${sugIndex}`}
                      id={`search-sug-${sugIndex}`}
                      variant="pill"
                      className={styles.suggestionPill}
                      onKeyDown={(e) => {
                        if (e.key === "ArrowDown") {
                          e.preventDefault();
                          setFocus("tvkb-key-0-0");
                        } else if (e.key === "ArrowUp") {
                          e.preventDefault();
                          setFocus("series-search-input-wrapper");
                        } else if (e.key === "ArrowLeft") {
                          if (sugIndex > 0) {
                            e.preventDefault();
                            setFocus(`search-sug-${sugIndex - 1}`);
                          } else {
                            e.preventDefault();
                          }
                        } else if (e.key === "ArrowRight") {
                          if (sugIndex < suggestions.length - 1) {
                            e.preventDefault();
                            setFocus(`search-sug-${sugIndex + 1}`);
                          } else if (filteredSeries.length > 0) {
                            e.preventDefault();
                            sidebarFocusedRef.current = false;
                            setFocus(`card-series-${filteredSeries[0].id}`);
                          }
                        }
                      }}
                      onEnter={() => {
                        setSearchQuery(sug);
                      }}
                    >
                      {sug}
                    </Focusable>
                  ))}
                </div>
              </div>
            )}

            <TvKeyboard
              title="Search"
              value={searchQuery}
              mode="search"
              variant="inline"
              layout="vertical"
              className={styles.customKeyboard}
              showHeader={false}
              showPreview={false}
              trapFocus={false}
              onChange={setSearchQuery}
              onKeyDown={(e, rowIndex, columnIndex) => {
                if (e.key === "ArrowUp" && rowIndex === 0) {
                  e.preventDefault();
                  if (suggestions.length > 0) {
                    setFocus("search-sug-0");
                  } else {
                    setFocus("series-search-input-wrapper");
                  }
                } else if (e.key === "ArrowRight") {
                  const isRightEdge =
                    columnIndex === 5 ||
                    (rowIndex === 6 && columnIndex === 2) ||
                    (rowIndex === 7 && columnIndex === 4);

                  if (isRightEdge && filteredSeries.length > 0) {
                    e.preventDefault();
                    sidebarFocusedRef.current = false;
                    setFocus(`card-series-${filteredSeries[0].id}`);
                  }
                }
              }}
              onSubmit={(val) => {
                setIsSearching(false);
                searchStorage.saveRecentSearch(val);
                setRecentSearches(searchStorage.getRecentSearches());
                if (filteredSeries.length > 0) {
                  sidebarFocusedRef.current = false;
                  setFocus(`card-series-${filteredSeries[0].id}`);
                } else {
                  setFocus("series-search-input-wrapper");
                }
              }}
              onBackClick={() => {
                setIsSearching(false);
                setSearchQuery("");
                setFocus("series-search-input-wrapper");
              }}
            />
          </div>
        ) : (
          <>
            <div className={styles.sidebarHeader}>
              <span className={styles.sidebarMeta}>SMARTIFLY</span>
              <h2 className={styles.sidebarTitle}>Series</h2>
            </div>

            <div
              ref={categoryListRef}
              className={styles.sidebarScroll}
              onScroll={handleCategoryListScroll}
            >
              {categories.length === 0 && isLoading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <div
                    key={`series-category-skeleton-${i}`}
                    className={`${styles.skeletonCategory} ${styles.skeletonPulse}`}
                  />
                ))
              ) : (
                <div
                  style={{
                    height: categoryOptions.length * CATEGORY_ROW_HEIGHT,
                    width: "100%",
                    position: "relative",
                  }}
                >
                  {categoryOptions
                    .slice(visibleCategoryStartIndex, visibleCategoryEndIndex)
                    .map((category, index) => {
                      const absIndex = visibleCategoryStartIndex + index;
                      const categoryId = category.id;

                      return (
                        <div
                          key={category.id}
                          style={{
                            position: "absolute",
                            top: absIndex * CATEGORY_ROW_HEIGHT,
                            left: 0,
                            right: 0,
                            height: 78,
                            display: "flex",
                            alignItems: "center",
                            zIndex: focusedId === `series-cat-${category.id}` ? 10 : (effectiveSelectedCategoryId === categoryId ? 2 : 1),
                          }}
                        >
                          <Focusable
                            id={`series-cat-${category.id}`}
                            variant="pill"
                            disableFocusEffects
                            className={`${styles.categoryItem} ${
                              effectiveSelectedCategoryId === categoryId ? styles.selected : ""
                            }`}
                            onFocus={() => handleCategoryFocus(categoryId)}
                            onEnter={() => handleCategoryEnter(categoryId)}
                            onKeyDown={(e) => handleCategoryKeyDown(e, categoryId, absIndex)}
                          >
                            <span className={styles.categoryText}>{category.name}</span>
                          </Focusable>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </>
        )}
      </aside>

      {/* ── Right Content Panel ──────────────────────────────────────────────── */}
      <main className={styles.content}>
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <h1 className={styles.title}>{activeCategoryName}</h1>
            <div className={styles.subtitleContainer}>
              {focusedSeries && seriesMeta ? (
                <>
                  <span className={styles.subtitleSeriesName}>{seriesMeta.cleanTitle}</span>
                  {seriesMeta.year && <span className={styles.badgeYear}>{seriesMeta.year}</span>}
                  {seriesMeta.resolution && (
                    <span className={styles.badgeQuality}>{seriesMeta.resolution}</span>
                  )}
                </>
              ) : (
                <span className={styles.subtitlePlaceholder}>&nbsp;</span>
              )}
            </div>
          </div>
          <div className={styles.headerRight}>
            <Focusable
              id="series-search-input-wrapper"
              variant="pill"
              className={styles.searchFocusable}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  if (isSearching && suggestions.length > 0) {
                    e.preventDefault();
                    setFocus("search-sug-0");
                  } else if (filteredSeries.length > 0) {
                    e.preventDefault();
                    setFocus(`card-series-${filteredSeries[0].id}`);
                  }
                } else if (e.key === "ArrowLeft") {
                  e.preventDefault();
                  const targetCategoryId = effectiveSelectedCategoryId || categoryOptions[0]?.id;
                  if (targetCategoryId) {
                    setFocus(`series-cat-${targetCategoryId}`);
                  }
                }
              }}
              onEnter={() => {
                setIsSearching(true);
                sidebarFocusedRef.current = false;
                setFocusedSeriesId(null);
                setTimeout(() => {
                  if (suggestions.length > 0) {
                    setFocus("search-sug-0");
                  } else {
                    setFocus("tvkb-key-0-0");
                  }
                }, 50);
              }}
              onFocus={() => {
                sidebarFocusedRef.current = false;
                setFocusedSeriesId(null);
              }}
            >
              <svg
                className={styles.searchIcon}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <div className={styles.searchInput}>
                {searchQuery || "Search series..."}
              </div>
            </Focusable>
          </div>
        </header>

        <div className={styles.gridContainer} ref={gridContainerRef}>
          {isLoading || isFetchingSeries ? (
            <SeriesSkeleton />
          ) : filteredSeries.length === 0 ? (
            <EmptyState
              title="No series found"
              message={searchQuery ? "No series match your search." : "This category does not contain playable series."}
            />
          ) : (
            <VirtualGrid
              key={`series-grid-${effectiveSelectedCategoryId ?? "none"}-${isSearching ? "search" : "browse"}`}
              items={filteredSeries}
              itemHeight={GRID_ITEM_HEIGHT}
              itemWidth={GRID_ITEM_WIDTH}
              columns={gridColumns}
              gap={GRID_GAP}
              containerHeight={gridHeight}
              initialScrollTop={initialGridScrollTop}
              onScrollTopChange={(nextTop) => {
                gridScrollMemory.set(activeCategoryKey, nextTop);
              }}
              focusedIndex={focusedId?.startsWith("card-series-") && focusedGridIndex >= 0 ? focusedGridIndex : undefined}
              renderItem={(seriesItem, index) => {
                return (
                  <SeriesCard
                    key={seriesItem.id}
                    seriesItem={seriesItem}
                    index={index}
                    prevSeriesId={index > 0 ? filteredSeries[index - 1]?.id : undefined}
                    nextRowSeriesId={index + gridColumns < filteredSeries.length ? filteredSeries[index + gridColumns]?.id : undefined}
                    prevRowSeriesId={index - gridColumns >= 0 ? filteredSeries[index - gridColumns]?.id : undefined}
                    totalSeries={filteredSeries.length}
                    lastSeriesId={filteredSeries[filteredSeries.length - 1]?.id}
                    selectedCategoryFocusId={effectiveSelectedCategoryId || categoryOptions[0]?.id}
                    onClick={handleSeriesClick}
                    onFocus={handleSeriesFocus}
                    columns={gridColumns}
                    isSearching={isSearching}
                    shouldLoadPoster={
                      index >= imagePreloadRange.startIndex &&
                      index < imagePreloadRange.endIndex
                    }
                  />
                );
              }}
            />
          )}
        </div>
      </main>
    </div>
  );
};
