import { createXtreamApi, type XtreamSeriesEpisode, type XtreamSeriesInfo } from '../../services/api';
import type { AppDestination, PlaybackRequest, Session } from '../../store/appStore';
import type { WatchProgress } from '../../store/watchHistoryStore';

type BuildResumePlaybackArgs = {
  progress: WatchProgress;
  session: Session;
  returnDestination: AppDestination;
};

function normalizeExtension(value?: string | null) {
  const trimmed = value?.trim().toLowerCase();
  return trimmed || undefined;
}

function uniqueExtensions(...values: Array<string | undefined>) {
  return values.filter((value, index, all): value is string => Boolean(value) && all.indexOf(value) === index);
}

function buildFallbackUrls(
  buildUrl: (extension: string) => string,
  primaryExtension: string,
  secondaryExtensions: string[]
) {
  return secondaryExtensions
    .filter((extension) => extension !== primaryExtension)
    .map((extension) => buildUrl(extension));
}

function getEpisodeNumber(value?: string | number | null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function findEpisodeFromSeriesInfo(progress: WatchProgress, info: XtreamSeriesInfo) {
  const seasonIds = progress.seasonNumber != null
    ? [String(progress.seasonNumber)]
    : Object.keys(info.episodes ?? {}).sort((a, b) => Number(a) - Number(b));

  for (const seasonId of seasonIds) {
    const episodes = info.episodes?.[seasonId] ?? [];
    const matchedEpisode = episodes.find((episode) => (
      episode.stream_id === progress.streamId ||
      Number(episode.id || 0) === progress.streamId ||
      (progress.episodeNumber != null && getEpisodeNumber(episode.episode_num) === progress.episodeNumber)
    ));

    if (matchedEpisode) {
      return {
        seasonId,
        episode: matchedEpisode
      };
    }
  }

  return null;
}

function buildSeriesDescription(episode?: XtreamSeriesEpisode, fallback?: string) {
  return episode?.plot?.trim() || episode?.info?.plot?.trim() || fallback;
}

export async function buildResumePlaybackRequest({
  progress,
  session,
  returnDestination
}: BuildResumePlaybackArgs): Promise<PlaybackRequest | null> {
  const username = session.username?.trim();
  const password = session.userInfo?.password?.trim();
  const portalBaseUrl = session.portalBaseUrl?.trim();

  if (!username || !password || !portalBaseUrl) {
    return null;
  }

  const api = createXtreamApi(portalBaseUrl);

  if (progress.type === 'movie') {
    let extension = normalizeExtension(progress.containerExtension);

    if (!extension) {
      try {
        const info = await api.getMovieInfo(username, password, progress.streamId);
        extension = normalizeExtension(info.movie_data?.container_extension);
      } catch {
        // Use fallback extensions below.
      }
    }

    const extensions = uniqueExtensions(extension, 'mkv', 'mp4');
    const primaryExtension = extensions[0];
    if (!primaryExtension) {
      return null;
    }

    return {
      id: progress.playbackId || `movie-${progress.streamId}`,
      kind: 'movie',
      title: progress.title,
      description: progress.description,
      posterUrl: progress.thumbnail,
      backdropUrl: progress.thumbnail,
      streamUrl: api.getVodStreamUrl(username, password, progress.streamId, primaryExtension),
      fallbackUrls: buildFallbackUrls(
        (candidateExtension) => api.getVodStreamUrl(username, password, progress.streamId, candidateExtension),
        primaryExtension,
        extensions.slice(1)
      ),
      resumePosition: progress.position,
      returnDestination,
      streamId: progress.streamId,
      containerExtension: primaryExtension
    };
  }

  let resolvedStreamId = progress.streamId;
  let resolvedPlaybackId = progress.playbackId || `episode-${progress.streamId}`;
  let resolvedEpisodeTitle = progress.episodeTitle;
  let resolvedDescription = progress.description;
  let resolvedExtension = normalizeExtension(progress.containerExtension);

  if (progress.seriesId) {
    try {
      const info = await api.getSeriesInfo(username, password, progress.seriesId);
      const matched = findEpisodeFromSeriesInfo(progress, info);

      if (matched) {
        const matchedEpisode = matched.episode;
        resolvedStreamId = matchedEpisode.stream_id || Number(matchedEpisode.id || 0) || resolvedStreamId;
        resolvedPlaybackId = `episode-${matchedEpisode.id || resolvedStreamId}`;
        resolvedEpisodeTitle = matchedEpisode.title?.trim() || resolvedEpisodeTitle;
        resolvedDescription = buildSeriesDescription(matchedEpisode, resolvedDescription);
        resolvedExtension = normalizeExtension(matchedEpisode.container_extension) || resolvedExtension;
      }
    } catch {
      // Use saved identifiers and fallback extensions below.
    }
  }

  const extensions = uniqueExtensions(resolvedExtension, 'mkv', 'mp4');
  const primaryExtension = extensions[0];
  if (!primaryExtension || !resolvedStreamId) {
    return null;
  }

  return {
    id: resolvedPlaybackId,
    kind: 'series',
    title: progress.title,
    episodeTitle: resolvedEpisodeTitle,
    description: resolvedDescription,
    posterUrl: progress.thumbnail,
    backdropUrl: progress.thumbnail,
    streamUrl: api.getSeriesStreamUrl(username, password, resolvedStreamId, primaryExtension),
    fallbackUrls: buildFallbackUrls(
      (candidateExtension) => api.getSeriesStreamUrl(username, password, resolvedStreamId, candidateExtension),
      primaryExtension,
      extensions.slice(1)
    ),
    resumePosition: progress.position,
    returnDestination,
    streamId: resolvedStreamId,
    seriesId: progress.seriesId,
    seasonNumber: progress.seasonNumber,
    episodeNumber: progress.episodeNumber,
    containerExtension: primaryExtension
  };
}
