import type { HomeRailPolicy } from "../features/home/homeAdaptivePolicy";
import type { AppCategory, AppChannel, AppMovie, AppSeries } from "../types/appModels";
import type { SmartRow } from "../services/interfaces/analyticsService";
import { localStorageService } from "./localStorageService";

const HOME_SNAPSHOT_VERSION = 4;
const HOME_SNAPSHOT_KEY_PREFIX = "smartifly_home_snapshot";
const HOME_SNAPSHOT_WRITE_DELAY_MS = 600;
const persistedSnapshotSignatures = new Map<string, string>();

export type PersistedHomeSnapshot = {
  version: number;
  completeness: "bootstrap" | "full";
  generatedAt: string;
  liveCategories?: AppCategory[];
  movies: AppMovie[];
  series: AppSeries[];
  liveStreams: AppChannel[];
  fetchMeta?: {
    analyticsFetchedAt?: string;
    categoriesFetchedAt?: string;
    contentFetchedAt?: string;
    fetchedCategoryIds?: {
      live: string[];
      series: string[];
      vod: string[];
    };
  };
  vodCategories: AppCategory[];
  seriesCategories: AppCategory[];
  trendingIds?: string[];
  smartRows?: SmartRow[];
  policy?: HomeRailPolicy;
};

const buildSnapshotKey = (playlistId: string, profileId: string) => {
  return `${HOME_SNAPSHOT_KEY_PREFIX}_${playlistId}_${profileId}`;
};

const buildSnapshotSignature = (snapshot: PersistedHomeSnapshot) => {
  return [
    snapshot.version,
    snapshot.completeness,
    snapshot.generatedAt,
    snapshot.movies.length,
    snapshot.series.length,
    snapshot.liveStreams.length,
    snapshot.liveCategories?.length ?? 0,
    snapshot.vodCategories.length,
    snapshot.seriesCategories.length,
    snapshot.trendingIds?.length ?? 0,
    snapshot.smartRows?.length ?? 0,
  ].join(":");
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

    persistedSnapshotSignatures.set(
      buildSnapshotKey(playlistId, profileId),
      buildSnapshotSignature(snapshot)
    );

    return snapshot;
  },

  saveSnapshot: (
    playlistId: string | null,
    profileId: string | null,
    snapshot: Omit<PersistedHomeSnapshot, "version">
  ) => {
    if (!playlistId || !profileId) return;

    const key = buildSnapshotKey(playlistId, profileId);
    const nextSnapshot: PersistedHomeSnapshot = {
      version: HOME_SNAPSHOT_VERSION,
      ...snapshot,
    };
    const nextSignature = buildSnapshotSignature(nextSnapshot);

    if (persistedSnapshotSignatures.get(key) === nextSignature) {
      return;
    }

    persistedSnapshotSignatures.set(key, nextSignature);

    localStorageService.setDeferred(
      key,
      nextSnapshot,
      HOME_SNAPSHOT_WRITE_DELAY_MS
    );
  },

  clearAllSnapshots: () => {
    persistedSnapshotSignatures.clear();
    localStorageService.removeByPrefix(HOME_SNAPSHOT_KEY_PREFIX);
  },
};
