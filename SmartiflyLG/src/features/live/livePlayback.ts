import { createXtreamApi } from '../../services/api';
import type { AppDestination } from '../../store/appStore';

export type LivePlaybackSource = {
  id: string;
  title: string;
  streamId: number;
  artwork?: string;
};

export type LivePlaybackRequest = {
  id: string;
  kind: 'live';
  title: string;
  streamUrl: string;
  fallbackUrls: string[];
  returnDestination: AppDestination;
  liveQueue: Array<{
    id: string;
    title: string;
    streamId: number;
    streamUrl: string;
    fallbackUrls: string[];
    artwork?: string;
  }>;
  liveIndex: number;
};

type BuildLivePlaybackRequestArgs = {
  username: string;
  password: string;
  portalBaseUrl: string;
  channels: LivePlaybackSource[];
  selectedChannelId: string;
  returnDestination?: AppDestination;
};

export function buildLivePlaybackRequest({
  username,
  password,
  portalBaseUrl,
  channels,
  selectedChannelId,
  returnDestination = 'live'
}: BuildLivePlaybackRequestArgs): LivePlaybackRequest | null {
  if (!username || !password || !portalBaseUrl || !Array.isArray(channels) || channels.length === 0) {
    return null;
  }

  const api = createXtreamApi(portalBaseUrl);
  const liveExtensions = ['m3u8', 'ts'];
  const liveQueue = channels.map((entry) => {
    return {
      id: entry.id,
      title: entry.title,
      streamId: entry.streamId,
      streamUrl: api.getLiveStreamUrl(username, password, entry.streamId, liveExtensions[0]),
      fallbackUrls: liveExtensions
        .slice(1)
        .map((extension) => api.getLiveStreamUrl(username, password, entry.streamId, extension)),
      artwork: entry.artwork
    };
  });

  const liveIndex = liveQueue.findIndex((entry) => entry.id === selectedChannelId);
  if (liveIndex < 0) {
    return null;
  }

  const selectedChannel = liveQueue[liveIndex];

  return {
    id: selectedChannel.id,
    kind: 'live',
    title: selectedChannel.title,
    streamUrl: selectedChannel.streamUrl,
    fallbackUrls: selectedChannel.fallbackUrls,
    returnDestination,
    liveQueue,
    liveIndex
  };
}
