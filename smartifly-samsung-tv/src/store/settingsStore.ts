import { create } from "zustand";
import {
  settingsStorage,
  type AppSettings,
  DEFAULT_SETTINGS,
} from "../storage/settingsStorage";

export type SettingsState = AppSettings & {
  setLiveExtension: (extension: "ts" | "m3u8") => void;
  setAutoplayLiveOnFocus: (enabled: boolean) => void;
  setParentalLock: (enabled: boolean) => void;
  setParentalPin: (pin: string) => void;
  isParentalUnlocked: boolean;
  unlockParentalSession: () => void;
  lockParentalSession: () => void;
  resetSettings: () => void;
  rehydrateForScope: () => void;
};

const persistSettings = (partial: Partial<AppSettings>) => {
  const nextSettings = {
    ...settingsStorage.getSettings(),
    ...partial,
  };
  settingsStorage.saveSettings(nextSettings);
  return nextSettings;
};

export const useSettingsStore = create<SettingsState>((set) => {
  const initial = settingsStorage.getSettings();

  return {
    liveExtension: initial.liveExtension,
    autoplayLiveOnFocus: initial.autoplayLiveOnFocus,
    enableParentalLock: initial.enableParentalLock,
    parentalPin: initial.parentalPin,
    isParentalUnlocked: false,
    setLiveExtension: (liveExtension) => {
      const next = persistSettings({ liveExtension });
      set(next);
    },
    setAutoplayLiveOnFocus: (autoplayLiveOnFocus) => {
      const next = persistSettings({ autoplayLiveOnFocus });
      set(next);
    },
    setParentalLock: (enableParentalLock) => {
      const next = persistSettings({ enableParentalLock });
      set({ ...next, isParentalUnlocked: !enableParentalLock });
    },
    setParentalPin: (parentalPin) => {
      const normalizedPin = parentalPin.trim();
      if (!/^\d{4,6}$/.test(normalizedPin)) return;
      const next = persistSettings({ parentalPin: normalizedPin });
      set({ ...next, isParentalUnlocked: false });
    },
    unlockParentalSession: () => set({ isParentalUnlocked: true }),
    lockParentalSession: () => set({ isParentalUnlocked: false }),
    resetSettings: () => {
      settingsStorage.saveSettings(DEFAULT_SETTINGS);
      set({ ...DEFAULT_SETTINGS, isParentalUnlocked: false });
    },
    rehydrateForScope: () => {
      const next = settingsStorage.getSettings();
      set({ ...next, isParentalUnlocked: false });
    },
  };
});
