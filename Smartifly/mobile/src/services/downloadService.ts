/**
 * Download Service
 * 
 * Logic for interfacing with react-native-blob-util and
 * updating the Zustand downloadStore.
 * 
 * Handles:
 * - Task creation and management via blob-util's fetch API
 * - Progress tracking
 * - Success/Failure callbacks
 */

import useDownloadStore from '../store/downloadStore';
import { logger } from '../config';
import { Platform } from 'react-native';
import useContentStore from '../store/contentStore';
import useOfflineQueueStore from '../store/offlineQueueStore';

// Safe access to react-native-blob-util
const getBlobUtil = () => {
    try {
        if (Platform.OS === 'web') return null;
        return require('react-native-blob-util').default;
    } catch {
        return null;
    }
};

// Track active download tasks for cancellation
const activeTasks: Map<string, any> = new Map();

class DownloadService {
    private static instance: DownloadService;

    private constructor() {
        // Initialization
    }

    public static getInstance(): DownloadService {
        if (!DownloadService.instance) {
            DownloadService.instance = new DownloadService();
        }
        return DownloadService.instance;
    }

    /**
     * Get the downloads directory path
     */
    public getDownloadsDir(): string {
        const ReactNativeBlobUtil = getBlobUtil();
        if (!ReactNativeBlobUtil) return '';

        return Platform.OS === 'ios'
            ? ReactNativeBlobUtil.fs.dirs.DocumentDir
            : ReactNativeBlobUtil.fs.dirs.DownloadDir;
    }

    /**
     * Start a new download using react-native-blob-util
     */
    public async startDownload(id: string, url: string, filename: string): Promise<boolean> {
        const ReactNativeBlobUtil = getBlobUtil();
        const isConnected = useContentStore.getState().isConnected;

        if (!isConnected) {
            useOfflineQueueStore.getState().enqueueAction('retry_download', { id, url, filename });
            useDownloadStore.getState().setDownloadError(id, 'No internet connection. Download queued for retry.');
            return false;
        }

        if (!ReactNativeBlobUtil) {
            logger.error('ReactNativeBlobUtil not available');
            useDownloadStore.getState().setDownloadError(id, 'Download initialization failed: Native module missing');
            return false;
        }

        try {
            const downloadsDir = this.getDownloadsDir();
            const destination = `${downloadsDir}/${filename}`;

            logger.debug(`Starting download: ${id}`, { destination });

            // Configure the download
            const config = {
                fileCache: true,
                path: destination,
                // For iOS, prevent file from being backed up to iCloud
                appendExt: filename.split('.').pop() || 'mp4',
            };

            // Start the download task
            const task = ReactNativeBlobUtil.config(config)
                .fetch('GET', url)
                .progress({ count: 10, interval: 250 }, (received: number, total: number) => {
                    const progress = total > 0 ? received / total : 0;
                    useDownloadStore.getState().updateProgress(id, progress, received, total);
                });

            // Store the task for potential cancellation
            activeTasks.set(id, task);

            // Wait for completion
            const res = await task;

            // Remove from active tasks
            activeTasks.delete(id);

            // Check if download was successful
            const path = res.path();
            if (path) {
                logger.info(`Download completed: ${id}`, { path });
                useDownloadStore.getState().completeDownload(id, path);
                return true;
            } else {
                throw new Error('Download path not available');
            }

        } catch (error: any) {
            activeTasks.delete(id);

            // Check if it was cancelled
            if (error.message?.includes('cancelled') || error.message?.includes('canceled')) {
                logger.info(`Download cancelled: ${id}`);
                return false;
            }

            logger.error(`Download failed: ${id}`, error);
            useDownloadStore.getState().setDownloadError(id, error.message || 'Download failed');
            return false;
        }
    }

    /**
     * Cancel an active download
     */
    public cancelDownload(id: string): boolean {
        const task = activeTasks.get(id);
        if (task && task.cancel) {
            task.cancel();
            activeTasks.delete(id);
            logger.info(`Download task cancelled: ${id}`);
            return true;
        }
        return false;
    }

    /**
     * Check if a file exists
     */
    public async fileExists(path: string): Promise<boolean> {
        const ReactNativeBlobUtil = getBlobUtil();
        if (!ReactNativeBlobUtil) return false;

        try {
            return await ReactNativeBlobUtil.fs.exists(path);
        } catch {
            return false;
        }
    }

    /**
     * Delete a file
     */
    public async deleteFile(path: string): Promise<boolean> {
        const ReactNativeBlobUtil = getBlobUtil();
        if (!ReactNativeBlobUtil) return false;

        try {
            const exists = await ReactNativeBlobUtil.fs.exists(path);
            if (exists) {
                await ReactNativeBlobUtil.fs.unlink(path);
                return true;
            }
            return false;
        } catch (error) {
            logger.error('Failed to delete file:', error);
            return false;
        }
    }

    /**
     * Get file stats (size, modified time)
     */
    public async getFileStats(path: string): Promise<{ size: number; lastModified: number } | null> {
        const ReactNativeBlobUtil = getBlobUtil();
        if (!ReactNativeBlobUtil) return null;

        try {
            const stat = await ReactNativeBlobUtil.fs.stat(path);
            return {
                size: stat.size || 0,
                lastModified: stat.lastModified || Date.now(),
            };
        } catch {
            return null;
        }
    }

    /**
     * Check if native module is available
     */
    public isAvailable(): boolean {
        return getBlobUtil() !== null;
    }
}

export default DownloadService.getInstance();
