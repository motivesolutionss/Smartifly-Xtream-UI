import type {
  AppCategory,
  AppChannel,
  AppMovie,
  AppMovieDetails,
  AppSeries,
  AppSeriesDetails,
  AppSeason,
  AppEpgItem,
} from "../../types/appModels";
import type {
  XtreamAccountInfo,
  XtreamCategory,
  XtreamLiveStream,
  XtreamVodStream,
  XtreamSeries,
  XtreamVodInfoResponse,
  XtreamSeriesInfoResponse,
  XtreamEpgListing,
} from "./xtreamTypes";
import { resolveFirstImageCandidate } from "../../utils/imagePolicy";

// Helper to ensure values are strings
const stringValue = (value: unknown) => {
  return value === undefined || value === null ? "" : String(value);
};

const backdropCandidates = (value: string[] | string | undefined) => {
  if (Array.isArray(value)) return value;
  if (typeof value === "string" && value.trim().startsWith("[")) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => stringValue(item));
      }
    } catch {
      return [value];
    }
  }
  return typeof value === "string" ? [value] : [];
};

const parseYear = (value: string | undefined) => {
  if (!value) return undefined;
  const match = value.match(/\b(19|20)\d{2}\b/);
  return match?.[0];
};

const resolveMovieBackdropUrl = (stream: Partial<XtreamVodStream> & { movie_image?: string }) =>
  resolveFirstImageCandidate(
    ...backdropCandidates(stream.backdrop_path),
    stream.cover_big,
    stream.cover,
    stream.movie_image,
    stream.stream_icon
  ) || undefined;

const resolveMoviePosterUrl = (stream: Partial<XtreamVodStream> & { movie_image?: string }) =>
  resolveFirstImageCandidate(
    stream.stream_icon,
    stream.cover,
    stream.cover_big,
    stream.movie_image
  ) || undefined;

const resolveMovieDetailsPosterUrl = (
  info: (Partial<XtreamVodStream> & { movie_image?: string }) | undefined,
  movieData: (Partial<XtreamVodStream> & { stream_icon?: string }) | undefined
) =>
  resolveFirstImageCandidate(
    info?.movie_image,
    info?.stream_icon,
    info?.cover,
    info?.cover_big,
    movieData?.stream_icon
  ) || undefined;

const resolveSeriesPosterUrl = (series: Partial<XtreamSeries>) =>
  resolveFirstImageCandidate(series.cover, series.cover_big) || undefined;

const resolveSeriesBackdropUrl = (series: Partial<XtreamSeries>) =>
  resolveFirstImageCandidate(
    ...backdropCandidates(series.backdrop_path),
    series.cover_big,
    series.cover
  ) || undefined;

