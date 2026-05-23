import { useCallback, useState } from "react";
import { favoritesStorage } from "../../../storage/favoritesStorage";
import type { FavoriteItem } from "../../../storage/favoritesStorage";
import { recentlyWatchedStorage } from "../../../storage/recentlyWatchedStorage";
import type { RecentlyWatchedItem } from "../../../storage/recentlyWatchedStorage";

export const useDashboard = () => {
  const [favorites, setFavorites] = useState<FavoriteItem[]>(() =>
    favoritesStorage.getFavorites()
  );
  const [history, setHistory] = useState<RecentlyWatchedItem[]>(() =>
    recentlyWatchedStorage.getHistory()
  );
  const [continueWatching, setContinueWatching] = useState<RecentlyWatchedItem[]>(() =>
    recentlyWatchedStorage.getContinueWatching()
  );

  const refresh = useCallback(() => {
    setFavorites(favoritesStorage.getFavorites());
    setHistory(recentlyWatchedStorage.getHistory());
    setContinueWatching(recentlyWatchedStorage.getContinueWatching());
  }, []);

  return {
    favorites,
    history,
    continueWatching,
    refresh,
  };
};
