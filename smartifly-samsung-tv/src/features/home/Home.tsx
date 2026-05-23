import React, { useState, useMemo, useEffect, useRef } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { services } from "../../services";
import { usePlayerStore } from "../../store/playerStore";
import { Card } from "../../components/ui/Card";
import { HeroBanner, type HeroItem } from "../../components/common/HeroBanner";
import { TopBar } from "../../components/common/TopBar";
import { ErrorView } from "../../components/common/ErrorView";
import { HeroSkeleton, CardSkeleton } from "../../components/ui/Skeleton";
import VodDetails from "../vod/VodDetails";
import { SeriesDetails } from "../series/SeriesDetails";
import { useDashboard } from "../dashboard/hooks/useDashboard";
import { useFocus } from "../../providers/useFocus";
import type {
  AppMovie,
  AppSeries,
  AppChannel,
  AppMovieDetails,
  AppSeriesDetails,
  AppCategory,
} from "../../types/appModels";
import { logger } from "../../utils/logger";
import { buildHomeHeroItems, buildHomeRails } from "./homePolicy";
import type { HomeRail, HomeRailItem } from "./homeTypes";
import { recentlyWatchedStorage } from "../../storage/recentlyWatchedStorage";
import { getResumePositionSeconds } from "../../utils/resumePosition";
import styles from "./Home.module.css";

type HomeScreenId =
  | "HOME"
  | "LIVE"
  | "VOD"
  | "SERIES"
  | "LIBRARY"
  | "SEARCH"
  | "SETTINGS";

