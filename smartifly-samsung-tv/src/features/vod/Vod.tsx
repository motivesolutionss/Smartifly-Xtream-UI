import React, { useMemo, useState, useRef, useEffect, useCallback } from "react";
import { useVodContent } from "./hooks/useVodContent";
import { Focusable } from "../../components/tv/Focusable";
import { VirtualGrid } from "../../components/tv/VirtualGrid";
import { ErrorView } from "../../components/common/ErrorView";
import { EmptyState } from "../../components/common/EmptyState";
import { useFocus } from "../../providers/useFocus";
import { VodCard } from "./components/VodCard";
import VodDetails from "./VodDetails";
import type { AppMovie } from "../../types/appModels";
import { useNetworkStatus } from "../../hooks/useNetworkStatus";
import { TvKeyboard } from "../../components/ui/TvKeyboard";
import { useTvBack } from "../../hooks/useTvBack";
import { searchStorage } from "../../storage/searchStorage";
import { contentCategoryStorage } from "../../storage/contentCategoryStorage";
import styles from "./Vod.module.css";

const CATEGORY_ROW_HEIGHT = 66;
const GRID_ITEM_HEIGHT = 392;
const GRID_ITEM_WIDTH = 251;
const GRID_GAP = 24;
const GRID_COLUMNS_BROWSE = 5;
const GRID_COLUMNS_SEARCH = 4;
const GRID_ROW_STRIDE = GRID_ITEM_HEIGHT + GRID_GAP;
const POSTER_PRELOAD_LIMIT = 6;

const VodSkeleton: React.FC = () => {
  return (
    <div className={styles.skeletonGrid}>
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={`vod-skeleton-${i}`} className={styles.skeletonContainer}>
          <div className={`${styles.skeletonCard} ${styles.skeletonPulse}`} />
          <div className={`${styles.skeletonTitle} ${styles.skeletonPulse}`} />
        </div>
      ))}
    </div>
  );
};

