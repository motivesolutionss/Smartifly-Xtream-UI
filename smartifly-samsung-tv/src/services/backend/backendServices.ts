import { AppError } from "../../types/errors";
import type { AccountService, UserInfo } from "../interfaces/accountService";
import type {
  ContentListRequestOptions,
  ContentRequestOptions,
  ContentService,
} from "../interfaces/contentService";
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
  getLiveCategories(_options?: ContentRequestOptions): Promise<AppCategory[]> {
    void _options;
    return backendNotImplemented();
  }
  getLiveStreams(_categoryId?: string, _options?: ContentListRequestOptions): Promise<AppChannel[]> {
    void _categoryId;
    void _options;
    return backendNotImplemented();
  }
  searchLiveStreams(
    _query?: string,
    _categoryId?: string,
    _options?: ContentListRequestOptions
  ): Promise<AppChannel[]> {
    void _query;
    void _categoryId;
    void _options;
    return backendNotImplemented();
  }
  getVodCategories(_options?: ContentRequestOptions): Promise<AppCategory[]> {
    void _options;
    return backendNotImplemented();
  }
  getVodStreams(_categoryId?: string, _options?: ContentListRequestOptions): Promise<AppMovie[]> {
    void _categoryId;
    void _options;
    return backendNotImplemented();
  }
  searchVodStreams(
    _query?: string,
    _categoryId?: string,
    _options?: ContentListRequestOptions
  ): Promise<AppMovie[]> {
    void _query;
    void _categoryId;
    void _options;
    return backendNotImplemented();
  }
  getVodInfo(_vodId?: string, _options?: ContentRequestOptions): Promise<AppMovieDetails> {
    void _vodId;
    void _options;
    return backendNotImplemented();
  }
  getSeriesCategories(_options?: ContentRequestOptions): Promise<AppCategory[]> {
    void _options;
    return backendNotImplemented();
  }
  getSeries(_categoryId?: string, _options?: ContentListRequestOptions): Promise<AppSeries[]> {
    void _categoryId;
    void _options;
    return backendNotImplemented();
  }
  searchSeries(
    _query?: string,
    _categoryId?: string,
    _options?: ContentListRequestOptions
  ): Promise<AppSeries[]> {
    void _query;
    void _categoryId;
    void _options;
    return backendNotImplemented();
  }
  getSeriesInfo(_seriesId?: string, _options?: ContentRequestOptions): Promise<AppSeriesDetails> {
    void _seriesId;
    void _options;
    return backendNotImplemented();
  }
  getShortEpg(_streamId?: string, _options?: ContentRequestOptions): Promise<AppEpgItem[]> {
    void _streamId;
    void _options;
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
