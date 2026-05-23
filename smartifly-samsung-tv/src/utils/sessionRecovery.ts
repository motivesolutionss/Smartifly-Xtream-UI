import { playlistStorage } from "../storage/playlistStorage";
import { useAuthStore } from "../store/authStore";
import { usePlayerStore } from "../store/playerStore";
import { useProfileStore } from "../store/profileStore";

export const returnToLogin = (): void => {
  usePlayerStore.getState().setActivePlaybackItem(null);
  useProfileStore.getState().selectProfile(null);
  useAuthStore.getState().setActivePlaylist(null);
  playlistStorage.setActivePlaylistId(null);

  window.location.reload();
};
