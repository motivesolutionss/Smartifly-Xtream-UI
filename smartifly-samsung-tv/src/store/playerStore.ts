import { create } from "zustand";
import type { AppChannel } from "../types/appModels";
import type { PlaybackContentType } from "../services/interfaces/playbackService";

export type ActivePlaybackItem = {
  id: string;
  title: string;
  logoUrl?: string;
  backdropUrl?: string;
  contentType: PlaybackContentType;
  extension?: string;
  seriesId?: string; // Parent series ID if applicable
  resumePositionSeconds?: number;
  resumeDurationSeconds?: number;
  metadata?: {
    seasonNumber?: number;
    episodeNumber?: number;
  };
  nextItem?: {
    id: string;
    title: string;
    logoUrl?: string;
    backdropUrl?: string;
    extension?: string;
    seasonNumber?: number;
    episodeNumber?: number;
    seriesId?: string;
    nextItem?: ActivePlaybackItem["nextItem"];
  };
};

type PlaybackInput = AppChannel | ActivePlaybackItem | null;

const areChannelListsEqual = (current: AppChannel[], next: AppChannel[]) => {
  if (current === next) return true;
  if (current.length !== next.length) return false;

  for (let index = 0; index < current.length; index += 1) {
    if (current[index].id !== next[index].id) {
      return false;
    }
  }

  return true;
};

interface PlayerStore {
  activePlaybackItem: ActivePlaybackItem | null;
  liveChannels: AppChannel[];
  isPlaying: boolean;
  setActivePlaybackItem: (item: PlaybackInput) => void;
  setLiveChannels: (channels: AppChannel[]) => void;
  setIsPlaying: (playing: boolean) => void;
}

const toPlaybackItem = (item: PlaybackInput): ActivePlaybackItem | null => {
  if (!item) return null;
  if ("contentType" in item) return item;

  return {
    id: item.id,
    title: item.title,
    logoUrl: item.logoUrl,
    contentType: "live",
  };
};

export const usePlayerStore = create<PlayerStore>((set) => ({
  activePlaybackItem: null,
  liveChannels: [],
  isPlaying: false,
  setActivePlaybackItem: (item) => set({ activePlaybackItem: toPlaybackItem(item) }),
  setLiveChannels: (channels) =>
    set((state) =>
      areChannelListsEqual(state.liveChannels, channels)
        ? state
        : { liveChannels: channels }
    ),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
}));
