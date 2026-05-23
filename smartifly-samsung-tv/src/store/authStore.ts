import type { PlaylistCredentials } from "../storage/playlistStorage";
import { create } from "zustand";

export type AuthState = {
  activePlaylist: PlaylistCredentials | null;
  setActivePlaylist: (playlist: PlaylistCredentials | null) => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  activePlaylist: null,
  setActivePlaylist: (playlist) => set({ activePlaylist: playlist }),
}));
