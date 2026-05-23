import { localStorageService } from "./localStorageService";
import { playlistStorage } from "./playlistStorage";
import { profileStorage } from "./profileStorage";

const getSettingsKey = (): string | null => {
  const playlistId = playlistStorage.getActivePlaylistId();
  const profileId = profileStorage.getActiveProfileId();
  if (!playlistId || !profileId) return null;
  return `smartifly_settings_${playlistId}_${profileId}`;
};

export type AppSettings = {
  liveExtension: "ts" | "m3u8";
  autoplayLiveOnFocus: boolean;
  enableParentalLock: boolean;
  parentalPin: string;
};

const DEFAULT_SETTINGS: AppSettings = {
  liveExtension: "ts",
  autoplayLiveOnFocus: false,
  enableParentalLock: false,
  parentalPin: "0000",
};

export const settingsStorage = {
  getSettings(): AppSettings {
    const key = getSettingsKey();
    if (!key) return DEFAULT_SETTINGS;

    const stored = localStorageService.get<Partial<AppSettings>>(key);
    if (!stored) return DEFAULT_SETTINGS;

    return {
      liveExtension:
        stored.liveExtension === "m3u8" ? "m3u8" : DEFAULT_SETTINGS.liveExtension,
      autoplayLiveOnFocus:
        typeof stored.autoplayLiveOnFocus === "boolean"
          ? stored.autoplayLiveOnFocus
          : DEFAULT_SETTINGS.autoplayLiveOnFocus,
      enableParentalLock:
        typeof stored.enableParentalLock === "boolean"
          ? stored.enableParentalLock
          : DEFAULT_SETTINGS.enableParentalLock,
      parentalPin:
        typeof stored.parentalPin === "string" &&
        /^\d{4,6}$/.test(stored.parentalPin)
          ? stored.parentalPin
          : DEFAULT_SETTINGS.parentalPin,
    };
  },

  saveSettings(settings: AppSettings): void {
    const key = getSettingsKey();
    if (!key) return;
    localStorageService.set(key, settings);
  },

  clearSettings(): void {
    const key = getSettingsKey();
    if (!key) return;
    localStorageService.remove(key);
  },
};

export { DEFAULT_SETTINGS };
