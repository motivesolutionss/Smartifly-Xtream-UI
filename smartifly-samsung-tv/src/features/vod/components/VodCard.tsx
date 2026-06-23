import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Focusable } from "../../../components/tv/Focusable";
import { useFocusActions, useIsFocused } from "../../../providers/useFocus";
import { imageFailureMemory } from "../../../utils/imageFailureMemory";
import { imageWarmMemory } from "../../../utils/imageWarmMemory";
import { perfMetrics } from "../../../utils/perfMetrics";
import type { AppMovie } from "../../../types/appModels";
import styles from "./VodCard.module.css";

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0;
  }
  return hash;
}

interface VodCardProps {
  movie: AppMovie;
  index: number;
  prevMovieId?: string;
  nextRowMovieId?: string;
  prevRowMovieId?: string;
  totalMovies: number;
  lastMovieId?: string;
  selectedCategoryFocusId?: string;
  onClick: (movie: AppMovie) => void;
  onFocus?: (movieId: string) => void;
  columns: number;
  isSearching: boolean;
  shouldLoadPoster: boolean;
}

type VodCardVisualProps = {
  isFocused: boolean;
  placeholderBackground: string;
  placeholderInitials: string;
  posterUrl?: string;
  showPoster: boolean;
  posterLoaded: boolean;
  onPosterError: () => void;
  onPosterLoad: () => void;
};

const VodCardVisual = memo(
  function VodCardVisual({
    isFocused,
    placeholderBackground,
    placeholderInitials,
    posterUrl,
    showPoster,
    posterLoaded,
    onPosterError,
    onPosterLoad,
  }: VodCardVisualProps) {
    useEffect(() => {
      perfMetrics.increment("vod_card_visual_render_count");
    }, []);

    return (
      <div className={`${styles.card} ${isFocused ? styles.cardFocused : ""}`}>
        {(!showPoster || !posterLoaded) && (
          <div
            className={styles.placeholder}
            style={{ background: placeholderBackground }}
          >
            {placeholderInitials}
          </div>
        )}
        {showPoster ? (
          <img
            src={posterUrl}
            alt=""
            loading="lazy"
            decoding="async"
            className={`${styles.poster} ${
              posterLoaded ? styles.posterLoaded : styles.posterLoading
            } ${isFocused ? styles.posterFocused : ""}`}
            onLoad={onPosterLoad}
            onError={onPosterError}
          />
        ) : null}
      </div>
    );
  },
  (previousProps, nextProps) =>
    previousProps.isFocused === nextProps.isFocused &&
    previousProps.placeholderBackground === nextProps.placeholderBackground &&
    previousProps.placeholderInitials === nextProps.placeholderInitials &&
    previousProps.posterUrl === nextProps.posterUrl &&
    previousProps.posterLoaded === nextProps.posterLoaded &&
    previousProps.showPoster === nextProps.showPoster
);

VodCardVisual.displayName = "VodCardVisual";

