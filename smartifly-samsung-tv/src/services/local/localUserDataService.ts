import {
  favoritesStorage,
  type FavoriteItem,
} from "../../storage/favoritesStorage";
import {
  playlistStorage,
  type PlaylistCredentials,
} from "../../storage/playlistStorage";
import {
  recentlyWatchedStorage,
  type RecentlyWatchedItem,
} from "../../storage/recentlyWatchedStorage";
import type { UserDataService } from "../interfaces/userDataService";

export class LocalUserDataService implements UserDataService {
  async getPlaylists(): Promise<PlaylistCredentials[]> {
    return playlistStorage.getPlaylists();
  }

  async savePlaylist(playlist: PlaylistCredentials): Promise<void> {
    playlistStorage.savePlaylist(playlist);
  }

  async deletePlaylist(id: string): Promise<void> {
    playlistStorage.deletePlaylist(id);
  }

  async getActivePlaylist(): Promise<PlaylistCredentials | null> {
    return playlistStorage.getActivePlaylist();
  }

  async setActivePlaylistId(id: string | null): Promise<void> {
    playlistStorage.setActivePlaylistId(id);
  }

  async getFavorites(): Promise<FavoriteItem[]> {
    return favoritesStorage.getFavorites();
  }

  async saveFavorite(favorite: FavoriteItem): Promise<void> {
    favoritesStorage.saveFavorite(favorite);
  }

  async clearFavorites(): Promise<void> {
    favoritesStorage.clearFavorites();
  }

  async getRecentlyWatched(): Promise<RecentlyWatchedItem[]> {
    return recentlyWatchedStorage.getItems();
  }

  async saveRecentlyWatched(item: RecentlyWatchedItem): Promise<void> {
    recentlyWatchedStorage.saveItem(item);
  }

  async clearRecentlyWatched(): Promise<void> {
    recentlyWatchedStorage.clearHistory();
  }
}
