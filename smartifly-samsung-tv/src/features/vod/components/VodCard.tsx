import React, { useMemo, useState } from "react";
import { Focusable } from "../../../components/tv/Focusable";
import { useFocus } from "../../../providers/useFocus";
import { imageFailureMemory } from "../../../utils/imageFailureMemory";
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
}

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
}) => {
  const focusId = `card-vod-${movie.id}`;
  const { focusedId, setFocus } = useFocus();
  const isFocused = focusedId === focusId;

  const handleKeyDown = (e: React.KeyboardEvent) => {
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
          setFocus("tvkb-key-2-9"); // Focus the middle rightmost key on virtual keyboard
        } else {
          if (selectedCategoryFocusId) {
            setFocus(`vod-cat-${selectedCategoryFocusId}`);
          }
        }
      } else if (prevMovieId) {
        e.preventDefault();
        setFocus(`card-vod-${prevMovieId}`);
      }
    } else if (e.key === "ArrowRight") {
      const isRightmost = index % columns === columns - 1 || index === totalMovies - 1;
      if (isRightmost) {
        e.preventDefault();
      }
    } else if (e.key === "ArrowDown") {
      if (nextRowMovieId) {
        e.preventDefault();
        setFocus(`card-vod-${nextRowMovieId}`);
      } else {
        e.preventDefault();
        const lastRowStartIndex = Math.floor((totalMovies - 1) / columns) * columns;
        if (index < lastRowStartIndex && lastMovieId) {
          // Direct fallback to the very last movie in the grid
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
  };

  const [failedUrls, setFailedUrls] = useState<Record<string, true>>({});

  const showPoster = useMemo(() => {
    if (!movie.posterUrl) return false;
    if (imageFailureMemory.hasFailed(movie.posterUrl)) return false;
    return !failedUrls[movie.posterUrl];
  }, [movie.posterUrl, failedUrls]);

  const placeholderStyle = useMemo(
    () => ({
      background: `linear-gradient(135deg,
        hsl(${Math.abs(hashString(movie.title)) % 360}, 42%, 22%),
        hsl(${(Math.abs(hashString(movie.title)) + 60) % 360}, 32%, 14%))`,
    }),
    [movie.title]
  );

  const placeholderInitials = useMemo(() => {
    const cleanLetters = movie.title.replace(/[^a-zA-Z0-9]/g, "").trim();
    return cleanLetters.substring(0, 2).toUpperCase() || "MV";
  }, [movie.title]);

  return (
    <div className={styles.container}>
      <Focusable
        id={focusId}
        variant="none"
        disableFocusEffects
        disableAutoScroll
        onEnter={() => onClick(movie)}
        onFocus={() => onFocus?.(movie.id)}
        onKeyDown={handleKeyDown}
        className={styles.focusShell}
      >
        <div className={`${styles.card} ${isFocused ? styles.cardFocused : ""}`}>
          {showPoster ? (
            <img
              src={movie.posterUrl}
              alt={movie.title}
              loading="lazy"
              decoding="async"
              className={`${styles.poster} ${isFocused ? styles.posterFocused : ""}`}
              onError={() => {
                if (!movie.posterUrl) return;
                imageFailureMemory.markFailed(movie.posterUrl);
                setFailedUrls((prev) => ({ ...prev, [movie.posterUrl!]: true }));
              }}
            />
          ) : (
            <div className={styles.placeholder} style={placeholderStyle}>
              {placeholderInitials}
            </div>
          )}
        </div>
      </Focusable>

      {/* Title sits outside Focusable so it never clips during focused zoom state */}
      <div className={`${styles.title} ${isFocused ? styles.titleFocused : ""}`}>
        {movie.title}
      </div>
    </div>
  );
};
