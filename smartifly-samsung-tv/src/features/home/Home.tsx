import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { usePlayerStore } from "../../store/playerStore";
import { HeroBanner, type HeroItem } from "../../components/common/HeroBanner";
import { TopBar } from "../../components/common/TopBar";
import { ErrorView } from "../../components/common/ErrorView";
import { HeroSkeleton, CardSkeleton } from "../../components/ui/Skeleton";
import VodDetails from "../vod/VodDetails";
import { SeriesDetails } from "../series/SeriesDetails";
import { useDashboard } from "../dashboard/hooks/useDashboard";
import type {
  AppMovie,
  AppChannel,
  AppMovieDetails,
  AppSeriesDetails,
} from "../../types/appModels";
import type { HomeRail, HomeRailItem } from "./homeTypes";
import { recentlyWatchedStorage } from "../../storage/recentlyWatchedStorage";
import { getResumePositionSeconds } from "../../utils/resumePosition";
import { useBudgetedImagePreload } from "../../hooks/useBudgetedImagePreload";
import { useHomeSnapshot } from "./useHomeSnapshot";
import { services } from "../../services";
import { imageFailureMemory } from "../../utils/imageFailureMemory";
import { HomeRailSection } from "./components/HomeRailSection";
import styles from "./Home.module.css";

const EMPTY_HERO_ITEMS: HeroItem[] = [];
const EMPTY_RAILS: HomeRail[] = [];
const INITIAL_HOME_IMAGE_RAIL_COUNT = 3;
const HOME_ACTIVE_IMAGE_WINDOW_BEFORE = 1;
const HOME_ACTIVE_IMAGE_WINDOW_AFTER = 2;

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
  const { activePlaybackItem, setActivePlaybackItem } = usePlayerStore();
  const { continueWatching } = useDashboard();
  const { snapshot, isBooting, isError, refresh } = useHomeSnapshot(continueWatching);
  const [selectedMovieId, setSelectedMovieId] = useState<string | null>(null);
  const [selectedSeriesId, setSelectedSeriesId] = useState<string | null>(null);
  const [selectedCategoryName, setSelectedCategoryName] = useState<string | null>(null);
  const [isHeroDetailEnabled, setIsHeroDetailEnabled] = useState(false);
  const [activeRailIndex, setActiveRailIndex] = useState(0);

  const scrollRef = useRef<HTMLDivElement>(null);
  const recentlyWatchedRevision = useSyncExternalStore(
    recentlyWatchedStorage.subscribe,
    recentlyWatchedStorage.getRevision,
    () => 0
  );
  const imageFailureRevision = useSyncExternalStore(
    imageFailureMemory.subscribe,
    imageFailureMemory.getRevision,
    () => 0
  );
  const heroItems = snapshot?.heroItems ?? EMPTY_HERO_ITEMS;
  const rails = snapshot?.rails ?? EMPTY_RAILS;
  const activeHero = heroItems[0];
  const playbackStartRevisionRef = useRef<number | null>(null);
  const playbackStartTypeRef = useRef<"live" | "vod" | "series" | null>(null);
  const lastPlaybackDrivenRefreshAtRef = useRef(0);
  const lastHomeFocusedIdRef = useRef("hero-play");
  const wasInDetailsRef = useRef(false);

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
    setIsHeroDetailEnabled(false);

    if (!activeHero || activeHero.type === "live") {
      return;
    }

    const timerId = window.setTimeout(() => {
      setIsHeroDetailEnabled(true);
    }, 450);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [activeHero?.id, activeHero?.type]);

  const { data: activeHeroDetail } = useQuery<AppMovieDetails | AppSeriesDetails | null>({
    queryKey: ["home-active-hero-detail", activeHero?.type, activeHero?.id],
    enabled: Boolean(activeHero && activeHero.type !== "live" && isHeroDetailEnabled),
    queryFn: async () => {
      if (!activeHero || activeHero.type === "live") return null;
      if (activeHero.type === "vod") {
        return services.content.getVodInfo(activeHero.id);
      }
      return services.content.getSeriesInfo(activeHero.id);
    },
    staleTime: 6 * 60 * 60 * 1000,
    gcTime: 12 * 60 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const hydratedHeroItems = useMemo(() => {
    if (!activeHero || !activeHeroDetail) return heroItems;

    const [firstHero, ...restHeroes] = heroItems;
    if (!firstHero) return heroItems;

    const hydratedBackdropUrlCandidates = [
      activeHeroDetail.backdropUrl,
      activeHeroDetail.posterUrl,
      firstHero.backdropUrl,
    ].filter((url): url is string => Boolean(url) && !imageFailureMemory.hasFailed(url));

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
  }, [activeHero, activeHeroDetail, heroItems, imageFailureRevision]);

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

  const homeRailImageWindow = useMemo(() => {
    if (rails.length === 0) {
      return {
        startIndex: 0,
        endIndex: INITIAL_HOME_IMAGE_RAIL_COUNT,
      };
    }

    const startIndex = Math.max(0, activeRailIndex - HOME_ACTIVE_IMAGE_WINDOW_BEFORE);
    const endIndex = Math.min(
      rails.length,
      Math.max(INITIAL_HOME_IMAGE_RAIL_COUNT, activeRailIndex + HOME_ACTIVE_IMAGE_WINDOW_AFTER + 1)
    );

    return { startIndex, endIndex };
  }, [activeRailIndex, rails.length]);

  const preloadedHomeRailUrls = useMemo(
    () =>
      rails
        .slice(homeRailImageWindow.startIndex, homeRailImageWindow.endIndex)
        .flatMap((rail) =>
          rail.items
            .map((item) => item.imageUrl || item.backdropUrl)
            .filter((url): url is string => Boolean(url))
        ),
    [homeRailImageWindow.endIndex, homeRailImageWindow.startIndex, rails]
  );

  useBudgetedImagePreload(preloadedHomeRailUrls, {
    enabled: rails.length > 0,
    maxConcurrent: 3,
    maxUrls: 18,
  });

  const handleHeroPlay = (item: HeroItem) => {
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
    } else if (item.type === "vod") {
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
    } else {
      setSelectedSeriesId(rawId);
    }
  };

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
                onInfo={(item) => {
                  setSelectedCategoryName("Featured");
                  if (item.type === "vod") setSelectedMovieId(item.data.id);
                  else if (item.type === "series") setSelectedSeriesId(item.data.id);
                }}
                onFocus={() => {
                  window.requestAnimationFrame(scrollHomeToTop);
                }}
              />
            </div>
          )}

          <div className={styles.rows}>
            {rails.map((rail, railIndex) => (
              <HomeRailSection
                key={rail.id}
                rail={rail}
                scrollContainerRef={scrollRef}
                shouldLoadImages={
                  rails.length <= INITIAL_HOME_IMAGE_RAIL_COUNT ||
                  (railIndex >= homeRailImageWindow.startIndex &&
                    railIndex < homeRailImageWindow.endIndex)
                }
                onCardClick={handleCardClick}
                onCardFocus={() => setActiveRailIndex(railIndex)}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return <>{content}</>;
});