export const Home: React.FC<{ onNavigate: (id: HomeScreenId) => void }> = ({ onNavigate }) => {
  const { setActivePlaybackItem } = usePlayerStore();
  const { continueWatching } = useDashboard();
  const [selectedMovieId, setSelectedMovieId] = useState<string | null>(null);
  const [selectedSeriesId, setSelectedSeriesId] = useState<string | null>(null);
  const [selectedCategoryName, setSelectedCategoryName] = useState<string | null>(null);
  const [atmosphereColor, setAtmosphereColor] = useState<string>("transparent");

  const {
    data: movies,
    isLoading: moviesLoading,
    isError: moviesError,
    refetch: refetchMovies,
  } = useQuery<AppMovie[]>({
    queryKey: ["home-movies"],
    queryFn: () => services.content.getVodStreams(),
    retry: 2,
    staleTime: 60 * 60 * 1000,
  });

  const {
    data: series,
    isLoading: seriesLoading,
    isError: seriesError,
    refetch: refetchSeries,
  } = useQuery<AppSeries[]>({
    queryKey: ["home-series"],
    queryFn: () => services.content.getSeries(),
    retry: 2,
    staleTime: 60 * 60 * 1000,
  });

  const {
    data: liveStreams,
    isLoading: liveLoading,
    isError: liveError,
    refetch: refetchLive,
  } = useQuery<AppChannel[]>({
    queryKey: ["home-live"],
    queryFn: () => services.content.getLiveStreams(),
    retry: 2,
    staleTime: 15 * 60 * 1000,
  });

  // Removed imageFailureMemory.clear() from mount to prevent repeated failure attempts
  
  const { data: vodCategories } = useQuery<AppCategory[]>({
    queryKey: ["home-vod-categories"],
    queryFn: () => services.content.getVodCategories(),
    retry: 2,
    staleTime: 60 * 60 * 1000,
  });

  const { data: seriesCategories } = useQuery<AppCategory[]>({
    queryKey: ["home-series-categories"],
    queryFn: () => services.content.getSeriesCategories(),
    retry: 2,
    staleTime: 60 * 60 * 1000,
  });

  const rails: HomeRail[] = useMemo(() => {
    return buildHomeRails(
      movies,
      series,
      liveStreams,
      continueWatching,
      vodCategories || [],
      seriesCategories || []
    );
  }, [movies, series, liveStreams, continueWatching, vodCategories, seriesCategories]);

  const baseHeroItems: HeroItem[] = useMemo(() => {
    return buildHomeHeroItems(movies, series, liveStreams, continueWatching);
  }, [movies, series, liveStreams, continueWatching]);

  const heroDetailQueries = useQueries({
    queries: baseHeroItems.map((item) => ({
      queryKey: ["home-hero-details", item.type, item.data.id],
      enabled: item.type !== "live",
      queryFn: async () => {
        if (item.type === "vod") {
          return (await services.content.getVodInfo(item.data.id)) as
            | AppMovieDetails
            | AppSeriesDetails;
        }

        if (item.type === "series") {
          return (await services.content.getSeriesInfo(item.data.id)) as
            | AppMovieDetails
            | AppSeriesDetails;
        }

        return undefined;
      },
      retry: 1,
      staleTime: 6 * 60 * 60 * 1000,
    })),
  });

  const heroItems: HeroItem[] = useMemo(() => {
    const items = [...baseHeroItems];

    for (let i = 0; i < items.length; i += 1) {
      const detail = heroDetailQueries[i]?.data;
      const item = items[i];
      if (!item || !detail) continue;

      if (item.type === "vod") {
        const vodDetail = detail as AppMovieDetails;
        items[i] = {
          ...item,
          backdropUrl: vodDetail.backdropUrl || vodDetail.posterUrl || item.backdropUrl,
          description: vodDetail.description || item.description,
          rating: vodDetail.rating || item.rating,
          year: vodDetail.year || vodDetail.releaseDate || item.year,
          duration: vodDetail.duration || item.duration,
          genre: vodDetail.genre || item.genre,
        };
      } else if (item.type === "series") {
        const seriesDetail = detail as AppSeriesDetails;
        items[i] = {
          ...item,
          backdropUrl:
            seriesDetail.backdropUrl || seriesDetail.posterUrl || item.backdropUrl,
          description: seriesDetail.description || item.description,
          rating: seriesDetail.rating || item.rating,
          genre: seriesDetail.genre || item.genre,
        };
      }
    }

    logger.debug("home_hero_selected", {
      movieCount: movies?.length || 0,
      seriesCount: series?.length || 0,
      liveCount: liveStreams?.length || 0,
      heroCount: items.length,
    });
    return items;
  }, [baseHeroItems, heroDetailQueries, movies, series, liveStreams]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const { focusedId } = useFocus();

  // Auto-scroll to top when focusing TopBar
  useEffect(() => {
    if (focusedId?.startsWith('top-')) {
      scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [focusedId]);

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

  if (moviesLoading || seriesLoading || liveLoading) {
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

  if (moviesError && seriesError && liveError) {
    return (
      <ErrorView
        message="Unable to load home content right now."
        onRetry={() => {
          void refetchMovies();
          void refetchSeries();
          void refetchLive();
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

  const getVibeColor = (title: string, item: HomeRailItem) => {
    const t = title.toLowerCase();
    const it = item.title.toLowerCase();
    if (t.includes("action") || it.includes("war")) return "#E50914"; // Action Red
    if (t.includes("sci-fi") || it.includes("space")) return "#00D1FF"; // Sci-Fi Blue
    if (t.includes("trending")) return "#6200EE"; // Premium Purple
    if (t.includes("continue")) return "#FFA500"; // Continue Orange
    if (t.includes("live")) return "#E50914"; // Live Red
    return "#1F1F1F";
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
    <div className={styles.container}>
      {/* Immersive Background Layers */}
      <div className={styles.wallpaper} />
      <div 
        className={styles.atmosphere} 
        style={{ 
          background: `radial-gradient(circle at 0% 0%, ${atmosphereColor}22 0%, transparent 70%)` 
        }} 
      />

      <TopBar onNavigate={onNavigate} />

      <div ref={scrollRef} className={styles.scrollContent}>
        {heroItems.length > 0 && (
          <div style={heroStyle}>
            <HeroBanner
              items={heroItems}
              onPlay={handleHeroPlay}
              onInfo={(item) => {
                setSelectedCategoryName("Featured");
                if (item.type === "vod") setSelectedMovieId(item.data.id);
                else if (item.type === "series") setSelectedSeriesId(item.data.id);
              }}
              onFocus={() => {
                setAtmosphereColor("transparent");
                // Definitively lock scroll to Y=0 after all event loop ticks settle
                setTimeout(() => {
                  if (scrollRef.current) {
                    scrollRef.current.scrollTo({ top: 0, behavior: "smooth" });
                  }
                }, 50);
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
                      setAtmosphereColor(getVibeColor(rail.title, item));
                      
                      const railElement = document.getElementById(`rail-${rail.id}`);
                      const itemIndex = rail.items.findIndex(it => it.id === item.id);
                      if (railElement && itemIndex !== -1) {
                        // 1. Dynamic TV Vertical Scroll: Smoothly scroll the page so that the focused rail aligns at exactly 15rem from the top
                        const scrollContainer = scrollRef.current;
                        if (scrollContainer) {
                          const railRect = railElement.getBoundingClientRect();
                          const containerRect = scrollContainer.getBoundingClientRect();
                          const currentScrollTop = scrollContainer.scrollTop;
                          
                          const railTopInContainer = railRect.top - containerRect.top + currentScrollTop;
                          const fontSize = parseFloat(getComputedStyle(document.documentElement).fontSize);
                          const targetScrollTop = Math.max(0, railTopInContainer - 15 * fontSize);
                          
                          scrollContainer.scrollTo({
                            top: targetScrollTop,
                            behavior: "smooth"
                          });
                        }

                        // 2. Explicit First-Card Guard: Force scroll position to exactly 0 to guarantee the card never clips behind the sidebar.
                        if (itemIndex === 0) {
                          railElement.scrollLeft = 0;
                          setTimeout(() => {
                            const el = document.getElementById(`rail-${rail.id}`);
                            if (el) el.scrollLeft = 0;
                          }, 0);
                        } else {
                          const cardElement = document.getElementById(`card-${rail.id}-${item.type}-${item.id}`);
                          if (cardElement) {
                            const fontSize = parseFloat(getComputedStyle(document.documentElement).fontSize);
                            const railPadding = 4 * fontSize; // 4rem padding
                            const viewportWidth = railElement.clientWidth;
                            
                            const railRect = railElement.getBoundingClientRect();
                            const cardRect = cardElement.getBoundingClientRect();
                            const currentScroll = railElement.scrollLeft;
                            
                            // Mathematically bulletproof Y-independent X coordinate inside the scroll container
                            const cardLeftInRail = cardRect.left - railRect.left + currentScroll;
                            const cardWidth = cardRect.width;
                            
                            // 3. Scrolling right: when card's right boundary exceeds visible viewport minus padding
                            if (cardLeftInRail + cardWidth > currentScroll + viewportWidth - railPadding) {
                              railElement.scrollTo({
                                left: cardLeftInRail + cardWidth - viewportWidth + railPadding,
                                behavior: "smooth"
                              });
                            } 
                            // 4. Scrolling left: when card's left boundary falls under current scroll position plus padding
                            else if (cardLeftInRail < currentScroll + railPadding) {
                              railElement.scrollTo({
                                left: Math.max(0, cardLeftInRail - railPadding),
                                behavior: "smooth"
                              });
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
};
