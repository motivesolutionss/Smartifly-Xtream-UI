import React, {
  memo,
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { usePlayerStore } from "../../store/playerStore";
import { useFocusActions } from "../../providers/useFocus";
import { HeroBanner, type HeroItem } from "../../components/common/HeroBanner";
import { TopBar } from "../../components/common/TopBar";
import { ErrorView } from "../../components/common/ErrorView";
import { HeroSkeleton, CardSkeleton } from "../../components/ui/Skeleton";
import VodDetails from "../vod/VodDetails";
import { SeriesDetails } from "../series/SeriesDetails";
import type {
  AppMovie,
  AppChannel,
  AppMovieDetails,
  AppSeriesDetails,
} from "../../types/appModels";
import type { HomeRail, HomeRailItem } from "./homeTypes";
import { recentlyWatchedStorage } from "../../storage/recentlyWatchedStorage";
import { getResumePositionSeconds } from "../../utils/resumePosition";
import {
  startBudgetedImagePreloadBatch,
  startBudgetedImagePreloadBatchInOrder,
} from "../../hooks/useBudgetedImagePreload";
import { useHomeSnapshot } from "./useHomeSnapshot";
import { services } from "../../services";
import { createPerfTrace } from "../../utils/perfTrace";
import { perfMetrics } from "../../utils/perfMetrics";
import { HomeRailSection } from "./components/HomeRailSection";
import { resolveHomePerformanceTier } from "./homeAdaptivePolicy";
import {
  getHomeAboveFoldImagePlan,
  getHomeRuntimeImagePlan,
} from "./homePreloadPolicy";
import {
  getActiveRailItemCount,
  getFocusedMountedRailCount,
  getInitialImageRailCount,
  getInitialRailItemCount,
  getInitialMountedRailCount,
  getProgressiveMountedRailCount,
} from "./homeRenderPolicy";
import {
  getHomeHeroDetailEnableDelayMs,
} from "./homeStartupPolicy";
import { AppError } from "../../types/errors";
import { logger } from "../../utils/logger";
import { markStartupMarker } from "../../utils/startupMarkers";
import styles from "./Home.module.css";

const EMPTY_HERO_ITEMS: HeroItem[] = [];
const EMPTY_RAILS: HomeRail[] = [];
const HOME_ACTIVE_IMAGE_WINDOW_BEFORE = 1;
const HOME_ACTIVE_IMAGE_WINDOW_AFTER = 2;
const HERO_DETAIL_TIMEOUT_MS = 3500;
const HOME_RAIL_PROGRESSIVE_MOUNT_DELAY_MS = 140;

type HomeScreenId =
  | "HOME"
  | "LIVE"
  | "VOD"
  | "SERIES"
  | "LIBRARY"
  | "SEARCH"
  | "SETTINGS";

type HomeProps = {
  onNavigate: (id: HomeScreenId) => void;
  setFocus: (id: string | null) => void;
};

export const Home: React.FC<HomeProps> = memo(function Home({
  onNavigate,
  setFocus,
}) {
  const homePerformanceTierRef = useRef(resolveHomePerformanceTier());
  const homePerformanceTier = homePerformanceTierRef.current;
  const { activePlaybackItem, setActivePlaybackItem } = usePlayerStore();
  const { getFocusedId, subscribe } = useFocusActions();
  const [selectedMovieId, setSelectedMovieId] = useState<string | null>(null);
  const [selectedSeriesId, setSelectedSeriesId] = useState<string | null>(null);
  const [selectedCategoryName, setSelectedCategoryName] = useState<string | null>(null);
  const [isHeroDetailEnabled, setIsHeroDetailEnabled] = useState(false);
  const [heroVisualReadyAt, setHeroVisualReadyAt] = useState<number | null>(null);
  const [activeRailIndex, setActiveRailIndex] = useState(0);
  const [activeRailItemIndex, setActiveRailItemIndex] = useState(0);
  const [mountedRailCount, setMountedRailCount] = useState(() =>
    getInitialMountedRailCount(0, homePerformanceTier)
  );

  const scrollRef = useRef<HTMLDivElement>(null);
  const recentlyWatchedRevision = React.useSyncExternalStore(
    recentlyWatchedStorage.subscribe,
    recentlyWatchedStorage.getRevision,
    () => 0
  );
  const continueWatching = useMemo(
    () => recentlyWatchedStorage.getContinueWatching(),
    [recentlyWatchedRevision]
  );
  const { snapshot, isBooting, isError, refresh } = useHomeSnapshot(continueWatching);
  const heroItems = snapshot?.heroItems ?? EMPTY_HERO_ITEMS;
  const rails = snapshot?.rails ?? EMPTY_RAILS;
  const mountedRails = useMemo(
    () => rails.slice(0, mountedRailCount),
    [mountedRailCount, rails]
  );
  const activeHero = heroItems[0];
  const homeScreenTraceRef = useRef(
    createPerfTrace("home_screen", {
      screen: "home",
    })
  );
  const hasLoggedHomeDataReadyRef = useRef(false);
  const hasLoggedHomeContentReadyRef = useRef(false);
  const heroDetailTraceRef = useRef<ReturnType<typeof createPerfTrace> | null>(null);
  const playbackStartRevisionRef = useRef<number | null>(null);
  const playbackStartTypeRef = useRef<"live" | "vod" | "series" | null>(null);
  const lastPlaybackDrivenRefreshAtRef = useRef(0);
  const lastHomeFocusedIdRef = useRef("hero-play");
  const focusedIdRef = useRef<string | null>(getFocusedId());
  const wasInDetailsRef = useRef(false);
  const hasClaimedInitialHomeFocusRef = useRef(false);
  const hasMarkedFocusableRowRef = useRef(false);

  const scrollHomeToTop = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, []);

  const handleFocusCapture = useCallback(
    (event: React.FocusEvent<HTMLDivElement>) => {
      if (selectedMovieId || selectedSeriesId) return;

      const target = event.target as HTMLElement | null;
      const targetId = target?.id ?? "";
      if (!targetId) return;

      if (
        !targetId.startsWith("nav-") &&
        !targetId.startsWith("epg-") &&
        !targetId.startsWith("player-")
      ) {
        lastHomeFocusedIdRef.current = targetId;
      }

      if (targetId.startsWith("top-")) {
        scrollHomeToTop();
      }
    },
    [selectedMovieId, selectedSeriesId]
  );

  useEffect(() => {
    const nextInitialCount = getInitialMountedRailCount(rails.length, homePerformanceTier);
    setMountedRailCount((currentCount) =>
      currentCount === nextInitialCount ? currentCount : nextInitialCount
    );
    setActiveRailIndex((currentIndex) =>
      rails.length === 0 ? 0 : Math.min(currentIndex, rails.length - 1)
    );
  }, [homePerformanceTier, rails.length]);

  useEffect(() => {
    if (rails.length <= mountedRailCount) {
      return;
    }

    const timerId = window.setTimeout(() => {
      startTransition(() => {
        setMountedRailCount((currentCount) =>
          getProgressiveMountedRailCount(currentCount, rails.length, homePerformanceTier)
        );
      });
    }, HOME_RAIL_PROGRESSIVE_MOUNT_DELAY_MS);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [homePerformanceTier, mountedRailCount, rails.length]);

  useEffect(() => {
    perfMetrics.increment("home_screen_render_count");
  });

  useEffect(() => {
    return () => {
      if (!homeScreenTraceRef.current.isClosed()) {
        homeScreenTraceRef.current.end({
          status: "unmounted",
          metricName: "home_screen_total_ms",
        });
      }
      if (heroDetailTraceRef.current && !heroDetailTraceRef.current.isClosed()) {
        heroDetailTraceRef.current.end({
          status: "cancelled",
          metricName: "home_hero_detail_total_ms",
        });
      }
    };
  }, []);

  useEffect(() => {
    if (hasLoggedHomeDataReadyRef.current || !snapshot) return;

    hasLoggedHomeDataReadyRef.current = true;
    homeScreenTraceRef.current.mark("data_ready", {
      metricName: "home_screen_data_ready_ms",
      slowAboveMs: 650,
      data: {
        heroCount: snapshot.heroItems.length,
        railCount: snapshot.rails.length,
      },
    });
  }, [snapshot]);

  useEffect(() => {
    if (hasLoggedHomeContentReadyRef.current || isBooting || !snapshot) return;
    if (snapshot.heroItems.length === 0 && snapshot.rails.length === 0) return;

    hasLoggedHomeContentReadyRef.current = true;
    const frameId = window.requestAnimationFrame(() => {
      homeScreenTraceRef.current.end({
        status: "content_ready",
        metricName: "home_screen_total_ms",
        slowAboveMs: 900,
        data: {
          heroCount: snapshot.heroItems.length,
          railCount: snapshot.rails.length,
        },
      });
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [isBooting, snapshot]);

  useEffect(() => {
    setHeroVisualReadyAt(null);
  }, [activeHero?.id]);

  useEffect(() => {
    setIsHeroDetailEnabled(false);

    if (isBooting || !activeHero || activeHero.type === "live") {
      return;
    }

    const timerId = window.setTimeout(() => {
      setIsHeroDetailEnabled(true);
    }, getHomeHeroDetailEnableDelayMs(homePerformanceTier, heroVisualReadyAt !== null));

    return () => {
      window.clearTimeout(timerId);
    };
  }, [
    activeHero?.id,
    activeHero?.type,
    heroVisualReadyAt,
    homePerformanceTier,
    isBooting,
  ]);

  const { data: activeHeroDetail } = useQuery<AppMovieDetails | AppSeriesDetails | null>({
    queryKey: ["home-active-hero-detail", activeHero?.type, activeHero?.id],
    enabled: Boolean(activeHero && activeHero.type !== "live" && isHeroDetailEnabled),
    queryFn: async ({ signal }) => {
      if (!activeHero || activeHero.type === "live") return null;

      try {
        if (activeHero.type === "vod") {
          return await services.content.getVodInfo(activeHero.id, {
            requestSource: "home_hero_detail",
            signal,
            timeoutMs: HERO_DETAIL_TIMEOUT_MS,
          });
        }

        return await services.content.getSeriesInfo(activeHero.id, {
          requestSource: "home_hero_detail",
          signal,
          timeoutMs: HERO_DETAIL_TIMEOUT_MS,
        });
      } catch (error) {
        if (signal.aborted) {
          return null;
        }

        if (error instanceof AppError && error.code === "TIMEOUT") {
          return null;
        }

        if (
          error &&
          typeof error === "object" &&
          "name" in error &&
          String(error.name) === "AbortError"
        ) {
          return null;
        }

        throw error;
      }
    },
    staleTime: 6 * 60 * 60 * 1000,
    gcTime: 12 * 60 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (!activeHero || activeHero.type === "live" || !isHeroDetailEnabled) {
      if (heroDetailTraceRef.current && !heroDetailTraceRef.current.isClosed()) {
        heroDetailTraceRef.current.end({
          status: "cancelled",
          metricName: "home_hero_detail_total_ms",
        });
      }
      heroDetailTraceRef.current = null;
      return;
    }

    if (activeHeroDetail) {
      if (heroDetailTraceRef.current && !heroDetailTraceRef.current.isClosed()) {
        heroDetailTraceRef.current.end({
          status: "ready",
          metricName: "home_hero_detail_total_ms",
          slowAboveMs: 500,
          data: {
            heroId: activeHero.id,
            heroType: activeHero.type,
          },
        });
      }
      return;
    }

    if (heroDetailTraceRef.current && !heroDetailTraceRef.current.isClosed()) {
      heroDetailTraceRef.current.end({
        status: "replaced",
        metricName: "home_hero_detail_total_ms",
      });
    }

    heroDetailTraceRef.current = createPerfTrace("home_hero_detail", {
      heroId: activeHero.id,
      heroType: activeHero.type,
    });
  }, [activeHero, activeHeroDetail, isHeroDetailEnabled]);

  const hydratedHeroItems = useMemo(() => {
    if (!activeHero || !activeHeroDetail) return heroItems;

    const [firstHero, ...restHeroes] = heroItems;
    if (!firstHero) return heroItems;

    const hydratedBackdropUrlCandidates = [
      activeHeroDetail.backdropUrl,
      activeHeroDetail.posterUrl,
      firstHero.backdropUrl,
    ].filter((url): url is string => Boolean(url));

    const mergedFirstHero: HeroItem = {
      ...firstHero,
      backdropUrl: hydratedBackdropUrlCandidates[0] || firstHero.backdropUrl,
      description: activeHeroDetail.description || firstHero.description,
      rating: activeHeroDetail.rating || firstHero.rating,
      year:
        ("year" in activeHeroDetail && activeHeroDetail.year) ||
        ("releaseDate" in activeHeroDetail && activeHeroDetail.releaseDate) ||
        firstHero.year,
      duration:
        ("duration" in activeHeroDetail && activeHeroDetail.duration) ||
        firstHero.duration,
      genre: activeHeroDetail.genre || firstHero.genre,
    };

    return [mergedFirstHero, ...restHeroes];
  }, [activeHero, activeHeroDetail, heroItems]);

  useEffect(() => {
    focusedIdRef.current = getFocusedId();

    return subscribe(() => {
      const nextFocusedId = getFocusedId();
      focusedIdRef.current = nextFocusedId;

      if (
        nextFocusedId === "nav-profile" ||
        nextFocusedId === "nav-HOME" ||
        nextFocusedId === "hero-play" ||
        nextFocusedId === "top-search" ||
        nextFocusedId === "top-settings"
      ) {
        logger.debug("home_focus_state", {
          focusedId: nextFocusedId,
          lastHomeFocusedId: lastHomeFocusedIdRef.current,
          heroCount: hydratedHeroItems.length,
          railCount: rails.length,
          isBooting,
          isHeroDetailEnabled,
        });
      }
    });
  }, [
    getFocusedId,
    hydratedHeroItems.length,
    isBooting,
    isHeroDetailEnabled,
    rails.length,
    subscribe,
  ]);

  useEffect(() => {
    if (isBooting || rails.length === 0) {
      return;
    }

    if (selectedMovieId || selectedSeriesId) {
      return;
    }

    const plan = getHomeAboveFoldImagePlan(rails, homePerformanceTier);
    const criticalBatch = startBudgetedImagePreloadBatchInOrder(plan.critical, {
      traceTag: "home_above_fold_critical",
    });
    let nearBatch: ReturnType<typeof startBudgetedImagePreloadBatchInOrder> | null = null;
    let cancelWarmBatch = () => {};
    let cancelled = false;

    void criticalBatch.done
      .then(() => {
        if (cancelled) {
          return;
        }

        nearBatch = startBudgetedImagePreloadBatchInOrder(plan.near, {
          traceTag: "home_above_fold_near",
        });

        return nearBatch.done;
      })
      .then(() => {
        if (cancelled) {
          return;
        }

        cancelWarmBatch = startBudgetedImagePreloadBatch(plan.warm, {
          preserveOrder: true,
          traceTag: "home_above_fold_warm",
        });
      });

    return () => {
      cancelled = true;
      criticalBatch.cancel();
      nearBatch?.cancel();
      cancelWarmBatch();
    };
  }, [
    homePerformanceTier,
    isBooting,
    rails,
    selectedMovieId,
    selectedSeriesId,
  ]);

  useEffect(() => {
    if (activePlaybackItem) {
      if (playbackStartRevisionRef.current === null) {
        playbackStartRevisionRef.current = recentlyWatchedRevision;
        playbackStartTypeRef.current = activePlaybackItem.contentType;
      }
      return;
    }

    if (playbackStartRevisionRef.current === null) {
      return;
    }

    const revisionChanged = recentlyWatchedRevision > playbackStartRevisionRef.current;
    const shouldRefreshFromPlayback =
      revisionChanged && playbackStartTypeRef.current !== "live";

    playbackStartRevisionRef.current = null;
    playbackStartTypeRef.current = null;

    if (!shouldRefreshFromPlayback) {
      return;
    }

    const now = Date.now();
    if (now - lastPlaybackDrivenRefreshAtRef.current < 45_000) {
      return;
    }

    lastPlaybackDrivenRefreshAtRef.current = now;
    void refresh();
  }, [activePlaybackItem, recentlyWatchedRevision, refresh]);

  useEffect(() => {
    const inDetails = Boolean(selectedMovieId || selectedSeriesId);

    if (inDetails) {
      wasInDetailsRef.current = true;
      return;
    }

    if (!wasInDetailsRef.current) {
      return;
    }

    wasInDetailsRef.current = false;
    const targetFocusId = lastHomeFocusedIdRef.current || "hero-play";

    let secondFrame = 0;
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        setFocus(targetFocusId);
      });
    });

    return () => {
      window.cancelAnimationFrame(firstFrame);
      if (secondFrame) window.cancelAnimationFrame(secondFrame);
    };
  }, [selectedMovieId, selectedSeriesId, setFocus]);

  useEffect(() => {
    if (isBooting) return;
    if (selectedMovieId || selectedSeriesId) return;
    if (hydratedHeroItems.length === 0) return;

    const currentFocusedId = focusedIdRef.current ?? "";
    const shouldClaimInitialFocus =
      !hasClaimedInitialHomeFocusRef.current &&
      (currentFocusedId === "" ||
        currentFocusedId.startsWith("nav-") ||
        currentFocusedId.startsWith("top-"));

    if (!shouldClaimInitialFocus) {
      if (
        currentFocusedId.startsWith("hero-") ||
        currentFocusedId.startsWith("card-")
      ) {
        hasClaimedInitialHomeFocusRef.current = true;
      }
      return;
    }

    hasClaimedInitialHomeFocusRef.current = true;
    const targetFocusId = lastHomeFocusedIdRef.current || "hero-play";

    let frameTwo = 0;
    const frameOne = window.requestAnimationFrame(() => {
      frameTwo = window.requestAnimationFrame(() => {
        setFocus(targetFocusId);
      });
    });

    return () => {
      window.cancelAnimationFrame(frameOne);
      if (frameTwo) {
        window.cancelAnimationFrame(frameTwo);
      }
    };
  }, [
    hydratedHeroItems.length,
    isBooting,
    selectedMovieId,
    selectedSeriesId,
    setFocus,
  ]);

  useEffect(() => {
    if (hasMarkedFocusableRowRef.current) return;
    if (isBooting) return;
    if (selectedMovieId || selectedSeriesId) return;
    if (hydratedHeroItems.length === 0 && mountedRails.length === 0) return;

    hasMarkedFocusableRowRef.current = true;
    const frameId = window.requestAnimationFrame(() => {
      markStartupMarker("home_first_focusable_row_rendered", {
        heroCount: hydratedHeroItems.length,
        mountedRailCount: mountedRails.length,
      });
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [
    hydratedHeroItems.length,
    isBooting,
    mountedRails.length,
    selectedMovieId,
    selectedSeriesId,
  ]);

  const homeRailImageWindow = useMemo(() => {
    const initialImageRailCount = getInitialImageRailCount(homePerformanceTier);

    if (rails.length === 0) {
      return {
        startIndex: 0,
        endIndex: initialImageRailCount,
      };
    }

    const startIndex = Math.max(0, activeRailIndex - HOME_ACTIVE_IMAGE_WINDOW_BEFORE);
    const endIndex = Math.min(
      rails.length,
      Math.max(initialImageRailCount, activeRailIndex + HOME_ACTIVE_IMAGE_WINDOW_AFTER + 1)
    );

    return { startIndex, endIndex };
  }, [activeRailIndex, homePerformanceTier, rails.length]);

  const handleHeroPlay = useCallback((item: HeroItem) => {
    const rawId = item.data.id;

    if (item.type === "live") {
      const data = item.data as AppChannel;
      // For live, "Play" is immediate playback intent, so we can seed a live history row.
      recentlyWatchedStorage.addEntry({
        id: data.id,
        type: "live",
        title: data.title,
        imageUrl: data.logoUrl,
        backdropUrl: item.backdropUrl,
      });
      setActivePlaybackItem({
        id: data.id,
        title: data.title,
        logoUrl: data.logoUrl,
        contentType: "live",
      });
      return;
    }

    if (item.type === "vod") {
      const data = item.data as AppMovie;
      const resumeEntry = recentlyWatchedStorage
        .getItems()
        .find((entry) => entry.id === data.id && entry.type === "vod");
      const resumePositionSeconds = getResumePositionSeconds(
        resumeEntry?.positionSeconds,
        resumeEntry?.durationSeconds
      );

      setActivePlaybackItem({
        id: data.id,
        title: data.title,
        logoUrl: data.posterUrl,
        contentType: "vod",
        extension: data.extension,
        resumePositionSeconds,
        resumeDurationSeconds: resumeEntry?.durationSeconds,
      });
      return;
    }

    setSelectedSeriesId(rawId);
  }, [setActivePlaybackItem]);

  const handleHeroInfo = useCallback((item: HeroItem) => {
    setSelectedCategoryName("Featured");
    if (item.type === "vod") {
      setSelectedMovieId(item.data.id);
      return;
    }
    if (item.type === "series") {
      setSelectedSeriesId(item.data.id);
    }
  }, []);

  const handleHeroFocus = useCallback(() => {
    window.requestAnimationFrame(scrollHomeToTop);
  }, [scrollHomeToTop]);

  const handleHeroVisualReady = useCallback(() => {
    setHeroVisualReadyAt((currentValue) => currentValue ?? performance.now());
  }, []);

  const handleCardClick = useCallback((item: HomeRailItem, categoryName?: string) => {
    const imageUrl = item.imageUrl || item.backdropUrl;

    const backdropUrl = item.backdropUrl;

    if (item.type === "live") {
      // For live cards, selecting the card starts playback directly.
      recentlyWatchedStorage.addEntry({
        id: item.id,
        type: "live",
        title: item.title,
        imageUrl,
        backdropUrl,
      });
      setActivePlaybackItem({
        id: item.id,
        title: item.title,
        logoUrl: imageUrl,
        contentType: "live",
      });
    } else if (item.type === "vod") {
      setSelectedMovieId(item.id);
      setSelectedCategoryName(categoryName || null);
    } else {
      setSelectedSeriesId(item.id);
      setSelectedCategoryName(categoryName || null);
    }
  }, [setActivePlaybackItem]);

  const handleRailCardFocus = useCallback(
    (railIndex: number, itemIndex: number) => {
      setActiveRailIndex(railIndex);
      setActiveRailItemIndex(itemIndex);
      startTransition(() => {
        setMountedRailCount((currentCount) =>
          getFocusedMountedRailCount(currentCount, railIndex, rails.length, homePerformanceTier)
        );
      });

      const focusPlan = getHomeRuntimeImagePlan(
        rails,
        railIndex,
        itemIndex,
        homePerformanceTier
      );
      startBudgetedImagePreloadBatch(focusPlan.critical, {
        preserveOrder: true,
        traceTag: "home_row_focus_critical",
      });
      startBudgetedImagePreloadBatch(focusPlan.near, {
        preserveOrder: true,
        traceTag: "home_row_focus_near",
      });
      startBudgetedImagePreloadBatch(focusPlan.warm, {
        preserveOrder: true,
        traceTag: "home_row_focus_warm",
      });
    },
    [homePerformanceTier, rails]
  );

  const heroStyle = {
    marginBottom: "56px",
  };

  let content: React.ReactNode;

  if (selectedMovieId) {
    content = (
      <VodDetails
        movieId={selectedMovieId}
        categoryName={selectedCategoryName || undefined}
        onBack={() => {
          setSelectedMovieId(null);
          setSelectedCategoryName(null);
        }}
      />
    );
  } else if (selectedSeriesId) {
    content = (
      <SeriesDetails
        seriesId={selectedSeriesId}
        categoryName={selectedCategoryName || undefined}
        onBack={() => {
          setSelectedSeriesId(null);
          setSelectedCategoryName(null);
        }}
      />
    );
  } else if (isBooting) {
    content = (
      <div className={styles.container}>
        <div className={styles.scrollContent}>
          <HeroSkeleton />
          <div className={styles.rows}>
            <div className={styles.row}>
              <div
                style={{
                  height: "32px",
                  width: "300px",
                  background: "rgba(255,255,255,0.05)",
                  marginBottom: "24px",
                  borderRadius: "4px",
                }}
              />
              <div className={styles.rail}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <CardSkeleton key={i} aspectRatio="landscape" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  } else if (isError && !snapshot) {
    content = (
      <ErrorView
        message="Unable to load home content right now."
        onRetry={() => {
          void refresh();
        }}
        showBackToLogin
      />
    );
  } else {
    const initialImageRailCount = getInitialImageRailCount(homePerformanceTier);

    content = (
      <div className={styles.container} onFocusCapture={handleFocusCapture}>
        <div className={styles.wallpaper} />
        <div className={styles.atmosphere} />

        <TopBar onNavigate={onNavigate} />

        <div ref={scrollRef} className={styles.scrollContent}>
          {hydratedHeroItems.length > 0 && (
            <div style={heroStyle}>
              <HeroBanner
                items={hydratedHeroItems}
                onPlay={handleHeroPlay}
                onInfo={handleHeroInfo}
                onFocus={handleHeroFocus}
                onVisualReady={handleHeroVisualReady}
              />
            </div>
          )}

          <div className={styles.rows}>
            {mountedRails.map((rail, railIndex) => (
              <HomeRailSection
                key={rail.id}
                railIndex={railIndex}
                rail={rail}
                scrollContainerRef={scrollRef}
                visibleItemCount={
                  railIndex === activeRailIndex
                    ? getActiveRailItemCount(
                        rail.items.length,
                        activeRailItemIndex,
                        homePerformanceTier
                      )
                    : getInitialRailItemCount(rail.items.length, homePerformanceTier)
                }
                shouldLoadImages={
                  rails.length <= initialImageRailCount ||
                  (railIndex >= homeRailImageWindow.startIndex &&
                    railIndex < homeRailImageWindow.endIndex)
                }
                onCardClick={handleCardClick}
                onCardFocus={handleRailCardFocus}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return <>{content}</>;
});
