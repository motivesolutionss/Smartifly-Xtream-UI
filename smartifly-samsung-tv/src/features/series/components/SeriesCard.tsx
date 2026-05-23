import React, { useMemo, useState } from "react";
import { Focusable } from "../../../components/tv/Focusable";
import { useFocus } from "../../../providers/useFocus";
import { imageFailureMemory } from "../../../utils/imageFailureMemory";
import type { AppSeries } from "../../../types/appModels";
import styles from "./SeriesCard.module.css";

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0;
  }
  return hash;
}

interface SeriesCardProps {
  seriesItem: AppSeries;
  index: number;
  prevSeriesId?: string;
  nextRowSeriesId?: string;
  prevRowSeriesId?: string;
  totalSeries: number;
  lastSeriesId?: string;
  selectedCategoryFocusId?: string;
  onClick: (seriesItem: AppSeries) => void;
  onFocus?: (seriesId: string) => void;
  columns: number;
  isSearching: boolean;
}

export const SeriesCard: React.FC<SeriesCardProps> = ({
  seriesItem,
  index,
  prevSeriesId,
  nextRowSeriesId,
  prevRowSeriesId,
  totalSeries,
  lastSeriesId,
  selectedCategoryFocusId,
  onClick,
  onFocus,
  columns,
  isSearching,
}) => {
  const focusId = `card-series-${seriesItem.id}`;
  const { focusedId, setFocus } = useFocus();
  const isFocused = focusedId === focusId;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const focusSearchInput = () => {
      setFocus("series-search-input-wrapper");
      window.requestAnimationFrame(() => {
        setFocus("series-search-input-wrapper");
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
            setFocus(`series-cat-${selectedCategoryFocusId}`);
          }
        }
      } else if (prevSeriesId) {
        e.preventDefault();
        setFocus(`card-series-${prevSeriesId}`);
      }
    } else if (e.key === "ArrowRight") {
      const isRightmost = index % columns === columns - 1 || index === totalSeries - 1;
      if (isRightmost) {
        e.preventDefault();
      }
    } else if (e.key === "ArrowDown") {
      if (nextRowSeriesId) {
        e.preventDefault();
        setFocus(`card-series-${nextRowSeriesId}`);
      } else {
        e.preventDefault();
        const lastRowStartIndex = Math.floor((totalSeries - 1) / columns) * columns;
        if (index < lastRowStartIndex && lastSeriesId) {
          // Direct fallback to the very last series in the grid
          setFocus(`card-series-${lastSeriesId}`);
        }
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (prevRowSeriesId) {
        setFocus(`card-series-${prevRowSeriesId}`);
      } else {
        focusSearchInput();
      }
    }
  };

  const [failedUrls, setFailedUrls] = useState<Record<string, true>>({});

  const showPoster = useMemo(() => {
    if (!seriesItem.posterUrl) return false;
    if (imageFailureMemory.hasFailed(seriesItem.posterUrl)) return false;
    return !failedUrls[seriesItem.posterUrl];
  }, [seriesItem.posterUrl, failedUrls]);

  const placeholderStyle = useMemo(
    () => ({
      background: `linear-gradient(135deg,
        hsl(${Math.abs(hashString(seriesItem.title)) % 360}, 42%, 22%),
        hsl(${(Math.abs(hashString(seriesItem.title)) + 60) % 360}, 32%, 14%))`,
    }),
    [seriesItem.title]
  );

  const placeholderInitials = useMemo(() => {
    const cleanLetters = seriesItem.title.replace(/[^a-zA-Z0-9]/g, "").trim();
    return cleanLetters.substring(0, 2).toUpperCase() || "TV";
  }, [seriesItem.title]);

  return (
    <div className={styles.container}>
      <Focusable
        id={focusId}
        variant="none"
        disableFocusEffects
        disableAutoScroll
        onEnter={() => onClick(seriesItem)}
        onFocus={() => onFocus?.(seriesItem.id)}
        onKeyDown={handleKeyDown}
        className={styles.focusShell}
      >
        <div className={`${styles.card} ${isFocused ? styles.cardFocused : ""}`}>
          {showPoster ? (
            <img
              src={seriesItem.posterUrl}
              alt={seriesItem.title}
              loading="lazy"
              decoding="async"
              className={`${styles.poster} ${isFocused ? styles.posterFocused : ""}`}
              onError={() => {
                if (!seriesItem.posterUrl) return;
                imageFailureMemory.markFailed(seriesItem.posterUrl);
                setFailedUrls((prev) => ({ ...prev, [seriesItem.posterUrl!]: true }));
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
        {seriesItem.title}
      </div>
    </div>
  );
};
