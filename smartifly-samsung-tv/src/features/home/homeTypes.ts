import type { AppMovie, AppSeries, AppChannel } from "../../types/appModels";

export type HomeRailVariant = "poster" | "landscape" | "live" | "continue";

export interface HomeRailItemBase {
  id: string;
  title: string;
  imageUrl?: string;
  backdropUrl?: string;
  type: "live" | "vod" | "series";
  contentType: "MOVIE" | "SERIES" | "LIVE";
  progress?: number;
  progressText?: string;
}

export type HomeMovieRailItem = HomeRailItemBase &
  AppMovie & {
    type: "vod";
    contentType: "MOVIE";
  };

export type HomeSeriesRailItem = HomeRailItemBase &
  AppSeries & {
    type: "series";
    contentType: "SERIES";
  };

export type HomeLiveRailItem = HomeRailItemBase &
  AppChannel & {
    type: "live";
    contentType: "LIVE";
  };

export type HomeContinueRailItem = HomeRailItemBase & {
  type: "vod" | "series";
  contentType: "MOVIE" | "SERIES";
};

export type HomeRailItem =
  | HomeMovieRailItem
  | HomeSeriesRailItem
  | HomeLiveRailItem
  | HomeContinueRailItem;

export interface HomeRail {
  id: string;
  title: string;
  items: HomeRailItem[];
  variant?: HomeRailVariant;
}
