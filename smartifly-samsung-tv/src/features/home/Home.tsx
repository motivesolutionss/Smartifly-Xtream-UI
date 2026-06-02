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
import { Card } from "../../components/ui/Card";
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
import { useHomeSnapshot } from "./useHomeSnapshot";
import { services } from "../../services";
import styles from "./Home.module.css";

const EMPTY_HERO_ITEMS: HeroItem[] = [];
const EMPTY_RAILS: HomeRail[] = [];

const getOffsetTopWithinAncestor = (element: HTMLElement, ancestor: HTMLElement) => {
  let offsetTop = 0;
  let current: HTMLElement | null = element;

  while (current && current !== ancestor) {
    offsetTop += current.offsetTop;
    current = current.offsetParent as HTMLElement | null;
  }

  return offsetTop;
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

  const scrollRef = useRef<HTMLDivElement>(null);
  const recentlyWatchedRevision = useSyncExternalStore(
    recentlyWatchedStorage.subscribe,
    recentlyWatchedStorage.getRevision,
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

  const scrollHomeToTop = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  };

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

    const mergedFirstHero: HeroItem = {
      ...firstHero,
      backdropUrl:
        activeHeroDetail.backdropUrl ||
        activeHeroDetail.posterUrl ||
        firstHero.backdropUrl,
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

  if (selectedMovieId) {
    return (
      <VodDetails 
        movieId={selectedMovieId} 
        categoryName={selectedCategoryName || undefined}
        onBack={() => {
          setSelectedMovieId(null);
          setSelectedCategoryName(null);
        }} 
      />
    );
  }

  if (selectedSeriesId) {
    return (
      <SeriesDetails 
        seriesId={selectedSeriesId} 
        categoryName={selectedCategoryName || undefined}
        onBack={() => {
          setSelectedSeriesId(null);
          setSelectedCategoryName(null);
        }} 
      />
    );
  }

  if (isBooting) {
    return (
      <div className={styles.container}>
        <div className={styles.scrollContent}>
          <HeroSkeleton />
          <div className={styles.rows}>
            <div className={styles.row}>
              <div style={{ height: '32px', width: '300px', background: 'rgba(255,255,255,0.05)', marginBottom: '24px', borderRadius: '4px' }} />
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
  }

  if (isError && !snapshot) {
    return (
      <ErrorView
        message="Unable to load home content right now."
        onRetry={() => {
          void refresh();
        }}
        showBackToLogin
      />
    );
  }

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

  const handleCardClick = (item: HomeRailItem, categoryName?: string) => {
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
  };

  const heroStyle = {
    marginBottom: "56px",
  };

  return (
    <div className={styles.container} onFocusCapture={handleFocusCapture}>
      {/* Immersive Background Layers */}
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
          {rails.map((rail) => (
            <section key={rail.id} className={styles.row}>
              <h2 className={styles.rowTitle}>{rail.title}</h2>
              <div id={`rail-${rail.id}`} className={styles.rail}>
                {rail.items.map((item) => (
                  <Card
                    key={`${rail.id}-${item.type}-${item.id}`}
                    id={`card-${rail.id}-${item.type}-${item.id}`}
                    title={item.title}
                    imageUrl={item.imageUrl || item.backdropUrl}
                    variant={rail.variant || "poster"}
                    aspectRatio={(rail.variant === "live" || rail.variant === "continue") ? "landscape" : undefined}
                    contentType={item.contentType}
                    progressText={item.progressText}
                    progress={item.progress}
                    className={rail.id === "continue-watching" ? styles.continueCard : undefined}
                    disableAutoScroll={true}
                    onFocus={() => {
                      const railElement = document.getElementById(`rail-${rail.id}`);
                      const itemIndex = rail.items.findIndex(it => it.id === item.id);
                      if (railElement && itemIndex !== -1) {
                        // 1. Align the focused rail at a fixed vertical anchor without layout reads.
                        const scrollContainer = scrollRef.current;
                        if (scrollContainer) {
                          const railTopInContainer = getOffsetTopWithinAncestor(
                            railElement,
                            scrollContainer
                          );
                          const fontSize = parseFloat(getComputedStyle(document.documentElement).fontSize);
                          const targetScrollTop = Math.max(0, railTopInContainer - 15 * fontSize);

                          if (Math.abs(scrollContainer.scrollTop - targetScrollTop) > 1) {
                            scrollContainer.scrollTop = targetScrollTop;
                          }
                        }

                        // 2. Edge-aware horizontal scroll (enterprise behavior): only scroll when card hits rail edges.
                        if (itemIndex === 0) {
                          if (railElement.scrollLeft !== 0) {
                            railElement.scrollLeft = 0;
                          }
                        } else {
                          const cardElement = document.getElementById(`card-${rail.id}-${item.type}-${item.id}`);
                          const cardContainer = cardElement?.parentElement as HTMLElement | null;
                          if (cardContainer) {
                            const railStyles = window.getComputedStyle(railElement);
                            const leftInset = parseFloat(railStyles.paddingLeft) || 24;
                            const rightInset = parseFloat(railStyles.paddingRight) || 24;
                            const viewportWidth = railElement.clientWidth;
                            const currentScroll = railElement.scrollLeft;
                            const cardLeftInRail = getOffsetLeftWithinAncestor(cardContainer, railElement);
                            const cardWidth = cardContainer.offsetWidth;
                            
                            // Scroll right only when card exits right safety inset.
                            if (cardLeftInRail + cardWidth > currentScroll + viewportWidth - rightInset) {
                              const nextLeft =
                                cardLeftInRail + cardWidth - viewportWidth + rightInset;
                              if (Math.abs(currentScroll - nextLeft) > 1) {
                                railElement.scrollLeft = nextLeft;
                              }
                            } 
                            // Scroll left only when card exits left safety inset.
                            else if (cardLeftInRail < currentScroll + leftInset) {
                              const nextLeft = Math.max(0, cardLeftInRail - leftInset);
                              if (Math.abs(currentScroll - nextLeft) > 1) {
                                railElement.scrollLeft = nextLeft;
                              }
                            }
                          }
                        }
                      }
                    }}
                    onClick={() => handleCardClick(item, rail.title)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
});
