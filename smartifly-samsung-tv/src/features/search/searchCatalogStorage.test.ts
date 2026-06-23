import { describe, expect, it, vi } from "vitest";
import type { PersistedSearchCatalog } from "./searchCatalogTypes";
import {
  createSearchCatalogStorage,
  SEARCH_CATALOG_STORAGE_VERSION,
  type SearchCatalogStorageRecord,
} from "./searchCatalogStorage";

const createCatalog = (): PersistedSearchCatalog => ({
  completeness: "full",
  generatedAt: "2026-06-09T00:00:00.000Z",
  live: [],
  vod: [],
  series: [],
  categories: {
    live: [],
    vod: [],
    series: [],
  },
  fetchedCategoryIds: {
    live: [],
    vod: [],
    series: [],
  },
});

describe("searchCatalogStorage", () => {
  it("saves and loads a catalog by playlist and profile", async () => {
    const records = new Map<string, SearchCatalogStorageRecord>();
    const storage = createSearchCatalogStorage({
      clearAll: async () => records.clear(),
      delete: async (key) => {
        records.delete(key);
      },
      get: async (key) => records.get(key) ?? null,
      isAvailable: () => true,
      put: async (record) => {
        records.set(record.key, record);
      },
    });

    const catalog = createCatalog();
    const saved = await storage.saveCatalog("playlist-1", "profile-1", catalog);
    const loaded = await storage.getCatalog("playlist-1", "profile-1");

    expect(saved).toBe(true);
    expect(loaded).toEqual(catalog);
    expect(records.get("playlist-1::profile-1")?.storageVersion).toBe(
      SEARCH_CATALOG_STORAGE_VERSION
    );
  });

  it("returns null when persistent storage is unavailable", async () => {
    const storage = createSearchCatalogStorage({
      clearAll: async () => {},
      delete: async () => {},
      get: async () => {
        throw new Error("should not be called");
      },
      isAvailable: () => false,
      put: async () => {
        throw new Error("should not be called");
      },
    });

    await expect(storage.getCatalog("playlist-1", "profile-1")).resolves.toBeNull();
    await expect(
      storage.saveCatalog("playlist-1", "profile-1", createCatalog())
    ).resolves.toBe(false);
  });

  it("ignores records from an incompatible storage schema version", async () => {
    const storage = createSearchCatalogStorage({
      clearAll: async () => {},
      delete: async () => {},
      get: async () =>
        ({
          key: "playlist-1::profile-1",
          storageVersion: SEARCH_CATALOG_STORAGE_VERSION - 1,
          playlistId: "playlist-1",
          profileId: "profile-1",
          savedAt: "2026-06-09T00:00:00.000Z",
          catalog: createCatalog(),
        }) satisfies SearchCatalogStorageRecord,
      isAvailable: () => true,
      put: async () => {},
    });

    await expect(storage.getCatalog("playlist-1", "profile-1")).resolves.toBeNull();
  });

  it("swallows backend save failures and falls back cleanly", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const storage = createSearchCatalogStorage({
      clearAll: async () => {},
      delete: async () => {},
      get: async () => null,
      isAvailable: () => true,
      put: async () => {
        throw new Error("quota");
      },
    });

    await expect(
      storage.saveCatalog("playlist-1", "profile-1", createCatalog())
    ).resolves.toBe(false);

    warnSpy.mockRestore();
  });
});
