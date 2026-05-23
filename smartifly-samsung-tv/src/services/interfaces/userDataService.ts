import type { FavoriteItem } from "../../storage/favoritesStorage";
import type { PlaylistCredentials } from "../../storage/playlistStorage";
import type { RecentlyWatchedItem } from "../../storage/recentlyWatchedStorage";

export interface UserDataService {
  getPlaylists(): Promise<PlaylistCredentials[]>;
  savePlaylist(playlist: PlaylistCredentials): Promise<void>;
  deletePlaylist(id: string): Promise<void>;
  getActivePlaylist(): Promise<PlaylistCredentials | null>;
  setActivePlaylistId(id: string | null): Promise<void>;
  getFavorites(): Promise<FavoriteItem[]>;
  saveFavorite(favorite: FavoriteItem): Promise<void>;
  clearFavorites(): Promise<void>;
  getRecentlyWatched(): Promise<RecentlyWatchedItem[]>;
  saveRecentlyWatched(item: RecentlyWatchedItem): Promise<void>;
  clearRecentlyWatched(): Promise<void>;
}
