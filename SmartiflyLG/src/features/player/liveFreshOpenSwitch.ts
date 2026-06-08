import type { PlaybackRequest } from '../../store/appStore';
import { setFreshLiveOpenIsolationActive } from './liveFreshOpenTestState';

export type LiveFreshOpenActions = {
  getSelectedPlayback: () => PlaybackRequest | null;
  openPlayback: (playback: PlaybackRequest) => void;
  setStatusMessage: (message: string) => void;
  teardownPlaybackEngines: () => Promise<void> | void;
  resetLiveSurface: () => void;
};

function resolveNextLivePlayback(playback: PlaybackRequest, delta: number): PlaybackRequest | null {
  if (playback.kind !== 'live' || !Array.isArray(playback.liveQueue) || playback.liveQueue.length === 0) {
    return null;
  }

  const currentIndex = playback.liveQueue.findIndex((entry) => entry.id === playback.id);
  const fallbackIndex =
    typeof playback.liveIndex === 'number' && playback.liveIndex >= 0 ? playback.liveIndex : -1;
  const resolvedIndex = currentIndex >= 0 ? currentIndex : fallbackIndex;
  const nextResolvedIndex = resolvedIndex >= 0 ? resolvedIndex : 0;
  const nextIndex = (nextResolvedIndex + delta + playback.liveQueue.length) % playback.liveQueue.length;
  const nextChannel = playback.liveQueue[nextIndex];

  if (!nextChannel) {
    return null;
  }

  return {
    id: nextChannel.id,
    kind: 'live',
    title: nextChannel.title,
    streamUrl: nextChannel.streamUrl,
    fallbackUrls: nextChannel.fallbackUrls,
    returnDestination: playback.returnDestination,
    liveQueue: playback.liveQueue,
    liveIndex: nextIndex
  };
}

export async function performFreshLiveChannelSwitch(delta: number, actions: LiveFreshOpenActions) {
  const playback = actions.getSelectedPlayback();
  if (!playback || playback.kind !== 'live') {
    return;
  }

  const nextPlayback = resolveNextLivePlayback(playback, delta);
  if (!nextPlayback) {
    return;
  }

  console.warn('[LG Player] fresh live open test', {
    delta,
    fromId: playback.id,
    fromTitle: playback.title,
    toId: nextPlayback.id,
    toTitle: nextPlayback.title
  });

  setFreshLiveOpenIsolationActive(true);
  await actions.teardownPlaybackEngines();
  actions.resetLiveSurface();
  actions.setStatusMessage(`Playing ${nextPlayback.title}`);
  actions.openPlayback(nextPlayback);
}
