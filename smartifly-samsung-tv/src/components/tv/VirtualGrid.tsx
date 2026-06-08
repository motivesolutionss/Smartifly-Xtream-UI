import React, { useState, useRef, useMemo, useEffect, useCallback } from "react";
import styles from "./VirtualGrid.module.css";

// ─── Layout defaults ─────────────────────────────────────────────────────────
/** Extra rows rendered above and below the visible window.
 *  Higher value = more DOM nodes but focused row stays mounted longer during
 *  fast key-hold navigation. 4 rows at 210px = 840px buffer each side. */
const DEFAULT_OVERSCAN = 4;
const DEFAULT_BOTTOM_SAFE_AREA_PX = 100;
const DEFAULT_FOCUS_BAND = 0.35;
const SNAP_EDGE_THRESHOLD_PX = 20;
const EDGE_FEEDBACK_DURATION_MS = 400;

/** If two focus-driven scroll requests arrive within this window (ms), the
 *  second one uses "instant" to keep the viewport in sync with key-repeat. */
const INSTANT_SCROLL_THRESHOLD_MS = 120;

export type RowSnapMode = "soft" | "none";
export type EdgeFeedbackSide = "top" | "bottom" | "left" | "right" | null;
export type ScrollBehaviorMode = "adaptive" | "instant";

export interface VirtualGridProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  getItemKey?: (item: T, index: number) => string | number;
  itemHeight: number;
  itemWidth: number;
  columns: number;
  gap: number;
  containerHeight: number;
  overscan?: number;
  initialScrollTop?: number;
  focusedIndex?: number;
  onScrollTopChange?: (scrollTop: number) => void;
  rowSnapMode?: RowSnapMode;
  scrollBehaviorMode?: ScrollBehaviorMode;
  focusBand?: number;
  bottomSafeArea?: number;
  edgeFeedback?: boolean;
  onEdgeReached?: (side: EdgeFeedbackSide) => void;
}

