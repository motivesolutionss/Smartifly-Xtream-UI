import { AppError } from "../../types/errors";
import type { AccountService, UserInfo } from "../interfaces/accountService";
import type { ContentService } from "../interfaces/contentService";
import type { PlaybackService } from "../interfaces/playbackService";
import type { UserDataService } from "../interfaces/userDataService";
import type {
  AppCategory,
  AppChannel,
  AppEpgItem,
  AppMovie,
  AppMovieDetails,
  AppSeries,
  AppSeriesDetails,
} from "../../types/appModels";
import type { FavoriteItem } from "../../storage/favoritesStorage";
import type { PlaylistCredentials } from "../../storage/playlistStorage";
import type { RecentlyWatchedItem } from "../../storage/recentlyWatchedStorage";

const backendNotImplemented = () => {
  throw new AppError("UNKNOWN", "Backend data source is not implemented yet");
};

export class BackendContentService implements ContentService {
  getLiveCategories(): Promise<AppCategory[]> {
    return backendNotImplemented();
  }
  getLiveStreams(): Promise<AppChannel[]> {
    return backendNotImplemented();
  }
  getVodCategories(): Promise<AppCategory[]> {
    return backendNotImplemented();
  }
  getVodStreams(): Promise<AppMovie[]> {
    return backendNotImplemented();
  }
  getVodInfo(): Promise<AppMovieDetails> {
    return backendNotImplemented();
  }
  getSeriesCategories(): Promise<AppCategory[]> {
    return backendNotImplemented();
  }
  getSeries(): Promise<AppSeries[]> {
    return backendNotImplemented();
  }
  getSeriesInfo(): Promise<AppSeriesDetails> {
    return backendNotImplemented();
  }
  getShortEpg(): Promise<AppEpgItem[]> {
    return backendNotImplemented();
  }
}

export class BackendAccountService implements AccountService {
  validateCredentials(): Promise<UserInfo> {
    return backendNotImplemented();
  }

  getAccountInfo(): Promise<UserInfo> {
    return backendNotImplemented();
  }
}

export class BackendPlaybackService implements PlaybackService {
  getPlaybackUrl(): Promise<string> {
    return backendNotImplemented();
  }
}

export class BackendUserDataService implements UserDataService {
  getPlaylists(): Promise<PlaylistCredentials[]> {
    return backendNotImplemented();
  }
  savePlaylist(_playlist: PlaylistCredentials): Promise<void> {
    void _playlist;
    return backendNotImplemented();
  }
  deletePlaylist(_id: string): Promise<void> {
    void _id;
    return backendNotImplemented();
  }
  getActivePlaylist(): Promise<PlaylistCredentials | null> {
    return backendNotImplemented();
  }
  setActivePlaylistId(_id: string | null): Promise<void> {
    void _id;
    return backendNotImplemented();
  }
  getFavorites(): Promise<FavoriteItem[]> {
    return backendNotImplemented();
  }
  saveFavorite(_favorite: FavoriteItem): Promise<void> {
    void _favorite;
    return backendNotImplemented();
  }
  clearFavorites(): Promise<void> {
    return backendNotImplemented();
  }
  getRecentlyWatched(): Promise<RecentlyWatchedItem[]> {
    return backendNotImplemented();
  }
  saveRecentlyWatched(_item: RecentlyWatchedItem): Promise<void> {
    void _item;
    return backendNotImplemented();
  }
  clearRecentlyWatched(): Promise<void> {
    return backendNotImplemented();
  }
}
