import React, { useState } from "react";
import { useEffect, useMemo, useRef } from "react";
import { useMovieDetails } from "./hooks/useVodContent";
import { usePlayerStore } from "../../store/playerStore";
import { Focusable } from "../../components/tv/Focusable";
import { Loader } from "../../components/ui/Loader";
import { ErrorView } from "../../components/common/ErrorView";
import { Play, ArrowLeft, Star } from "lucide-react";
import styles from "./VodDetails.module.css";
import { favoritesStorage } from "../../storage/favoritesStorage";
import { recentlyWatchedStorage } from "../../storage/recentlyWatchedStorage";
import { useTvBack } from "../../hooks/useTvBack";
import { getUserFriendlyErrorMessage } from "../../utils/errorMapper";
import { useFocus } from "../../providers/useFocus";
import { getAtmosphereColor } from "../../hooks/vibeUtils.ts";
import { getResumePositionSeconds } from "../../utils/resumePosition";
import { detectVideoResolution } from "../../utils/resolutionDetector";


interface VodDetailsProps {
  movieId: string;
  categoryName?: string;
  onBack: () => void;
}

export default function VodDetails({ movieId, categoryName, onBack }: VodDetailsProps) {
  const { data: movie, isLoading, isError, error, refetch } = useMovieDetails(movieId);
  const { setActivePlaybackItem } = usePlayerStore();
  const { setFocus } = useFocus();
  const [isFavorite, setIsFavorite] = useState(favoritesStorage.isFavorite(movieId));
  const [isDescriptionExpanded, setDescriptionExpanded] = useState(false);
  const lastFocusedControlRef = useRef("play-movie");
  const hasInitialFocusRef = useRef(false);

  useTvBack(onBack);

  useEffect(() => {
    hasInitialFocusRef.current = false;
  }, [movieId]);

  useEffect(() => {
    if (isLoading || hasInitialFocusRef.current) return;

    const id = lastFocusedControlRef.current || "play-movie";
    const frameId = window.requestAnimationFrame(() => {
      setFocus(id);
      hasInitialFocusRef.current = true;
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [movieId, isLoading, setFocus]);

  const lastWatchedEntry = useMemo(() => {
    const history = recentlyWatchedStorage.getItems();
    return history.find((h) => h.id === movieId && h.type === "vod") ?? null;
  }, [movieId]);

  const resumePositionSeconds = useMemo(
    () =>
      getResumePositionSeconds(
        lastWatchedEntry?.positionSeconds,
        lastWatchedEntry?.durationSeconds
      ),
    [lastWatchedEntry?.durationSeconds, lastWatchedEntry?.positionSeconds]
  );

  const hasBackdrop = Boolean(movie?.backdropUrl);
  const backdropSrc = movie?.backdropUrl || movie?.posterUrl;

  const formatRating = (value?: string) => {
    if (!value) return undefined;
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
    return parsed.toFixed(1);
  };

  const formatReleaseYear = (value?: string) => {
    if (!value) return undefined;
    const match = value.match(/\b(19|20)\d{2}\b/);
    return match?.[0];
  };

  const formatDuration = (value?: string) => {
    if (!value) return undefined;
    const hhmmss = value.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
    if (!hhmmss) return value;
    const hours = Number(hhmmss[1]);
    const minutes = Number(hhmmss[2]);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const genres = useMemo(
    () =>
      (movie?.genre || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    [movie?.genre]
  );

  const handlePlay = () => {
    if (movie) {
      setActivePlaybackItem({
        id: movie.id,
        title: movie.title,
        logoUrl: movie.posterUrl,
        backdropUrl: movie.backdropUrl || movie.posterUrl,
        contentType: "vod",
        extension: movie.extension,
        resumePositionSeconds,
        resumeDurationSeconds: lastWatchedEntry?.durationSeconds,
      });
    }
  };

  const toggleFavorite = () => {
    if (movie) {
      const added = favoritesStorage.toggleFavorite({
        id: movie.id,
        type: "vod",
        title: movie.title,
        imageUrl: movie.posterUrl
      });
      setIsFavorite(added);
    }
  };

  const ratingText = formatRating(movie?.rating);
  const durationText = formatDuration(movie?.duration);
  const releaseYearText = formatReleaseYear(movie?.releaseDate);

  const statItems = [
    ratingText
      ? (
          <span key="rating" className={styles.stat}>
            <Star size={18} className={styles.starIcon} fill="currentColor" />
            {ratingText}
          </span>
        )
      : null,
    durationText ? (
      <span key="duration" className={styles.stat}>{durationText}</span>
    ) : null,
    releaseYearText ? (
      <span key="releaseDate" className={styles.stat}>{releaseYearText}</span>
    ) : null,
  ].filter(Boolean);

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

  if (!movie || isError) {
    return (
      <ErrorView
        message={error ? getUserFriendlyErrorMessage(error) : "Unable to load movie details."}
        onRetry={() => {
          void refetch();
        }}
        showBackToLogin
      />
    );
  }

  return (
    <div className={styles.container}>
      <div 
        className={styles.atmosphere} 
        style={{ 
          background: `radial-gradient(circle at 20% 50%, ${getAtmosphereColor(movie.title, movie.genre, categoryName)}, transparent 70%)` 
        }} 
      />
      <div className={styles.backdropContainer}>
        <img 
          src={backdropSrc}
          alt="" 
          className={`${styles.backdrop} ${hasBackdrop ? styles.backdropMain : styles.backdropFallback}`}
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
          id="details-back"
          onEnter={onBack}
          onFocus={() => {
            lastFocusedControlRef.current = "details-back";
          }}
          variant="pill"
          className={styles.backBtn}
        >
          <ArrowLeft size={20} />
        </Focusable>

        <div className={styles.meta}>
          <h1 className={styles.title}>{movie.title}</h1>
          
          <div className={styles.stats}>
            {statItems.map((item, index) => (
              <React.Fragment key={`stat-${index}`}>
                {index > 0 && <span className={styles.dot} />}
                {item}
              </React.Fragment>
            ))}
            {statItems.length > 0 && <span className={styles.dot} />}
            <span className={styles.qualityBadge}>{detectVideoResolution(movie.title, movie.description)}</span>
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
            {movie.description || "No movie description is available for this title."}
          </Focusable>

          {/* Extended Info toggled by More Info but outside the scrollable text */}
          {isDescriptionExpanded && (movie.cast || movie.director) && (
            <div className={styles.crewInfo}>
              {movie.director && (
                <div className={styles.crewItem}>
                  <span className={styles.crewLabel}>Director</span>
                  <span className={styles.crewValue}>{movie.director}</span>
                </div>
              )}
              {movie.cast && (
                <div className={styles.crewItem}>
                  <span className={styles.crewLabel}>Cast</span>
                  <span className={styles.crewValue}>{movie.cast}</span>
                </div>
              )}
            </div>
          )}

          <div className={styles.actions}>
            <Focusable
              id="play-movie"
              onEnter={handlePlay}
              onFocus={() => {
                lastFocusedControlRef.current = "play-movie";
              }}
              className={styles.playBtn}
            >
              <Play size={24} fill="currentColor" className={styles.playIcon} />
                  <span>{resumePositionSeconds ? "Resume" : "Play Movie"}</span>
            </Focusable>
            
            <Focusable
              id="add-favorite"
              onEnter={toggleFavorite}
              onFocus={() => {
                lastFocusedControlRef.current = "add-favorite";
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
              id="toggle-description"
              onEnter={() => {
                setDescriptionExpanded((current) => !current);
              }}
              onFocus={() => {
                lastFocusedControlRef.current = "toggle-description";
              }}
              className={styles.moreBtn}
            >
              <span>{isDescriptionExpanded ? "Less Info" : "More Info"}</span>
            </Focusable>
          </div>
        </div>
      </div>
    </div>
  );
}
