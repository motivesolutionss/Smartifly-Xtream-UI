import { localStorageService } from "./localStorageService";
import { playlistStorage } from "./playlistStorage";
import { profileStorage } from "./profileStorage";

const getFavoritesKey = (): string | null => {
  const playlistId = playlistStorage.getActivePlaylistId();
  const profileId = profileStorage.getActiveProfileId();
  if (!playlistId || !profileId) return null;
  return `smartifly_favorites_${playlistId}_${profileId}`;
};

export interface FavoriteItem {
  id: string;
  type: "live" | "vod" | "series";
  title: string;
  imageUrl?: string;
  addedAt: string;
}

const FAVORITES_WRITE_DELAY_MS = 200;

export const favoritesStorage = {
  getFavorites: (): FavoriteItem[] => {
    const key = getFavoritesKey();
    if (!key) return [];
    return localStorageService.get<FavoriteItem[]>(key) || [];
  },

  saveFavorite: (favorite: FavoriteItem): void => {
    const favorites = favoritesStorage.getFavorites();
    const existingIndex = favorites.findIndex(
      (item) => item.id === favorite.id && item.type === favorite.type
    );

    if (existingIndex >= 0) {
      favorites[existingIndex] = favorite;
    } else {
      favorites.unshift(favorite);
    }

    const key = getFavoritesKey();
    if (!key) return;
    localStorageService.setDeferred(key, favorites, FAVORITES_WRITE_DELAY_MS);
  },

  toggleFavorite: (item: Omit<FavoriteItem, "addedAt">) => {
    const favorites = favoritesStorage.getFavorites();
    const index = favorites.findIndex(
      (favorite) => favorite.id === item.id && favorite.type === item.type
    );

    if (index > -1) {
      // Remove
      favorites.splice(index, 1);
    } else {
      // Add
      favorites.unshift({ ...item, addedAt: new Date().toISOString() });
    }

    const key = getFavoritesKey();
    if (!key) return index === -1;
    localStorageService.setDeferred(key, favorites, FAVORITES_WRITE_DELAY_MS);
    return index === -1; // Returns true if added
  },

  isFavorite: (id: string, type?: FavoriteItem["type"]): boolean => {
    return favoritesStorage
      .getFavorites()
      .some((favorite) =>
        type ? favorite.id === id && favorite.type === type : favorite.id === id
      );
  },

  removeFavorite: (id: string, type: FavoriteItem["type"]): void => {
    const favorites = favoritesStorage.getFavorites().filter(
      (favorite) => !(favorite.id === id && favorite.type === type)
    );
    const key = getFavoritesKey();
    if (!key) return;
    localStorageService.setDeferred(key, favorites, FAVORITES_WRITE_DELAY_MS);
  },

  clearFavorites: (): void => {
    const key = getFavoritesKey();
    if (!key) return;
    localStorageService.setDeferred(key, [], FAVORITES_WRITE_DELAY_MS);
  },
};
