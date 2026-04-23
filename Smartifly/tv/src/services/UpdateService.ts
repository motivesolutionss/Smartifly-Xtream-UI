import ReactNativeBlobUtil from 'react-native-blob-util';
import { Platform } from 'react-native';
import config, { logger } from '../config';

export interface UpdateInfo {
    updateAvailable: boolean;
    latestVersion: string;
    downloadUrl: string;
    releaseNotes: string;
    fileSize: number;
}

class UpdateService {
    private static instance: UpdateService;

    private constructor() { }

    public static getInstance(): UpdateService {
        if (!UpdateService.instance) {
            UpdateService.instance = new UpdateService();
        }
        return UpdateService.instance;
    }

    /**
     * Check for updates on the Portfolio backend
     */
    async checkForUpdates(): Promise<UpdateInfo | null> {
        try {
            const currentVersion = config.app.version;
            // Map 'Smartifly' to 'Smartifly IPTV Pro' for the backend check
            const appName = config.app.name === 'Smartifly' ? 'Smartifly IPTV Pro' : config.app.name;

            // Use the Master Backend URL (Portfolio) for update checks
            const baseUrl = config.api.masterBackendUrl;

            const response = await fetch(
                `${baseUrl}/apps/check-update?name=${encodeURIComponent(appName)}&version=${currentVersion}&platform=tv`
            );

            // Read as text first to handle potential HTML errors from server/platform
            const responseText = await response.text();
            let result;

            try {
                result = JSON.parse(responseText);
            } catch (parseError) {
                logger.error(`JSON Parse Error: Received non-JSON response from ${baseUrl}. Status: ${response.status}`, parseError);
                logger.debug(`Raw response body: ${responseText.substring(0, 500)}`);
                return null;
            }

            if (result.success) {
                return {
                    updateAvailable: result.updateAvailable,
                    latestVersion: result.latestVersion,
                    downloadUrl: result.downloadUrl,
                    releaseNotes: result.releaseNotes,
                    fileSize: parseInt(result.fileSize, 10) || 0
                };
            }
            return null;
        } catch (error) {
            logger.error('Failed to check for updates:', error);
            return null;
        }
    }

    /**
     * Download the APK and trigger installation
     */
    async downloadAndInstall(
        url: string,
        onProgress?: (received: number, total: number) => void,
        expectedTotalSize?: number
    ): Promise<void> {
        if (Platform.OS !== 'android') {
            logger.warn('Update functionality only supported on Android');
            return;
        }

        try {
            const appName = config.app.name.replace(/[^a-zA-Z0-9]/g, '_');
            const path = `${ReactNativeBlobUtil.fs.dirs.DownloadDir}/${appName}_update.apk`;

            // Ensure destination exists and is clean
            if (await ReactNativeBlobUtil.fs.exists(path)) {
                await ReactNativeBlobUtil.fs.unlink(path);
            }

            logger.info(`Starting direct download from: ${url}`);

            // We use direct fetch instead of DownloadManager for better progress UI control
            const res = await ReactNativeBlobUtil
                .config({
                    path,
                    fileCache: true,
                    followRedirect: true,
                })
                .fetch('GET', url)
                .progress({ count: 10, interval: 250 }, (received, total) => {
                    const receivedNum = Number(received);
                    let totalNum = Number(total);

                    // Fallback to expectedTotalSize if server total is missing or -1
                    if (totalNum <= 0 && expectedTotalSize && expectedTotalSize > 0) {
                        totalNum = expectedTotalSize;
                    }

                    if (onProgress && totalNum > 0) {
                        onProgress(receivedNum, totalNum);
                    }
                });

            const status = res.info().status;
            logger.info(`Download finished with status: ${status}`);

            if (status === 200 || status === 201) {
                // Post-download: Trigger the Android Installer
                logger.info('Download successful, prompting user for installation');

                // Note: For Android 10+, we might need to use actionViewIntent with specific flags
                ReactNativeBlobUtil.android.actionViewIntent(
                    res.path(),
                    'application/vnd.android.package-archive'
                );
            } else {
                throw new Error(`Server returned status ${status}. Download failed.`);
            }
        } catch (error) {
            logger.error('The update download process was interrupted:', error);
            throw error;
        }
    }
}

export default UpdateService.getInstance();
