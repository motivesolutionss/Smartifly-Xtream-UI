import { logger } from "../../utils/logger";
import type { PersistedSearchCatalog } from "./searchCatalogTypes";

const SEARCH_CATALOG_DB_NAME = "smartifly-search-catalog";
const SEARCH_CATALOG_STORE_NAME = "catalogs";
const SEARCH_CATALOG_DB_VERSION = 1;
export const SEARCH_CATALOG_STORAGE_VERSION = 1;

export type SearchCatalogStorageRecord = {
  key: string;
  storageVersion: number;
  playlistId: string;
  profileId: string;
  savedAt: string;
  catalog: PersistedSearchCatalog;
};

type SearchCatalogStorageBackend = {
  clearAll(): Promise<void>;
  delete(key: string): Promise<void>;
  get(key: string): Promise<SearchCatalogStorageRecord | null>;
  isAvailable(): boolean;
  put(record: SearchCatalogStorageRecord): Promise<void>;
};

const buildStorageKey = (playlistId: string, profileId: string) =>
  `${playlistId}::${profileId}`;

let databasePromise: Promise<IDBDatabase> | null = null;

const openSearchCatalogDatabase = (): Promise<IDBDatabase> => {
  if (databasePromise) {
    return databasePromise;
  }

  databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(SEARCH_CATALOG_DB_NAME, SEARCH_CATALOG_DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(SEARCH_CATALOG_STORE_NAME)) {
        database.createObjectStore(SEARCH_CATALOG_STORE_NAME, { keyPath: "key" });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error ?? new Error("Unable to open search catalog database"));
    };
  });

  return databasePromise;
};

const withStore = async <T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T> | void
) => {
  const database = await openSearchCatalogDatabase();
  const transaction = database.transaction(SEARCH_CATALOG_STORE_NAME, mode);
  const store = transaction.objectStore(SEARCH_CATALOG_STORE_NAME);
  const request = fn(store);

  return await new Promise<T>((resolve, reject) => {
    transaction.oncomplete = () => {
      if (request) {
        resolve(request.result);
      } else {
        resolve(undefined as T);
      }
    };

    transaction.onerror = () => {
      reject(transaction.error ?? new Error("Search catalog IndexedDB transaction failed"));
    };

    transaction.onabort = () => {
      reject(transaction.error ?? new Error("Search catalog IndexedDB transaction aborted"));
    };
  });
};

const indexedDbBackend: SearchCatalogStorageBackend = {
  clearAll: () => withStore("readwrite", (store) => store.clear()),
  delete: (key) => withStore("readwrite", (store) => store.delete(key)),
  get: (key) => withStore("readonly", (store) => store.get(key)),
  isAvailable: () => typeof indexedDB !== "undefined",
  put: async (record) => {
    await withStore("readwrite", (store) => {
      store.put(record);
    });
  },
};

const isValidStorageRecord = (
  value: SearchCatalogStorageRecord | null
): value is SearchCatalogStorageRecord => {
  return Boolean(
    value &&
      typeof value.key === "string" &&
      typeof value.playlistId === "string" &&
      typeof value.profileId === "string" &&
      typeof value.savedAt === "string" &&
      value.storageVersion === SEARCH_CATALOG_STORAGE_VERSION &&
      value.catalog
  );
};

export const createSearchCatalogStorage = (
  backend: SearchCatalogStorageBackend = indexedDbBackend
) => ({
  async clearAll() {
    if (!backend.isAvailable()) return;
    try {
      await backend.clearAll();
    } catch (error) {
      logger.warn("search_catalog_storage_clear_all_failed", error);
    }
  },

  async clearCatalog(playlistId: string | null, profileId: string | null) {
    if (!playlistId || !profileId || !backend.isAvailable()) return;
    try {
      await backend.delete(buildStorageKey(playlistId, profileId));
    } catch (error) {
      logger.warn("search_catalog_storage_clear_failed", {
        playlistId,
        profileId,
        error,
      });
    }
  },

  async getCatalog(playlistId: string | null, profileId: string | null) {
    if (!playlistId || !profileId || !backend.isAvailable()) return null;

    try {
      const record = await backend.get(buildStorageKey(playlistId, profileId));
      if (!isValidStorageRecord(record)) {
        return null;
      }

      return record.catalog;
    } catch (error) {
      logger.warn("search_catalog_storage_get_failed", {
        playlistId,
        profileId,
        error,
      });
      return null;
    }
  },

  async saveCatalog(
    playlistId: string | null,
    profileId: string | null,
    catalog: PersistedSearchCatalog
  ) {
    if (!playlistId || !profileId || !backend.isAvailable()) return false;

    try {
      await backend.put({
        key: buildStorageKey(playlistId, profileId),
        storageVersion: SEARCH_CATALOG_STORAGE_VERSION,
        playlistId,
        profileId,
        savedAt: new Date().toISOString(),
        catalog,
      });
      return true;
    } catch (error) {
      logger.warn("search_catalog_storage_save_failed", {
        playlistId,
        profileId,
        error,
      });
      return false;
    }
  },
});

export const searchCatalogStorage = createSearchCatalogStorage();
