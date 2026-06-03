import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

type SettingsState = {
  autoplayPreviews: boolean;
  compactLayout: boolean;
  reducedMotion: boolean;
  dataSaver: boolean;
  playbackStartupGuard: boolean;
  webosNativeHlsMediaOption: boolean;
  hlsPlaylistRewrite: boolean;
};

type SettingsActions = {
  setAutoplayPreviews: (value: boolean) => void;
  setCompactLayout: (value: boolean) => void;
  setReducedMotion: (value: boolean) => void;
  setDataSaver: (value: boolean) => void;
  setPlaybackStartupGuard: (value: boolean) => void;
  setWebosNativeHlsMediaOption: (value: boolean) => void;
  setHlsPlaylistRewrite: (value: boolean) => void;
  resetSettings: () => void;
};

type SettingsStore = SettingsState & SettingsActions;

const defaults: SettingsState = {
  autoplayPreviews: true,
  compactLayout: false,
  reducedMotion: false,
  dataSaver: false,
  playbackStartupGuard: true,
  webosNativeHlsMediaOption: true,
  hlsPlaylistRewrite: true
};

const safeStorage = {
  getItem(name: string) {
    try {
      return window.localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem(name: string, value: string) {
    try {
      window.localStorage.setItem(name, value);
    } catch {
      // Ignore storage failures in restricted browser modes.
    }
  },
  removeItem(name: string) {
    try {
      window.localStorage.removeItem(name);
    } catch {
      // Ignore storage failures in restricted browser modes.
    }
  }
};

const settingsStorage = createJSONStorage(() => safeStorage);

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      ...defaults,
      setAutoplayPreviews: (value) => set({ autoplayPreviews: value }),
      setCompactLayout: (value) => set({ compactLayout: value }),
      setReducedMotion: (value) => set({ reducedMotion: value }),
      setDataSaver: (value) => set({ dataSaver: value }),
      setPlaybackStartupGuard: (value) => set({ playbackStartupGuard: value }),
      setWebosNativeHlsMediaOption: (value) => set({ webosNativeHlsMediaOption: value }),
      setHlsPlaylistRewrite: (value) => set({ hlsPlaylistRewrite: value }),
      resetSettings: () => set(defaults)
    }),
    {
      name: 'smartifly-lg-settings-v1',
      storage: settingsStorage,
      partialize: (state) => ({
        autoplayPreviews: state.autoplayPreviews,
        compactLayout: state.compactLayout,
        reducedMotion: state.reducedMotion,
        dataSaver: state.dataSaver,
        playbackStartupGuard: state.playbackStartupGuard,
        webosNativeHlsMediaOption: state.webosNativeHlsMediaOption,
        hlsPlaylistRewrite: state.hlsPlaylistRewrite
      })
    }
  )
);

export default useSettingsStore;
