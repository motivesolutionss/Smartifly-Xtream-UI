import type { PlaybackContentType } from "../../services/interfaces/playbackService";

export const contentTypeLabels: Record<PlaybackContentType, string> = {
  live: "Live TV",
  vod: "Movie",
  series: "Series",
};
