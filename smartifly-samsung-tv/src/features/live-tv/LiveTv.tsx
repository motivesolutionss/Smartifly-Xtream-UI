import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useLiveContent } from "./hooks/useLiveContent";
import { usePlayerStore } from "../../store/playerStore";
import { Focusable } from "../../components/tv/Focusable";
import { LiveTvCard } from "./LiveTvCard";
import { cleanChannelTitle } from "./channelTitle";
import { ErrorView } from "../../components/common/ErrorView";
import { EmptyState } from "../../components/common/EmptyState";
import { services } from "../../services";
import { EpgGrid } from "./EpgGrid";
import { VirtualGrid } from "../../components/tv/VirtualGrid";
import type { AppChannel } from "../../types/appModels";
import { useTvBack } from "../../hooks/useTvBack";
import { useFocus } from "../../providers/useFocus";
import { useEpg } from "./hooks/useEpg";
import { useLiveTvStore } from "../../store/liveTvStore";
import { useNetworkStatus } from "../../hooks/useNetworkStatus";
import { logger } from "../../utils/logger";
import { perfMetrics } from "../../utils/perfMetrics";
import { formatEpgTime } from "./epgTime";
import { TvKeyboard } from "../../components/ui/TvKeyboard";
import { searchStorage } from "../../storage/searchStorage";
import {
  getGridPreloadRange,
  sliceImagePreloadUrls,
  useBudgetedImagePreload,
} from "../../hooks/useBudgetedImagePreload";
import styles from "./LiveTv.module.css";

// ─── Constants ────────────────────────────────────────────────────────────────
/** Number of overscan rows used for visible-first logo preloading. */
const GRID_IMAGE_PRELOAD_OVERSCAN_ROWS = 1;
/** Debounce delay (ms) before triggering expensive side effects during fast
 *  d-pad navigation (perf logs, EPG refresh hints, etc.). */
const NAV_DEBOUNCE_MS = 120;
/** Debounce delay before changing mini-guide EPG probe channel. */
const EPG_PREVIEW_DEBOUNCE_MS = 140;
/** VirtualGrid layout config for the live channel grid.
 *  itemHeight = 296px
 */
const GRID_ITEM_HEIGHT = 296;
const GRID_GAP = 16;
const CATEGORY_ROW_HEIGHT = 80;

const parseChannelTitle = (title: string) => {
  let cleanTitle = cleanChannelTitle(title);
  let resolution: string | null = null;
  const unicodeMap: Record<string, string> = {
    "⁴ᴷ": "4K",
    "ᵁᴴᴰ": "UHD",
    "ᶠᴴᴰ": "FHD",
    "ᴴᴰ": "HD",
    "ˢᴰ": "SD"
  };
  for (const [uni, std] of Object.entries(unicodeMap)) {
    if (cleanTitle.includes(uni)) {
      resolution = std;
      cleanTitle = cleanTitle.split(uni).join("");
    }
  }
  if (!resolution) {
    const qualityMatch = cleanTitle.match(/\b(4K|UHD|FHD|1080p|720p|HD|SD)\b/i);
    if (qualityMatch) {
      resolution = qualityMatch[1].toUpperCase();
      cleanTitle = cleanTitle.replace(new RegExp(`\\(?\\[?\\b${qualityMatch[1]}\\b\\]?\\)?`, 'gi'), '');
    }
  }
  cleanTitle = cleanTitle.replace(/\(\s*\)|\[\s*\]/g, "").replace(/[().[\]]/g, " ").replace(/\s+/g, " ").replace(/\s*[.\-_]\s*$/g, "").trim();
  return { cleanTitle, resolution };
};