export const VodCard: React.FC<VodCardProps> = ({
  movie,
  index,
  prevMovieId,
  nextRowMovieId,
  prevRowMovieId,
  totalMovies,
  lastMovieId,
  selectedCategoryFocusId,
  onClick,
  onFocus,
  columns,
  isSearching,
  shouldLoadPoster,
}) => {
  const focusId = `card-vod-${movie.id}`;
  const { setFocus } = useFocusActions();
  const isFocused = useIsFocused(focusId);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const focusSearchInput = () => {
        setFocus("vod-search-input-wrapper");
        window.requestAnimationFrame(() => {
          setFocus("vod-search-input-wrapper");
        });
      };

      if (e.key === "ArrowLeft") {
        const isLeftmost = index % columns === 0;
        if (isLeftmost) {
          e.preventDefault();
          if (isSearching) {
            setFocus("tvkb-key-2-9");
          } else if (selectedCategoryFocusId) {
            setFocus(`vod-cat-${selectedCategoryFocusId}`);
          }
        } else if (prevMovieId) {
          e.preventDefault();
          setFocus(`card-vod-${prevMovieId}`);
        }
      } else if (e.key === "ArrowRight") {
        const isRightmost =
          index % columns === columns - 1 || index === totalMovies - 1;
        if (isRightmost) {
          e.preventDefault();
        }
      } else if (e.key === "ArrowDown") {
        if (nextRowMovieId) {
          e.preventDefault();
          setFocus(`card-vod-${nextRowMovieId}`);
        } else {
          e.preventDefault();
          const lastRowStartIndex =
            Math.floor((totalMovies - 1) / columns) * columns;
          if (index < lastRowStartIndex && lastMovieId) {
            setFocus(`card-vod-${lastMovieId}`);
          }
        }
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (prevRowMovieId) {
          setFocus(`card-vod-${prevRowMovieId}`);
        } else {
          focusSearchInput();
        }
      }
    },
    [
      columns,
      index,
      isSearching,
      lastMovieId,
      nextRowMovieId,
      prevMovieId,
      prevRowMovieId,
      selectedCategoryFocusId,
      setFocus,
      totalMovies,
    ]
  );

  const [failedPosterUrl, setFailedPosterUrl] = useState<string | null>(null);
  const [posterLoaded, setPosterLoaded] = useState(false);
  const imageLoadStartedAtRef = useRef<number | null>(null);

  const showPoster = useMemo(() => {
    if (!movie.posterUrl) return false;
    if (!shouldLoadPoster && !imageWarmMemory.hasWarm(movie.posterUrl)) return false;
    if (imageFailureMemory.hasFailed(movie.posterUrl)) return false;
    return failedPosterUrl !== movie.posterUrl;
  }, [failedPosterUrl, movie.posterUrl, shouldLoadPoster]);

  const placeholderBackground = useMemo(
    () =>
      `linear-gradient(135deg,
        hsl(${Math.abs(hashString(movie.title)) % 360}, 42%, 22%),
        hsl(${(Math.abs(hashString(movie.title)) + 60) % 360}, 32%, 14%))`,
    [movie.title]
  );

  const placeholderInitials = useMemo(() => {
    const cleanLetters = movie.title.replace(/[^a-zA-Z0-9]/g, "").trim();
    return cleanLetters.substring(0, 2).toUpperCase() || "MV";
  }, [movie.title]);

  const handleEnter = useCallback(() => onClick(movie), [movie, onClick]);
  const handleFocus = useCallback(() => onFocus?.(movie.id), [movie.id, onFocus]);

  useEffect(() => {
    setPosterLoaded(false);
  }, [movie.posterUrl]);

  useEffect(() => {
    if (showPoster && movie.posterUrl) {
      imageLoadStartedAtRef.current = performance.now();
      return;
    }

    imageLoadStartedAtRef.current = null;
  }, [movie.posterUrl, showPoster]);

  const handlePosterLoad = useCallback(() => {
    if (movie.posterUrl) {
      imageFailureMemory.markLoaded(movie.posterUrl);
      imageWarmMemory.markWarm(movie.posterUrl);
    }
    setPosterLoaded(true);
    perfMetrics.increment("vod_card_poster_load_success_count");
    if (imageLoadStartedAtRef.current !== null) {
      perfMetrics.recordDuration(
        "vod_card_poster_load_ms",
        performance.now() - imageLoadStartedAtRef.current,
        { slowAboveMs: 300, data: { movieId: movie.id }, logSlowEvent: false }
      );
    }
    imageLoadStartedAtRef.current = null;
  }, [movie.id, movie.posterUrl]);
  const handlePosterError = useCallback(() => {
    if (!movie.posterUrl) return;
    perfMetrics.increment("vod_card_poster_load_error_count");
    if (imageLoadStartedAtRef.current !== null) {
      perfMetrics.recordDuration(
        "vod_card_poster_error_ms",
        performance.now() - imageLoadStartedAtRef.current,
        { slowAboveMs: 300, data: { movieId: movie.id }, logSlowEvent: false }
      );
    }
    imageLoadStartedAtRef.current = null;
    imageFailureMemory.markFailed(movie.posterUrl);
    setPosterLoaded(false);
    setFailedPosterUrl(movie.posterUrl);
  }, [movie.id, movie.posterUrl]);

  return (
    <div className={styles.container}>
      <Focusable
        id={focusId}
        variant="none"
        disableFocusEffects
        disableAutoScroll
        onEnter={handleEnter}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        className={styles.focusShell}
      >
        <VodCardVisual
          isFocused={isFocused}
          placeholderBackground={placeholderBackground}
          placeholderInitials={placeholderInitials}
          posterUrl={movie.posterUrl}
          showPoster={showPoster}
          posterLoaded={posterLoaded}
          onPosterLoad={handlePosterLoad}
          onPosterError={handlePosterError}
        />
      </Focusable>

      <div className={`${styles.title} ${isFocused ? styles.titleFocused : ""}`}>
        {movie.title}
      </div>
    </div>
  );
};