export function VirtualGrid<T>({
  items,
  renderItem,
  getItemKey,
  itemHeight,
  itemWidth: itemWidthProp,
  columns,
  gap,
  containerHeight,
  overscan = DEFAULT_OVERSCAN,
  initialScrollTop = 0,
  focusedIndex,
  onScrollTopChange,
  rowSnapMode = "soft",
  scrollBehaviorMode = "adaptive",
  focusBand = DEFAULT_FOCUS_BAND,
  bottomSafeArea = DEFAULT_BOTTOM_SAFE_AREA_PX,
  edgeFeedback = true,
  onEdgeReached,
}: VirtualGridProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const [edgeSide, setEdgeSide] = useState<EdgeFeedbackSide>(null);
  const [measuredWidth, setMeasuredWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const edgeTimerRef = useRef<number | null>(null);
  const scrollRafRef = useRef<number | null>(null);
  const pendingScrollTopRef = useRef(0);
  const prevFocusedIndexRef = useRef<number | undefined>(undefined);
  const lastScrollRequestRef = useRef<number>(0);

  // Measure the viewport width so item widths fill it exactly.
  // This is more reliable than measuring an outer container.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      if (el.offsetWidth > 0) setMeasuredWidth(el.offsetWidth);
    });
    ro.observe(el);
    if (el.offsetWidth > 0) setMeasuredWidth(el.offsetWidth);
    return () => ro.disconnect();
  }, []);

  // Compute item width from measured viewport — fills all columns exactly.
  const itemWidth = measuredWidth > 0
    ? Math.floor((measuredWidth - (columns - 1) * gap) / columns)
    : itemWidthProp;

  const totalRows = Math.ceil(items.length / columns);
  const rowStride = itemHeight + gap;
  const totalHeight = totalRows * rowStride - gap + bottomSafeArea;

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const next = e.currentTarget.scrollTop;
    pendingScrollTopRef.current = next;
    onScrollTopChange?.(next);
    if (scrollRafRef.current !== null) return;

    scrollRafRef.current = window.requestAnimationFrame(() => {
      scrollRafRef.current = null;
      setScrollTop((current) =>
        Math.abs(current - pendingScrollTopRef.current) < 1
          ? current
          : pendingScrollTopRef.current
      );
    });
  }, [onScrollTopChange]);

  // Restore scroll position on mount only.
  useEffect(() => {
    const viewport = containerRef.current;
    if (!viewport) return;
    if (Math.abs(viewport.scrollTop - initialScrollTop) < 1) return;
    viewport.scrollTop = initialScrollTop;
    pendingScrollTopRef.current = initialScrollTop;
    setScrollTop(initialScrollTop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Focus-driven scrolling with adaptive smooth/instant behavior.
  useEffect(() => {
    if (focusedIndex === undefined || focusedIndex < 0) return;
    const viewport = containerRef.current;
    if (!viewport) return;

    const row = Math.floor(focusedIndex / columns);
    const itemTop = row * rowStride;
    const itemBottom = itemTop + itemHeight;
    const viewportTop = viewport.scrollTop;
    const viewportBottom = viewportTop + containerHeight;

    // Detect key-hold: if another scroll was requested very recently, use
    // "instant" so the viewport catches up before the next keypress fires.
    const now = performance.now();
    const isRapidFire = now - lastScrollRequestRef.current < INSTANT_SCROLL_THRESHOLD_MS;
    lastScrollRequestRef.current = now;
    const scrollBehavior: ScrollBehavior =
      scrollBehaviorMode === "instant" ? "instant" : (isRapidFire ? "instant" : "smooth");

    if (rowSnapMode === "soft") {
      const bandCenter = containerHeight * focusBand;
      const idealTop = Math.max(0, itemTop - bandCenter);
      const tooHigh = itemTop < viewportTop + SNAP_EDGE_THRESHOLD_PX;
      const tooLow = itemBottom > viewportBottom - SNAP_EDGE_THRESHOLD_PX;
      if (tooHigh || tooLow) {
        viewport.scrollTo({ top: idealTop, behavior: scrollBehavior });
      }
    } else {
      if (itemTop < viewportTop) {
        // Minimal reveal: only move enough to bring the focused row into view.
        viewport.scrollTo({ top: Math.max(0, itemTop), behavior: scrollBehavior });
      } else if (itemBottom > viewportBottom - gap) {
        // Minimal reveal: align focused row to the bottom edge without recentering.
        viewport.scrollTo({ top: Math.max(0, itemBottom - containerHeight), behavior: scrollBehavior });
      }
    }

    // Edge feedback.
    if (edgeFeedback && prevFocusedIndexRef.current !== undefined) {
      const prev = prevFocusedIndexRef.current;
      const prevRow = Math.floor(prev / columns);
      const prevCol = prev % columns;
      const curRow = Math.floor(focusedIndex / columns);
      const curCol = focusedIndex % columns;

      let side: EdgeFeedbackSide = null;
      if (curRow === prevRow && curCol === prevCol) {
        if (curRow === 0) side = "top";
        else if (curRow === totalRows - 1) side = "bottom";
        else if (curCol === 0) side = "left";
        else if (curCol === columns - 1 || focusedIndex === items.length - 1) side = "right";
      }

      if (side) {
        if (edgeTimerRef.current !== null) window.clearTimeout(edgeTimerRef.current);
        setEdgeSide(side);
        onEdgeReached?.(side);
        edgeTimerRef.current = window.setTimeout(() => {
          setEdgeSide(null);
          edgeTimerRef.current = null;
        }, EDGE_FEEDBACK_DURATION_MS);
      }
    }

    prevFocusedIndexRef.current = focusedIndex;
  }, [
    focusedIndex, columns, rowStride, itemHeight, gap,
    containerHeight, rowSnapMode, scrollBehaviorMode, focusBand, edgeFeedback,
    totalRows, items.length, onEdgeReached,
  ]);

  useEffect(() => {
    return () => {
      if (edgeTimerRef.current !== null) window.clearTimeout(edgeTimerRef.current);
      if (scrollRafRef.current !== null) window.cancelAnimationFrame(scrollRafRef.current);
    };
  }, []);

  const visibleRange = useMemo(() => {
    const startRow = Math.max(0, Math.floor(scrollTop / rowStride) - overscan);
    const endRow = Math.min(
      totalRows,
      Math.ceil((scrollTop + containerHeight) / rowStride) + overscan
    );
    return {
      start: startRow * columns,
      end: Math.min(items.length, endRow * columns),
    };
  }, [scrollTop, containerHeight, rowStride, columns, totalRows, items.length, overscan]);

  return (
    <div
      ref={containerRef}
      className={`${styles.viewport} ${edgeSide ? styles[`edge_${edgeSide}`] : ""}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div className={styles.canvas} style={{ height: totalHeight }}>
        {items.slice(visibleRange.start, visibleRange.end).map((item, index) => {
          const absoluteIndex = visibleRange.start + index;
          const row = Math.floor(absoluteIndex / columns);
          const col = absoluteIndex % columns;
          const itemKey = getItemKey ? getItemKey(item, absoluteIndex) : absoluteIndex;
          return (
            <div
              key={itemKey}
              className={styles.itemWrapper}
              style={{
                top: row * rowStride,
                left: col * (itemWidth + gap),
                width: itemWidth,
                height: itemHeight,
              }}
            >
              {renderItem(item, absoluteIndex)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
