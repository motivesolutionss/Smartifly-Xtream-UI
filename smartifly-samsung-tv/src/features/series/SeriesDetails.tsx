import React, { useState, useEffect, useMemo, useRef, useCallback, memo } from "react";
import { useSeriesDetails } from "./hooks/useSeriesContent";
import { usePlayerStore, type ActivePlaybackItem } from "../../store/playerStore";
import { Focusable } from "../../components/tv/Focusable";
import { Loader } from "../../components/ui/Loader";
import { ErrorView } from "../../components/common/ErrorView";
import { EmptyState } from "../../components/common/EmptyState";
import { ArrowLeft, Star, Play } from "lucide-react";
import type { AppEpisode, AppSeriesDetails } from "../../types/appModels";
import { favoritesStorage } from "../../storage/favoritesStorage";
import { recentlyWatchedStorage } from "../../storage/recentlyWatchedStorage";
import { useTvBack } from "../../hooks/useTvBack";
import { getUserFriendlyErrorMessage } from "../../utils/errorMapper";
import { useFocus } from "../../providers/useFocus";
import { getAtmosphereColor } from "../../hooks/vibeUtils.ts";
import { getResumePositionSeconds } from "../../utils/resumePosition";
import styles from "./SeriesDetails.module.css";
import { detectVideoResolution } from "../../utils/resolutionDetector";


interface SeriesDetailsProps {
  seriesId: string;
  categoryName?: string;
  onBack: () => void;
}

interface EpisodeCardImageProps {
  episodeImage?: string;
  fallbackImages: string[];
  alt: string;
  className: string;
}

const FAST_IMAGE_TIMEOUT_MS = 1200;

const getEpisodeLabel = (episode: AppEpisode, index: number) => {
  if (episode.seasonNumber && episode.episodeNumber) {
    return `S${episode.seasonNumber} | E${episode.episodeNumber}`;
  }
  if (episode.episodeNumber) {
    return `Episode ${episode.episodeNumber}`;
  }
  return `Episode ${index + 1}`;
};

const getEpisodeTitle = (episode: AppEpisode, index: number) => {
  const rawTitle = episode.title?.trim();
  if (!rawTitle) return `Episode ${index + 1}`;
  return rawTitle;
};

const parseDurationMinutes = (duration?: string): string | null => {
  const raw = duration?.trim();
  if (!raw) return null;

  if (/^\d+$/.test(raw)) {
    const seconds = Number(raw);
    if (!Number.isFinite(seconds) || seconds <= 0) return null;
    return `${Math.max(1, Math.floor(seconds / 60))}m`;
  }

  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(raw)) {
    const parts = raw.split(":").map((part) => Number(part));
    const totalSeconds =
      parts.length === 3
        ? parts[0] * 3600 + parts[1] * 60 + parts[2]
        : parts[0] * 60 + parts[1];
    if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) return null;
    return `${Math.max(1, Math.floor(totalSeconds / 60))}m`;
  }

  return null;
};

const buildQueuedEpisode = (
  episodes: AppEpisode[],
  index: number,
  series: AppSeriesDetails
): ActivePlaybackItem["nextItem"] | undefined => {
  const episode = episodes[index];
  if (!episode) return undefined;

  const queued: NonNullable<ActivePlaybackItem["nextItem"]> = {
    id: episode.id,
    title: episode.title,
    logoUrl: episode.posterUrl || series.posterUrl,
    backdropUrl: series.backdropUrl || series.posterUrl,
    extension: episode.extension,
    seasonNumber: episode.seasonNumber,
    episodeNumber: episode.episodeNumber,
    seriesId: series.id,
  };

  const upcoming = buildQueuedEpisode(episodes, index + 1, series);
  if (upcoming) {
    queued.nextItem = upcoming;
  }

  return queued;
};

