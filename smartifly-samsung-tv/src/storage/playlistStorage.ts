import { localStorageService } from "./localStorageService";

export type PlaylistCredentials = {
  id: string;
  name: string;
  serverUrl: string;
  username: string;
  password: string;
  addedAt: string;
};

const PLAYLISTS_KEY = "smartifly_playlists";
const ACTIVE_PLAYLIST_ID_KEY = "smartifly_active_playlist_id";

const getAllLocalStorageKeys = (): string[] => {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (key) keys.push(key);
  }
  return keys;
};

const clearScopedKeysForPlaylist = (playlistId: string): void => {
  const exactKeys = new Set<string>([
    `smartifly_profiles_${playlistId}`,
    `smartifly_active_profile_id_${playlistId}`,
  ]);

  const prefixedKeys = [
    `smartifly_favorites_${playlistId}_`,
    `smartifly_history_${playlistId}_`,
    `smartifly_settings_${playlistId}_`,
  ];

  getAllLocalStorageKeys().forEach((key) => {
    if (exactKeys.has(key) || prefixedKeys.some((prefix) => key.startsWith(prefix))) {
      localStorageService.remove(key);
    }
  });
};

export const createPlaylistId = (serverUrl: string, username: string) => {
  return `${serverUrl}:${username}`.toLowerCase();
};

export const playlistStorage = {
  getPlaylists: (): PlaylistCredentials[] => {
    return localStorageService.get<PlaylistCredentials[]>(PLAYLISTS_KEY) || [];
  },

  getAllPlaylists: (): PlaylistCredentials[] => {
    return playlistStorage.getPlaylists();
  },

  savePlaylist: (playlist: PlaylistCredentials): void => {
    const playlists = playlistStorage.getPlaylists();
    const index = playlists.findIndex((p) => p.id === playlist.id);
    
    if (index >= 0) {
      playlists[index] = playlist;
    } else {
      playlists.push(playlist);
    }
    
    localStorageService.set(PLAYLISTS_KEY, playlists);
  },

  deletePlaylist: (id: string): void => {
    const playlists = playlistStorage.getPlaylists().filter((p) => p.id !== id);
    localStorageService.set(PLAYLISTS_KEY, playlists);
    clearScopedKeysForPlaylist(id);
    
    if (playlistStorage.getActivePlaylistId() === id) {
      playlistStorage.setActivePlaylistId(null);
    }
  },

  getActivePlaylistId: (): string | null => {
    return localStorageService.get<string>(ACTIVE_PLAYLIST_ID_KEY);
  },

  setActivePlaylistId: (id: string | null): void => {
    if (id === null) {
      localStorageService.remove(ACTIVE_PLAYLIST_ID_KEY);
    } else {
      localStorageService.set(ACTIVE_PLAYLIST_ID_KEY, id);
    }
  },

  setActivePlaylist: (id: string | null): void => {
    playlistStorage.setActivePlaylistId(id);
  },

  getActivePlaylist: (): PlaylistCredentials | null => {
    const activeId = playlistStorage.getActivePlaylistId();
    if (!activeId) return null;
    return playlistStorage.getPlaylists().find((p) => p.id === activeId) || null;
  },
};
