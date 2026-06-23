import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { playlistStorage } from "../../../storage/playlistStorage";
import { useProfileStore } from "../../../store/profileStore";
import { usePlayerStore } from "../../../store/playerStore";
import { logger } from "../../../utils/logger";
import { createPerfTrace } from "../../../utils/perfTrace";
import { markStartupMarker } from "../../../utils/startupMarkers";
import {
  syncSearchCatalog,
  type SearchCatalogSyncMode,
} from "../searchCatalogService";
import { searchCatalogSession } from "../searchCatalogSession";
import type {
  PersistedSearchCatalog,
  SearchCatalogSnapshot,
} from "../searchCatalogTypes";
import {
  hydrateSearchCatalog,
  isSearchCatalogFresh,
} from "../searchCatalogUtils";
import { searchCatalogStorage } from "../searchCatalogStorage";

type SearchCatalogStatus = "idle" | "syncing" | "ready" | "error";

const SEARCH_SYNC_MODE_PRIORITY: Record<SearchCatalogSyncMode, number> = {
  warm: 1,
  background: 2,
  active: 3,
};
const SEARCH_WARM_IDLE_DELAY_MS = 2500;
const SEARCH_BACKGROUND_IDLE_DELAY_MS = 6000;

const scheduleWhenIdle = (callback: () => void, delayMs: number) => {
  let cancelled = false;
  let timeoutId = 0;
  let idleId = 0;

  const run = () => {
    if (cancelled) return;

    if (
      typeof window !== "undefined" &&
      "requestIdleCallback" in window &&
      typeof window.requestIdleCallback === "function"
    ) {
      idleId = window.requestIdleCallback(
        () => {
          if (!cancelled) {
            callback();
          }
        },
        { timeout: 1500 }
      );
      return;
    }

    idleId = window.setTimeout(() => {
      if (!cancelled) {
        callback();
      }
    }, 0);
  };

  timeoutId = window.setTimeout(run, delayMs);

  return () => {
    cancelled = true;
    window.clearTimeout(timeoutId);
    if (
      typeof window !== "undefined" &&
      "cancelIdleCallback" in window &&
      typeof window.cancelIdleCallback === "function"
    ) {
      window.cancelIdleCallback(idleId);
      return;
    }

    window.clearTimeout(idleId);
  };
};

