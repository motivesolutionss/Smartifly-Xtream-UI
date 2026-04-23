/**
 * Download Store
 * 
 * Manages VOD background downloads, storage tracking, and expiry policies.
 * Uses react-native-blob-util for robust file operations and downloads.
 * 
 * @enterprise-grade
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { createDebouncedStorage } from '../utils/storage';

// Safe access to react-native-blob-util to prevent crashes if not linked
const getBlobUtil = () => {
    try {
        if (Platform.OS === 'web') return null;
        return require('react-native-blob-util').default;
    } catch {
        return null;
    }
};

const getDeviceInfo = () => {
    try {
        if (Platform.OS === 'web') return null;
        return require('react-native-device-info').default;
    } catch {
        return null;
    }
};

// =============================================================================
// TYPES
// =============================================================================

export type DownloadStatus = 'pending' | 'downloading' | 'paused' | 'completed' | 'error' | 'expired';

export type DownloadQuality = 'sd' | 'hd' | 'fhd';

export interface DownloadItem {
    id: string;             // stream_id or series_id_episode_id
    title: string;
    thumbnail?: string;
    type: 'movie' | 'series';
    url: string;            // The remote source URL
    localPath?: string;     // path to the downloaded file
    status: DownloadStatus;
    progress: number;       // 0 to 1
    totalSize?: number;     // in bytes
    downloadedSize?: number;// in bytes
    quality: DownloadQuality;
    addedAt: number;        // timestamp
    completedAt?: number;   // timestamp
    expiresAt?: number;     // timestamp for cleanup
    error?: string;
    // Metadata for resuming/navigating
    categoryId?: string;
    data: any;              // Original item data
}

interface DownloadState {
    downloads: DownloadItem[];
    isBackgroundDownloading: boolean;
    storageUsage: {
        total: number;      // in bytes
        available: number;  // in bytes
        appUsed: number;    // in bytes
    };
    settings: {
        preferredQuality: DownloadQuality;
        autoDeleteOnPlay: boolean;
        expiryDays: number;
        allowMobileData: boolean;
    };
}

interface DownloadActions {
    /** Start or queue a new download */
    addDownload: (item: Omit<DownloadItem, 'status' | 'progress' | 'addedAt'>) => void;
    /** Pause an active download */
    pauseDownload: (id: string) => void;
    /** Resume a paused download */
    resumeDownload: (id: string) => void;
    /** Cancel and delete a download */
    removeDownload: (id: string) => void;
    /** Update progress from background task */
    updateProgress: (id: string, progress: number, downloadedSize: number, totalSize?: number) => void;
    /** Mark download as finished */
    completeDownload: (id: string, localPath: string) => void;
    /** Mark download as failed */
    setDownloadError: (id: string, error: string) => void;
    /** Clear all downloads */
    clearAll: () => void;
    /** Update storage metrics */
    refreshStorageMetrics: () => Promise<void>;
    /** Update settings */
    updateSettings: (settings: Partial<DownloadState['settings']>) => void;
    /** Check for expired items */
    cleanupExpired: () => void;
}

type DownloadStore = DownloadState & DownloadActions;

// =============================================================================
// DEFAULTS
// =============================================================================

const DEFAULT_EXPIRY_DAYS = 30;
const DOWNLOAD_STORAGE_DEBOUNCE_MS = 1000;

const downloadStorage = createJSONStorage(() =>
    createDebouncedStorage(AsyncStorage, DOWNLOAD_STORAGE_DEBOUNCE_MS)
);

// =============================================================================
// STORE
// =============================================================================

