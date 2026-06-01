import React, { useMemo, useState, useRef, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Heart, History, PlayCircle, Trash2 } from "lucide-react";
import { services } from "../../services";
import { usePlayerStore } from "../../store/playerStore";
import type { FavoriteItem } from "../../storage/favoritesStorage";
import type { RecentlyWatchedItem } from "../../storage/recentlyWatchedStorage";
import { playlistStorage } from "../../storage/playlistStorage";
import { profileStorage } from "../../storage/profileStorage";
import { Focusable } from "../../components/tv/Focusable";
import { LibraryCard } from "./LibraryCard";
import { EmptyState } from "../../components/common/EmptyState";
import { ErrorView } from "../../components/common/ErrorView";
import VodDetails from "../vod/VodDetails";
import { SeriesDetails } from "../series/SeriesDetails";
import { useFocus } from "../../providers/useFocus";
import { useTvBack } from "../../hooks/useTvBack";
import styles from "./Library.module.css";

type LibraryTabId = "FAVORITES" | "RECENT" | "CONTINUE";

const TAB_ITEMS: { id: LibraryTabId; label: string; icon: typeof Heart }[] = [
  { id: "FAVORITES", label: "Favorites", icon: Heart },
  { id: "RECENT", label: "Recently Watched", icon: History },
  { id: "CONTINUE", label: "Continue Watching", icon: PlayCircle },
];

type LibraryData = {
  favorites: FavoriteItem[];
  history: RecentlyWatchedItem[];
};

const getOffsetLeftWithinAncestor = (element: HTMLElement, ancestor: HTMLElement) => {
  let offsetLeft = 0;
  let current: HTMLElement | null = element;

  while (current && current !== ancestor) {
    offsetLeft += current.offsetLeft;
    current = current.offsetParent as HTMLElement | null;
  }

  return offsetLeft;
};