export const useSearchCatalog = (shouldSearch: boolean) => {
  const playlistId = playlistStorage.getActivePlaylistId();
  const profileId = useProfileStore((state) => state.activeProfile?.id ?? null);
  const activePlaybackItem = usePlayerStore((state) => state.activePlaybackItem);

  const [sessionCatalog, setSessionCatalog] = useState<PersistedSearchCatalog | null>(() =>
    searchCatalogSession.getCatalog(playlistId, profileId)
  );
  const [status, setStatus] = useState<SearchCatalogStatus>("idle");
  const [error, setError] = useState<unknown>(null);
  const [isHydrating, setIsHydrating] = useState(() => Boolean(playlistId && profileId));

  const sessionCatalogRef = useRef<PersistedSearchCatalog | null>(sessionCatalog);
  const syncRunIdRef = useRef(0);
  const isSyncingRef = useRef(false);
  const currentSyncModeRef = useRef<SearchCatalogSyncMode | null>(null);

  useEffect(() => {
    sessionCatalogRef.current = sessionCatalog;
  }, [sessionCatalog]);

  useEffect(() => {
    const nextCatalog = searchCatalogSession.getCatalog(playlistId, profileId);
    sessionCatalogRef.current = nextCatalog;
    setSessionCatalog(nextCatalog);
    setError(null);
    setStatus(nextCatalog ? "ready" : "idle");
    setIsHydrating(Boolean(playlistId && profileId && !nextCatalog));
  }, [playlistId, profileId]);

  useEffect(() => {
    if (!playlistId || !profileId) {
      setIsHydrating(false);
      return;
    }

    if (sessionCatalogRef.current) {
      setIsHydrating(false);
      return;
    }

    let cancelled = false;

    void (async () => {
      const persistedCatalog = await searchCatalogStorage.getCatalog(playlistId, profileId);
      if (cancelled) return;

      if (persistedCatalog) {
        const nextCatalog = { ...persistedCatalog };
        searchCatalogSession.saveCatalog(playlistId, profileId, nextCatalog);
        sessionCatalogRef.current = nextCatalog;
        setSessionCatalog(nextCatalog);
        setStatus("ready");
      }

      setIsHydrating(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [playlistId, profileId]);

  const snapshot = useMemo<SearchCatalogSnapshot | null>(
    () => hydrateSearchCatalog(sessionCatalog),
    [sessionCatalog]
  );

  const isFresh = useMemo(() => isSearchCatalogFresh(snapshot), [snapshot]);

  const startSync = useCallback(async (mode: SearchCatalogSyncMode) => {
    if (!playlistId || !profileId) return;
    if (usePlayerStore.getState().activePlaybackItem) return;

    if (isSyncingRef.current) {
      const currentMode = currentSyncModeRef.current;
      if (
        currentMode &&
        SEARCH_SYNC_MODE_PRIORITY[currentMode] >= SEARCH_SYNC_MODE_PRIORITY[mode]
      ) {
        return;
      }

      syncRunIdRef.current += 1;
      isSyncingRef.current = false;
    }

    const runId = syncRunIdRef.current + 1;
    syncRunIdRef.current = runId;
    isSyncingRef.current = true;
    currentSyncModeRef.current = mode;
    setStatus("syncing");
    setError(null);
    const syncTrace = createPerfTrace("search_catalog_sync", {
      mode,
      runId,
    });

    try {
      markStartupMarker("search_warming_start", {
        mode,
      }, { once: false });
      const nextCatalog = await syncSearchCatalog({
        seedCatalog: sessionCatalogRef.current,
        mode,
        shouldPause: () =>
          runId !== syncRunIdRef.current || Boolean(usePlayerStore.getState().activePlaybackItem),
        onProgress: (catalog) => {
          if (runId !== syncRunIdRef.current) return;
          if (
            sessionCatalogRef.current?.completeness === "full" &&
            catalog.completeness === "partial"
          ) {
            return;
          }

          const nextSessionCatalog: PersistedSearchCatalog = { ...catalog };
          sessionCatalogRef.current = nextSessionCatalog;
          setSessionCatalog(nextSessionCatalog);
          searchCatalogSession.saveCatalog(playlistId, profileId, nextSessionCatalog);
          void searchCatalogStorage.saveCatalog(playlistId, profileId, nextSessionCatalog);
          syncTrace.mark("progress", {
            metricName: "search_catalog_sync_progress_ms",
            slowAboveMs: 800,
            data: {
              liveCount: catalog.live.length,
              vodCount: catalog.vod.length,
              seriesCount: catalog.series.length,
            },
          });
        },
      });

      if (runId !== syncRunIdRef.current) {
        return;
      }

      if (
        usePlayerStore.getState().activePlaybackItem &&
        sessionCatalogRef.current?.completeness === "full" &&
        nextCatalog.completeness === "partial"
      ) {
        setStatus("ready");
        return;
      }

      const nextSessionCatalog: PersistedSearchCatalog = { ...nextCatalog };
      sessionCatalogRef.current = nextSessionCatalog;
      setSessionCatalog(nextSessionCatalog);
      searchCatalogSession.saveCatalog(playlistId, profileId, nextSessionCatalog);
      void searchCatalogStorage.saveCatalog(playlistId, profileId, nextSessionCatalog);
      setStatus("ready");
      markStartupMarker("search_warming_end", {
        completeness: nextCatalog.completeness,
        mode,
      }, { once: false });
      syncTrace.end({
        status: "completed",
        metricName: "search_catalog_sync_total_ms",
        slowAboveMs: 1400,
        data: {
          liveCount: nextCatalog.live.length,
          vodCount: nextCatalog.vod.length,
          seriesCount: nextCatalog.series.length,
        },
      });
    } catch (syncError) {
      if (runId !== syncRunIdRef.current) return;

      logger.error("Search catalog sync failed", syncError);
      syncTrace.fail(syncError, {
        metricName: "search_catalog_sync_total_ms",
        slowAboveMs: 1400,
      });
      setError(syncError);
      setStatus(sessionCatalogRef.current ? "ready" : "error");
    } finally {
      if (runId === syncRunIdRef.current) {
        isSyncingRef.current = false;
        currentSyncModeRef.current = null;
      }
    }
  }, [playlistId, profileId]);

  useEffect(() => {
    if (isHydrating) return;
    if (!playlistId || !profileId) return;
    if (activePlaybackItem) return;

    const catalog = sessionCatalogRef.current;
    if (!catalog) {
      const cancel = scheduleWhenIdle(() => {
        void startSync("warm");
      }, SEARCH_WARM_IDLE_DELAY_MS);
      return cancel;
    }

    if (!isSearchCatalogFresh(catalog)) {
      const cancel = scheduleWhenIdle(() => {
        void startSync("warm");
      }, SEARCH_WARM_IDLE_DELAY_MS);
      return cancel;
    }
  }, [activePlaybackItem, isHydrating, playlistId, profileId, startSync]);

  useEffect(() => {
    if (isHydrating) return;
    if (!shouldSearch) return;
    if (!playlistId || !profileId) return;
    if (activePlaybackItem) return;

    const catalog = sessionCatalogRef.current;
    if (!catalog) {
      const cancel = scheduleWhenIdle(() => {
        void startSync("warm");
      }, SEARCH_WARM_IDLE_DELAY_MS);
      return cancel;
    }

    if (!isSearchCatalogFresh(catalog)) {
      const cancel = scheduleWhenIdle(() => {
        void startSync("warm");
      }, SEARCH_WARM_IDLE_DELAY_MS);
      return cancel;
    }

    if (catalog.completeness === "partial") {
      const cancel = scheduleWhenIdle(() => {
        void startSync("background");
      }, SEARCH_BACKGROUND_IDLE_DELAY_MS);
      return cancel;
    }
  }, [activePlaybackItem, isHydrating, playlistId, profileId, shouldSearch, startSync]);

  return {
    snapshot,
    status,
    error,
    isFresh,
    refresh: () => startSync("warm"),
    isSyncing: status === "syncing",
  };
};