const parseMovieTitle = (title: string) => {
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

export const Vod: React.FC = () => {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>(
    () => contentCategoryStorage.getVodLastCategoryId() ?? undefined
  );
  const [focusedCategoryId, setFocusedCategoryId] = useState<string | undefined>(
    () => contentCategoryStorage.getVodLastCategoryId() ?? undefined
  );
  const [selectedMovieId, setSelectedMovieId] = useState<string | null>(null);
  const [focusedMovieId, setFocusedMovieId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    setRecentSearches(searchStorage.getRecentSearches());
  }, []);

  const suggestions = useMemo(() => {
    const combined = [...recentSearches];
    const defaults = ["Action", "Sci-Fi", "Thriller", "Comedy", "Drama"];
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
    movies,
    isLoading,
    isFetchingMovies,
    isError,
    errorMessage,
    refetch,
  } = useVodContent(selectedCategoryId);

  const { focusedId, setFocus } = useFocus();
  
  useTvBack(() => {
    if (isSearching) {
      setIsSearching(false);
      setFocus("vod-search-input-wrapper");
    } else if (searchQuery) {
      setSearchQuery("");
      setFocus("vod-search-input-wrapper");
    }
  }, isSearching || Boolean(searchQuery));
  const { status: networkStatus } = useNetworkStatus();

  const activeCategoryName = useMemo(() => {
    const targetId = selectedCategoryId;
    if (!targetId) return categories[0]?.name ?? "Movies";
    return categories.find((c) => c.id === targetId)?.name ?? "Movies";
  }, [selectedCategoryId, categories]);

  const focusedMovie = useMemo(() => {
    return movies.find((m) => m.id === focusedMovieId);
  }, [movies, focusedMovieId]);

  const movieMeta = useMemo(() => {
    if (!focusedMovie) return null;
    return parseMovieTitle(focusedMovie.title);
  }, [focusedMovie]);

  const filteredMovies = useMemo(() => {
    if (!searchQuery) return movies;
    const lowerQuery = searchQuery.toLowerCase();
    return movies.filter((m) => m.title.toLowerCase().includes(lowerQuery));
  }, [movies, searchQuery]);

  const gridColumns = isSearching ? GRID_COLUMNS_SEARCH : GRID_COLUMNS_BROWSE;

  const sidebarFocusedRef = useRef(true);
  const lastClickedMovieIdRef = useRef<string | null>(null);
  const pendingGridFocusRef = useRef(false);
  const gridScrollByCategoryRef = useRef<Record<string, number>>({});

  const categoryOptions = useMemo(() => categories, [categories]);

  const activeCategoryKey = useMemo(
    () => `${selectedCategoryId ?? "__none__"}|${isSearching ? "search" : "browse"}`,
    [selectedCategoryId, isSearching]
  );

  const resolveGridFocusMovieId = useCallback(
    (categoryId: string | undefined) => {
      if (filteredMovies.length === 0) return null;

      if (focusedMovieId && filteredMovies.some((movie) => movie.id === focusedMovieId)) {
        return focusedMovieId;
      }

      const scrollKey = `${categoryId ?? "__none__"}|${isSearching ? "search" : "browse"}`;
      const scrollTop = gridScrollByCategoryRef.current[scrollKey] ?? 0;
      const firstVisibleRow = Math.max(0, Math.floor(scrollTop / GRID_ROW_STRIDE));
      const firstVisibleIndex = Math.min(
        filteredMovies.length - 1,
        firstVisibleRow * gridColumns
      );

      return filteredMovies[firstVisibleIndex]?.id ?? filteredMovies[0].id;
    },
    [filteredMovies, focusedMovieId, gridColumns, isSearching]
  );

  useEffect(() => {
    if (categories.length === 0) {
      setSelectedCategoryId(undefined);
      setFocusedCategoryId(undefined);
      return;
    }

    const savedCategoryId = contentCategoryStorage.getVodLastCategoryId();
    const hasSavedCategory = !!savedCategoryId && categories.some((cat) => cat.id === savedCategoryId);
    const hasSelectedCategory =
      !!selectedCategoryId && categories.some((cat) => cat.id === selectedCategoryId);

    const resolvedCategoryId =
      (hasSavedCategory ? savedCategoryId : undefined) ||
      (hasSelectedCategory ? selectedCategoryId : undefined) ||
      categories[0].id;

    if (resolvedCategoryId && selectedCategoryId !== resolvedCategoryId) {
      setSelectedCategoryId(resolvedCategoryId);
    }

    if (
      resolvedCategoryId &&
      (!focusedCategoryId || !categories.some((cat) => cat.id === focusedCategoryId))
    ) {
      setFocusedCategoryId(resolvedCategoryId);
    }

    if (resolvedCategoryId && savedCategoryId !== resolvedCategoryId) {
      contentCategoryStorage.setVodLastCategoryId(resolvedCategoryId);
    }
  }, [categories, focusedCategoryId, selectedCategoryId]);

  // ── Dynamic Resolution-Independent Viewport Measurements ───────────────────
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const [gridHeight, setGridHeight] = useState(window.innerHeight - 140);
  const [sidebarHeight, setSidebarHeight] = useState(800);

  useEffect(() => {
    if (!gridContainerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setGridHeight(Math.max(200, entry.contentRect.height));
      }
    });
    observer.observe(gridContainerRef.current);
    return () => observer.disconnect();
  }, [selectedMovieId, isSearching]);

  useEffect(() => {
    if (!categoryListRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setSidebarHeight(Math.max(300, entry.contentRect.height));
      }
    });
    observer.observe(categoryListRef.current);
    return () => observer.disconnect();
  }, [selectedMovieId, isSearching]);

  // Sync scroll position when category list mounts (e.g., coming back from keyboard)
  useEffect(() => {
    if (!categoryListRef.current || isSearching) return;
    categoryListRef.current.scrollTop = categoryScrollTop;
  }, [isSearching]);

  // ── Eagerly preload top 12 movie poster images to prevent visually jarring pops ──
  useEffect(() => {
    if (networkStatus !== "online") return;
    if (movies.length === 0) return;
    if (isSearching) return;

    const targets = movies
      .slice(0, POSTER_PRELOAD_LIMIT)
      .map((mv) => mv.posterUrl)
      .filter((url): url is string => Boolean(url));

    targets.forEach((url) => {
      const img = new Image();
      img.decoding = "async";
      img.src = url;
    });
  }, [movies, networkStatus, isSearching]);

  // ── Restore focus when returning from VodDetails ──────────────────────────
  useEffect(() => {
    if (selectedMovieId || filteredMovies.length === 0) return;

    const rememberedId = lastClickedMovieIdRef.current;
    if (!rememberedId) return;
    const targetId =
      rememberedId && filteredMovies.some((movie) => movie.id === rememberedId)
        ? rememberedId
        : resolveGridFocusMovieId(selectedCategoryId);

    if (!targetId) {
      lastClickedMovieIdRef.current = null;
      return;
    }

    sidebarFocusedRef.current = false;
    setFocusedMovieId(targetId);

    let secondFrame = 0;
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        setFocus(`card-vod-${targetId}`);
      });
    });

    lastClickedMovieIdRef.current = null;
    return () => {
      window.cancelAnimationFrame(firstFrame);
      if (secondFrame) window.cancelAnimationFrame(secondFrame);
    };
  }, [selectedMovieId, filteredMovies, selectedCategoryId, resolveGridFocusMovieId, setFocus]);

  // ── Trigger auto focus into grid when categories load after Enter click ──
  useEffect(() => {
    if (pendingGridFocusRef.current && filteredMovies.length > 0) {
      pendingGridFocusRef.current = false;
      const targetMovieId = resolveGridFocusMovieId(selectedCategoryId);
      if (!targetMovieId) return;

      sidebarFocusedRef.current = false;
      const frameId = window.requestAnimationFrame(() => {
        setFocus(`card-vod-${targetMovieId}`);
      });
      return () => window.cancelAnimationFrame(frameId);
    }
  }, [filteredMovies, selectedCategoryId, resolveGridFocusMovieId, setFocus]);

  // ── Category Sidebar Virtualization state & refs ────────────────────────────
  const [categoryScrollTop, setCategoryScrollTop] = useState(0);
  const categoryListRef = useRef<HTMLDivElement>(null);

  const handleCategoryListScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setCategoryScrollTop(e.currentTarget.scrollTop);
  }, []);

  // Scroll category list to keep active/focused category visible
  useEffect(() => {
    if (!categoryListRef.current || categoryOptions.length === 0) return;
    const focusedCatId = focusedId?.startsWith("vod-cat-")
      ? focusedId.replace("vod-cat-", "")
      : (focusedCategoryId || categoryOptions[0]?.id);
    if (!focusedCatId) return;
    const idx = categoryOptions.findIndex((c) => c.id === focusedCatId);
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
  }, [categoryOptions, focusedId, focusedCategoryId, isSearching]);

  // ── Initial Focus ───────────────────────────────────────────────────────────
  const hasInitializedFocusRef = useRef(false);
  useEffect(() => {
    if (categories.length === 0) return;
    if (hasInitializedFocusRef.current) return;
    hasInitializedFocusRef.current = true;

    const frameId = window.requestAnimationFrame(() => {
      const initialCategoryId = selectedCategoryId || categoryOptions[0]?.id;
      if (initialCategoryId) {
        setFocus(`vod-cat-${initialCategoryId}`);
      }
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [categories, categoryOptions, selectedCategoryId, setFocus]);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleCategoryFocus = useCallback(
    (categoryId: string | undefined) => {
      setFocusedCategoryId(categoryId);

      if (sidebarFocusedRef.current) return;
      sidebarFocusedRef.current = true;

      const targetId = selectedCategoryId || categoryOptions[0]?.id;
      if (categoryId && targetId && categoryId !== targetId) {
        window.requestAnimationFrame(() => {
          setFocus(`vod-cat-${targetId}`);
        });
      }
    },
    [categoryOptions, selectedCategoryId, setFocus]
  );

  const handleCategoryEnter = useCallback((categoryId: string | undefined) => {
    if (selectedCategoryId !== categoryId) {
      pendingGridFocusRef.current = true;
      setFocusedMovieId(null);
      setSelectedCategoryId(categoryId);
      setFocusedCategoryId(categoryId);
      contentCategoryStorage.setVodLastCategoryId(categoryId ?? null);
      return;
    }

    if (filteredMovies.length > 0) {
      sidebarFocusedRef.current = false;
      const targetMovieId = resolveGridFocusMovieId(categoryId);
      if (!targetMovieId) return;
      setFocus(`card-vod-${targetMovieId}`);
    }
  }, [selectedCategoryId, filteredMovies, resolveGridFocusMovieId, setFocus]);

  const handleCategoryKeyDown = useCallback(
    (e: React.KeyboardEvent, categoryId: string | undefined, categoryIndex: number) => {
      if (e.key === "ArrowUp") {
        if (categoryIndex === 0) {
          e.preventDefault();
          setFocus("vod-search-input-wrapper");
        }
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        
        if (selectedCategoryId !== categoryId) {
          pendingGridFocusRef.current = true;
          setSelectedCategoryId(categoryId);
          setFocusedCategoryId(categoryId);
          contentCategoryStorage.setVodLastCategoryId(categoryId ?? null);
        } else {
          if (filteredMovies.length > 0) {
            sidebarFocusedRef.current = false;
            const targetMovieId = resolveGridFocusMovieId(categoryId);
            if (!targetMovieId) return;
            setFocusedMovieId(targetMovieId);
            setFocus(`card-vod-${targetMovieId}`);
          }
        }
      }
    },
    [filteredMovies, selectedCategoryId, resolveGridFocusMovieId, setFocus]
  );

  const handleMovieFocus = useCallback((movieId: string) => {
    sidebarFocusedRef.current = false;
    setFocusedMovieId(movieId);
  }, []);

  const handleMovieClick = useCallback((movie: AppMovie) => {
    lastClickedMovieIdRef.current = movie.id;
    setSelectedMovieId(movie.id);
  }, []);



  const focusedGridIndex = useMemo(
    () => (focusedMovieId ? filteredMovies.findIndex((m) => m.id === focusedMovieId) : -1),
    [filteredMovies, focusedMovieId]
  );

  const initialGridScrollTop = gridScrollByCategoryRef.current[activeCategoryKey] ?? 0;

  if (selectedMovieId) {
    return <VodDetails movieId={selectedMovieId} onBack={() => setSelectedMovieId(null)} />;
  }

  if (isError) {
    return (
      <ErrorView
        message={errorMessage || "Unable to load movies. Please try again."}
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
            ? "You are currently offline. Some categories or movies might not be loadable."
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
                          setFocus("vod-search-input-wrapper");
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
                          } else if (filteredMovies.length > 0) {
                             e.preventDefault();
                             sidebarFocusedRef.current = false;
                             setFocus(`card-vod-${filteredMovies[0].id}`);
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
                    setFocus("vod-search-input-wrapper");
                  }
                } else if (e.key === "ArrowRight") {
                  const isRightEdge =
                    columnIndex === 5 ||
                    (rowIndex === 6 && columnIndex === 2) ||
                    (rowIndex === 7 && columnIndex === 4);

                  if (isRightEdge && filteredMovies.length > 0) {
                    e.preventDefault();
                    sidebarFocusedRef.current = false;
                    setFocus(`card-vod-${filteredMovies[0].id}`);
                  }
                }
              }}
              onSubmit={(val) => {
                setIsSearching(false);
                searchStorage.saveRecentSearch(val);
                setRecentSearches(searchStorage.getRecentSearches());
                if (filteredMovies.length > 0) {
                  sidebarFocusedRef.current = false;
                  setFocus(`card-vod-${filteredMovies[0].id}`);
                } else {
                  setFocus("vod-search-input-wrapper");
                }
              }}
              onBackClick={() => {
                setIsSearching(false);
                setSearchQuery("");
                setFocus("vod-search-input-wrapper");
              }}
            />
          </div>
        ) : (
          <>
            <div className={styles.sidebarHeader}>
              <h2 className={styles.sidebarTitle}>Categories</h2>
              <span className={styles.sidebarMeta}>{categories.length} sections</span>
            </div>

            <div
              ref={categoryListRef}
              className={styles.sidebarScroll}
              onScroll={handleCategoryListScroll}
            >
              {categories.length === 0 && isLoading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <div
                    key={`vod-category-skeleton-${i}`}
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
                    .slice(
                      Math.max(0, Math.floor(categoryScrollTop / CATEGORY_ROW_HEIGHT) - 3),
                      Math.min(categoryOptions.length, Math.ceil((categoryScrollTop + sidebarHeight) / CATEGORY_ROW_HEIGHT) + 3)
                    )
                    .map((category, index) => {
                      const absIndex =
                        Math.max(0, Math.floor(categoryScrollTop / CATEGORY_ROW_HEIGHT) - 3) + index;
                      const categoryId = category.id;

                      return (
                        <div
                          key={category.id}
                          style={{
                            position: "absolute",
                            top: absIndex * CATEGORY_ROW_HEIGHT,
                            left: 0,
                            right: 0,
                            height: 64,
                            display: "flex",
                            alignItems: "center",
                            zIndex: focusedId === `vod-cat-${category.id}` ? 10 : (selectedCategoryId === categoryId ? 2 : 1),
                          }}
                        >
                          <Focusable
                            id={`vod-cat-${category.id}`}
                            variant="pill"
                            disableFocusEffects
                            className={`${styles.categoryItem} ${
                              selectedCategoryId === categoryId ? styles.selected : ""
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
              {focusedMovie && movieMeta ? (
                <>
                  <span className={styles.subtitleMovieName}>{movieMeta.cleanTitle}</span>
                  {movieMeta.year && <span className={styles.badgeYear}>{movieMeta.year}</span>}
                  {movieMeta.resolution && (
                    <span className={styles.badgeQuality}>{movieMeta.resolution}</span>
                  )}
                </>
              ) : (
                <span className={styles.subtitlePlaceholder}>&nbsp;</span>
              )}
            </div>
          </div>
          <div className={styles.headerRight}>
            <Focusable
              id="vod-search-input-wrapper"
              variant="pill"
              className={styles.searchFocusable}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  if (isSearching && suggestions.length > 0) {
                    e.preventDefault();
                    setFocus("search-sug-0");
                  } else if (filteredMovies.length > 0) {
                    e.preventDefault();
                    setFocus(`card-vod-${filteredMovies[0].id}`);
                  }
                } else if (e.key === "ArrowLeft") {
                  e.preventDefault();
                  const targetCategoryId = selectedCategoryId || categoryOptions[0]?.id;
                  if (targetCategoryId) {
                    setFocus(`vod-cat-${targetCategoryId}`);
                  }
                }
              }}
              onEnter={() => {
                setIsSearching(true);
                sidebarFocusedRef.current = false;
                setFocusedMovieId(null);
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
                setFocusedMovieId(null);
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
                {searchQuery || "Search movies..."}
              </div>
            </Focusable>
          </div>
        </header>

        <div className={styles.gridContainer} ref={gridContainerRef}>
          {isLoading || isFetchingMovies ? (
            <VodSkeleton />
          ) : filteredMovies.length === 0 ? (
            <EmptyState
              title="No movies found"
              message={searchQuery ? "No movies match your search." : "This category does not contain playable movies."}
            />
          ) : (
            <VirtualGrid
              key={`vod-grid-${selectedCategoryId ?? "none"}-${isSearching ? "search" : "browse"}`}
              items={filteredMovies}
              itemHeight={GRID_ITEM_HEIGHT}
              itemWidth={GRID_ITEM_WIDTH}
              columns={gridColumns}
              gap={GRID_GAP}
              containerHeight={gridHeight}
              initialScrollTop={initialGridScrollTop}
              onScrollTopChange={(nextTop) => {
                gridScrollByCategoryRef.current[activeCategoryKey] = nextTop;
              }}
              focusedIndex={focusedId?.startsWith("card-vod-") && focusedGridIndex >= 0 ? focusedGridIndex : undefined}
              renderItem={(movie, index) => {
                return (
                  <VodCard
                    key={movie.id}
                    movie={movie}
                    index={index}
                    prevMovieId={index > 0 ? filteredMovies[index - 1]?.id : undefined}
                    nextRowMovieId={index + gridColumns < filteredMovies.length ? filteredMovies[index + gridColumns]?.id : undefined}
                    prevRowMovieId={index - gridColumns >= 0 ? filteredMovies[index - gridColumns]?.id : undefined}
                    totalMovies={filteredMovies.length}
                    lastMovieId={filteredMovies[filteredMovies.length - 1]?.id}
                    selectedCategoryFocusId={selectedCategoryId || categoryOptions[0]?.id}
                    onFocus={handleMovieFocus}
                    onClick={handleMovieClick}
                    columns={gridColumns}
                    isSearching={isSearching}
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
