import { useCallback, useSyncExternalStore } from "react";
import { favoritesStorage } from "../../../storage/favoritesStorage";
import { recentlyWatchedStorage } from "../../../storage/recentlyWatchedStorage";

export const useDashboard = () => {
  const subscribeRecentlyWatched = useCallback(
    (listener: () => void) => recentlyWatchedStorage.subscribe(listener),
    []
  );

  const recentlyWatchedRevision = useSyncExternalStore(
    subscribeRecentlyWatched,
    () => recentlyWatchedStorage.getRevision(),
    () => 0
  );

  const history = recentlyWatchedStorage.getHistory();
  const continueWatching = recentlyWatchedStorage.getContinueWatching();
  const favorites = favoritesStorage.getFavorites();

  const refresh = useCallback(() => {
    return recentlyWatchedRevision;
  }, [recentlyWatchedRevision]);

  return {
    favorites,
    history,
    continueWatching,
    refresh,
  };
};