export const Library: React.FC = () => {
  const [activeTab, setActiveTab] = useState<LibraryTabId>("FAVORITES");
  const [focusedTab, setFocusedTab] = useState<LibraryTabId>("FAVORITES");
  const [selectedMovieId, setSelectedMovieId] = useState<string | null>(null);
  const [selectedSeriesId, setSelectedSeriesId] = useState<string | null>(null);
  const [focusedItem, setFocusedItem] = useState<FavoriteItem | RecentlyWatchedItem | null>(null);
  const setActivePlaybackItem = usePlayerStore((state) => state.setActivePlaybackItem);
  const { setFocus, focusedId } = useFocus();

  const lastFocusedCardIdRef = useRef<string | null>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const isMountedRef = useRef(false);
  const wasInDetailsRef = useRef(false);
  const focusScrollRafRef = useRef<number | null>(null);
  const pendingFocusIdRef = useRef<string | null>(null);
  const activePlaylistId = playlistStorage.getActivePlaylistId();
  const activeProfileId = profileStorage.getActiveProfileId();

  // Fetch Library Data using TanStack Query
  const { data, isLoading, isError, refetch } = useQuery<LibraryData>({
    queryKey: ["library-data", activePlaylistId, activeProfileId],
    queryFn: async () => {
      const [favorites, history] = await Promise.all([
        services.userData.getFavorites(),
        services.userData.getRecentlyWatched(),
      ]);
      return { favorites, history };
    },
    enabled: !!activePlaylistId && !!activeProfileId,
    retry: 2,
    staleTime: 60 * 1000,
  });

  const favorites = useMemo(() => data?.favorites ?? [], [data?.favorites]);
  const history = useMemo(() => data?.history ?? [], [data?.history]);

  // Segment favorites into TV Channels, Movies, and Series
  const { favoriteLive, favoriteMovies, favoriteSeries } = useMemo(() => {
    const live: FavoriteItem[] = [];
    const movies: FavoriteItem[] = [];
    const seriesList: FavoriteItem[] = [];

    favorites.forEach((item) => {
      if (item.type === "live") live.push(item);
      else if (item.type === "vod") movies.push(item);
      else if (item.type === "series") seriesList.push(item);
    });

    return {
      favoriteLive: live,
      favoriteMovies: movies,
      favoriteSeries: seriesList,
    };
  }, [favorites]);

  // Segment recently watched history into TV Channels, Movies, and Series
  const { recentLive, recentMovies, recentSeries } = useMemo(() => {
    const live: RecentlyWatchedItem[] = [];
    const movies: RecentlyWatchedItem[] = [];
    const seriesList: RecentlyWatchedItem[] = [];

    history.forEach((item) => {
      if (item.type === "live") live.push(item);
      else if (item.type === "vod") movies.push(item);
      else if (item.type === "series") seriesList.push(item);
    });

    return {
      recentLive: live,
      recentMovies: movies,
      recentSeries: seriesList,
    };
  }, [history]);
  
  const continueWatching = useMemo(() => {
    return history
      .filter(
        (item) =>
          item.type !== "live" &&
          (item.positionSeconds === undefined || item.positionSeconds >= 30)
      )
      .slice(0, 20);
  }, [history]);

  const currentItems = useMemo(() => {
    if (activeTab === "FAVORITES") {
      return [...favoriteLive, ...favoriteMovies, ...favoriteSeries];
    }
    if (activeTab === "RECENT") {
      return [...recentLive, ...recentMovies, ...recentSeries];
    }
    return continueWatching;
  }, [activeTab, favoriteLive, favoriteMovies, favoriteSeries, recentLive, recentMovies, recentSeries, continueWatching]);

  const currentCardIds = useMemo(() => {
    if (activeTab === "FAVORITES") {
      const ids: string[] = [];
      favoriteLive.forEach((_, i) => ids.push(`library-live-${i}`));
      favoriteMovies.forEach((_, i) => ids.push(`library-movies-${i}`));
      favoriteSeries.forEach((_, i) => ids.push(`library-series-${i}`));
      return ids;
    }
    if (activeTab === "RECENT") {
      const ids: string[] = [];
      recentLive.forEach((_, i) => ids.push(`library-live-${i}`));
      recentMovies.forEach((_, i) => ids.push(`library-movies-${i}`));
      recentSeries.forEach((_, i) => ids.push(`library-series-${i}`));
      return ids;
    }
    return continueWatching.map((_, i) => `library-continue-${i}`);
  }, [activeTab, favoriteLive, favoriteMovies, favoriteSeries, recentLive, recentMovies, recentSeries, continueWatching]);

  const firstCardId = currentCardIds[0] ?? null;

  useEffect(() => {
    setFocusedTab(activeTab);
  }, [activeTab]);

  const canClear = currentItems.length > 0;

  // Set default focused item when active tab or data changes
  useEffect(() => {
    if (currentItems.length > 0) {
      setFocusedItem(currentItems[0]);
    } else {
      setFocusedItem(null);
    }
  }, [activeTab, currentItems]);

  const title = useMemo(() => {
    if (activeTab === "FAVORITES") return "Favorites";
    if (activeTab === "RECENT") return "Recently Watched";
    return "Continue Watching";
  }, [activeTab]);

  // Escape to global sidebar on Back key press
  useTvBack(() => {
    const rememberedId = lastFocusedCardIdRef.current;
    const targetId =
      rememberedId && currentCardIds.includes(rememberedId)
        ? rememberedId
        : firstCardId ?? `library-tab-${activeTab}`;
    setFocus(targetId);
  }, !selectedMovieId && !selectedSeriesId);

  // Restore Focus or set initial focus when returning to main Library screen
  useEffect(() => {
    const inDetails = !!(selectedMovieId || selectedSeriesId);
    
    if (inDetails) {
      wasInDetailsRef.current = true;
      return;
    }

    const returnedFromDetails = wasInDetailsRef.current;
    wasInDetailsRef.current = false;

    if (returnedFromDetails) {
      const rememberedId = lastFocusedCardIdRef.current;
      const targetId =
        rememberedId && currentCardIds.includes(rememberedId)
          ? rememberedId
          : firstCardId ?? `library-tab-${activeTab}`;

      let secondFrame = 0;
      const firstFrame = window.requestAnimationFrame(() => {
        secondFrame = window.requestAnimationFrame(() => {
          setFocus(targetId);
        });
      });
      return () => {
        window.cancelAnimationFrame(firstFrame);
        if (secondFrame) window.cancelAnimationFrame(secondFrame);
      };
    } else if (!isMountedRef.current) {
      isMountedRef.current = true;
      let secondFrame = 0;
      const firstFrame = window.requestAnimationFrame(() => {
        secondFrame = window.requestAnimationFrame(() => {
          setFocus(`library-tab-${activeTab}`);
        });
      });
      return () => {
        window.cancelAnimationFrame(firstFrame);
        if (secondFrame) window.cancelAnimationFrame(secondFrame);
      };
    }
  }, [selectedMovieId, selectedSeriesId, setFocus, currentCardIds, firstCardId, activeTab]);

  // Auto-scroll: keep focused card visible in its rail or grid
  useEffect(() => {
    if (!focusedId || !pageRef.current) return;
    pendingFocusIdRef.current = focusedId;

    if (focusScrollRafRef.current !== null) {
      window.cancelAnimationFrame(focusScrollRafRef.current);
    }

    focusScrollRafRef.current = window.requestAnimationFrame(() => {
      focusScrollRafRef.current = null;
      const targetFocusId = pendingFocusIdRef.current;
      if (!targetFocusId || !pageRef.current) return;

      const focusedEl = document.getElementById(targetFocusId);
      if (!focusedEl) return;

      const pageElement = pageRef.current;

    if (
      targetFocusId.startsWith("library-live-") ||
      targetFocusId.startsWith("library-movies-") ||
      targetFocusId.startsWith("library-series-")
    ) {
      // Horizontal rail scroll — offset math avoids repeated viewport rect reads.
      const railEl = focusedEl.closest(`.${styles.resultRail}`) as HTMLDivElement | null;
      const cardContainer = focusedEl.parentElement as HTMLElement | null;
      if (railEl && cardContainer) {
        const focusedIndex = Number.parseInt(
          targetFocusId.slice(targetFocusId.lastIndexOf("-") + 1),
          10
        );
        const leftInset = 24;
        const rightInset = 24;
        const cardLeft = getOffsetLeftWithinAncestor(cardContainer, railEl);
        const cardWidth = cardContainer.offsetWidth;
        const currentScrollLeft = railEl.scrollLeft;
        const viewportWidth = railEl.clientWidth;

        if (Number.isFinite(focusedIndex) && focusedIndex === 0) {
          if (currentScrollLeft !== 0) {
            railEl.scrollLeft = 0;
          }
        } else if (cardLeft < currentScrollLeft + leftInset) {
          const nextLeft = Math.max(0, cardLeft - leftInset);
          if (Math.abs(currentScrollLeft - nextLeft) > 1) {
            railEl.scrollLeft = nextLeft;
          }
        } else if (
          cardLeft + cardWidth >
          currentScrollLeft + viewportWidth - rightInset
        ) {
          const nextLeft = cardLeft + cardWidth - viewportWidth + rightInset;
          if (Math.abs(currentScrollLeft - nextLeft) > 1) {
            railEl.scrollLeft = nextLeft;
          }
        }
      }

      // Vertical page scroll — center the active row using layout offsets.
      const rowEl = focusedEl.closest(`.${styles.resultRow}`) as HTMLDivElement | null;
      if (rowEl) {
        const absoluteRowTop = rowEl.offsetTop;
        const verticalTarget = Math.max(
          0,
          absoluteRowTop - (pageElement.clientHeight / 2) + (rowEl.offsetHeight / 2)
        );
        if (Math.abs(pageElement.scrollTop - verticalTarget) > 1) {
          pageElement.scrollTop = verticalTarget;
        }
      }
    } else if (targetFocusId.startsWith("library-continue-")) {
      // Grid card — only vertical scroll, center the focused card on screen.
      const cardWrapper = focusedEl.parentElement;
      if (cardWrapper) {
        const absoluteCardTop = cardWrapper.offsetTop;
        const verticalTarget = Math.max(
          0,
          absoluteCardTop - (pageElement.clientHeight / 2) + (cardWrapper.offsetHeight / 2)
        );
        if (Math.abs(pageElement.scrollTop - verticalTarget) > 1) {
          pageElement.scrollTop = verticalTarget;
        }
      }
    } else if (
      targetFocusId.startsWith("library-tab-") ||
      targetFocusId === "library-clear"
    ) {
      if (pageElement.scrollTop !== 0) {
        pageElement.scrollTop = 0;
      }
    }
    });
  }, [focusedId]);

  useEffect(() => {
    return () => {
      if (focusScrollRafRef.current !== null) {
        window.cancelAnimationFrame(focusScrollRafRef.current);
      }
    };
  }, []);

  // ── All callbacks must be declared BEFORE any early returns ──────────────
  // React requires hooks to be called in the same order on every render.
  // Early returns after hooks cause "fewer hooks than expected" crashes.

  const handleOpenItem = useCallback((item: FavoriteItem | RecentlyWatchedItem) => {
    if (item.type === "live") {
      setActivePlaybackItem({
        id: item.id,
        title: item.title,
        logoUrl: item.imageUrl,
        contentType: "live",
      });
      return;
    }

    if (item.type === "vod") {
      setSelectedMovieId(item.id);
      return;
    }

    setSelectedSeriesId(item.id);
  }, [setActivePlaybackItem]);

  const handleClearActive = useCallback(async () => {
    setFocus(`library-tab-${activeTab}`);

    if (activeTab === "FAVORITES") {
      await services.userData.clearFavorites();
    } else {
      await services.userData.clearRecentlyWatched();
    }
    await refetch();
  }, [activeTab, setFocus, refetch]);

  const getProgressText = useCallback((itm: FavoriteItem | RecentlyWatchedItem) => {
    const rw = itm as RecentlyWatchedItem;
    if (rw.type === "series" && rw.metadata?.seasonNumber) {
      return `S${rw.metadata.seasonNumber}:E${rw.metadata.episodeNumber}`;
    }
    if (rw.positionSeconds && rw.durationSeconds) {
      const remainingMin = Math.round((rw.durationSeconds - rw.positionSeconds) / 60);
      return remainingMin > 0 ? `${remainingMin}m left` : "Finished";
    }
    return rw.type === "series" ? "Series" : "Movie";
  }, []);

  // Remote directional controls for Tab Bar
  const handleTabKeyDown = useCallback((e: React.KeyboardEvent, index: number, tabId: LibraryTabId) => {
    if (e.key === "ArrowLeft") {
      if (index === 0) {
        e.preventDefault();
        setFocus("nav-LIBRARY");
      } else {
        e.preventDefault();
        const prevTab = TAB_ITEMS[index - 1].id;
        setFocus(`library-tab-${prevTab}`);
      }
    } else if (e.key === "ArrowRight") {
      if (index === TAB_ITEMS.length - 1) {
        if (canClear) {
          e.preventDefault();
          setFocus("library-clear");
        }
      } else {
        e.preventDefault();
        const nextTab = TAB_ITEMS[index + 1].id;
        setFocus(`library-tab-${nextTab}`);
      }
    } else if (e.key === "ArrowDown") {
      if (firstCardId) {
        e.preventDefault();
        setFocus(firstCardId);
      }
    } else if (e.key === "Enter" || e.key === "NumpadEnter") {
      e.preventDefault();
      setActiveTab(tabId);
    }
  }, [canClear, firstCardId, setFocus]);

  // Remote directional controls for "Clear" button
  const handleClearKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      setFocus(`library-tab-${focusedTab}`);
    } else if (e.key === "ArrowDown") {
      if (firstCardId) {
        e.preventDefault();
        setFocus(firstCardId);
      }
    }
  }, [focusedTab, firstCardId, setFocus]);

  // Grid columns for Continue Watching
  const CONTINUE_COLS = 4;

  // Remote directional controls for horizontal rails and continue watching grid
  const handleCardKeyDown = useCallback((
    e: React.KeyboardEvent,
    rowType: "live" | "movies" | "series" | "continue",
    index: number,
    rowLength: number
  ) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      if (rowType === "continue") {
        // Grid: move left, but don't wrap to previous row
        const col = index % CONTINUE_COLS;
        if (col > 0) setFocus(`library-continue-${index - 1}`);
        // col === 0: stay on first column, no leak
      } else {
        if (index > 0) setFocus(`library-${rowType}-${index - 1}`);
        // index === 0: stay, no leak to sidebar
      }
      return;
    }

    if (e.key === "ArrowRight") {
      e.preventDefault();
      if (rowType === "continue") {
        // Grid: move right, but don't wrap to next row
        const col = index % CONTINUE_COLS;
        if (col < CONTINUE_COLS - 1 && index < rowLength - 1) {
          setFocus(`library-continue-${index + 1}`);
        }
        // last col or last item: stay
      } else {
        if (index < rowLength - 1) setFocus(`library-${rowType}-${index + 1}`);
        // last item: stay
      }
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (rowType === "continue") {
        // Grid: move up one row
        const prevRowIndex = index - CONTINUE_COLS;
        if (prevRowIndex >= 0) {
          setFocus(`library-continue-${prevRowIndex}`);
        } else {
          // First grid row — go to tab bar / clear
          setFocus(canClear ? "library-clear" : `library-tab-${activeTab}`);
        }
        return;
      }
      if (rowType === "live") {
        setFocus(canClear ? "library-clear" : `library-tab-${activeTab}`);
      } else if (rowType === "movies") {
        const liveItems = activeTab === "FAVORITES" ? favoriteLive : recentLive;
        if (liveItems.length > 0) {
          setFocus(`library-live-${Math.min(index, liveItems.length - 1)}`);
        } else {
          setFocus(canClear ? "library-clear" : `library-tab-${activeTab}`);
        }
      } else if (rowType === "series") {
        const movieItems = activeTab === "FAVORITES" ? favoriteMovies : recentMovies;
        const liveItems = activeTab === "FAVORITES" ? favoriteLive : recentLive;
        if (movieItems.length > 0) {
          setFocus(`library-movies-${Math.min(index, movieItems.length - 1)}`);
        } else if (liveItems.length > 0) {
          setFocus(`library-live-${Math.min(index, liveItems.length - 1)}`);
        } else {
          setFocus(canClear ? "library-clear" : `library-tab-${activeTab}`);
        }
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (rowType === "continue") {
        // Grid: move down one row
        const nextRowIndex = index + CONTINUE_COLS;
        if (nextRowIndex < rowLength) {
          setFocus(`library-continue-${nextRowIndex}`);
        }
        // last row: stay
        return;
      }
      if (rowType === "live") {
        const movieItems = activeTab === "FAVORITES" ? favoriteMovies : recentMovies;
        const seriesItems = activeTab === "FAVORITES" ? favoriteSeries : recentSeries;
        if (movieItems.length > 0) {
          setFocus(`library-movies-${Math.min(index, movieItems.length - 1)}`);
        } else if (seriesItems.length > 0) {
          setFocus(`library-series-${Math.min(index, seriesItems.length - 1)}`);
        }
      } else if (rowType === "movies") {
        const seriesItems = activeTab === "FAVORITES" ? favoriteSeries : recentSeries;
        if (seriesItems.length > 0) {
          setFocus(`library-series-${Math.min(index, seriesItems.length - 1)}`);
        }
      }
    }
  }, [activeTab, canClear, favoriteLive, favoriteMovies, favoriteSeries, recentLive, recentMovies, recentSeries, setFocus]);

  // ── Early returns (must come AFTER all hooks) ─────────────────────────────

  if (selectedMovieId) {
    return (
      <VodDetails movieId={selectedMovieId} onBack={() => setSelectedMovieId(null)} />
    );
  }

  if (selectedSeriesId) {
    return (
      <SeriesDetails
        seriesId={selectedSeriesId}
        onBack={() => setSelectedSeriesId(null)}
      />
    );
  }

  return (
    <div ref={pageRef} className={styles.container}>
      <header className={styles.header}>
        <span className={styles.pageEyebrow}>My Collection</span>
        <h1 className={styles.pageTitle}>Library</h1>
        <div className={styles.tabBar}>
          {TAB_ITEMS.map((tab, idx) => {
            const Icon = tab.icon;
            return (
              <Focusable
                key={tab.id}
                id={`library-tab-${tab.id}`}
                onFocus={() => setFocusedTab(tab.id)}
                onEnter={() => setActiveTab(tab.id)}
                onKeyDown={(e) => handleTabKeyDown(e, idx, tab.id)}
                disableFocusEffects={true}
                className={`${styles.tabItem} ${
                  activeTab === tab.id ? styles.activeTab : ""
                }`}
              >
                <Icon size={20} />
                <span>{tab.label}</span>
              </Focusable>
            );
          })}
        </div>
      </header>

      <div className={styles.content}>
        {isLoading ? (
          activeTab === "RECENT" || activeTab === "FAVORITES" ? (
            <div className={styles.resultRows}>
              <div className={`${styles.resultRow} ${styles.liveRow}`}>
                <div className={styles.resultHeader}>
                  <h3 className={styles.shelfTitle}>Live TV Channels</h3>
                </div>
                <div className={styles.resultRail}>
                  <div className={styles.resultRailInner}>
                    {Array.from({ length: 5 }).map((_, idx) => (
                      <div
                        key={`shimmer-live-${idx}`}
                        className={`${styles.shimmerCard} ${styles.live}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div className={`${styles.resultRow} ${styles.moviesRow}`}>
                <div className={styles.resultHeader}>
                  <h3 className={styles.shelfTitle}>Movies</h3>
                </div>
                <div className={styles.resultRail}>
                  <div className={styles.resultRailInner}>
                    {Array.from({ length: 7 }).map((_, idx) => (
                      <div
                        key={`shimmer-poster-${idx}`}
                        className={`${styles.shimmerCard} ${styles.poster}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className={styles.continueGridRow}>
              <div className={styles.resultHeader}>
                <h3>Continue Watching</h3>
              </div>
              <div className={styles.continueShimmerGrid}>
                {Array.from({ length: 8 }).map((_, idx) => (
                  <div
                    key={idx}
                    className={`${styles.shimmerCard} ${styles.continue}`}
                  />
                ))}
              </div>
            </div>
          )
        ) : isError ? (
          <ErrorView
            message="Unable to load your library right now."
            onRetry={() => {
              void refetch();
            }}
            showBackToLogin
          />
        ) : (
          <div className={styles.section}>
            {/* Details Peek Banner */}
            {focusedItem && (
              <div
                className={styles.peekSection}
                data-type={focusedItem.type}
              >
                {/* Left: text content */}
                <div className={styles.peekLeft}>
                  <span className={`${styles.peekBadge} ${styles[`peekBadge_${focusedItem.type}`]}`}>
                    {focusedItem.type === "live" ? "● Live TV" : focusedItem.type === "vod" ? "Movie" : "Series"}
                  </span>
                  <h2 className={styles.peekTitle}>{focusedItem.title}</h2>
                  <div className={styles.peekMeta}>
                    <span className={styles.peekMetaChip}>
                      {focusedItem.type === "live" ? "TV Channel" : focusedItem.type === "vod" ? "Feature Film" : "Show / Series"}
                    </span>
                    {(focusedItem.type === "vod" || focusedItem.type === "series") && (
                      <span className={styles.peekMetaChip}>
                        {getProgressText(focusedItem)}
                      </span>
                    )}
                  </div>
                  <div className={styles.peekHint}>
                    <PlayCircle size={15} />
                    <span>Press ENTER to {focusedItem.type === "live" ? "watch" : "view details"}</span>
                  </div>
                </div>

                {/* Right: artwork thumbnail */}
                <div className={styles.peekRight}>
                  {focusedItem.imageUrl ? (
                    <img
                      src={focusedItem.imageUrl}
                      alt={focusedItem.title}
                      className={`${styles.peekArtwork} ${focusedItem.type === "live" ? styles.peekArtworkLive : styles.peekArtworkPoster}`}
                    />
                  ) : (
                    <div className={styles.peekArtworkFallback}>
                      <span>{focusedItem.title.substring(0, 2).toUpperCase()}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className={styles.sectionHeader}>
              <h2 className="title-large">{title}</h2>
              <Focusable
                id="library-clear"
                disabled={currentItems.length === 0}
                onEnter={() => {
                  void handleClearActive();
                }}
                onKeyDown={handleClearKeyDown}
                disableFocusEffects={true}
                className={styles.clearButton}
              >
                <Trash2 size={18} />
                <span>Clear</span>
              </Focusable>
            </div>

            {currentItems.length === 0 ? (
              <div className={styles.emptyWrap}>
                <EmptyState
                  title={`No ${title.toLowerCase()} yet`}
                  message="Start watching content and it will appear here."
                />
              </div>
            ) : (activeTab === "RECENT" || activeTab === "FAVORITES") ? (
              <div className={styles.resultRows}>
                {(activeTab === "FAVORITES" ? favoriteLive : recentLive).length > 0 && (
                  <div className={`${styles.resultRow} ${styles.liveRow}`}>
                    <div className={styles.resultHeader}>
                      <h3>Live TV Channels</h3>
                      <span>{(activeTab === "FAVORITES" ? favoriteLive : recentLive).length} Channels</span>
                    </div>
                    <div className={styles.resultRail}>
                      <div className={styles.resultRailInner}>
                      {(activeTab === "FAVORITES" ? favoriteLive : recentLive).map((item, index) => {
                        const cardId = `library-live-${index}`;
                        return (
                          <LibraryCard
                            key={`${item.type}-${item.id}-${index}`}
                            id={cardId}
                            title={item.title}
                            imageUrl={item.imageUrl}
                            type={item.type}
                            onClick={() => handleOpenItem(item)}
                            onFocus={() => {
                              lastFocusedCardIdRef.current = cardId;
                              setFocusedItem(item);
                            }}
                            onKeyDown={(e) => handleCardKeyDown(e, "live", index, (activeTab === "FAVORITES" ? favoriteLive : recentLive).length)}
                            variant="live"
                            aspectRatio="landscape"
                            disableAutoScroll={true}
                          />
                        );
                      })}
                      </div>
                    </div>
                  </div>
                )}

                {(activeTab === "FAVORITES" ? favoriteMovies : recentMovies).length > 0 && (
                  <div className={`${styles.resultRow} ${styles.moviesRow}`}>
                    <div className={styles.resultHeader}>
                      <h3>Movies</h3>
                      <span>{(activeTab === "FAVORITES" ? favoriteMovies : recentMovies).length} Movies</span>
                    </div>
                    <div className={styles.resultRail}>
                      <div className={styles.resultRailInner}>
                      {(activeTab === "FAVORITES" ? favoriteMovies : recentMovies).map((item, index) => {
                        const cardId = `library-movies-${index}`;
                        const rw = item as RecentlyWatchedItem;
                        const progress = rw.positionSeconds && rw.durationSeconds
                          ? Math.min(100, Math.round((rw.positionSeconds / rw.durationSeconds) * 100))
                          : undefined;

                        return (
                          <LibraryCard
                            key={`${item.type}-${item.id}-${index}`}
                            id={cardId}
                            title={item.title}
                            imageUrl={item.imageUrl}
                            type={item.type}
                            onClick={() => handleOpenItem(item)}
                            onFocus={() => {
                              lastFocusedCardIdRef.current = cardId;
                              setFocusedItem(item);
                            }}
                            onKeyDown={(e) => handleCardKeyDown(e, "movies", index, (activeTab === "FAVORITES" ? favoriteMovies : recentMovies).length)}
                            variant="poster"
                            aspectRatio="poster"
                            progress={progress}
                            progressText={rw.positionSeconds ? getProgressText(item) : undefined}
                            disableAutoScroll={true}
                          />
                        );
                      })}
                      </div>
                    </div>
                  </div>
                )}

                {(activeTab === "FAVORITES" ? favoriteSeries : recentSeries).length > 0 && (
                  <div className={`${styles.resultRow} ${styles.seriesRow}`}>
                    <div className={styles.resultHeader}>
                      <h3>TV Series</h3>
                      <span>{(activeTab === "FAVORITES" ? favoriteSeries : recentSeries).length} Series</span>
                    </div>
                    <div className={styles.resultRail}>
                      <div className={styles.resultRailInner}>
                      {(activeTab === "FAVORITES" ? favoriteSeries : recentSeries).map((item, index) => {
                        const cardId = `library-series-${index}`;
                        return (
                          <LibraryCard
                            key={`${item.type}-${item.id}-${index}`}
                            id={cardId}
                            title={item.title}
                            imageUrl={item.imageUrl}
                            type={item.type}
                            onClick={() => handleOpenItem(item)}
                            onFocus={() => {
                              lastFocusedCardIdRef.current = cardId;
                              setFocusedItem(item);
                            }}
                            onKeyDown={(e) => handleCardKeyDown(e, "series", index, (activeTab === "FAVORITES" ? favoriteSeries : recentSeries).length)}
                            variant="poster"
                            aspectRatio="poster"
                            disableAutoScroll={true}
                          />
                        );
                      })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className={styles.continueGridRow}>
                <div className={styles.resultHeader}>
                  <h3>Continue Watching</h3>
                  <span>{continueWatching.length} Items</span>
                </div>
                <div className={styles.continueGrid}>
                  {continueWatching.map((item, index) => {
                    const rw = item as RecentlyWatchedItem;
                    const progress = rw.positionSeconds && rw.durationSeconds
                      ? Math.min(100, Math.round((rw.positionSeconds / rw.durationSeconds) * 100))
                      : undefined;
                    const cardId = `library-continue-${index}`;
                    // Prefer backdrop (wide) over poster (portrait) for landscape cards
                    const displayImage = rw.backdropUrl || rw.imageUrl;
                    return (
                      <LibraryCard
                        key={`${item.type}-${item.id}-${index}`}
                        id={cardId}
                        title={item.title}
                        imageUrl={displayImage}
                        type={item.type}
                        onClick={() => handleOpenItem(item)}
                        onFocus={() => {
                          lastFocusedCardIdRef.current = cardId;
                          setFocusedItem(item);
                        }}
                        onKeyDown={(e) => handleCardKeyDown(e, "continue", index, continueWatching.length)}
                        variant="continue"
                        aspectRatio="landscape"
                        gridCell={true}
                        progress={progress}
                        progressText={getProgressText(item)}
                        disableAutoScroll={true}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* Solid scroll spacer block to solve the Webkit collapsed padding bug on Tizen Smart TVs */}
            <div className={styles.scrollSpacer} />
          </div>
        )}
      </div>
    </div>
  );
};