const EpisodeCardImage: React.FC<EpisodeCardImageProps> = ({
  episodeImage,
  fallbackImages,
  alt,
  className,
}) => {
  const safeFallbacks = useMemo(
    () => Array.from(new Set(fallbackImages.map((item) => item.trim()).filter(Boolean))),
    [fallbackImages]
  );
  const fallback = safeFallbacks[0] || "";
  const candidate = episodeImage?.trim() || "";
  const initialSrc = fallback || candidate;
  const [promotedSrc, setPromotedSrc] = useState<string | null>(null);
  const displaySrc = promotedSrc || initialSrc;
  const isFallbackMode = Boolean(fallback && displaySrc === fallback);

  useEffect(() => {
    if (!candidate || !fallback || candidate === fallback) return;

    let active = true;
    const probe = new Image();
    const timeoutId = window.setTimeout(() => {
      probe.onload = null;
      probe.onerror = null;
    }, FAST_IMAGE_TIMEOUT_MS);

    const clearProbe = () => {
      window.clearTimeout(timeoutId);
      probe.onload = null;
      probe.onerror = null;
    };

    probe.onload = () => {
      clearProbe();
      if (!active) return;
      setPromotedSrc(candidate);
    };
    probe.onerror = () => {
      clearProbe();
    };
    probe.src = candidate;

    return () => {
      active = false;
      clearProbe();
    };
  }, [candidate, fallback]);

  return (
    <img
      src={displaySrc}
      alt={alt}
      className={`${className} ${isFallbackMode ? styles.episodeThumbFallback : ""}`}
      loading="lazy"
      onError={(event) => {
        const image = event.currentTarget;
        if (fallback && image.src !== fallback) {
          setPromotedSrc(fallback);
          return;
        }
        image.style.opacity = "0.18";
      }}
    />
  );
};

// Memoized Episode Card for performance
const EpisodeCard = memo(({ 
  episode, 
  index, 
  backdropUrl,
  posterUrl,
  onPlay 
}: { 
  episode: AppEpisode; 
  index: number; 
  backdropUrl?: string;
  posterUrl?: string;
  onPlay: (ep: AppEpisode, idx: number) => void 
}) => {
  const durationLabel = parseDurationMinutes(episode.duration);

  const imageSources = [
    episode.posterUrl?.trim(),
    backdropUrl?.trim(),
    posterUrl?.trim(),
  ].filter((value): value is string => Boolean(value));

  const episodeImage = imageSources[0];
  const fallbackImages = imageSources.slice(1);

  return (
    <Focusable
      id={`episode-${episode.id}`}
      onEnter={() => onPlay(episode, index)}
      className={styles.episodeCard}
      scrollOptions={{ block: "center", inline: "nearest" }}
      disableFocusEffects
    >
      <div className={styles.episodeInner}>
        <div className={styles.episodeThumbWrap}>
          <EpisodeCardImage
            episodeImage={episodeImage}
            fallbackImages={fallbackImages}
            alt={episode.title}
            className={styles.episodeThumb}
          />
          <span className={styles.episodeChip}>{getEpisodeLabel(episode, index)}</span>
        </div>

        <div className={styles.episodeMeta}>
          <p className={styles.episodeTitle}>{getEpisodeTitle(episode, index)}</p>
          <div className={styles.episodeSubMeta}>
            {durationLabel ? (
              <span>{durationLabel}</span>
            ) : (
              <span>Press OK to play</span>
            )}
          </div>
        </div>
      </div>
    </Focusable>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.episode === nextProps.episode &&
    prevProps.index === nextProps.index &&
    prevProps.backdropUrl === nextProps.backdropUrl &&
    prevProps.posterUrl === nextProps.posterUrl &&
    prevProps.onPlay === nextProps.onPlay
  );
});

