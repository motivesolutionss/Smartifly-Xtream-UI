import { localStorageService } from "./localStorageService";
import { playlistStorage } from "./playlistStorage";

export interface UserProfile {
  id: string;
  name: string;
  avatarColor: string; // Sleek color
  avatarIcon: string;  // Lucide icon name matching profile selection icons
  isKids?: boolean;
}

export const DEFAULT_AVATAR_COLORS = [
  "#E50914", // Red
  "#3182CE", // Blue
  "#38A169", // Green
  "#805AD5", // Purple
  "#DD6B20", // Orange
  "#D69E2E", // Gold/Yellow
];

export const DEFAULT_AVATARS = [
  "smile",
  "tv",
  "film",
  "clapperboard",
  "heart",
  "star",
];

const getActivePlaylistId = (): string | null => {
  return playlistStorage.getActivePlaylistId();
};

const getProfilesKey = (): string | null => {
  const playlistId = getActivePlaylistId();
  if (!playlistId) return null;
  return `smartifly_profiles_${playlistId}`;
};

const getActiveProfileIdKey = (): string | null => {
  const playlistId = getActivePlaylistId();
  if (!playlistId) return null;
  return `smartifly_active_profile_id_${playlistId}`;
};

export const profileStorage = {
  getProfiles: (): UserProfile[] => {
    const key = getProfilesKey();
    if (!key) return [];

    let profiles = localStorageService.get<UserProfile[]>(key);
    if (!profiles || profiles.length === 0) {
      // Seed default main profile if empty
      const defaultProfile: UserProfile = {
        id: "profile_main",
        name: "Primary",
        avatarColor: DEFAULT_AVATAR_COLORS[0],
        avatarIcon: "smile",
        isKids: false,
      };
      profiles = [defaultProfile];
      localStorageService.set(key, profiles);
    }
    return profiles;
  },

  saveProfile: (profile: UserProfile): void => {
    const key = getProfilesKey();
    if (!key) return;

    const profiles = profileStorage.getProfiles();
    const index = profiles.findIndex((p) => p.id === profile.id);
    if (index >= 0) {
      profiles[index] = profile;
    } else {
      profiles.push(profile);
    }
    localStorageService.set(key, profiles);
  },

  deleteProfile: (id: string): void => {
    const key = getProfilesKey();
    if (!key) return;

    const profiles = profileStorage.getProfiles().filter((p) => p.id !== id);
    if (profiles.length === 0) return; // Prevent deleting the last profile
    localStorageService.set(key, profiles);

    if (profileStorage.getActiveProfileId() === id) {
      profileStorage.setActiveProfileId(profiles[0].id);
    }
  },

  getActiveProfileId: (): string | null => {
    const key = getActiveProfileIdKey();
    if (!key) return null;
    return localStorageService.get<string>(key);
  },

  setActiveProfileId: (id: string | null): void => {
    const key = getActiveProfileIdKey();
    if (!key) return;

    if (id === null) {
      localStorageService.remove(key);
    } else {
      localStorageService.set(key, id);
    }
  },

  getActiveProfile: (): UserProfile | null => {
    const activeId = profileStorage.getActiveProfileId();
    if (!activeId) return null;
    return profileStorage.getProfiles().find((p) => p.id === activeId) || null;
  },
};
