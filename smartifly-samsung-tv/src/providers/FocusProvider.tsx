import React, { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { FocusContext } from "./focusContext";
import { perfMetrics } from "../utils/perfMetrics";
import { logger } from "../utils/logger";

export const FocusProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const focusedIdRef = useRef<string | null>(null);
  const focusSubscribersRef = useRef(new Set<() => void>());
  const elements = useRef<Map<string, HTMLElement>>(new Map());
  const focusScopePrefixesRef = useRef<string[] | null>(null);
  const pendingFocusIdRef = useRef<string | null>(null);
  /** Last known bounding rect of the focused element — used when the element
   *  is temporarily unmounted (virtualized card scrolled out of window). */
  const lastKnownRectRef = useRef<DOMRect | null>(null);

  /**
   * Persistent rect cache — survives between moveFocus calls.
   * Invalidated on any scroll or resize event so stale positions don't
   * cause wrong navigation. Saves 200+ getBoundingClientRect() calls per
   * keypress on large grids.
   */
  const persistentRectCacheRef = useRef<Map<HTMLElement, DOMRect>>(new Map());
  const rectCacheValidRef = useRef(false);

  const invalidateRectCache = useCallback(() => {
    if (rectCacheValidRef.current) {
      persistentRectCacheRef.current.clear();
      rectCacheValidRef.current = false;
    }
  }, []);

  useEffect(() => {
    const handler = () => invalidateRectCache();
    window.addEventListener("scroll", handler, { passive: true, capture: true });
    window.addEventListener("resize", handler, { passive: true });
    return () => {
      window.removeEventListener("scroll", handler, { capture: true });
      window.removeEventListener("resize", handler);
    };
  }, [invalidateRectCache]);

  const notifyFocusedIdSubscribers = useCallback(() => {
    focusSubscribersRef.current.forEach((listener) => listener());
  }, []);

  const subscribe = useCallback((listener: () => void) => {
    focusSubscribersRef.current.add(listener);
    return () => {
      focusSubscribersRef.current.delete(listener);
    };
  }, []);

  const getFocusedId = useCallback(() => focusedIdRef.current, []);

  const getActiveElementId = useCallback(() => {
    const activeElement = document.activeElement;
    if (!(activeElement instanceof HTMLElement)) {
      return null;
    }
    return activeElement.id || activeElement.tagName || null;
  }, []);

  const getDebugCaller = useCallback(() => {
    const stack = new Error().stack?.split("\n") ?? [];
    return stack
      .slice(2)
      .map((line) => line.trim())
      .find((line) => !line.includes("FocusProvider") && !line.includes("getDebugCaller"))
      ?? null;
  }, []);

  const blurActiveElement = useCallback(() => {
    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLElement) {
      activeElement.blur();
    }
  }, []);

  const focusElementWithoutScroll = useCallback((element: HTMLElement) => {
    if (document.activeElement === element) {
      return;
    }

    const scrollPositions: Array<{ el: HTMLElement; top: number; left: number }> = [];
    let parent = element.parentElement;
    while (parent) {
      const isVerticallyScrollable = parent.scrollHeight > parent.clientHeight;
      const isHorizontallyScrollable = parent.scrollWidth > parent.clientWidth;
      if (isVerticallyScrollable || isHorizontallyScrollable) {
        scrollPositions.push({ el: parent, top: parent.scrollTop, left: parent.scrollLeft });
      }
      parent = parent.parentElement;
    }
    const bodyTop = document.body.scrollTop;
    const bodyLeft = document.body.scrollLeft;
    const docTop = document.documentElement.scrollTop;
    const docLeft = document.documentElement.scrollLeft;

    try {
      element.focus({ preventScroll: true });
    } catch {
      element.focus();
    }

    scrollPositions.forEach(({ el, top, left }) => {
      if (el.scrollTop !== top) el.scrollTop = top;
      if (el.scrollLeft !== left) el.scrollLeft = left;
    });
    if (document.body.scrollTop !== bodyTop) document.body.scrollTop = bodyTop;
    if (document.body.scrollLeft !== bodyLeft) document.body.scrollLeft = bodyLeft;
    if (document.documentElement.scrollTop !== docTop) document.documentElement.scrollTop = docTop;
    if (document.documentElement.scrollLeft !== docLeft) document.documentElement.scrollLeft = docLeft;
  }, []);

  const isIdAllowed = useCallback((id: string | null) => {
    if (!id) return true;
    const scopePrefixes = focusScopePrefixesRef.current;
    if (!scopePrefixes || scopePrefixes.length === 0) return true;
    return scopePrefixes.some((prefix) => id.startsWith(prefix));
  }, []);

  const setFocus = useCallback(
    (id: string | null) => {
      if (!isIdAllowed(id)) return;

      if (id && !elements.current.has(id)) {
        logger.debug("focus_set_pending", {
          targetId: id,
          previousFocusedId: focusedIdRef.current,
          activeElementId: getActiveElementId(),
          caller: id.startsWith("nav-") || id === "hero-play" ? getDebugCaller() : null,
        });
        pendingFocusIdRef.current = id;
        blurActiveElement();
        return;
      }

      pendingFocusIdRef.current = null;
      if (focusedIdRef.current === id) {
        if (!id) {
          blurActiveElement();
          return;
        }

        const existingElement = elements.current.get(id);
        if (existingElement) {
          focusElementWithoutScroll(existingElement);
        }
        return;
      }
      logger.debug("focus_set_applied", {
        previousFocusedId: focusedIdRef.current,
        nextFocusedId: id,
        activeElementId: getActiveElementId(),
        caller:
          id?.startsWith("nav-") ||
          id === "hero-play" ||
          focusedIdRef.current?.startsWith("nav-") ||
          focusedIdRef.current === "hero-play"
            ? getDebugCaller()
            : null,
      });
      focusedIdRef.current = id;
      setFocusedId(id);
      notifyFocusedIdSubscribers();
      if (!id) {
        blurActiveElement();
      }
    },
    [blurActiveElement, focusElementWithoutScroll, isIdAllowed, notifyFocusedIdSubscribers]
  );

  const setFocusScope = useCallback(
    (prefixes: string[] | null, fallbackId: string | null = null) => {
      focusScopePrefixesRef.current =
        prefixes && prefixes.length > 0 ? prefixes : null;

      const currentId = focusedIdRef.current;
      if (isIdAllowed(currentId)) return;

      if (fallbackId && isIdAllowed(fallbackId)) {
        setFocus(fallbackId);
        return;
      }

      const firstAllowedId = Array.from(elements.current.keys()).find((id) =>
        isIdAllowed(id)
      );
      setFocus(firstAllowedId ?? null);
    },
    [isIdAllowed, setFocus]
  );

  const registerElement = useCallback(
    (
      id: string,
      ref: HTMLElement,
      options?: { allowGlobalAutoFocus?: boolean }
    ) => {
      elements.current.set(id, ref);
      invalidateRectCache();

      if (pendingFocusIdRef.current === id && isIdAllowed(id)) {
        logger.debug("focus_register_resolved_pending", {
          id,
          activeElementId: getActiveElementId(),
        });
        setFocus(id);
        return;
      }

      // Auto-focus first focusable element after initial registration.
      if (
        !pendingFocusIdRef.current &&
        options?.allowGlobalAutoFocus !== false &&
        !focusedIdRef.current &&
        isIdAllowed(id)
      ) {
        logger.debug("focus_register_auto_focus", {
          id,
          activeElementId: getActiveElementId(),
        });
        setFocus(id);
      }
    },
    [isIdAllowed, setFocus]
  );

  const unregisterElement = useCallback(
    (id: string) => {
      const elem = elements.current.get(id);
      if (elem) persistentRectCacheRef.current.delete(elem);
      elements.current.delete(id);
      if (pendingFocusIdRef.current === id) {
        pendingFocusIdRef.current = null;
      }
      if (focusedIdRef.current === id) {
        // ── Virtualized card guard ──────────────────────────────────────────
        // Virtualized cards unmount when scrolled out of the render window.
        // Don't reassign focus — park the ID as pending so it re-attaches
        // when the card scrolls back into view.
        const isVirtualizedCard = id.startsWith("card-");

        if (isVirtualizedCard) {
          pendingFocusIdRef.current = id;
          // focusedIdRef stays pointing at the ghost ID so moveFocus can still
          // use lastKnownRectRef to navigate spatially while the card is gone.
          return;
        }

        if (pendingFocusIdRef.current && isIdAllowed(pendingFocusIdRef.current)) {
          logger.debug("focus_unregister_preserving_pending", {
            removedId: id,
            pendingFocusId: pendingFocusIdRef.current,
            activeElementId: getActiveElementId(),
          });
          blurActiveElement();
          return;
        }

        // Non-virtualized elements: fall back to first available.
        const candidateIds = Array.from(elements.current.keys()).filter((itemId) =>
          isIdAllowed(itemId)
        );
        const preferContentFallback = !id.startsWith("nav-");
        const fallbackId =
          (preferContentFallback
            ? candidateIds.find((itemId) => !itemId.startsWith("nav-"))
            : null) ??
          candidateIds[0];
        logger.debug("focus_unregister_fallback", {
          removedId: id,
          fallbackId,
          activeElementId: getActiveElementId(),
        });
        setFocus(fallbackId ?? null);
      }
    },
    [blurActiveElement, getActiveElementId, isIdAllowed, setFocus]
  );

  // Keep lastKnownRectRef updated whenever the focused element is in the DOM.
  useEffect(() => {
    if (!focusedId) return;
    const element = elements.current.get(focusedId);
    if (element) {
      lastKnownRectRef.current = element.getBoundingClientRect();
      focusElementWithoutScroll(element);
    }
  }, [focusElementWithoutScroll, focusedId]);

  const moveFocus = useCallback((direction: "up" | "down" | "left" | "right") => {
    const perfEnabled = perfMetrics.enabled;
    const startTime = perfEnabled ? performance.now() : 0;
    let measuredRectCount = 0;
    let directionalCandidateCount = 0;

    const finalizeMetrics = (matched: boolean) => {
      if (!perfEnabled) return;
      const durationMs = performance.now() - startTime;
      perfMetrics.increment("focus_move_count");
      perfMetrics.increment("focus_move_rect_measure_count", measuredRectCount);
      perfMetrics.increment("focus_move_directional_candidate_count", directionalCandidateCount);
      if (!matched) {
        perfMetrics.increment("focus_move_no_match_count");
      }
      perfMetrics.recordDuration("focus_move_duration_ms", durationMs, {
        slowAboveMs: 16,
        data: {
          direction,
          matched,
          measuredRectCount,
          directionalCandidateCount,
        },
      });
    };

    const currentId = focusedIdRef.current;
    if (!currentId) {
      finalizeMetrics(false);
      return;
    }

    const currentElem = elements.current.get(currentId);

    // Use the persistent cross-call rect cache. Falls back to a live measurement
    // only when an element isn't cached yet. The cache is invalidated by scroll
    // and resize events, so we never serve stale layout data.
    const getRect = (element: HTMLElement): DOMRect => {
      const persistent = persistentRectCacheRef.current.get(element);
      if (persistent) return persistent;
      measuredRectCount += 1;
      const rect = element.getBoundingClientRect();
      persistentRectCacheRef.current.set(element, rect);
      rectCacheValidRef.current = true;
      return rect;
    };

    // ── Ghost focus: element is temporarily unmounted (virtualized) ──────────
    // Use the last known rect so navigation still works during key-hold while
    // the card is outside the virtual window.
    const currentRect: DOMRect | null = currentElem
      ? getRect(currentElem)
      : lastKnownRectRef.current;

    if (!currentRect) {
      finalizeMetrics(false);
      return;
    }

    // Update lastKnownRect if element is live.
    if (currentElem) {
      lastKnownRectRef.current = currentRect;
    }

    const currentRailContainer = currentElem
      ? (currentElem.closest("[id^='rail-']") as HTMLElement | null)
      : null;
    const currentRailId = currentRailContainer?.id ?? null;

    const navigationEscapeRight =
      direction === "right" && currentId.startsWith("nav-")
        ? Math.min(currentRect.right, 80)
        : currentRect.right;

    const isInLiveGrid = currentId.startsWith("card-live-");
    const currentIsNav = currentId.startsWith("nav-");
    const currentIsCard = currentId.startsWith("card-");
    const limitRightMoveToCurrentRail =
      direction === "right" && currentRailId && currentIsCard;

    let bestMatch: string | null = null;
    let minDistance = Infinity;

    elements.current.forEach((elem, id) => {
      if (id === currentId) return;
      if (!isIdAllowed(id)) return;

      const candidateIsNav = id.startsWith("nav-");
      const candidateIsCard = id.startsWith("card-");
      const candidateIsLiveCategory = id.startsWith("live-cat-");
      const candidateIsLiveGuide = id === "live-open-epg";
      const candidateIsTopBar = id.startsWith("top-");

      if ((direction === "up" || direction === "down") && candidateIsNav && !currentIsNav) {
        return;
      }

      if (isInLiveGrid && direction === "left" && candidateIsNav) {
        return;
      }

      if (isInLiveGrid) {
        if (
          direction === "up" &&
          (candidateIsLiveGuide || candidateIsLiveCategory || candidateIsTopBar)
        ) {
          return;
        }

        if (direction === "down" && (candidateIsLiveCategory || candidateIsLiveGuide)) {
          return;
        }
      }

      // Fast pre-check: skip elements that are not currently mounted or are hidden.
      if (!elem.isConnected || elem.offsetWidth === 0) return;

      // Rail containment: right moves from card- stay within same rail.
      if (limitRightMoveToCurrentRail) {
        if (!candidateIsCard) return;
        const candidateRailContainer = elem.closest("[id^='rail-']") as HTMLElement | null;
        if (candidateRailContainer?.id !== currentRailId) return;
      }

      const rect = getRect(elem);
      let isCandidate = false;
      const threshold = 10;

      switch (direction) {
        case "up":
          isCandidate = rect.bottom <= currentRect.top + threshold;
          break;
        case "down":
          isCandidate = rect.top >= currentRect.bottom - threshold;
          break;
        case "left":
          isCandidate = rect.right <= currentRect.left + threshold;
          break;
        case "right":
          isCandidate = rect.left >= navigationEscapeRight - threshold;
          break;
      }

      if (isCandidate) {
        directionalCandidateCount += 1;
        const dX = rect.left + rect.width / 2 - (currentRect.left + currentRect.width / 2);
        const dY = rect.top + rect.height / 2 - (currentRect.top + currentRect.height / 2);
        const weight = direction === "up" || direction === "down" ? 3 : 1;

        let navPenalty = 0;
        if (candidateIsNav && !currentIsNav) {
          navPenalty = direction === "left" ? 600 : 2000;
        }

        const dist =
          direction === "up" || direction === "down"
            ? Math.abs(dY) * weight + Math.abs(dX) + navPenalty
            : Math.abs(dX) * weight + Math.abs(dY) + navPenalty;

        if (dist < minDistance) {
          minDistance = dist;
          bestMatch = id;
        }
      }
    });

    if (!bestMatch && direction === "right" && currentIsNav) {
      let closestRightId: string | null = null;
      let closestRightLeft = Infinity;

      elements.current.forEach((element, id) => {
        if (id.startsWith("nav-") || !isIdAllowed(id)) return;
        if (!element.isConnected || element.offsetWidth === 0) return;

        const rect = getRect(element);
        if (rect.left < navigationEscapeRight - 10) return;

        if (rect.left < closestRightLeft) {
          closestRightLeft = rect.left;
          closestRightId = id;
        }
      });

      bestMatch = closestRightId;
    }

    if (!bestMatch && direction === "up") {
      const fallbackSearchId =
        currentId.startsWith("card-vod-") || currentId.startsWith("vod-cat-")
          ? "vod-search-input-wrapper"
          : currentId.startsWith("card-series-") || currentId.startsWith("series-cat-")
            ? "series-search-input-wrapper"
            : null;

      if (
        fallbackSearchId &&
        elements.current.has(fallbackSearchId) &&
        isIdAllowed(fallbackSearchId)
      ) {
        bestMatch = fallbackSearchId;
      }
    }

    if (!bestMatch && direction === "right" && currentIsCard) {
      finalizeMetrics(false);
      return;
    }

    if (bestMatch) {
      setFocus(bestMatch);
    }

    finalizeMetrics(Boolean(bestMatch));
  }, [isIdAllowed, setFocus]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      if (document.activeElement?.tagName === "INPUT") return;

      const currentId = focusedIdRef.current;
      const currentElement = currentId ? elements.current.get(currentId) : null;
      const key = e.key;

      if (
        currentElement &&
        currentElement.dataset.focusScrollY === "true" &&
        (key === "ArrowUp" || key === "ArrowDown")
      ) {
        const direction = key === "ArrowDown" ? 1 : -1;
        const viewportScroll = Math.max(36, Math.floor(currentElement.clientHeight * 0.6));
        const maxScrollTop = currentElement.scrollHeight - currentElement.clientHeight;
        const nextScrollTop = Math.max(
          0,
          Math.min(maxScrollTop, currentElement.scrollTop + viewportScroll * direction)
        );
        if (nextScrollTop !== currentElement.scrollTop) {
          e.preventDefault();
          currentElement.scrollTo({ top: nextScrollTop, behavior: "smooth" });
          return;
        }
      }

      switch (e.key) {
        case "ArrowUp":    e.preventDefault(); moveFocus("up");    break;
        case "ArrowDown":  e.preventDefault(); moveFocus("down");  break;
        case "ArrowLeft":  e.preventDefault(); moveFocus("left");  break;
        case "ArrowRight": e.preventDefault(); moveFocus("right"); break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [moveFocus]);

  const focusController = useMemo(
    () => ({
      getFocusedId,
      subscribe,
      setFocus,
      setFocusScope,
      registerElement,
      unregisterElement,
    }),
    [getFocusedId, subscribe, setFocus, setFocusScope, registerElement, unregisterElement]
  );

  return <FocusContext.Provider value={focusController}>{children}</FocusContext.Provider>;
};