export const useDownloadStore = create<DownloadStore>()(
    persist(
        (set, get) => ({
            downloads: [],
            isBackgroundDownloading: false,
            storageUsage: {
                total: 0,
                available: 0,
                appUsed: 0,
            },
            settings: {
                preferredQuality: 'hd',
                autoDeleteOnPlay: false,
                expiryDays: DEFAULT_EXPIRY_DAYS,
                allowMobileData: false,
            },

            addDownload: (itemData) => {
                const { downloads } = get();

                // Prevent duplicate downloads
                if (downloads.find(d => d.id === itemData.id)) {
                    return;
                }

                const newItem: DownloadItem = {
                    ...itemData,
                    status: 'pending',
                    progress: 0,
                    addedAt: Date.now(),
                    expiresAt: Date.now() + (get().settings.expiryDays * 24 * 60 * 60 * 1000),
                };

                set({ downloads: [newItem, ...downloads] });
            },

            updateProgress: (id, progress, downloadedSize, totalSize) => {
                set((state) => ({
                    downloads: state.downloads.map(d =>
                        d.id === id
                            ? { ...d, progress, downloadedSize, totalSize: totalSize || d.totalSize, status: 'downloading' }
                            : d
                    ),
                    isBackgroundDownloading: true
                }));
            },

            completeDownload: (id, localPath) => {
                set((state) => ({
                    downloads: state.downloads.map(d =>
                        d.id === id
                            ? { ...d, status: 'completed', progress: 1, localPath, completedAt: Date.now() }
                            : d
                    ),
                }));
                get().refreshStorageMetrics();
            },

            setDownloadError: (id, error) => {
                set((state) => ({
                    downloads: state.downloads.map(d =>
                        d.id === id
                            ? { ...d, status: 'error', error }
                            : d
                    ),
                }));
            },

            removeDownload: async (id) => {
                const item = get().downloads.find(d => d.id === id);
                const ReactNativeBlobUtil = getBlobUtil();

                if (item?.localPath && ReactNativeBlobUtil) {
                    try {
                        const exists = await ReactNativeBlobUtil.fs.exists(item.localPath);
                        if (exists) {
                            await ReactNativeBlobUtil.fs.unlink(item.localPath);
                        }
                    } catch (error) {
                        console.error('Failed to delete download file:', error);
                    }
                }

                set((state) => ({
                    downloads: state.downloads.filter(d => d.id !== id)
                }));
                get().refreshStorageMetrics();
            },

            pauseDownload: (id) => {
                set((state) => ({
                    downloads: state.downloads.map(d =>
                        d.id === id ? { ...d, status: 'paused' } : d
                    )
                }));
            },

            resumeDownload: (id) => {
                set((state) => ({
                    downloads: state.downloads.map(d =>
                        d.id === id ? { ...d, status: 'pending' } : d
                    )
                }));
            },

            clearAll: async () => {
                const { downloads } = get();
                const ReactNativeBlobUtil = getBlobUtil();

                for (const item of downloads) {
                    if (item.localPath && ReactNativeBlobUtil) {
                        try {
                            const exists = await ReactNativeBlobUtil.fs.exists(item.localPath);
                            if (exists) {
                                await ReactNativeBlobUtil.fs.unlink(item.localPath);
                            }
                        } catch (error) {
                            console.error('Failed to delete file during clearAll:', error);
                        }
                    }
                }
                set({ downloads: [] });
                get().refreshStorageMetrics();
            },

            updateSettings: (newSettings) => {
                set((state) => ({
                    settings: { ...state.settings, ...newSettings }
                }));
            },

            refreshStorageMetrics: async () => {
                const DeviceInfo = getDeviceInfo();

                if (!DeviceInfo) {
                    // Fallback to mock data if native module is missing
                    set({
                        storageUsage: {
                            total: 100 * 1024 * 1024 * 1024,
                            available: 50 * 1024 * 1024 * 1024,
                            appUsed: get().downloads.reduce((acc, d) => acc + (d.downloadedSize || 0), 0),
                        }
                    });
                    return;
                }

                try {
                    const available = await DeviceInfo.getFreeDiskStorage();
                    const total = await DeviceInfo.getTotalDiskCapacity();

                    const appUsed = get().downloads.reduce((acc, d) => acc + (d.downloadedSize || 0), 0);

                    set({
                        storageUsage: {
                            total,
                            available,
                            appUsed,
                        }
                    });
                } catch (error) {
                    console.error('Failed to refresh storage metrics:', error);
                }
            },

            cleanupExpired: async () => {
                const now = Date.now();
                const { downloads } = get();
                const ReactNativeBlobUtil = getBlobUtil();

                const expiredItems = downloads.filter(d => d.expiresAt && d.expiresAt < now && d.status === 'completed');

                for (const item of expiredItems) {
                    if (item.localPath && ReactNativeBlobUtil) {
                        try {
                            const exists = await ReactNativeBlobUtil.fs.exists(item.localPath);
                            if (exists) {
                                await ReactNativeBlobUtil.fs.unlink(item.localPath);
                            }
                        } catch (error) {
                            console.error('Failed to cleanup expired file:', error);
                        }
                    }
                }

                set((state) => ({
                    downloads: state.downloads.map(d => {
                        if (d.expiresAt && d.expiresAt < now && d.status === 'completed') {
                            return { ...d, status: 'expired' as DownloadStatus };
                        }
                        return d;
                    })
                }));
            },
        }),
        {
            name: 'smartifly-downloads',
            storage: downloadStorage,
            // Don't persist large metadata if not needed, but metadata is small here
            partialize: (state) => ({
                downloads: state.downloads.filter(d => d.status === 'completed' || d.status === 'paused'),
                settings: state.settings,
            }),
        }
    )
);

export default useDownloadStore;
