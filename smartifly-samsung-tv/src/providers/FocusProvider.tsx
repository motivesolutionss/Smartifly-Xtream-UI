import React, { useState, useCallback, useEffect, useRef } from "react";
import { FocusContext } from "./focusContext";

export const FocusProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const focusedIdRef = useRef<string | null>(null);
  const elements = useRef<Map<string, HTMLElement>>(new Map());
  const focusScopePrefixesRef = useRef<string[] | null>(null);
  const pendingFocusIdRef = useRef<string | null>(null);
  /** Last known bounding rect of the focused element — used when the element
   *  is temporarily unmounted (virtualized card scrolled out of window). */
  const lastKnownRectRef = useRef<DOMRect | null>(null);

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
        pendingFocusIdRef.current = id;
        return;
      }

      pendingFocusIdRef.current = null;
      focusedIdRef.current = id;
      setFocusedId((currentId) => (currentId === id ? currentId : id));
    },
    [isIdAllowed]
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
    (id: string, ref: HTMLElement) => {
      elements.current.set(id, ref);

      if (pendingFocusIdRef.current === id && isIdAllowed(id)) {
        setFocus(id);
        return;
      }

      // Auto-focus first focusable element after initial registration.
      if (!focusedIdRef.current && isIdAllowed(id)) {
        setFocus(id);
      }
    },
    [isIdAllowed, setFocus]
  );

  const unregisterElement = useCallback(
    (id: string) => {
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

        // Non-virtualized elements: fall back to first available.
        const fallbackId = Array.from(elements.current.keys()).find((itemId) =>
          isIdAllowed(itemId)
        );
        setFocus(fallbackId ?? null);
      }
    },
    [isIdAllowed, setFocus]
  );

  // Keep lastKnownRectRef updated whenever the focused element is in the DOM.
  useEffect(() => {
    if (!focusedId) return;
    const element = elements.current.get(focusedId);
    if (element) {
      lastKnownRectRef.current = element.getBoundingClientRect();
      if (document.activeElement !== element) {
        // Save exact scroll positions of all parent layout nodes to bypass browser-native shifts
        const scrollPositions: Array<{ el: HTMLElement; top: number; left: number }> = [];
        let parent = element.parentElement;
        while (parent) {
          scrollPositions.push({ el: parent, top: parent.scrollTop, left: parent.scrollLeft });
          parent = parent.parentElement;
        }
        const bodyTop = document.body.scrollTop;
        const bodyLeft = document.body.scrollLeft;
        const docTop = document.documentElement.scrollTop;
        const docLeft = document.documentElement.scrollLeft;

        try {
          element.focus({ preventScroll: true });
        } catch (e) {
          element.focus();
        }

        // Instantly restore parent scroll positions in the same tick
        scrollPositions.forEach(({ el, top, left }) => {
          if (el.scrollTop !== top) el.scrollTop = top;
          if (el.scrollLeft !== left) el.scrollLeft = left;
        });
        if (document.body.scrollTop !== bodyTop) document.body.scrollTop = bodyTop;
        if (document.body.scrollLeft !== bodyLeft) document.body.scrollLeft = bodyLeft;
        if (document.documentElement.scrollTop !== docTop) document.documentElement.scrollTop = docTop;
        if (document.documentElement.scrollLeft !== docLeft) document.documentElement.scrollLeft = docLeft;
      }
    }
  }, [focusedId]);

  const moveFocus = useCallback((direction: "up" | "down" | "left" | "right") => {
    const currentId = focusedIdRef.current;
    if (!currentId) return;

    const currentElem = elements.current.get(currentId);

    // ── Ghost focus: element is temporarily unmounted (virtualized) ──────────
    // Use the last known rect so navigation still works during key-hold while
    // the card is outside the virtual window.
    const currentRect: DOMRect | null = currentElem
      ? currentElem.getBoundingClientRect()
      : lastKnownRectRef.current;

    if (!currentRect) return;

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

    let bestMatch: string | null = null;
    let minDistance = Infinity;

    elements.current.forEach((elem, id) => {
      if (id === currentId) return;
      if (!isIdAllowed(id)) return;

      // Rail containment: right moves from card- stay within same rail.
      if (direction === "right" && currentRailId && currentId.startsWith("card-")) {
        const candidateRailContainer = elem.closest("[id^='rail-']") as HTMLElement | null;
        if (candidateRailContainer?.id !== currentRailId) return;
      }

      // Fast pre-check: skip elements that are not currently mounted or are hidden
      if (!elem.isConnected || elem.offsetWidth === 0) return;

      const rect = elem.getBoundingClientRect();
      let isCandidate = false;
      const threshold = 10;

      switch (direction) {
        case "up":
          isCandidate = rect.bottom <= currentRect.top + threshold;
          if (isCandidate && id.startsWith("nav-") && !currentId.startsWith("nav-")) {
            isCandidate = false;
          }
          if (isInLiveGrid && isCandidate) {
            if (id === "live-open-epg" || id.startsWith("live-cat-") || id.startsWith("top-")) {
              isCandidate = false;
            }
          }
          break;
        case "down":
          isCandidate = rect.top >= currentRect.bottom - threshold;
          if (isCandidate && id.startsWith("nav-") && !currentId.startsWith("nav-")) {
            isCandidate = false;
          }
          if (isInLiveGrid && isCandidate) {
            if (id.startsWith("live-cat-") || id === "live-open-epg") {
              isCandidate = false;
            }
          }
          break;
        case "left":
          isCandidate = rect.right <= currentRect.left + threshold;
          if (isInLiveGrid && isCandidate && id.startsWith("nav-")) {
            isCandidate = false;
          }
          break;
        case "right":
          isCandidate = rect.left >= navigationEscapeRight - threshold;
          break;
      }

      if (isCandidate) {
        const dX = rect.left + rect.width / 2 - (currentRect.left + currentRect.width / 2);
        const dY = rect.top + rect.height / 2 - (currentRect.top + currentRect.height / 2);
        const weight = direction === "up" || direction === "down" ? 3 : 1;

        let navPenalty = 0;
        if (id.startsWith("nav-") && !currentId.startsWith("nav-")) {
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

    if (!bestMatch && direction === "right" && currentId.startsWith("nav-")) {
      const nonNavCandidates = Array.from(elements.current.entries())
        .filter(([id]) => !id.startsWith("nav-") && isIdAllowed(id))
        .map(([id, element]) => ({ id, rect: element.getBoundingClientRect() }))
        .filter(({ rect }) => rect.left >= navigationEscapeRight - 10);
      nonNavCandidates.sort((a, b) => a.rect.left - b.rect.left);
      bestMatch = nonNavCandidates[0]?.id ?? null;
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

    if (!bestMatch && direction === "right" && currentId.startsWith("card-")) return;

    if (bestMatch) {
      setFocus(bestMatch);
    }
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

  return (
    <FocusContext.Provider
      value={{ focusedId, setFocus, setFocusScope, registerElement, unregisterElement }}
    >
      {children}
    </FocusContext.Provider>
  );
};
