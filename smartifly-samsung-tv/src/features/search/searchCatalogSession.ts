import type { PersistedSearchCatalog } from "./searchCatalogTypes";

const sessionCatalogs = new Map<string, PersistedSearchCatalog>();

const buildSessionKey = (playlistId: string, profileId: string) =>
  `${playlistId}::${profileId}`;

export const searchCatalogSession = {
  getCatalog: (playlistId: string | null, profileId: string | null) => {
    if (!playlistId || !profileId) return null;
    return sessionCatalogs.get(buildSessionKey(playlistId, profileId)) ?? null;
  },

  saveCatalog: (
    playlistId: string | null,
    profileId: string | null,
    catalog: PersistedSearchCatalog
  ) => {
    if (!playlistId || !profileId) return;
    sessionCatalogs.set(buildSessionKey(playlistId, profileId), catalog);
  },

  clearCatalog: (playlistId: string | null, profileId: string | null) => {
    if (!playlistId || !profileId) return;
    sessionCatalogs.delete(buildSessionKey(playlistId, profileId));
  },

  clearAll: () => {
    sessionCatalogs.clear();
  },
};
