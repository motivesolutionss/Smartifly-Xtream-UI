import { playlistStorage } from "../storage/playlistStorage";
import { useAuthStore } from "../store/authStore";
import { usePlayerStore } from "../store/playerStore";
import { useProfileStore } from "../store/profileStore";
import { clearSessionCaches } from "./clearSessionCaches";

export const returnToLogin = async (): Promise<void> => {
  usePlayerStore.getState().setActivePlaybackItem(null);
  useProfileStore.getState().selectProfile(null);
  useAuthStore.getState().setActivePlaylist(null);
  playlistStorage.setActivePlaylistId(null);
  await clearSessionCaches({ reason: "sign-out" });

  window.location.reload();
};
