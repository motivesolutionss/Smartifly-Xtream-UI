import { ENABLE_MOVIE_DETAIL_ART_FALLBACK_V1 } from '../playerFlags';

const normalizeCandidates = (urls: Array<string | undefined | null>): string[] => {
    const unique = new Set<string>();
    urls
        .filter((url): url is string => typeof url === 'string' && url.trim().length > 0)
        .map((url) => url.trim())
        .sort((a, b) => (a.startsWith('https://') ? 0 : 1) - (b.startsWith('https://') ? 0 : 1))
        .forEach((url) => unique.add(url));
    return Array.from(unique);
};

const preferHttps = (urls: Array<string | undefined | null>): string => (
    normalizeCandidates(urls)[0] || ''
);

export const getMovieTrueBackdropCandidates = (movie: any, movieInfo?: any): string[] => (
    normalizeCandidates([
        Array.isArray(movie?.backdrop_path) ? movie.backdrop_path[0] : movie?.backdrop_path,
        movieInfo?.info?.backdrop_path?.[0],
        movieInfo?.movie_data?.backdrop_path?.[0],
        movieInfo?.movie_data?.backdrop,
    ])
);

export const getMovieDetailCoverCandidates = (movie: any, movieInfo?: any): string[] => (
    normalizeCandidates([
        movie?.cover_big,
        movie?.movie_image,
        movie?.cover,
        ...(ENABLE_MOVIE_DETAIL_ART_FALLBACK_V1 ? [
            movieInfo?.movie_data?.movie_image,
            movieInfo?.movie_data?.cover_big,
        ] : []),
        movieInfo?.info?.movie_image,
        movieInfo?.info?.cover_big,
        movie?.stream_icon,
    ])
);

export const getMovieDetailBackdropCandidates = (movie: any, movieInfo?: any): string[] => (
    normalizeCandidates([
        ...getMovieTrueBackdropCandidates(movie, movieInfo),
        ...(ENABLE_MOVIE_DETAIL_ART_FALLBACK_V1 ? [
            movieInfo?.info?.movie_image,
            movieInfo?.movie_data?.movie_image,
            movieInfo?.info?.cover_big,
            movieInfo?.movie_data?.cover_big,
            movie?.cover_big,
            movie?.movie_image,
            movie?.cover,
            movie?.stream_icon,
        ] : [
            movieInfo?.info?.cover_big,
            movieInfo?.info?.movie_image,
            movie?.cover_big,
            movie?.movie_image,
            movie?.cover,
            movie?.stream_icon,
        ]),
    ])
);

export const getSeriesDetailCoverCandidates = (series: any, seriesInfo?: any): string[] => (
    normalizeCandidates([
        series?.cover,
        seriesInfo?.info?.cover,
        seriesInfo?.info?.cover_big,
        seriesInfo?.info?.movie_image,
    ])
);

export const getSeriesDetailBackdropCandidates = (series: any, seriesInfo?: any): string[] => (
    normalizeCandidates([
        seriesInfo?.info?.backdrop_path?.[0],
        Array.isArray(series?.backdrop_path) ? series.backdrop_path[0] : series?.backdrop_path,
        seriesInfo?.info?.cover_big,
        series?.cover,
        seriesInfo?.info?.cover,
        seriesInfo?.info?.movie_image,
    ])
);

export const resolveMovieDetailImages = (movie: any, movieInfo?: any) => ({
    cover: preferHttps(getMovieDetailCoverCandidates(movie, movieInfo)),
    backdrop: preferHttps(getMovieDetailBackdropCandidates(movie, movieInfo)),
});

export const resolveSeriesDetailImages = (series: any, seriesInfo?: any) => ({
    cover: preferHttps(getSeriesDetailCoverCandidates(series, seriesInfo)),
    backdrop: preferHttps(getSeriesDetailBackdropCandidates(series, seriesInfo)),
});

export const getSeriesSeasonImageUrls = (
    episodes: any[],
    fallbackCover?: string
): string[] => (
    episodes
        .map((episode) => preferHttps([
            episode?.info?.movie_image,
            fallbackCover,
        ]))
        .filter(Boolean)
);

export const getSeriesEpisodeThumbnailCandidates = (
    episode: any,
    fallbackCover?: string
): string[] => (
    normalizeCandidates([
        episode?.info?.movie_image,
        fallbackCover,
    ])
);

export const getSeriesFirstSeasonImageUrls = (series: any, seriesInfo?: any): string[] => {
    const seasonKeys = Object.keys(seriesInfo?.episodes || {}).sort((a, b) => Number(a) - Number(b));
    if (seasonKeys.length === 0) return [];

    const firstSeasonKey = seasonKeys[0];
    const rawSeason = seriesInfo?.episodes?.[firstSeasonKey];
    const episodes = Array.isArray(rawSeason)
        ? rawSeason
        : rawSeason && typeof rawSeason === 'object'
            ? Object.values(rawSeason)
            : [];

    const { cover } = resolveSeriesDetailImages(series, seriesInfo);
    return getSeriesSeasonImageUrls(episodes, cover || series?.cover);
};
