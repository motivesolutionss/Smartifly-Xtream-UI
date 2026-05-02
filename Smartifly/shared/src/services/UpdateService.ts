import { Platform } from 'react-native';
import ReactNativeBlobUtil from 'react-native-blob-util';
import config, { logger } from '../config';

export interface UpdateInfo {
  updateAvailable: boolean;
  latestVersion: string;
  downloadUrl: string;
  releaseNotes: string;
  fileSize: number;
  sha256?: string;
}

class UpdateService {
  private static instance: UpdateService;
  private readonly checkTimeoutMs = 10000;

  private constructor() {}

  public static getInstance(): UpdateService {
    if (!UpdateService.instance) {
      UpdateService.instance = new UpdateService();
    }
    return UpdateService.instance;
  }

  private getUpdatePlatform(): 'tv' | 'mobile' {
    return Platform.isTV ? 'tv' : 'mobile';
  }

  private isHttpsUrl(url: string): boolean {
    return /^https:\/\//i.test(url.trim());
  }

  private isValidSha256(value?: string): boolean {
    return !!value && /^[a-fA-F0-9]{64}$/.test(value);
  }

  private async fetchWithTimeout(url: string): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.checkTimeoutMs);

    try {
      return await fetch(url, { signal: controller.signal });
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async checkForUpdates(): Promise<UpdateInfo | null> {
    try {
      const currentVersion = config.app.version;
      const appName = config.app.name === 'Smartifly' ? 'Smartifly IPTV Pro' : config.app.name;
      const baseUrl = config.api.masterBackendUrl;
      const requestUrl = `${baseUrl}/apps/check-update?name=${encodeURIComponent(appName)}&version=${currentVersion}&platform=${this.getUpdatePlatform()}`;

      const response = await this.fetchWithTimeout(requestUrl);
      const responseText = await response.text();
      let result;

      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        logger.error(`JSON Parse Error: Received non-JSON response from ${baseUrl}. Status: ${response.status}`, parseError);
        logger.debug(`Raw response body: ${responseText.substring(0, 500)}`);
        return null;
      }

      if (!response.ok || !result.success) {
        logger.warn(`Update check failed. Status: ${response.status}`);
        return null;
      }

      const downloadUrl = String(result.downloadUrl || '');
      if (result.updateAvailable && !this.isHttpsUrl(downloadUrl)) {
        logger.error('Rejected update: APK download URL must use HTTPS.');
        return null;
      }

      const sha256 = typeof result.sha256 === 'string'
        ? result.sha256.trim().toLowerCase()
        : undefined;

      return {
        updateAvailable: Boolean(result.updateAvailable),
        latestVersion: String(result.latestVersion || ''),
        downloadUrl,
        releaseNotes: String(result.releaseNotes || ''),
        fileSize: parseInt(String(result.fileSize || '0'), 10) || 0,
        sha256: this.isValidSha256(sha256) ? sha256 : undefined,
      };
    } catch (error) {
      logger.error('Failed to check for updates:', error);
      return null;
    }
  }

  async downloadAndInstall(
    url: string,
    onProgress?: (received: number, total: number) => void,
    expectedTotalSize?: number,
    expectedSha256?: string
  ): Promise<void> {
    if (Platform.OS !== 'android') {
      logger.warn('Update functionality only supported on Android');
      return;
    }

    if (!this.isHttpsUrl(url)) {
      throw new Error('APK update URL must use HTTPS.');
    }

    if (expectedSha256 && !this.isValidSha256(expectedSha256)) {
      throw new Error('Invalid APK checksum format.');
    }

    try {
      const appName = config.app.name.replace(/[^a-zA-Z0-9]/g, '_');
      const path = `${ReactNativeBlobUtil.fs.dirs.DownloadDir}/${appName}_update.apk`;

      if (await ReactNativeBlobUtil.fs.exists(path)) {
        await ReactNativeBlobUtil.fs.unlink(path);
      }

      logger.info(`Starting secure APK download from: ${url}`);

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

          if (totalNum <= 0 && expectedTotalSize && expectedTotalSize > 0) {
            totalNum = expectedTotalSize;
          }

          if (onProgress && totalNum > 0) {
            onProgress(receivedNum, totalNum);
          }
        });

      const status = res.info().status;
      logger.info(`Download finished with status: ${status}`);

      if (status !== 200 && status !== 201) {
        throw new Error(`Server returned status ${status}. Download failed.`);
      }

      if (expectedSha256) {
        const actualSha256 = await ReactNativeBlobUtil.fs.hash(res.path(), 'sha256');

        if (actualSha256.toLowerCase() !== expectedSha256.toLowerCase()) {
          await ReactNativeBlobUtil.fs.unlink(res.path()).catch(() => undefined);
          throw new Error('APK checksum verification failed.');
        }

        logger.info('APK checksum verification passed.');
      } else {
        logger.warn('APK checksum was not provided. Skipping integrity verification.');
      }

      logger.info('Download successful, prompting user for installation');

      ReactNativeBlobUtil.android.actionViewIntent(
        res.path(),
        'application/vnd.android.package-archive'
      );
    } catch (error) {
      logger.error('The update download process was interrupted:', error);
      throw error;
    }
  }
}

export default UpdateService.getInstance();