export const LiveTv: React.FC = () => {
  // ── Store / data ────────────────────────────────────────────────────────────
  const persistedSelectedCategoryId = useLiveTvStore((s) => s.selectedCategoryId);
  const setSelectedCategoryInStore = useLiveTvStore((s) => s.setSelectedCategoryId);

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>(
    persistedSelectedCategoryId ?? undefined
  );

  const {
    categories,
    channels,
    isLoading,
    isFetchingChannels,
    isError,
    errorCode,
    errorMessage,
    effectiveCategoryId,
    prefetchCategory,
    refetch,
  } = useLiveContent(selectedCategoryId);

  const activeCategoryId = effectiveCategoryId;
  const { setLiveChannels, setActivePlaybackItem } = usePlayerStore();
  const { setFocus, focusedId } = useFocus();
  const { status: networkStatus } = useNetworkStatus();

  // ── Search & Suggestions state ──────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>(() =>
    searchStorage.getRecentSearches()
  );

  const suggestions = useMemo(() => {
    const combined = [...recentSearches];
    const defaults = ["Sports", "News", "Movies", "Music", "Kids"];
    for (const d of defaults) {
      if (combined.length >= 5) break;
      if (!combined.some(item => item.toLowerCase() === d.toLowerCase())) {
        combined.push(d);
      }
    }
    return combined;
  }, [recentSearches]);

  const filteredChannels = useMemo(() => {
    if (!searchQuery) return channels;
    const lowerQuery = searchQuery.toLowerCase();
    return channels.filter((c) => c.title.toLowerCase().includes(lowerQuery));
  }, [channels, searchQuery]);

  // ── Sidebar dynamic columns ──────────────────────────────────────────────────
  const cols = isSearching ? 4 : 5;

  // ── Category Sidebar Virtualization state & refs ────────────────────────────
  const [categoryScrollTop, setCategoryScrollTop] = useState(0);
  const categoryListRef = useRef<HTMLDivElement>(null);

  const handleCategoryListScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setCategoryScrollTop(e.currentTarget.scrollTop);
  }, []);

  // Scroll category list to keep active/focused category visible
  useEffect(() => {
    if (!categoryListRef.current || categories.length === 0 || isSearching) return;
    const focusedCatId = focusedId?.startsWith("live-cat-")
      ? focusedId.replace("live-cat-", "")
      : activeCategoryId;
    if (!focusedCatId) return;
    const idx = categories.findIndex((c) => c.id === focusedCatId);
    if (idx < 0) return;

    const itemTop = idx * CATEGORY_ROW_HEIGHT;
    const itemBottom = itemTop + CATEGORY_ROW_HEIGHT;
    const viewTop = categoryListRef.current.scrollTop;
    const viewBottom = viewTop + categoryListRef.current.clientHeight;

    if (itemTop < viewTop + 10) {
      categoryListRef.current.scrollTo({ top: Math.max(0, itemTop - 14), behavior: "auto" });
    } else if (itemBottom > viewBottom - 10) {
      categoryListRef.current.scrollTo({
        top: itemBottom - categoryListRef.current.clientHeight + 14,
        behavior: "auto",
      });
    }
  }, [categories, focusedId, activeCategoryId, isSearching]);

  // Restore category list scroll position when keyboard/search closes
  useEffect(() => {
    if (!categoryListRef.current) return;
    if (wasSearchingRef.current && !isSearching) {
      categoryListRef.current.scrollTop = categoryScrollTop;
    }
    wasSearchingRef.current = isSearching;
  }, [categoryScrollTop, isSearching]);

  // ── UI state ────────────────────────────────────────────────────────────────
  const [showEpg, setShowEpg] = useState(false);
  const [focusedChannelId, setFocusedChannelId] = useState<string | null>(null);
  const [epgPreviewChannelId, setEpgPreviewChannelId] = useState<string>("");

  // ── Refs ────────────────────────────────────────────────────────────────────
  const hasInitializedFocusRef = useRef(false);
  /** True while focus is already inside the sidebar — prevents redirect loops. */
  const sidebarFocusedRef = useRef(true);
  const wasSearchingRef = useRef(isSearching);
  const pendingGridFocusCategoryRef = useRef<string | null>(null);
  const categorySwitchStartRef = useRef<number | null>(null);
  const firstGridRenderStartRef = useRef<number>(0);
  /** Debounce timer for expensive side effects during fast navigation. */
  const navDebounceTimerRef = useRef<number | null>(null);
  const epgPreviewTimerRef = useRef<number | null>(null);
  const [gridContainerWidth, setGridContainerWidth] = useState(0);
  const [gridHeight, setGridHeight] = useState(window.innerHeight - 240);

  // ── Back key: close EPG / Search ────────────────────────────────────────────
  useTvBack(() => {
    if (isSearching) {
      setIsSearching(false);
      setFocus("live-search-input-wrapper");
    } else if (searchQuery) {
      setSearchQuery("");
      setFocus("live-search-input-wrapper");
    } else if (showEpg) {
      setShowEpg(false);
    }
  }, isSearching || Boolean(searchQuery) || showEpg);

  // ── Sync channels to player store ───────────────────────────────────────────
  useEffect(() => {
    setLiveChannels(filteredChannels);
  }, [filteredChannels, setLiveChannels]);
  useEffect(() => {
    if (firstGridRenderStartRef.current === 0) {
      firstGridRenderStartRef.current = performance.now();
    }
  }, []);

  // ── Persist selected category ───────────────────────────────────────────────
  useEffect(() => {
    if (!selectedCategoryId) return;
    setSelectedCategoryInStore(selectedCategoryId);
  }, [selectedCategoryId, setSelectedCategoryInStore]);

  // ── Performance: first-render timing ───────────────────────────────────────
  useEffect(() => {
    if (filteredChannels.length === 0) return;
    const durationMs = Math.max(
      1,
      Math.round(performance.now() - firstGridRenderStartRef.current)
    );
    // Guard: only log once (set to Infinity after first log).
    if (firstGridRenderStartRef.current === Number.POSITIVE_INFINITY) return;
    logger.info(`Live grid first render in ${durationMs}ms`, { channelCount: filteredChannels.length });
    perfMetrics.recordDuration("live_grid_first_render_ms", durationMs, {
      slowAboveMs: 400,
      data: { channelCount: filteredChannels.length },
    });
    firstGridRenderStartRef.current = Number.POSITIVE_INFINITY;
  }, [filteredChannels.length]);

  // ── Performance: category-switch timing ────────────────────────────────────
  useEffect(() => {
    if (!activeCategoryId) return;
    if (categorySwitchStartRef.current === null) return;
    if (isFetchingChannels) return;
    const switchDuration = Math.round(performance.now() - categorySwitchStartRef.current);
    logger.debug(`Live category switch completed in ${switchDuration}ms`, {
      categoryId: activeCategoryId,
      channelCount: filteredChannels.length,
    });
    perfMetrics.recordDuration("live_category_switch_ms", switchDuration, {
      slowAboveMs: 250,
      data: {
        categoryId: activeCategoryId,
        channelCount: filteredChannels.length,
      },
    });
    categorySwitchStartRef.current = null;
  }, [activeCategoryId, filteredChannels.length, isFetchingChannels]);

  // ── Image preload (bounded) ─────────────────────────────────────────────────

  // ── Measure grid container dimensions dynamically with a robust callback ref ─────
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const gridContainerRef = useCallback((node: HTMLDivElement | null) => {
    if (resizeObserverRef.current) {
      resizeObserverRef.current.disconnect();
      resizeObserverRef.current = null;
    }
    if (node) {
      setGridContainerWidth(node.clientWidth);
      setGridHeight(node.clientHeight || window.innerHeight - 240);
      const ro = new ResizeObserver((entries) => {
        const rect = entries[0]?.contentRect;
        if (rect) {
          if (rect.width > 0) {
            setGridContainerWidth(rect.width);
          }
          if (rect.height > 0) {
            setGridHeight(rect.height);
          }
        }
      });
      ro.observe(node);
      resizeObserverRef.current = ro;
    }
  }, []);

  const gridItemWidth = useMemo(() => {
    if (gridContainerWidth <= 0) return 250;
    return Math.floor((gridContainerWidth - (cols - 1) * GRID_GAP) / cols);
  }, [gridContainerWidth, cols]);

  // ── Cleanup debounce timer on unmount ───────────────────────────────────────
  useEffect(() => {
    return () => {
      if (navDebounceTimerRef.current !== null) {
        window.clearTimeout(navDebounceTimerRef.current);
      }
      if (epgPreviewTimerRef.current !== null) {
        window.clearTimeout(epgPreviewTimerRef.current);
      }
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
    };
  }, []);

  // ── Initial focus: first category ──────────────────────────────────────────
  useEffect(() => {
    if (showEpg) return;
    if (hasInitializedFocusRef.current) return;
    if (categories.length === 0) return;

    hasInitializedFocusRef.current = true;
    const frameId = window.requestAnimationFrame(() => {
      const initialCategoryId = activeCategoryId || categories[0]?.id;
      if (initialCategoryId) setFocus(`live-cat-${initialCategoryId}`);
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [activeCategoryId, categories, setFocus, showEpg]);

  // ── Deferred grid focus after category switch ───────────────────────────────
  useEffect(() => {
    if (showEpg || filteredChannels.length === 0 || !activeCategoryId) return;

    const pendingCategoryId = pendingGridFocusCategoryRef.current;
    if (!pendingCategoryId || pendingCategoryId !== activeCategoryId) return;

    pendingGridFocusCategoryRef.current = null;

    const scrollTop = useLiveTvStore.getState().gridScrollTopByCategory[activeCategoryId] ?? 0;
    const rowStride = GRID_ITEM_HEIGHT + GRID_GAP;
    const firstVisibleRow = Math.floor(scrollTop / rowStride);
    const firstVisibleIndex = Math.min(
      filteredChannels.length - 1,
      Math.max(0, firstVisibleRow * cols)
    );
    const targetChannelId = filteredChannels[firstVisibleIndex]?.id;

    if (!targetChannelId) return;

    sidebarFocusedRef.current = false;
    const frameId = window.requestAnimationFrame(() => {
      setFocus(`card-live-${targetChannelId}`);
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [activeCategoryId, filteredChannels, cols, setFocus, showEpg]);

  // ── Derived values ──────────────────────────────────────────────────────────
  const activeCategoryName = useMemo(
    () => categories.find((c) => c.id === activeCategoryId)?.name ?? "All Channels",
    [activeCategoryId, categories]
  );

  const activeGridScrollTop = useLiveTvStore((state) =>
    activeCategoryId
      ? (state.gridScrollTopByCategory[activeCategoryId] ?? 0)
      : 0
  );
  const initialGridScrollTop = activeGridScrollTop;
  const gridRowStride = GRID_ITEM_HEIGHT + GRID_GAP;
  const visibleGridRange = getGridPreloadRange({
    itemCount: filteredChannels.length,
    columns: cols,
    rowStride: gridRowStride,
    viewportHeight: gridHeight,
    anchorScrollTop: activeGridScrollTop,
    overscanRows: GRID_IMAGE_PRELOAD_OVERSCAN_ROWS,
  });

  const focusedGridIndex = useMemo(
    () => filteredChannels.findIndex((c) => c.id === focusedChannelId),
    [filteredChannels, focusedChannelId]
  );

  const visibleLogoPreloadUrls = useMemo(
    () =>
      sliceImagePreloadUrls(
        filteredChannels,
        (channel) => channel.logoUrl,
        visibleGridRange.startIndex,
        visibleGridRange.endIndex
      ),
    [filteredChannels, visibleGridRange.endIndex, visibleGridRange.startIndex]
  );

  useBudgetedImagePreload(
    visibleLogoPreloadUrls,
    {
      enabled: networkStatus === "online" && !isSearching,
      maxConcurrent: 2,
      maxUrls: 8,
    }
  );

  const focusedChannel = useMemo(() => {
    return filteredChannels.find((c) => c.id === focusedChannelId);
  }, [filteredChannels, focusedChannelId]);

  const channelMeta = useMemo(() => {
    if (!focusedChannel) return null;
    return parseChannelTitle(focusedChannel.title);
  }, [focusedChannel]);

  // ── EPG mini-guide: preview channel ────────────────────────────────────────
  const firstChannelId = filteredChannels[0]?.id;
  const previewChannelId = useMemo(() => {
    if (focusedChannelId && filteredChannels.some((ch) => ch.id === focusedChannelId)) {
      return focusedChannelId;
    }
    return firstChannelId ?? "";
  }, [filteredChannels, firstChannelId, focusedChannelId]);

  useEffect(() => {
    if (!previewChannelId) return;
    if (epgPreviewTimerRef.current !== null) {
      window.clearTimeout(epgPreviewTimerRef.current);
    }
    epgPreviewTimerRef.current = window.setTimeout(() => {
      epgPreviewTimerRef.current = null;
      setEpgPreviewChannelId(previewChannelId);
    }, EPG_PREVIEW_DEBOUNCE_MS);
  }, [previewChannelId]);

  const epgStreamId = epgPreviewChannelId || previewChannelId;
  const { currentProgram, nextPrograms, isLoading: isEpgLoading } = useEpg(epgStreamId);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleChannelFocus = useCallback(
    (channelId: string) => {
      sidebarFocusedRef.current = false;
      setFocusedChannelId(channelId);

      // Debounce expensive side effects (store write, perf logs).
      if (navDebounceTimerRef.current !== null) {
        window.clearTimeout(navDebounceTimerRef.current);
      }
      navDebounceTimerRef.current = window.setTimeout(() => {
        navDebounceTimerRef.current = null;
        if (activeCategoryId) {
          useLiveTvStore
            .getState()
            .setLastFocusedChannelForCategory(activeCategoryId, channelId);
        }
      }, NAV_DEBOUNCE_MS);
    },
    [activeCategoryId]
  );

  const handleChannelClick = useCallback(
    (channel: AppChannel) => {
      if (!channel.id) {
        logger.warn("Ignored live channel click with empty stream id", channel);
        return;
      }

      useLiveTvStore.getState().setReturnFocusId(`card-live-${channel.id}`);

      void services.userData.saveRecentlyWatched({
        id: channel.id,
        type: "live",
        title: channel.title,
        imageUrl: channel.logoUrl,
        watchedAt: new Date().toISOString(),
      });

      setActivePlaybackItem({
        id: channel.id,
        title: channel.title,
        logoUrl: channel.logoUrl,
        contentType: "live",
      });
    },
    [setActivePlaybackItem]
  );

  const handleCategoryEnter = useCallback(
    (categoryId: string) => {
      pendingGridFocusCategoryRef.current = categoryId;
      categorySwitchStartRef.current = performance.now();

      if (selectedCategoryId !== categoryId) {
        setSelectedCategoryId(categoryId);
        return;
      }

      if (activeCategoryId !== categoryId || filteredChannels.length === 0) return;

      const scrollTop = useLiveTvStore.getState().gridScrollTopByCategory[categoryId] ?? 0;
      const rowStride = GRID_ITEM_HEIGHT + GRID_GAP;
      const firstVisibleRow = Math.floor(scrollTop / rowStride);
      const firstVisibleIndex = Math.min(
        filteredChannels.length - 1,
        Math.max(0, firstVisibleRow * cols)
      );
      const targetChannelId = filteredChannels[firstVisibleIndex]?.id;
      if (!targetChannelId) return;

      pendingGridFocusCategoryRef.current = null;
      setFocusedChannelId(targetChannelId);
      sidebarFocusedRef.current = false;
      const frameId = window.requestAnimationFrame(() => {
        setFocus(`card-live-${targetChannelId}`);
      });
      window.setTimeout(() => window.cancelAnimationFrame(frameId), 500);
    },
    [activeCategoryId, filteredChannels, selectedCategoryId, cols, setFocus]
  );

  const handleScrollTopChange = useCallback(
    (nextScrollTop: number) => {
      if (!activeCategoryId) return;
      useLiveTvStore.getState().setGridScrollTopForCategory(activeCategoryId, nextScrollTop);
    },
    [activeCategoryId]
  );

  // When focus enters the sidebar from the grid, jump straight to the
  // currently selected category instead of landing on a random item.
  const handleCategoryFocus = useCallback(
    (categoryId: string) => {
      prefetchCategory(categoryId);

      if (sidebarFocusedRef.current) return;

      sidebarFocusedRef.current = true;

      if (categoryId === activeCategoryId) return;

      const targetId = activeCategoryId ?? categories[0]?.id;
      if (targetId) {
        window.requestAnimationFrame(() => {
          setFocus(`live-cat-${targetId}`);
        });
      }
    },
    [activeCategoryId, categories, prefetchCategory, setFocus]
  );

  // Direct index-based navigation override for Butter-smooth vertical category movements.
  const handleCategoryKeyDown = useCallback(
    (e: React.KeyboardEvent, index: number) => {
      const isUp = e.key === "ArrowUp";
      const isDown = e.key === "ArrowDown";
      const isRight = e.key === "ArrowRight";

      if (isUp || isDown) {
        e.preventDefault();
        const nextIndex = isUp ? index - 1 : index + 1;
        if (nextIndex >= 0 && nextIndex < categories.length) {
          const targetCategory = categories[nextIndex];
          setFocus(`live-cat-${targetCategory.id}`);
        } else if (isUp && index === 0) {
          setFocus("live-search-input-wrapper");
        }
      } else if (isRight && filteredChannels.length > 0) {
        e.preventDefault();
        const categoryId = categories[index].id;
        const scrollTop = useLiveTvStore.getState().gridScrollTopByCategory[categoryId] ?? 0;
        const rowStride = GRID_ITEM_HEIGHT + GRID_GAP;
        const firstVisibleRow = Math.floor(scrollTop / rowStride);
        const firstVisibleIndex = Math.min(
          filteredChannels.length - 1,
          Math.max(0, firstVisibleRow * cols)
        );
        const targetChannelId = filteredChannels[firstVisibleIndex]?.id;

        if (targetChannelId) {
          sidebarFocusedRef.current = false;
          setFocus(`card-live-${targetChannelId}`);
        }
      }
    },
    [categories, filteredChannels, cols, setFocus]
  );

  // ── Error state ─────────────────────────────────────────────────────────────
  if (isError) {
    const titleByErrorCode: Record<string, string> = {
      INVALID_CREDENTIALS: "Playlist authentication failed",
      ACCOUNT_DISABLED: "Account is disabled",
      ACCOUNT_EXPIRED: "Account has expired",
      SERVER_UNREACHABLE: "Server is unreachable",
      TIMEOUT: "Server timeout",
      INVALID_RESPONSE: "Unexpected server response",
    };

    return (
      <ErrorView
        message={`${titleByErrorCode[errorCode ?? ""] || "Unable to load Live TV"}. ${errorMessage || "Please try again."}`}
        onRetry={() => refetch()}
        showBackToLogin
      />
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className={`${styles.container} ${isSearching ? styles.containerSearching : ""}`}>
      {/* ── Non-blocking network status banner ──────────────────────────────── */}
      {networkStatus !== "online" && (
        <div
          className={`${styles.networkBanner} ${
            networkStatus === "offline" ? styles.networkBannerOffline : styles.networkBannerDegraded
          }`}
          role="status"
          aria-live="polite"
        >
          {networkStatus === "offline"
            ? "No internet connection — showing cached content"
            : "Connection is slow — content may take longer to load"}
        </div>
      )}

      {/* ── Left Sidebar / Search Keyboard ─────────────────────────────────── */}
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
                          setFocus("live-search-input-wrapper");
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
                          } else if (filteredChannels.length > 0) {
                             e.preventDefault();
                             sidebarFocusedRef.current = false;
                             setFocus(`card-live-${filteredChannels[0].id}`);
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
                    setFocus("live-search-input-wrapper");
                  }
                } else if (e.key === "ArrowRight") {
                  const isRightEdge =
                    columnIndex === 5 ||
                    (rowIndex === 6 && columnIndex === 2) ||
                    (rowIndex === 7 && columnIndex === 4);

                  if (isRightEdge && filteredChannels.length > 0) {
                    e.preventDefault();
                    sidebarFocusedRef.current = false;
                    setFocus(`card-live-${filteredChannels[0].id}`);
                  }
                }
              }}
              onSubmit={(val) => {
                setIsSearching(false);
                searchStorage.saveRecentSearch(val);
                setRecentSearches(searchStorage.getRecentSearches());
                if (filteredChannels.length > 0) {
                  sidebarFocusedRef.current = false;
                  setFocus(`card-live-${filteredChannels[0].id}`);
                } else {
                  setFocus("live-search-input-wrapper");
                }
              }}
              onBackClick={() => {
                setIsSearching(false);
                setSearchQuery("");
                setFocus("live-search-input-wrapper");
              }}
            />
          </div>
        ) : (
          <>
            <div className={styles.sidebarHeader}>
              <span className={styles.sidebarMeta}>SMARTIFLY</span>
              <h2 className={styles.sidebarTitle}>Live TV</h2>
            </div>

            <div
              ref={categoryListRef}
              className={styles.categoryList}
              onScroll={handleCategoryListScroll}
              style={{ position: "relative" }}
            >
              {categories.length === 0 && isLoading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <div
                    key={`live-category-skeleton-${i}`}
                    className={`${styles.skeletonCategory} ${styles.skeletonPulse}`}
                  />
                ))
              ) : (
                <div
                  style={{
                    height: categories.length * CATEGORY_ROW_HEIGHT,
                    width: "100%",
                    position: "relative",
                  }}
                >
                  {categories
                    .slice(
                      Math.max(0, Math.floor(categoryScrollTop / CATEGORY_ROW_HEIGHT) - 3),
                      Math.min(categories.length, Math.ceil((categoryScrollTop + 800) / CATEGORY_ROW_HEIGHT) + 3)
                    )
                    .map((category, index) => {
                      const absIndex =
                        Math.max(0, Math.floor(categoryScrollTop / CATEGORY_ROW_HEIGHT) - 3) + index;
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
                            zIndex: focusedId === `live-cat-${category.id}` ? 10 : (activeCategoryId === category.id ? 2 : 1),
                          }}
                        >
                          <Focusable
                            id={`live-cat-${category.id}`}
                            variant="pill"
                            disableFocusEffects
                            className={`${styles.categoryItem} ${
                              activeCategoryId === category.id ? styles.selected : ""
                            }`}
                            onFocus={() => handleCategoryFocus(category.id)}
                            onEnter={() => handleCategoryEnter(category.id)}
                            onKeyDown={(e) => handleCategoryKeyDown(e, absIndex)}
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

      {/* ── Main content ────────────────────────────────────────────────────── */}
      <main className={styles.content}>
        {/* Header containing two rows for premium TV layout */}
        <header className={styles.header}>
          {/* Row 1: Category Name, EPG Bar and TV Guide button in same line */}
          <div className={styles.headerRowTop}>
            <div className={styles.categoryAndEpg}>
              <h1 className={styles.title}>{activeCategoryName}</h1>
              {focusedChannel && (
                <MiniGuide
                  isLoading={isEpgLoading}
                  currentProgram={currentProgram}
                  nextPrograms={nextPrograms}
                />
              )}
            </div>
            
            <Focusable
              id="live-open-epg"
              variant="pill"
              disableFocusEffects
              className={styles.guideBtn}
              onEnter={() => setShowEpg(true)}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setFocus("live-search-input-wrapper");
                } else if (e.key === "ArrowLeft") {
                  e.preventDefault();
                  const targetCatId = activeCategoryId ?? categories[0]?.id;
                  if (targetCatId) {
                    setFocus(`live-cat-${targetCatId}`);
                  }
                }
              }}
            >
              <svg 
                className={styles.guideIcon} 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="3" y1="9" x2="21" y2="9"></line>
                <line x1="9" y1="21" x2="9" y2="9"></line>
              </svg>
              <span>TV Guide</span>
            </Focusable>
          </div>

          {/* Row 2: Focused Channel/Content Title (left) & Search Bar (right) */}
          <div className={styles.headerRowBottom}>
            <div className={styles.subtitleContainer}>
              {focusedChannel && channelMeta ? (
                <>
                  <span className={styles.subtitleChannelName}>{channelMeta.cleanTitle}</span>
                  {channelMeta.resolution && (
                    <span className={styles.badgeQuality}>{channelMeta.resolution}</span>
                  )}
                </>
              ) : (
                <span className={styles.subtitlePlaceholder}>&nbsp;</span>
              )}
            </div>

            <div className={styles.searchContainer}>
              <Focusable
                id="live-search-input-wrapper"
                variant="pill"
                className={styles.searchFocusable}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    if (isSearching && suggestions.length > 0) {
                      e.preventDefault();
                      setFocus("search-sug-0");
                    } else if (filteredChannels.length > 0) {
                      e.preventDefault();
                      setFocus(`card-live-${filteredChannels[0].id}`);
                    }
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setFocus("live-open-epg");
                  } else if (e.key === "ArrowLeft") {
                    e.preventDefault();
                    if (!isSearching) {
                      const targetCatId = activeCategoryId ?? categories[0]?.id;
                      if (targetCatId) {
                        setFocus(`live-cat-${targetCatId}`);
                      }
                    }
                  }
                }}
                onEnter={() => {
                  setIsSearching(true);
                  sidebarFocusedRef.current = false;
                  setFocusedChannelId(null);
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
                  setFocusedChannelId(null);
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
                  {searchQuery || "Search channels..."}
                </div>
              </Focusable>
            </div>
          </div>
        </header>

        {/* Channel grid */}
        {isLoading ? (
          <div className={styles.loaderContainer}>
            <div className={styles.skeletonGrid}>
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={`live-card-skeleton-${i}`}
                  className={`${styles.skeletonCard} ${styles.skeletonPulse}`}
                />
              ))}
            </div>
          </div>
        ) : categories.length === 0 ? (
          <EmptyState
            title="No live categories"
            message="The server responded but no Live TV categories are available."
          />
        ) : filteredChannels.length === 0 ? (
          <EmptyState
            title="No channels found"
            message={searchQuery ? "No channels match your search." : "This category does not contain playable channels."}
          />
        ) : (
          <div className={styles.gridContainer} aria-live="polite">
            {isFetchingChannels && (
              <div className={styles.updatingBanner}>Updating channels…</div>
            )}
            {/* Sticky category context watermark — visible when header scrolls out of view */}
            <div className={styles.categoryWatermark} aria-hidden="true">
              {activeCategoryName}
            </div>
            <div
              ref={gridContainerRef}
              key={`${activeCategoryId}-${isSearching ? "search" : "browse"}`}
              id="rail-live-channels"
              className={styles.railGrid}
            >
              <VirtualGrid
                items={filteredChannels}
                itemHeight={GRID_ITEM_HEIGHT}
                itemWidth={gridItemWidth}
                columns={cols}
                gap={GRID_GAP}
                containerHeight={gridHeight}
                initialScrollTop={initialGridScrollTop}
                focusedIndex={focusedId?.startsWith("card-live-") && focusedGridIndex >= 0 ? focusedGridIndex : undefined}
                rowSnapMode="none"
                scrollBehaviorMode="adaptive"
                bottomSafeArea={60}
                edgeFeedback
                onScrollTopChange={handleScrollTopChange}
                renderItem={(channel, index) => (
                  <LiveTvCard
                    key={channel.id}
                    channel={channel}
                    index={index}
                    activeCategoryId={activeCategoryId ?? null}
                    onFocus={handleChannelFocus}
                    onClick={handleChannelClick}
                    columns={cols}
                    isSearching={isSearching}
                    prevChannelId={index > 0 ? filteredChannels[index - 1]?.id : undefined}
                    nextRowChannelId={index + cols < filteredChannels.length ? filteredChannels[index + cols]?.id : undefined}
                    prevRowChannelId={index - cols >= 0 ? filteredChannels[index - cols]?.id : undefined}
                    totalChannels={filteredChannels.length}
                    lastChannelId={filteredChannels[filteredChannels.length - 1]?.id}
                    shouldLoadLogo={
                      index >= visibleGridRange.startIndex &&
                      index < visibleGridRange.endIndex
                    }
                  />
                )}
              />
            </div>
          </div>
        )}
      </main>

      {/* ── EPG modal ───────────────────────────────────────────────────────── */}
      {showEpg && (
        <EpgGrid
          channels={filteredChannels}
          onClose={() => setShowEpg(false)}
          onSelectChannel={(channel) => {
            handleChannelClick(channel);
            setShowEpg(false);
          }}
        />
      )}
    </div>
  );
};

