import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Focusable } from "../../../components/tv/Focusable";
import { useFocus } from "../../../providers/useFocus";
import { imageFailureMemory } from "../../../utils/imageFailureMemory";
import { imageWarmMemory } from "../../../utils/imageWarmMemory";
import { perfMetrics } from "../../../utils/perfMetrics";
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
  shouldLoadPoster: boolean;
}

type SeriesCardVisualProps = {
  isFocused: boolean;
  placeholderBackground: string;
  placeholderInitials: string;
  posterUrl?: string;
  showPoster: boolean;
  onPosterError: () => void;
  onPosterLoad: () => void;
};

const SeriesCardVisual = memo(
  function SeriesCardVisual({
    isFocused,
    placeholderBackground,
    placeholderInitials,
    posterUrl,
    showPoster,
    onPosterError,
    onPosterLoad,
  }: SeriesCardVisualProps) {
    useEffect(() => {
      perfMetrics.increment("series_card_visual_render_count");
    });

    return (
      <div className={`${styles.card} ${isFocused ? styles.cardFocused : ""}`}>
        {showPoster ? (
          <img
            src={posterUrl}
            alt=""
            loading="lazy"
            decoding="async"
            className={`${styles.poster} ${isFocused ? styles.posterFocused : ""}`}
            onLoad={onPosterLoad}
            onError={onPosterError}
          />
        ) : (
          <div
            className={styles.placeholder}
            style={{ background: placeholderBackground }}
          >
            {placeholderInitials}
          </div>
        )}
      </div>
    );
  },
  (previousProps, nextProps) =>
    previousProps.isFocused === nextProps.isFocused &&
    previousProps.placeholderBackground === nextProps.placeholderBackground &&
    previousProps.placeholderInitials === nextProps.placeholderInitials &&
    previousProps.posterUrl === nextProps.posterUrl &&
    previousProps.showPoster === nextProps.showPoster
);

SeriesCardVisual.displayName = "SeriesCardVisual";

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
  shouldLoadPoster,
}) => {
  const focusId = `card-series-${seriesItem.id}`;
  const { focusedId, setFocus } = useFocus();
  const isFocused = focusedId === focusId;

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
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
            setFocus("tvkb-key-2-9");
          } else if (selectedCategoryFocusId) {
            setFocus(`series-cat-${selectedCategoryFocusId}`);
          }
        } else if (prevSeriesId) {
          e.preventDefault();
          setFocus(`card-series-${prevSeriesId}`);
        }
      } else if (e.key === "ArrowRight") {
        const isRightmost =
          index % columns === columns - 1 || index === totalSeries - 1;
        if (isRightmost) {
          e.preventDefault();
        }
      } else if (e.key === "ArrowDown") {
        if (nextRowSeriesId) {
          e.preventDefault();
          setFocus(`card-series-${nextRowSeriesId}`);
        } else {
          e.preventDefault();
          const lastRowStartIndex =
            Math.floor((totalSeries - 1) / columns) * columns;
          if (index < lastRowStartIndex && lastSeriesId) {
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
    },
    [
      columns,
      index,
      isSearching,
      lastSeriesId,
      nextRowSeriesId,
      prevRowSeriesId,
      prevSeriesId,
      selectedCategoryFocusId,
      setFocus,
      totalSeries,
    ]
  );

  const [failedPosterUrl, setFailedPosterUrl] = useState<string | null>(null);
  const imageLoadStartedAtRef = useRef<number | null>(null);

  const showPoster = useMemo(() => {
    if (!seriesItem.posterUrl) return false;
    if (!shouldLoadPoster && !imageWarmMemory.hasWarm(seriesItem.posterUrl)) return false;
    if (imageFailureMemory.hasFailed(seriesItem.posterUrl)) return false;
    return failedPosterUrl !== seriesItem.posterUrl;
  }, [failedPosterUrl, seriesItem.posterUrl, shouldLoadPoster]);

  const placeholderBackground = useMemo(
    () =>
      `linear-gradient(135deg,
        hsl(${Math.abs(hashString(seriesItem.title)) % 360}, 42%, 22%),
        hsl(${(Math.abs(hashString(seriesItem.title)) + 60) % 360}, 32%, 14%))`,
    [seriesItem.title]
  );

  const placeholderInitials = useMemo(() => {
    const cleanLetters = seriesItem.title.replace(/[^a-zA-Z0-9]/g, "").trim();
    return cleanLetters.substring(0, 2).toUpperCase() || "TV";
  }, [seriesItem.title]);

  const handleEnter = useCallback(
    () => onClick(seriesItem),
    [onClick, seriesItem]
  );
  const handleFocus = useCallback(
    () => onFocus?.(seriesItem.id),
    [onFocus, seriesItem.id]
  );
  useEffect(() => {
    if (showPoster && seriesItem.posterUrl) {
      imageLoadStartedAtRef.current = performance.now();
      return;
    }

    imageLoadStartedAtRef.current = null;
  }, [seriesItem.posterUrl, showPoster]);

  const handlePosterLoad = useCallback(() => {
    if (seriesItem.posterUrl) {
      imageFailureMemory.markLoaded(seriesItem.posterUrl);
      imageWarmMemory.markWarm(seriesItem.posterUrl);
    }
    perfMetrics.increment("series_card_poster_load_success_count");
    if (imageLoadStartedAtRef.current !== null) {
      perfMetrics.recordDuration(
        "series_card_poster_load_ms",
        performance.now() - imageLoadStartedAtRef.current,
        { slowAboveMs: 300, data: { seriesId: seriesItem.id }, logSlowEvent: false }
      );
    }
    imageLoadStartedAtRef.current = null;
  }, [seriesItem.id, seriesItem.posterUrl]);
  const handlePosterError = useCallback(() => {
    if (!seriesItem.posterUrl) return;
    perfMetrics.increment("series_card_poster_load_error_count");
    if (imageLoadStartedAtRef.current !== null) {
      perfMetrics.recordDuration(
        "series_card_poster_error_ms",
        performance.now() - imageLoadStartedAtRef.current,
        { slowAboveMs: 300, data: { seriesId: seriesItem.id }, logSlowEvent: false }
      );
    }
    imageLoadStartedAtRef.current = null;
    imageFailureMemory.markFailed(seriesItem.posterUrl);
    setFailedPosterUrl(seriesItem.posterUrl);
  }, [seriesItem.id, seriesItem.posterUrl]);

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
        <SeriesCardVisual
          isFocused={isFocused}
          placeholderBackground={placeholderBackground}
          placeholderInitials={placeholderInitials}
          posterUrl={seriesItem.posterUrl}
          showPoster={showPoster}
          onPosterLoad={handlePosterLoad}
          onPosterError={handlePosterError}
        />
      </Focusable>

      <div className={`${styles.title} ${isFocused ? styles.titleFocused : ""}`}>
        {seriesItem.title}
      </div>
    </div>
  );
};
