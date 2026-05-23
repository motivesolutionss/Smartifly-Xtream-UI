export type AppCategory = {
  id: string;
  name: string;
  type: "live" | "vod" | "series";
};

export type AppChannel = {
  id: string;
  title: string;
  logoUrl?: string;
  categoryId?: string;
  streamType: "live";
};

export type AppMovie = {
  id: string;
  title: string;
  posterUrl?: string;
  backdropUrl?: string;
  categoryId?: string;
  extension?: string;
  description?: string;
  rating?: string;
  year?: string;
  duration?: string;
  genre?: string;
  tmdbId?: string;
  director?: string;
  cast?: string;
};

export type AppMovieDetails = AppMovie & {
  description?: string;
  rating?: string;
  releaseDate?: string;
  duration?: string;
  genre?: string;
  backdropUrl?: string;
};

export type AppSeries = {
  id: string;
  title: string;
  posterUrl?: string;
  backdropUrl?: string;
  categoryId?: string;
  description?: string;
  rating?: string;
  year?: string;
  genre?: string;
  duration?: string;
  tmdbId?: string;
  director?: string;
  cast?: string;
};

export type AppSeriesDetails = {
  id: string;
  title: string;
  posterUrl?: string;
  backdropUrl?: string;
  description?: string;
  rating?: string;
  genre?: string;
  director?: string;
  cast?: string;
  seasons: AppSeason[];
};

export type AppSeason = {
  seasonNumber: number;
  episodes: AppEpisode[];
};

export type AppEpisode = {
  id: string;
  title: string;
  seasonNumber?: number;
  episodeNumber?: number;
  extension?: string;
  description?: string;
  duration?: string;
  posterUrl?: string;
};

export type AppEpgItem = {
  id?: string;
  title: string;
  description?: string;
  start: string; // ISO String
  end: string;   // ISO String
};
