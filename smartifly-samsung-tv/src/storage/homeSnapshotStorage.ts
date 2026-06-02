import type { AppCategory, AppChannel, AppMovie, AppSeries } from "../types/appModels";
import { localStorageService } from "./localStorageService";

const HOME_SNAPSHOT_VERSION = 2;
const HOME_SNAPSHOT_KEY_PREFIX = "smartifly_home_snapshot";
const HOME_SNAPSHOT_WRITE_DELAY_MS = 600;

export type PersistedHomeSnapshot = {
  version: number;
  completeness: "bootstrap" | "full";
  generatedAt: string;
  movies: AppMovie[];
  series: AppSeries[];
  liveStreams: AppChannel[];
  vodCategories: AppCategory[];
  seriesCategories: AppCategory[];
};

const buildSnapshotKey = (playlistId: string, profileId: string) => {
  return `${HOME_SNAPSHOT_KEY_PREFIX}_${playlistId}_${profileId}`;
};

export const homeSnapshotStorage = {
  getSnapshot: (
    playlistId: string | null,
    profileId: string | null
  ): PersistedHomeSnapshot | null => {
    if (!playlistId || !profileId) return null;

    const snapshot = localStorageService.get<PersistedHomeSnapshot>(
      buildSnapshotKey(playlistId, profileId)
    );

    if (!snapshot || snapshot.version !== HOME_SNAPSHOT_VERSION) {
      return null;
    }

    return snapshot;
  },

  saveSnapshot: (
    playlistId: string | null,
    profileId: string | null,
    snapshot: Omit<PersistedHomeSnapshot, "version">
  ) => {
    if (!playlistId || !profileId) return;

    localStorageService.setDeferred(
      buildSnapshotKey(playlistId, profileId),
      {
        version: HOME_SNAPSHOT_VERSION,
        ...snapshot,
      },
      HOME_SNAPSHOT_WRITE_DELAY_MS
    );
  },
};