// ─── MiniGuide sub-component ──────────────────────────────────────────────────
interface MiniGuideProps {
  isLoading: boolean;
  currentProgram: ReturnType<typeof useEpg>["currentProgram"];
  nextPrograms: ReturnType<typeof useEpg>["nextPrograms"];
  nextProgram?: ReturnType<typeof useEpg>["currentProgram"];
}

const MiniGuide: React.FC<MiniGuideProps> = React.memo(
  ({ isLoading, currentProgram, nextPrograms }) => {
    if (isLoading) {
      return (
        <div className={styles.programStrip}>
          <span className={styles.programPlaceholder}>Loading TV guide…</span>
        </div>
      );
    }

    if (!currentProgram) {
      return (
        <div className={styles.programStrip}>
          <span className={styles.programPlaceholder}>No EPG data</span>
        </div>
      );
    }

    const startTime = formatEpgTime(String(Math.floor(currentProgram.startMs / 1000)));
    const endTime = formatEpgTime(String(Math.floor(currentProgram.endMs / 1000)));

    return (
      <div className={styles.programStrip}>
        <span className={styles.programBadge}>ON NOW</span>
        <span className={styles.programText}>{currentProgram.title}</span>
        <span className={styles.programTime}>
          {startTime} – {endTime}
        </span>
        {/* Progress bar */}
        <span className={styles.programProgressWrap}>
          <span
            className={styles.programProgressFill}
            style={{ width: `${currentProgram.progress}%` }}
          />
        </span>
        {nextPrograms.length > 0 && (
          <>
            <span className={styles.programDivider}>|</span>
            <span className={styles.programNextLabel}>NEXT</span>
            <span className={styles.programText}>{nextPrograms[0].title}</span>
          </>
        )}
      </div>
    );
  }
);
MiniGuide.displayName = "MiniGuide";
