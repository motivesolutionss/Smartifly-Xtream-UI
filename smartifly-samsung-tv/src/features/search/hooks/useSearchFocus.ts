import { useEffect, useRef } from "react";

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

type UseSearchFocusParams = {
  focusedId: string | null;
  debouncedQuery: string;
  selectedMovieId: string | null;
  selectedSeriesId: string | null;
  setFocus: (id: string | null) => void;
  resultRailClassName: string;
  resultRowClassName: string;
};

export const useSearchFocus = ({
  focusedId,
  debouncedQuery,
  selectedMovieId,
  selectedSeriesId,
  setFocus,
  resultRailClassName,
  resultRowClassName,
}: UseSearchFocusParams) => {
  const pageRef = useRef<HTMLDivElement | null>(null);
  const lastFocusedIdRef = useRef<string>("search-input");
  const wasInDetailsRef = useRef(false);
  const focusScrollRafRef = useRef<number | null>(null);
  const pendingFocusIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!pageRef.current) return;
    if (!debouncedQuery) {
      pageRef.current.scrollTop = 0;
    }
  }, [debouncedQuery]);

  useEffect(() => {
    if (!focusedId) return;
    pendingFocusIdRef.current = focusedId;

    if (focusScrollRafRef.current !== null) {
      window.cancelAnimationFrame(focusScrollRafRef.current);
    }

    focusScrollRafRef.current = window.requestAnimationFrame(() => {
      focusScrollRafRef.current = null;
      const targetFocusId = pendingFocusIdRef.current;
      if (!targetFocusId) return;

      const focusedEl = document.getElementById(targetFocusId);
      if (!focusedEl) return;

      if (targetFocusId.startsWith("search-result-")) {
        const cardContainer = focusedEl.parentElement;
        const railEl = focusedEl.closest(`.${resultRailClassName}`) as HTMLDivElement | null;
        if (cardContainer && railEl) {
          const focusedIndex = Number.parseInt(
            targetFocusId.slice(targetFocusId.lastIndexOf("-") + 1),
            10
          );

          if (Number.isFinite(focusedIndex) && focusedIndex === 0) {
            if (railEl.scrollLeft !== 0) {
              railEl.scrollLeft = 0;
            }
          } else {
            const cardLeft = getOffsetLeftWithinAncestor(cardContainer as HTMLElement, railEl);
            const cardWidth = (cardContainer as HTMLElement).offsetWidth;
            const currentScrollLeft = railEl.scrollLeft;
            const viewportWidth = railEl.clientWidth;
            const railStyles = window.getComputedStyle(railEl);
            const leftInset = parseFloat(railStyles.paddingLeft) || 24;
            const rightInset = parseFloat(railStyles.paddingRight) || 24;

            if (cardLeft < currentScrollLeft + leftInset) {
              const nextLeft = Math.max(0, cardLeft - leftInset);
              if (Math.abs(currentScrollLeft - nextLeft) > 1) {
                railEl.scrollLeft = nextLeft;
              }
            } else if (cardLeft + cardWidth > currentScrollLeft + viewportWidth - rightInset) {
              const nextLeft = cardLeft + cardWidth - viewportWidth + rightInset;
              if (Math.abs(currentScrollLeft - nextLeft) > 1) {
                railEl.scrollLeft = nextLeft;
              }
            }
          }
        }

        const rowEl = focusedEl.closest(`.${resultRowClassName}`) as HTMLDivElement | null;
        if (rowEl && pageRef.current) {
          const absoluteRowTop = getOffsetTopWithinAncestor(rowEl, pageRef.current);
          const rowHeight = rowEl.offsetHeight;
          const containerHeight = pageRef.current.clientHeight;
          const verticalTarget = Math.max(
            0,
            absoluteRowTop - containerHeight / 2 + rowHeight / 2
          );
          if (Math.abs(pageRef.current.scrollTop - verticalTarget) > 1) {
            pageRef.current.scrollTop = verticalTarget;
          }
        }
      } else if (
        targetFocusId === "search-input" ||
        targetFocusId === "search-mic" ||
        targetFocusId.startsWith("search-suggest-") ||
        targetFocusId.startsWith("search-key-")
      ) {
        if (pageRef.current && pageRef.current.scrollTop !== 0) {
          pageRef.current.scrollTop = 0;
        }
      }
    });
  }, [focusedId, resultRailClassName, resultRowClassName]);

  useEffect(() => {
    return () => {
      if (focusScrollRafRef.current !== null) {
        window.cancelAnimationFrame(focusScrollRafRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const inDetails = Boolean(selectedMovieId || selectedSeriesId);
    if (inDetails) {
      wasInDetailsRef.current = true;
      return;
    }

    if (wasInDetailsRef.current) {
      wasInDetailsRef.current = false;
      const target = lastFocusedIdRef.current || "search-input";
      let raf2 = 0;
      const raf1 = window.requestAnimationFrame(() => {
        raf2 = window.requestAnimationFrame(() => setFocus(target));
      });
      return () => {
        window.cancelAnimationFrame(raf1);
        if (raf2) window.cancelAnimationFrame(raf2);
      };
    }
  }, [selectedMovieId, selectedSeriesId, setFocus]);

  return {
    pageRef,
    rememberFocus: (id: string) => {
      lastFocusedIdRef.current = id;
    },
  };
};
