export type PlaybackContentType = "live" | "vod" | "series";

export type PlaybackUrlRequest = {
  contentType: PlaybackContentType;
  streamId: string;
  extension?: string;
};

export interface PlaybackService {
  getPlaybackUrl(request: PlaybackUrlRequest): Promise<string>;
}
