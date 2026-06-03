import type { PlaybackRequest } from '../../store/appStore';

/** Persists across PlayerScreen remounts (mobile-style replace per channel). */
export const LIVE_CHANNEL_MIN_HANDOFF_MS = 800;
export const LIVE_CHANNEL_REVISIT_COOLDOWN_MS = 8000;
export const LIVE_SWITCH_FORBIDDEN_RETRY_MS = 8000;

export const liveStreamLastStopTimes = new Map<number, number>();
export const liveStreamForbiddenUntil = new Map<number, number>();

export type LiveSwitchContext = {
  streamId: number | null;
  fromSwitch: boolean;
  nativeAttempt: number;
  cooldownRetryUsed: boolean;
  cooldownMs: number;
};

let liveSwitchContext: LiveSwitchContext = {
  streamId: null,
  fromSwitch: false,
  nativeAttempt: 0,
  cooldownRetryUsed: false,
  cooldownMs: LIVE_CHANNEL_MIN_HANDOFF_MS
};

export function getLiveSwitchContext() {
  return liveSwitchContext;
}

export function setLiveSwitchContext(patch: Partial<LiveSwitchContext>) {
  liveSwitchContext = { ...liveSwitchContext, ...patch };
}

export function markLiveStreamStopped(streamId: number) {
  liveStreamLastStopTimes.set(streamId, Date.now());
}

export function markLiveStreamForbidden(streamId: number, cooldownMs: number) {
  liveStreamForbiddenUntil.set(streamId, Date.now() + cooldownMs);
}

export function getLiveHandoffDelayMs(streamId: number) {
  const lastStop = liveStreamLastStopTimes.get(streamId) ?? 0;
  const forbiddenUntil = liveStreamForbiddenUntil.get(streamId) ?? 0;
  const revisitExtra =
    lastStop > 0 ? Math.max(0, LIVE_CHANNEL_REVISIT_COOLDOWN_MS - (Date.now() - lastStop)) : 0;
  const forbiddenExtra = Math.max(0, forbiddenUntil - Date.now());
  return Math.max(LIVE_CHANNEL_MIN_HANDOFF_MS, revisitExtra, forbiddenExtra);
}

export function isLiveStreamForbidden(streamId: number) {
  return (liveStreamForbiddenUntil.get(streamId) ?? 0) > Date.now();
}

export function hasExhaustedLiveCooldownRetry(streamId: number) {
  const context = getLiveSwitchContext();
  return context.cooldownRetryUsed && context.streamId === streamId;
}

export function clearLivePlayerSession() {
  liveStreamLastStopTimes.clear();
  liveStreamForbiddenUntil.clear();
  liveSwitchContext = {
    streamId: null,
    fromSwitch: false,
    nativeAttempt: 0,
    cooldownRetryUsed: false,
    cooldownMs: LIVE_CHANNEL_MIN_HANDOFF_MS
  };
}

const PLAYER_LOG_PREFIX = '[LG Player]';

let switchInFlight = false;
let pendingDelta = 0;

export type LivePlaybackActions = {
  getSelectedPlayback: () => PlaybackRequest | null;
  openPlayback: (playback: PlaybackRequest) => void;
  setStatusMessage: (message: string) => void;
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
    liveIndex: nextIndex,
    liveHandoffMs: getLiveHandoffDelayMs(nextChannel.streamId)
  };
}

export async function performLiveChannelSwitch(delta: number, actions: LivePlaybackActions) {
  if (switchInFlight) {
    pendingDelta += delta;
    console.debug(`${PLAYER_LOG_PREFIX} switchLiveChannel coalesced`, { pendingDelta });
    return;
  }

  switchInFlight = true;

  try {
    let stepDelta = delta;

    while (true) {
      const playback = actions.getSelectedPlayback();
      if (!playback || playback.kind !== 'live') {
        return;
      }

      const nextPlayback = resolveNextLivePlayback(playback, stepDelta);
      if (!nextPlayback) {
        return;
      }

      const currentIndex = playback.liveQueue!.findIndex((entry) => entry.id === playback.id);
      const fallbackIndex =
        typeof playback.liveIndex === 'number' && playback.liveIndex >= 0 ? playback.liveIndex : -1;
      const resolvedIndex = currentIndex >= 0 ? currentIndex : fallbackIndex;
      const currentChannel =
        resolvedIndex >= 0 ? (playback.liveQueue![resolvedIndex] ?? null) : null;

      if (currentChannel?.streamId) {
        markLiveStreamStopped(currentChannel.streamId);
      }

      const nextChannel = playback.liveQueue![nextPlayback.liveIndex ?? 0];
      const handoffMs = nextPlayback.liveHandoffMs ?? getLiveHandoffDelayMs(nextChannel.streamId);
      liveStreamForbiddenUntil.delete(nextChannel.streamId);

      setLiveSwitchContext({
        streamId: nextChannel.streamId,
        fromSwitch: true,
        nativeAttempt: 0,
        cooldownRetryUsed: false,
        cooldownMs: handoffMs
      });

      console.debug(`${PLAYER_LOG_PREFIX} switchLiveChannel`, {
        delta: stepDelta,
        currentId: playback.id,
        currentTitle: playback.title,
        nextId: nextPlayback.id,
        nextTitle: nextPlayback.title,
        handoffMs
      });

      actions.setStatusMessage(`Playing ${nextChannel.title}`);
      actions.openPlayback(nextPlayback);

      if (pendingDelta === 0) {
        break;
      }

      stepDelta = pendingDelta;
      pendingDelta = 0;
    }
  } finally {
    switchInFlight = false;

    if (pendingDelta !== 0) {
      const coalesced = pendingDelta;
      pendingDelta = 0;
      void performLiveChannelSwitch(coalesced, actions);
    }
  }
}
