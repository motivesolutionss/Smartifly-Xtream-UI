export type XtreamCategory = {
  category_id: string;
  category_name: string;
  parent_id: number;
};

export type XtreamLiveStream = {
  num: number;
  name: string;
  stream_type: string;
  stream_id: number;
  stream_icon: string;
  category_id: string;
  epg_channel_id: string | null;
  added: string;
  custom_sid: string;
  tv_archive: number;
  direct_source: string;
  tv_archive_duration: number;
};

export type XtreamVodStream = {
  num: number;
  name: string;
  stream_type: string;
  stream_id: number;
  stream_icon: string;
  cover?: string;
  cover_big?: string;
  rating: string;
  rating_5based: number;
  added: string;
  category_id: string;
  container_extension: string;
  custom_sid: string;
  direct_source: string;
  year?: string;
  releasedate?: string;
  releaseDate?: string;
  duration?: string;
  genre?: string;
  plot?: string;
  backdrop_path?: string[] | string;
};

export type XtreamVodInfoResponse = {
  info?: Partial<XtreamVodStream> & {
    movie_image?: string;
    plot?: string;
    description?: string;
    releasedate?: string;
    year?: string;
    duration?: string;
    genre?: string;
    director?: string;
    cast?: string;
    backdrop_path?: string[] | string;
  };
  movie_data?: Partial<XtreamVodStream> & {
    name?: string;
    stream_id?: string | number;
    stream_icon?: string;
    container_extension?: string;
  };
};

export type XtreamSeries = {
  num: number;
  name: string;
  series_id: number;
  cover: string;
  cover_big?: string;
  plot: string;
  cast: string;
  director: string;
  genre: string;
  releaseDate: string;
  last_modified: string;
  rating: string;
  rating_5based: number;
  backdrop_path: string[];
  youtube_trailer: string;
  episode_run_time: string;
  category_id: string;
};

export type XtreamEpisode = {
  id?: string | number;
  stream_id?: string | number;
  title: string;
  season?: number;
  episode_num?: number;
  container_extension?: string;
  info?: {
    plot?: string;
    duration_secs?: string | number;
    movie_image?: string;
  };
};

export type XtreamSeriesInfoResponse = {
  info?: Partial<XtreamSeries>;
  episodes?: Record<string, XtreamEpisode[]>;
};

export type XtreamShortEpgResponse = {
  epg_listings?: XtreamEpgListing[];
};

export type XtreamEpgListing = {
  id?: string;
  title?: string;
  description?: string;
  start?: string;
  end?: string;
};

export type XtreamAccountInfo = {
  user_info: {
    username: string;
    password: string;
    message: string;
    auth: number;
    status: string;
    exp_date: string;
    is_trial: string;
    active_cons: string;
    max_connections: string;
    created_at: string;
    allowed_output_formats: string[];
  };
  server_info: {
    url: string;
    port: string;
    https_port: string;
    server_protocol: string;
    rtmp_port: string;
    timezone: string;
    timestamp: number;
    time_now: string;
  };
};