export const SeriesDetails: React.FC<SeriesDetailsProps> = ({ seriesId, categoryName, onBack }) => {
  const { data: series, isLoading, isError, error, refetch } = useSeriesDetails(seriesId);
  const setActivePlaybackItem = usePlayerStore((state) => state.setActivePlaybackItem);
  const { setFocus } = useFocus();
  const [seasonSelection, setSeasonSelection] = useState<{ seriesId: string; index: number } | null>(null);
  const [favoriteOverrides, setFavoriteOverrides] = useState<Record<string, boolean>>({});
  const [isDescriptionExpanded, setDescriptionExpanded] = useState(false);
  const lastFocusedControlRef = useRef("series-play-primary");
  const hasInitialFocusAppliedRef = useRef(false);
  const isFavorite = favoriteOverrides[seriesId] ?? favoritesStorage.isFavorite(seriesId);

  useTvBack(onBack);

  useEffect(() => {
    hasInitialFocusAppliedRef.current = false;
  }, [seriesId]);

  const resumeEpisode = useMemo(() => {
    if (!series) return null;
    const history = recentlyWatchedStorage.getItems();
    const entry = history.find((h) => h.id === seriesId && h.type === "series");
    if (!entry?.metadata?.episodeId) return null;

    const resumePositionSeconds = getResumePositionSeconds(
      entry.positionSeconds,
      entry.durationSeconds
    );
    if (!resumePositionSeconds) return null;

    for (let sIdx = 0; sIdx < series.seasons.length; sIdx++) {
      const season = series.seasons[sIdx];
      const eIdx = season.episodes.findIndex((e) => e.id === entry.metadata?.episodeId);
      if (eIdx !== -1) {
        return {
          episode: season.episodes[eIdx],
          index: eIdx,
          seasonIndex: sIdx,
          resumePositionSeconds,
          resumeDurationSeconds: entry.durationSeconds,
        };
      }
    }

    return null;
  }, [series, seriesId]);

  const selectedSeasonIndex = (() => {
    if (!series || series.seasons.length === 0) return 0;

    const preferredIndex =
      seasonSelection && seasonSelection.seriesId === seriesId
        ? seasonSelection.index
        : (resumeEpisode?.seasonIndex ?? 0);

    return Math.max(0, Math.min(preferredIndex, series.seasons.length - 1));
  })();

  useEffect(() => {
    if (!series || hasInitialFocusAppliedRef.current) return;

    const resumeFocusId = resumeEpisode ? `episode-${resumeEpisode.episode.id}` : null;
    const currentSeason = series.seasons[selectedSeasonIndex];
    const isResumeInCurrentSeason = Boolean(
      resumeFocusId &&
        currentSeason?.episodes.some((episode) => `episode-${episode.id}` === resumeFocusId)
    );
    const fallbackFocusId = lastFocusedControlRef.current || "series-play-primary";
    const targetFocusId = isResumeInCurrentSeason && resumeFocusId ? resumeFocusId : fallbackFocusId;

    let timeoutId: number | null = null;
    const frameId = window.requestAnimationFrame(() => {
      timeoutId = window.setTimeout(() => {
        setFocus(targetFocusId);
        lastFocusedControlRef.current = targetFocusId;
        hasInitialFocusAppliedRef.current = true;
      }, isResumeInCurrentSeason ? 80 : 0);
    });

    return () => {
      window.cancelAnimationFrame(frameId);
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [resumeEpisode, selectedSeasonIndex, series, setFocus]);

  const formatRating = (value?: string) => {
    if (!value) return undefined;
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
    return parsed.toFixed(1);
  };

  const genres = useMemo(
    () =>
      (series?.genre || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    [series?.genre]
  );

  const qualityLabel = useMemo(() => {
    if (!series) return "HD";
    return detectVideoResolution(series.title, series.description);
  }, [series?.title, series?.description]);

  const handlePlayEpisode = useCallback((episode: AppEpisode, episodeIndex: number) => {
    if (!series) return;

    const currentSeason = series.seasons[selectedSeasonIndex];
    const queuedNextEpisode = buildQueuedEpisode(
      currentSeason?.episodes || [],
      episodeIndex + 1,
      series
    );
    const matchingResumeEpisode =
      resumeEpisode?.episode.id === episode.id ? resumeEpisode : null;

    setActivePlaybackItem({
      id: episode.id,
      seriesId: series.id,
      title: `${series.title} - ${getEpisodeLabel(episode, episodeIndex)}`,
      logoUrl: episode.posterUrl || series.posterUrl,
      backdropUrl: series.backdropUrl || series.posterUrl,
      contentType: "series",
      extension: episode.extension,
      resumePositionSeconds: matchingResumeEpisode?.resumePositionSeconds,
      resumeDurationSeconds: matchingResumeEpisode?.resumeDurationSeconds,
      metadata: {
        seasonNumber: episode.seasonNumber,
        episodeNumber: episode.episodeNumber,
      },
      nextItem: queuedNextEpisode,
    });
  }, [resumeEpisode, selectedSeasonIndex, series, setActivePlaybackItem]);

  const toggleFavorite = () => {
    if (series) {
      const added = favoritesStorage.toggleFavorite({
        id: series.id,
        type: "series",
        title: series.title,
        imageUrl: series.posterUrl
      });
      setFavoriteOverrides((current) => ({
        ...current,
        [series.id]: added,
      }));
    }
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingBackdrop} />
        <div className={styles.loadingContent}>
          <div className={styles.loadingBackBtn} />
          <div className={styles.loadingMeta}>
            <div className={styles.loadingTitle} />
            <div className={styles.loadingStats} />
            <div className={styles.loadingLine} />
            <div className={styles.loadingLineShort} />
            <div className={styles.loadingActions}>
              <div className={styles.loadingActionBtn} />
              <div className={styles.loadingActionBtn} />
            </div>
          </div>
          <Loader size={64} />
        </div>
      </div>
    );
  }

  if (!series || isError) {
    return (
      <ErrorView
        message={error ? getUserFriendlyErrorMessage(error) : "Unable to load series info."}
        onRetry={() => {
          void refetch();
        }}
        showBackToLogin
      />
    );
  }

  const currentSeason = series.seasons[selectedSeasonIndex];
  const hasEpisodes = Boolean(currentSeason?.episodes?.length);

  return (
    <div className={styles.container}>
      <div 
        className={styles.atmosphere} 
        style={{ 
          background: `radial-gradient(circle at 20% 50%, ${getAtmosphereColor(series.title, series.genre, categoryName)}, transparent 70%)` 
        }} 
      />
      <div className={styles.backdropContainer}>
        <img 
          src={series.backdropUrl || series.posterUrl} 
          alt="" 
          className={styles.backdrop} 
          onError={(event) => {
            const image = event.currentTarget;
            image.style.opacity = "0.2";
          }}
        />
        <div className={styles.overlayHorizontal} />
        <div className={styles.overlayVertical} />
      </div>

      <div className={styles.content}>
        <Focusable
          id="series-back"
          onEnter={onBack}
          onFocus={() => {
            lastFocusedControlRef.current = "series-back";
          }}
          scrollOptions={{ block: "nearest", inline: "nearest" }}
          variant="pill"
          disableFocusEffects
          className={styles.backBtn}
        >
          <ArrowLeft size={20} />
        </Focusable>

        <div className={styles.meta}>
          <h1 className={styles.title}>{series.title}</h1>
          
          <div className={styles.stats}>
            {series.rating && (
              <span className={styles.stat}>
                <Star size={18} fill="currentColor" className={styles.starIcon} /> {formatRating(series.rating) || series.rating}
              </span>
            )}
            {series.rating && (series.seasons.length > 0) && <span className={styles.dot} />}
            <span className={styles.count}>{series.seasons.length} Seasons</span>
            <span className={styles.dot} />
            <span className={styles.qualityBadge}>{qualityLabel}</span>
          </div>

          <div className={styles.genrePills}>
            {genres.map((g, i) => (
              <span key={i} className={styles.genrePill}>{g}</span>
            ))}
          </div>

          <Focusable
            id="details-description"
            onFocus={() => {
              lastFocusedControlRef.current = "details-description";
            }}
            variant="none"
            disabled={!isDescriptionExpanded}
            disableFocusEffects={!isDescriptionExpanded}
            enableVerticalScrollOnArrow={isDescriptionExpanded}
            className={`${styles.description} ${
              isDescriptionExpanded ? `${styles.descriptionExpanded} ${styles.descriptionInteractive}` : ""
            }`}
          >
            {series.description || "No series description is available."}
          </Focusable>

          {/* Extended Info toggled by More Info but outside the scrollable text */}
          {isDescriptionExpanded && (series.cast || series.director) && (
            <div className={styles.crewInfo}>
              {series.director && (
                <div className={styles.crewItem}>
                  <span className={styles.crewLabel}>Director</span>
                  <span className={styles.crewValue}>{series.director}</span>
                </div>
              )}
              {series.cast && (
                <div className={styles.crewItem}>
                  <span className={styles.crewLabel}>Cast</span>
                  <span className={styles.crewValue}>{series.cast}</span>
                </div>
              )}
            </div>
          )}


          <div className={styles.actions}>
            <Focusable
              id="series-play-primary"
              onEnter={() => {
                if (resumeEpisode) {
                  handlePlayEpisode(resumeEpisode.episode, resumeEpisode.index);
                } else {
                  const firstEp = series.seasons[0]?.episodes?.[0];
                  if (firstEp) handlePlayEpisode(firstEp, 0);
                }
              }}
              onFocus={() => {
                lastFocusedControlRef.current = "series-play-primary";
              }}
              className={styles.playBtn}
            >
              <Play size={24} fill="currentColor" className={styles.playIcon} />
              <span>
                {resumeEpisode 
                  ? `Resume S${resumeEpisode.episode.seasonNumber}:E${resumeEpisode.episode.episodeNumber}`
                  : "Watch S1:E1"}
              </span>
            </Focusable>

            <Focusable
              id="series-fav"
              onEnter={toggleFavorite}
              onFocus={() => {
                lastFocusedControlRef.current = "series-fav";
              }}
              className={styles.favoriteBtn}
            >
              <Star
                size={24}
                fill={isFavorite ? "#FFD700" : "none"}
                color={isFavorite ? "#FFD700" : "currentColor"}
              />
              <span>{isFavorite ? "In Favorites" : "Add to Favorites"}</span>
            </Focusable>

            <Focusable
              id="series-toggle-description"
              onEnter={() => {
                setDescriptionExpanded((current) => !current);
              }}
              onFocus={() => {
                lastFocusedControlRef.current = "series-toggle-description";
              }}
              className={styles.moreBtn}
            >
              <span>{isDescriptionExpanded ? "Less Info" : "More Info"}</span>
            </Focusable>
          </div>
        </div>

        <div className={styles.seasonsSection}>
          <div className={styles.seasonScroller}>
            {series.seasons.map((season, index) => (
              <Focusable
                key={season.seasonNumber}
                id={`season-${index}`}
                onFocus={() => {
                  lastFocusedControlRef.current = `season-${index}`;
                }}
                onEnter={() => {
                  setSeasonSelection({ seriesId, index });
                  // Focus first episode of selected season
                  window.setTimeout(() => {
                    const firstEp = series.seasons[index]?.episodes?.[0];
                    if (firstEp) setFocus(`episode-${firstEp.id}`);
                  }, 150);
                }}
                variant="pill"
                className={`${styles.seasonTab} ${selectedSeasonIndex === index ? styles.activeSeason : ""}`}
              >
                <span>Season {season.seasonNumber}</span>
              </Focusable>
            ))}
          </div>
        </div>

        <div className={styles.episodesSection}>
          {hasEpisodes ? (
            <div className={styles.episodesRailShell}>
              <div className={styles.episodesRailHeader}>
                <h3 className={styles.episodesRailTitle}>Episodes</h3>
                <span className={styles.episodesRailCount}>
                  {currentSeason?.episodes.length ?? 0} in Season {currentSeason?.seasonNumber}
                </span>
              </div>

              <div className={styles.episodesRail}>
                {currentSeason?.episodes.map((episode, index) => (
                  <EpisodeCard
                    key={episode.id}
                    episode={episode}
                    index={index}
                    backdropUrl={series.backdropUrl}
                    posterUrl={series.posterUrl}
                    onPlay={handlePlayEpisode}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className={styles.emptyEpisodes}>
              <EmptyState
                title="No episodes found"
                message="This season does not contain playable episodes."
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