export const xtreamMapper = {
  mapAccountInfo: (data: XtreamAccountInfo) => {
    const user = data.user_info;
    const expiryTimestamp = Number(user?.exp_date || 0);

    return {
      username: stringValue(user?.username),
      status: stringValue(user?.status),
      expiryDate: expiryTimestamp
        ? new Date(expiryTimestamp * 1000).toISOString()
        : undefined,
      activeConnections: Number(user?.active_cons || "0"),
      maxConnections: Number(user?.max_connections || "0"),
    };
  },

  toAppCategory: (
    cat: XtreamCategory,
    type: "live" | "vod" | "series"
  ): AppCategory => ({
    id: stringValue(cat.category_id),
    name: stringValue(cat.category_name) || "Untitled category",
    type,
  }),

  toAppChannel: (stream: XtreamLiveStream): AppChannel => ({
    id: stringValue(stream.stream_id),
    title: stringValue(stream.name) || "Untitled channel",
    logoUrl: resolveFirstImageCandidate(stream.stream_icon) || undefined,
    categoryId: stream.category_id || undefined,
    streamType: "live",
  }),

  toAppMovie: (stream: XtreamVodStream): AppMovie => ({
    id: stringValue(stream.stream_id),
    title: stringValue(stream.name) || "Untitled movie",
    posterUrl: resolveMoviePosterUrl(stream),
    backdropUrl: resolveMovieBackdropUrl(stream),
    categoryId: stringValue(stream.category_id) || undefined,
    extension: stream.container_extension || undefined,
    description: stringValue(stream.plot) || undefined,
    rating: stringValue(stream.rating) || undefined,
    year:
      parseYear(stringValue(stream.year)) ||
      parseYear(stringValue(stream.releasedate)) ||
      parseYear(stringValue(stream.releaseDate)),
    duration: stringValue(stream.duration) || undefined,
    genre: stringValue(stream.genre) || undefined,
  }),
  
  toAppSeries: (series: XtreamSeries): AppSeries => ({
    id: stringValue(series.series_id),
    title: stringValue(series.name) || "Untitled series",
    posterUrl: resolveSeriesPosterUrl(series),
    backdropUrl: resolveSeriesBackdropUrl(series),
    categoryId: stringValue(series.category_id) || undefined,
    description: stringValue(series.plot) || undefined,
    rating: stringValue(series.rating) || undefined,
    year: parseYear(stringValue(series.releaseDate)) || undefined,
    genre: stringValue(series.genre) || undefined,
    duration: stringValue(series.episode_run_time) || undefined,
  }),

  toAppMovieDetails: (response: XtreamVodInfoResponse, vodId: string): AppMovieDetails => {
    const info = response.info || {};
    const movieData = response.movie_data || {};
    const streamId = stringValue(info.stream_id || movieData.stream_id || vodId);
    const containerExtension =
      stringValue(info.container_extension || movieData.container_extension) || undefined;
    const title = stringValue(info.name || movieData.name) || "Untitled movie";
    const posterUrl = resolveMovieDetailsPosterUrl(info, movieData);

    const baseMovie = xtreamMapper.toAppMovie({
      num: 0,
      name: title,
      stream_type: "movie",
      stream_id: Number(streamId),
      stream_icon: posterUrl || "",
      cover: stringValue(info.cover),
      cover_big: stringValue(info.cover_big),
      rating: stringValue(info.rating),
      rating_5based: Number(info.rating_5based || 0),
      added: stringValue(info.added),
      category_id: stringValue(info.category_id),
      container_extension: containerExtension || "",
      custom_sid: stringValue(info.custom_sid),
      direct_source: stringValue(info.direct_source),
    });

    return {
      ...baseMovie,
      description: stringValue(info.plot || info.description) || undefined,
      rating: stringValue(info.rating) || undefined,
      releaseDate: stringValue(info.releasedate || info.year) || undefined,
      duration: info.duration,
      genre: info.genre,
      director: info.director,
      cast: info.cast,
      extension: containerExtension || baseMovie.extension,
      posterUrl,
      backdropUrl:
        resolveMovieBackdropUrl({
          ...movieData,
          ...info,
          stream_icon: info.stream_icon || movieData.stream_icon,
        }) || posterUrl,
    };
  },

  toAppSeriesDetails: (
    response: XtreamSeriesInfoResponse,
    seriesId: string
  ): AppSeriesDetails => {
    const info = response.info || {};
    const seasons: AppSeason[] = Object.entries(response.episodes || {})
      .map(([seasonNumber, episodes]) => ({
        seasonNumber: Number(seasonNumber),
        episodes: episodes
          .map((episode, index) => {
            const fallbackId = `${seriesId}-s${seasonNumber}-e${index + 1}`;
            const episodeId = stringValue(
              episode.id ?? episode.stream_id ?? fallbackId
            );
            const episodeNumber =
              episode.episode_num !== undefined
                ? Number(episode.episode_num)
                : undefined;

            return {
              id: episodeId,
              title:
                stringValue(episode.title) ||
                `Episode ${episodeNumber ?? index + 1}`,
              seasonNumber: Number(episode.season || seasonNumber),
              episodeNumber,
              extension: episode.container_extension || undefined,
              description: episode.info?.plot,
              duration:
                episode.info?.duration_secs === undefined
                  ? undefined
                  : stringValue(episode.info.duration_secs),
              posterUrl: resolveFirstImageCandidate(episode.info?.movie_image) || undefined,
            };
          })
          .sort((left, right) => {
            if (
              left.episodeNumber !== undefined &&
              right.episodeNumber !== undefined
            ) {
              return left.episodeNumber - right.episodeNumber;
            }
            return left.title.localeCompare(right.title);
          }),
      }))
      .sort((left, right) => left.seasonNumber - right.seasonNumber);

    return {
      id: stringValue(info.series_id || seriesId),
      title: stringValue(info.name) || "Untitled series",
      posterUrl: resolveSeriesPosterUrl(info),
      backdropUrl: resolveSeriesBackdropUrl(info) || resolveSeriesPosterUrl(info),
      description: info.plot,
      rating: info.rating,
      genre: info.genre,
      director: info.director,
      cast: info.cast,
      seasons,
    };
  },

  toAppEpg: (epgItems: XtreamEpgListing[]): AppEpgItem[] => {
    return (epgItems || []).map((item) => ({
      id: stringValue(item.id),
      title: xtreamMapper.decodeBase64(stringValue(item.title) || "No Program Info"),
      description: xtreamMapper.decodeBase64(stringValue(item.description)),
      start: stringValue(item.start),
      end: stringValue(item.end),
    }));
  },

  decodeBase64: (str: string): string => {
    try {
      if (!str) return "";
      // Check if it's likely base64
      if (str.includes(" ") || str.length < 4) return str;
      return atob(str);
    } catch {
      return str;
    }
  },
};
