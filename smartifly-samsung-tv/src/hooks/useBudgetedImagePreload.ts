import { useEffect } from "react";
import { imageFailureMemory } from "../utils/imageFailureMemory";
import { imageWarmMemory } from "../utils/imageWarmMemory";

const preloadedImageUrls = new Set<string>();
const inflightImageUrls = new Set<string>();

type GridPreloadRangeArgs = {
  itemCount: number;
  columns: number;
  rowStride: number;
  viewportHeight: number;
  anchorScrollTop: number;
  overscanRows: number;
};

export const getGridAnchorScrollTop = ({
  focusedIndex,
  columns,
  rowStride,
  fallbackScrollTop,
}: {
  focusedIndex: number;
  columns: number;
  rowStride: number;
  fallbackScrollTop: number;
}) => {
  if (focusedIndex < 0 || columns <= 0) {
    return Math.max(0, fallbackScrollTop);
  }

  const focusedRow = Math.floor(focusedIndex / columns);
  return Math.max(0, focusedRow * rowStride - rowStride);
};

export const getGridPreloadRange = ({
  itemCount,
  columns,
  rowStride,
  viewportHeight,
  anchorScrollTop,
  overscanRows,
}: GridPreloadRangeArgs) => {
  const startRow = Math.max(
    0,
    Math.floor(anchorScrollTop / rowStride) - overscanRows
  );
  const endRow = Math.max(
    startRow + 1,
    Math.ceil((anchorScrollTop + viewportHeight) / rowStride) + overscanRows
  );

  return {
    startIndex: startRow * columns,
    endIndex: Math.min(itemCount, endRow * columns),
  };
};

export const sliceImagePreloadUrls = <T>(
  items: T[],
  getUrl: (item: T) => string | undefined,
  startIndex: number,
  endIndex: number
) =>
  items
    .slice(startIndex, endIndex)
    .map(getUrl)
    .filter((url): url is string => Boolean(url));

const preloadImage = (url: string, onSettled?: () => void) => {
  if (preloadedImageUrls.has(url) || inflightImageUrls.has(url)) {
    onSettled?.();
    return;
  }

  inflightImageUrls.add(url);

  const img = new Image();
  img.decoding = "async";
  img.onload = () => {
    inflightImageUrls.delete(url);
    preloadedImageUrls.add(url);
    imageFailureMemory.markLoaded(url);
    imageWarmMemory.markWarm(url);
    onSettled?.();
  };
  img.onerror = () => {
    inflightImageUrls.delete(url);
    imageFailureMemory.markFailed(url);
    onSettled?.();
  };
  img.src = url;
};

type ImagePreloadOptions = {
  enabled: boolean;
  maxConcurrent?: number;
  maxUrls?: number;
};

export const useBudgetedImagePreload = (
  urls: string[],
  options: ImagePreloadOptions
) => {
  useEffect(() => {
    if (!options.enabled || urls.length === 0) {
      return;
    }

    const maxConcurrent = Math.max(1, options.maxConcurrent ?? 2);
    const maxUrls = Math.max(maxConcurrent, options.maxUrls ?? urls.length);
    const candidateUrls = urls
      .filter(
        (url) =>
          !preloadedImageUrls.has(url) &&
          !inflightImageUrls.has(url) &&
          !imageFailureMemory.hasFailed(url)
      )
      .slice(0, maxUrls);

    if (candidateUrls.length === 0) {
      return;
    }

    let cancelled = false;
    let nextIndex = 0;
    let activeCount = 0;

    const schedule = () => {
      if (cancelled) return;

      while (activeCount < maxConcurrent && nextIndex < candidateUrls.length) {
        const url = candidateUrls[nextIndex++];
        activeCount += 1;
        preloadImage(url, () => {
          activeCount -= 1;
          schedule();
        });
      }
    };

    schedule();

    return () => {
      cancelled = true;
    };
  }, [options.enabled, options.maxConcurrent, options.maxUrls, urls]);
};
