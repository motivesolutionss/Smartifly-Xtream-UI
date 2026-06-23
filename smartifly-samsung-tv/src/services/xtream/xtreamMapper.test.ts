import { beforeEach, describe, expect, it } from "vitest";
import { setPortalImageBaseUrl } from "../../utils/imagePolicy";
import { xtreamMapper } from "./xtreamMapper";
import type { XtreamLiveStream, XtreamSeries, XtreamVodInfoResponse, XtreamVodStream } from "./xtreamTypes";

describe("xtreamMapper image normalization", () => {
  beforeEach(() => {
    setPortalImageBaseUrl("http://portal.example.com:8080");
  });

  it("maps movie posters and backdrops using Android-style fallback order", () => {
    const movie = xtreamMapper.toAppMovie({
      num: 1,
      name: "Movie A",
      stream_type: "movie",
      stream_id: 11,
      stream_icon: "",
      cover: "/covers/movie-a.jpg",
      cover_big: "//cdn.example.com/wide/movie-a.jpg",
      rating: "8.5",
      rating_5based: 4.2,
      added: "2026-01-10",
      category_id: "1",
      container_extension: "mp4",
      custom_sid: "",
      direct_source: "",
      backdrop_path: ["invalid-url"],
    } satisfies XtreamVodStream);

    expect(movie.posterUrl).toBe("http://portal.example.com:8080/covers/movie-a.jpg");
    expect(movie.backdropUrl).toBe("https://cdn.example.com/wide/movie-a.jpg");
  });

  it("maps series art using centralized normalized fallbacks", () => {
    const series = xtreamMapper.toAppSeries({
      num: 1,
      name: "Series A",
      series_id: 21,
      cover: "/covers/series-a.jpg",
      cover_big: "//cdn.example.com/wide/series-a.jpg",
      plot: "",
      cast: "",
      director: "",
      genre: "",
      releaseDate: "2026-02-02",
      last_modified: "",
      rating: "7.9",
      rating_5based: 4.0,
      backdrop_path: ["bad-value"],
      youtube_trailer: "",
      episode_run_time: "45m",
      category_id: "2",
    } satisfies XtreamSeries);

    expect(series.posterUrl).toBe("http://portal.example.com:8080/covers/series-a.jpg");
    expect(series.backdropUrl).toBe("https://cdn.example.com/wide/series-a.jpg");
  });

  it("normalizes live channel logos", () => {
    const channel = xtreamMapper.toAppChannel({
      num: 1,
      name: "Live A",
      stream_type: "live",
      stream_id: 31,
      stream_icon: "/logos/live-a.png",
      category_id: "5",
      epg_channel_id: null,
      added: "",
      custom_sid: "",
      tv_archive: 0,
      direct_source: "",
      tv_archive_duration: 0,
    } satisfies XtreamLiveStream);

    expect(channel.logoUrl).toBe("http://portal.example.com:8080/logos/live-a.png");
  });

  it("maps details payload images through the same normalization path", () => {
    const details = xtreamMapper.toAppMovieDetails(
      {
        info: {
          name: "Movie B",
          movie_image: "/details/movie-b.jpg",
          backdrop_path: ["bad-value"],
          rating: "8.0",
        },
        movie_data: {
          stream_id: 45,
          name: "Movie B",
        },
      } satisfies XtreamVodInfoResponse,
      "45"
    );

    expect(details.posterUrl).toBe("http://portal.example.com:8080/details/movie-b.jpg");
    expect(details.backdropUrl).toBe("http://portal.example.com:8080/details/movie-b.jpg");
  });
});
