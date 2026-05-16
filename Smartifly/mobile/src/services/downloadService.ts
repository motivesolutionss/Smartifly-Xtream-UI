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
     * Resolve redirect chain to get the final download URL with token.
     * Xtream servers return 302 → CDN URL with a time-limited token.
     * We need the final URL so react-native-blob-util can track Content-Length correctly.
     * Also used by the VLC player to avoid MobileVLCKit redirect issues.
     */
    public async resolveFinalUrl(url: string): Promise<string> {
        try {
            const ReactNativeBlobUtil = getBlobUtil();
            if (!ReactNativeBlobUtil) return url;

            // Use a HEAD request to follow redirects and get the final URL
            const response = await ReactNativeBlobUtil.fetch('HEAD', url, {});
            // react-native-blob-util exposes the final URL after redirects
            const finalUrl = response.info()?.redirects?.slice(-1)[0] || url;
            return finalUrl;
        } catch {
            return url; // fall back to original if resolution fails
        }
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

            logger.debug(`Starting download: ${id}`, { url, destination });

            // Resolve the final CDN URL with token so progress tracking works.
            // Xtream servers redirect to a CDN URL with Content-Length — we need
            // that final URL for react-native-blob-util to report progress correctly.
            const finalUrl = await this.resolveFinalUrl(url);
            logger.debug(`Resolved download URL: ${id}`, { finalUrl: finalUrl.substring(0, 80) });

            const config: any = {
                fileCache: true,
                path: destination,
                appendExt: filename.split('.').pop() || 'mp4',
                // iOS: allow download to continue in background
                ...(Platform.OS === 'ios' ? { IOSBackgroundTask: true } : {}),
                // Android: show notification
                ...(Platform.OS === 'android' ? {
                    addAndroidDownloads: {
                        useDownloadManager: false,
                        notification: true,
                        title: filename,
                        description: 'Downloading...',
                    }
                } : {}),
            };

            // Start the download task
            const task = ReactNativeBlobUtil.config(config)
                .fetch('GET', finalUrl, {
                    'User-Agent': Platform.OS === 'ios'
                        ? 'Smartifly/3.0 iOS'
                        : 'Smartifly/3.0 Android',
                })
                .progress({ count: 20, interval: 500 }, (received: number, total: number) => {
                    // total can be -1 if Content-Length is missing — show indeterminate
                    const progress = total > 0 ? received / total : -1;
                    useDownloadStore.getState().updateProgress(
                        id,
                        progress < 0 ? 0 : progress,
                        received,
                        total > 0 ? total : undefined
                    );
                });

            // Store the task for potential cancellation
            activeTasks.set(id, task);

            // Wait for completion
            const res = await task;

            // Remove from active tasks
            activeTasks.delete(id);

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
