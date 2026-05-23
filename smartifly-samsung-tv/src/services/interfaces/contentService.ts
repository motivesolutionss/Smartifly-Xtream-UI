import type {
  AppCategory,
  AppChannel,
  AppMovie,
  AppMovieDetails,
  AppSeries,
  AppSeriesDetails,
  AppEpgItem,
} from "../../types/appModels";

export interface ContentService {
  getLiveCategories(): Promise<AppCategory[]>;
  getLiveStreams(categoryId?: string): Promise<AppChannel[]>;

  getVodCategories(): Promise<AppCategory[]>;
  getVodStreams(categoryId?: string): Promise<AppMovie[]>;
  getVodInfo(vodId: string): Promise<AppMovieDetails>;

  getSeriesCategories(): Promise<AppCategory[]>;
  getSeries(categoryId?: string): Promise<AppSeries[]>;
  getSeriesInfo(seriesId: string): Promise<AppSeriesDetails>;

  getShortEpg(streamId: string): Promise<AppEpgItem[]>;
}
