import { create } from "zustand";
import { profileStorage, type UserProfile } from "../storage/profileStorage";

export type ProfileState = {
  activeProfile: UserProfile | null;
  profiles: UserProfile[];
  isEditMode: boolean;
  
  loadProfiles: () => void;
  selectProfile: (profile: UserProfile | null) => void;
  createProfile: (name: string, avatarColor: string, avatarIcon: string, isKids?: boolean) => void;
  updateProfile: (profile: UserProfile) => void;
  deleteProfile: (id: string) => void;
  setEditMode: (enabled: boolean) => void;
  rehydrateForPlaylist: () => void;
};

export const useProfileStore = create<ProfileState>((set) => {
  // Gracefully load initial states from persistent storage on bootstrap
  const initialProfile = profileStorage.getActiveProfile();
  const initialProfiles = profileStorage.getProfiles();

  return {
    activeProfile: initialProfile,
    profiles: initialProfiles,
    isEditMode: false,

    loadProfiles: () => {
      const list = profileStorage.getProfiles();
      set({ profiles: list });
    },

    selectProfile: (profile) => {
      profileStorage.setActiveProfileId(profile ? profile.id : null);
      set({ activeProfile: profile });
    },

    createProfile: (name, avatarColor, avatarIcon, isKids = false) => {
      const newProfile: UserProfile = {
        id: `profile_${Date.now()}`,
        name: name.trim() || "Viewer",
        avatarColor,
        avatarIcon,
        isKids,
      };
      profileStorage.saveProfile(newProfile);
      
      const list = profileStorage.getProfiles();
      set({ profiles: list });
    },

    updateProfile: (profile) => {
      profileStorage.saveProfile(profile);
      const list = profileStorage.getProfiles();
      const currentActive = profileStorage.getActiveProfile();
      set({ profiles: list, activeProfile: currentActive });
    },

    deleteProfile: (id) => {
      profileStorage.deleteProfile(id);
      const list = profileStorage.getProfiles();
      const currentActive = profileStorage.getActiveProfile();
      set({ profiles: list, activeProfile: currentActive });
    },

    setEditMode: (isEditMode) => {
      set({ isEditMode });
    },

    rehydrateForPlaylist: () => {
      const currentActive = profileStorage.getActiveProfile();
      const list = profileStorage.getProfiles();
      set({ activeProfile: currentActive, profiles: list, isEditMode: false });
    },
  };
});
