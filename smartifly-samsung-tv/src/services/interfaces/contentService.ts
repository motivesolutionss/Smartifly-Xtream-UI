import type {
  AppCategory,
  AppChannel,
  AppMovie,
  AppMovieDetails,
  AppSeries,
  AppSeriesDetails,
  AppEpgItem,
} from "../../types/appModels";

export type ContentRequestOptions = {
  requestSource?: string;
  signal?: AbortSignal;
  timeoutMs?: number;
};

export type ContentListRequestOptions = ContentRequestOptions & {
  limit?: number;
  page?: number;
};

export interface ContentService {
  getLiveCategories(options?: ContentRequestOptions): Promise<AppCategory[]>;
  getLiveStreams(
    categoryId?: string,
    options?: ContentListRequestOptions
  ): Promise<AppChannel[]>;
  searchLiveStreams(
    query: string,
    categoryId?: string,
    options?: ContentListRequestOptions
  ): Promise<AppChannel[]>;

  getVodCategories(options?: ContentRequestOptions): Promise<AppCategory[]>;
  getVodStreams(
    categoryId?: string,
    options?: ContentListRequestOptions
  ): Promise<AppMovie[]>;
  searchVodStreams(
    query: string,
    categoryId?: string,
    options?: ContentListRequestOptions
  ): Promise<AppMovie[]>;
  getVodInfo(vodId: string, options?: ContentRequestOptions): Promise<AppMovieDetails>;

  getSeriesCategories(options?: ContentRequestOptions): Promise<AppCategory[]>;
  getSeries(
    categoryId?: string,
    options?: ContentListRequestOptions
  ): Promise<AppSeries[]>;
  searchSeries(
    query: string,
    categoryId?: string,
    options?: ContentListRequestOptions
  ): Promise<AppSeries[]>;
  getSeriesInfo(seriesId: string, options?: ContentRequestOptions): Promise<AppSeriesDetails>;

  getShortEpg(streamId: string, options?: ContentRequestOptions): Promise<AppEpgItem[]>;
}
