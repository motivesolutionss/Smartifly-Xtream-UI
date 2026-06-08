import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { playlistStorage } from "../../../storage/playlistStorage";
import { useProfileStore } from "../../../store/profileStore";
import { usePlayerStore } from "../../../store/playerStore";
import { logger } from "../../../utils/logger";
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

type SearchCatalogStatus = "idle" | "syncing" | "ready" | "error";

const SEARCH_SYNC_MODE_PRIORITY: Record<SearchCatalogSyncMode, number> = {
  warm: 1,
  background: 2,
  active: 3,
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

    try {
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
      setStatus("ready");
    } catch (syncError) {
      if (runId !== syncRunIdRef.current) return;

      logger.error("Search catalog sync failed", syncError);
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
    if (!playlistId || !profileId) return;
    if (activePlaybackItem) return;

    const catalog = sessionCatalogRef.current;
    if (!catalog) {
      void startSync("warm");
      return;
    }

    if (catalog.completeness === "partial") {
      void startSync("background");
      return;
    }

    if (!isSearchCatalogFresh(catalog)) {
      void startSync("background");
    }
  }, [activePlaybackItem, playlistId, profileId, startSync]);

  useEffect(() => {
    if (!shouldSearch) return;
    if (!playlistId || !profileId) return;
    if (activePlaybackItem) return;

    const catalog = sessionCatalogRef.current;
    if (!catalog) {
      void startSync("warm");
      return;
    }

    if (catalog.completeness !== "full" || !isSearchCatalogFresh(catalog)) {
      void startSync("active");
    }
  }, [activePlaybackItem, playlistId, profileId, shouldSearch, startSync]);

  return {
    snapshot,
    status,
    error,
    isFresh,
    refresh: () => startSync("active"),
    isSyncing: status === "syncing",
  };
};
