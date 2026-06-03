import { create } from 'zustand';
import {
  createXtreamApi,
  type DeviceActivationLicense,
  type PortalDetails,
  type XtreamServerInfo,
  type XtreamUserInfo,
  validatePortalCode
} from '../services/api';
import { loadHomeBootstrapData, type HomeBootstrapData } from '../features/home/homeBootstrap';

export type Session = {
  portalCode: string;
  portalBaseUrl: string;
  serverName: string;
  username: string;
  userInfo?: XtreamUserInfo;
  serverInfo?: XtreamServerInfo;
  authenticatedAt?: string;
};

export type UserProfile = {
  id: string;
  name: string;
  avatarSeed: string;
  isKids?: boolean;
};

export type AppDestination =
  | 'home'
  | 'movies'
  | 'series'
  | 'live'
  | 'details'
  | 'player'
  | 'search'
  | 'watchlist'
  | 'settings';

export type SelectedContent = {
  id: string;
  contentId: number;
  kind: 'movie' | 'series';
  title: string;
  categoryId?: string;
  posterUrl?: string;
  backdropUrl?: string;
  description?: string;
  year?: string;
  rating?: string;
};

export type LivePlaybackChannel = {
  id: string;
  title: string;
  streamId: number;
  streamUrl: string;
  artwork?: string;
};

export type PlaybackRequest = {
  id: string;
  kind: 'movie' | 'series' | 'live';
  title: string;
  description?: string;
  posterUrl?: string;
  backdropUrl?: string;
  streamUrl: string;
  fallbackUrls?: string[];
  resumePosition?: number;
  episodeTitle?: string;
  returnDestination: AppDestination;
  liveQueue?: LivePlaybackChannel[];
  liveIndex?: number;
  /** Delay before opening the stream after a live channel switch (ms). */
  liveHandoffMs?: number;
  streamId?: number;
  seriesId?: number;
  seasonNumber?: number;
  episodeNumber?: number;
};

type LoginInput = {
  portalCode: string;
  username: string;
  password: string;
};

export type BootstrapStatus = 'idle' | 'loading' | 'ready' | 'error';
export type OnboardingScreen = 'welcome' | 'login' | 'register';
export type ProfileSelectionSource = 'post-login' | 'home-sidebar';

type AppState = {
  onboardingScreen: OnboardingScreen;
  lastPortal: string;
  session: Session | null;
  profiles: UserProfile[];
  selectedProfile: UserProfile | null;
  profileSelectionSource: ProfileSelectionSource;
  bootstrapStatus: BootstrapStatus;
  bootstrapError: string | null;
  homeBootstrapData: HomeBootstrapData | null;
  currentDestination: AppDestination;
  sidebarDestination: AppDestination;
  sidebarFocusTarget: 'profile' | AppDestination | 'settings';
  homeFocusId: string;
  moviesCategoryId: string;
  moviesFocusId: string;
  moviesLastFocusedCardId: string;
  seriesCategoryId: string;
  seriesFocusId: string;
  seriesLastFocusedCardId: string;
  liveCategoryId: string;
  liveFocusId: string;
  liveLastFocusedCardId: string;
  searchQuery: string;
  searchFocusId: string;
  selectedContent: SelectedContent | null;
  selectedPlayback: PlaybackRequest | null;
  detailReturnDestination: AppDestination;
  statusMessage: string;
  isAuthenticating: boolean;
  setOnboardingScreen: (screen: OnboardingScreen) => void;
  setStatusMessage: (message: string) => void;
  signIn: (input: LoginInput) => Promise<boolean>;
  completeDeviceActivation: (license: DeviceActivationLicense, deviceId: string) => Promise<boolean>;
  bootstrapHomeData: () => Promise<void>;
  resetBootstrap: () => void;
  selectProfile: (profileId: string) => void;
  clearSelectedProfile: () => void;
  openProfileSelectionFromHome: () => void;
  leaveProfileSelection: () => void;
  setCurrentDestination: (destination: AppDestination) => void;
  setSidebarFocusTarget: (target: 'profile' | AppDestination | 'settings') => void;
  setHomeFocusId: (focusId: string) => void;
  setMoviesBrowseState: (state: { categoryId?: string, focusId?: string, lastFocusedCardId?: string }) => void;
  setSeriesBrowseState: (state: { categoryId?: string, focusId?: string, lastFocusedCardId?: string }) => void;
  setLiveBrowseState: (state: { categoryId?: string, focusId?: string, lastFocusedCardId?: string }) => void;
  setSearchQuery: (query: string) => void;
  setSearchFocusId: (focusId: string) => void;
  openContentDetails: (content: SelectedContent, returnDestination: AppDestination) => void;
  openPlayback: (playback: PlaybackRequest) => void;
  closePlayback: () => void;
  closeContentDetails: () => void;
  changePortal: () => void;
  signOut: () => void;
};

const SESSION_KEY = 'smartifly-lg-session';
const PORTAL_KEY = 'smartifly-lg-last-portal';
const PROFILES_KEY = 'smartifly-lg-profiles';
const SELECTED_PROFILE_KEY = 'smartifly-lg-selected-profile';
const SEARCH_QUERY_KEY = 'smartifly-lg-search-query';

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function readJson<T>(key: string): T | null {
  if (!canUseStorage()) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function readString(key: string, fallback: string) {
  if (!canUseStorage()) {
    return fallback;
  }

  const value = window.localStorage.getItem(key);
  return value && value.trim().length > 0 ? value : fallback;
}

function writeJson(key: string, value: unknown) {
  if (!canUseStorage()) {
    return;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage failures on restricted browsers or private modes.
  }
}

function writeString(key: string, value: string) {
  if (!canUseStorage()) {
    return;
  }

  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignore storage failures on restricted browsers or private modes.
  }
}

function readStoredQuery() {
  return readString(SEARCH_QUERY_KEY, '');
}

function readProfiles(): UserProfile[] {
  const raw = readJson<UserProfile[]>(PROFILES_KEY);
  return Array.isArray(raw) ? raw : [];
}

function createDefaultProfiles(username: string): UserProfile[] {
  const cleanUsername = username.trim();
  const primaryName = cleanUsername.length > 0 ? cleanUsername : 'Primary';

  return [
    {
      id: 'primary',
      name: primaryName,
      avatarSeed: primaryName.slice(0, 2).toUpperCase()
    },
    {
      id: 'kids',
      name: 'Kids',
      avatarSeed: 'KD',
      isKids: true
    }
  ];
}

function persistSessionState(session: Session, profiles: UserProfile[]) {
  writeJson(SESSION_KEY, session);
  writeJson(PROFILES_KEY, profiles);
  writeString(PORTAL_KEY, session.portalCode);
  writeString(SELECTED_PROFILE_KEY, '');
}

function applyAuthenticatedState(setter: Parameters<typeof create<AppState>>[0], session: Session, profiles: UserProfile[]) {
  persistSessionState(session, profiles);
  setter({
    onboardingScreen: 'login',
    lastPortal: session.portalCode,
    session,
    profiles,
    selectedProfile: null,
    profileSelectionSource: 'post-login',
    bootstrapStatus: 'idle',
    bootstrapError: null,
    homeBootstrapData: null,
    currentDestination: 'home',
    sidebarDestination: 'home',
    sidebarFocusTarget: 'home',
    homeFocusId: 'play',
    moviesCategoryId: '',
    moviesFocusId: '',
    moviesLastFocusedCardId: '',
    seriesCategoryId: '',
    seriesFocusId: '',
    seriesLastFocusedCardId: '',
    liveCategoryId: '',
    liveFocusId: '',
    liveLastFocusedCardId: '',
    isAuthenticating: false,
    statusMessage: `Connected as ${session.username}`
  });
}

function normalizeStoredSession(raw: Session | (Partial<Session> & { portal?: string }) | null): Session | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const portalCode = typeof raw.portalCode === 'string'
    ? raw.portalCode
    : typeof raw.portal === 'string'
      ? raw.portal
      : '';
  const portalBaseUrl = typeof raw.portalBaseUrl === 'string'
    ? raw.portalBaseUrl
    : typeof raw.portal === 'string'
      ? raw.portal
      : '';
  const serverName = typeof raw.serverName === 'string'
    ? raw.serverName
    : portalCode || 'Default Server';

  if (!portalCode || !portalBaseUrl || typeof raw.username !== 'string') {
    return null;
  }

  return {
    portalCode,
    portalBaseUrl,
    serverName,
    username: raw.username,
    userInfo: raw.userInfo,
    serverInfo: raw.serverInfo,
    authenticatedAt: raw.authenticatedAt
  };
}

const initialSession = normalizeStoredSession(readJson<Session | (Partial<Session> & { portal?: string })>(SESSION_KEY));
const initialPortal = initialSession?.portalCode ?? readString(PORTAL_KEY, 'Default Server');
const initialProfiles = readProfiles();
const initialSelectedProfileId = readString(SELECTED_PROFILE_KEY, '');
const initialSelectedProfile =
  initialProfiles.find((profile) => profile.id === initialSelectedProfileId) ?? null;

export const useAppStore = create<AppState>((set) => ({
  onboardingScreen: initialSession ? 'login' : 'welcome',
  lastPortal: initialPortal,
  session: initialSession,
  profiles: initialProfiles,
  selectedProfile: initialSelectedProfile,
  profileSelectionSource: 'post-login',
  bootstrapStatus: initialSession && initialSelectedProfile ? 'idle' : 'idle',
  bootstrapError: null,
  homeBootstrapData: null,
  currentDestination: 'home',
  sidebarDestination: 'home',
  sidebarFocusTarget: 'home',
  homeFocusId: 'play',
  moviesCategoryId: '',
  moviesFocusId: '',
  moviesLastFocusedCardId: '',
  seriesCategoryId: '',
  seriesFocusId: '',
  seriesLastFocusedCardId: '',
  liveCategoryId: '',
  liveFocusId: '',
  liveLastFocusedCardId: '',
  searchQuery: readStoredQuery(),
  searchFocusId: 'query',
  selectedContent: null,
  selectedPlayback: null,
  detailReturnDestination: 'home',
  statusMessage: initialSession ? `Connected as ${initialSession.username}` : 'Ready for LG webOS emulator test',
  isAuthenticating: false,
  setOnboardingScreen: (screen) => set({ onboardingScreen: screen }),
  setStatusMessage: (message) => set({ statusMessage: message }),
  signIn: async ({ portalCode, username, password }) => {
    const cleanUsername = username.trim();
    const cleanPassword = password.trim();
    const cleanPortalCode = portalCode.trim().toUpperCase();

    if (!cleanPortalCode) {
      set({ statusMessage: 'Enter a Server Identity' });
      return false;
    }

    if (!cleanUsername || !cleanPassword) {
      set({ statusMessage: 'Enter username and password' });
      return false;
    }

    set({ isAuthenticating: true, statusMessage: 'Validating server identity...' });

    try {
      const portal: PortalDetails = await validatePortalCode(cleanPortalCode);
      set({ isAuthenticating: true, statusMessage: `Connecting to ${portal.name}...` });

      const api = createXtreamApi(portal.baseUrl);
      const authResponse = await api.authenticate(cleanUsername, cleanPassword);
      const userInfo = authResponse.user_info;

      if (!userInfo || Number(userInfo.auth) !== 1) {
        set({
          isAuthenticating: false,
          statusMessage: userInfo?.message || 'Invalid Xtream credentials'
        });
        return false;
      }

      const session: Session = {
        portalCode: portal.portalCode,
        portalBaseUrl: portal.baseUrl,
        serverName: portal.name,
        username: cleanUsername,
        userInfo,
        serverInfo: authResponse.server_info,
        authenticatedAt: new Date().toISOString()
      };
      const profiles = createDefaultProfiles(cleanUsername);

      applyAuthenticatedState(set, session, profiles);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Xtream login failed';
      set({
        isAuthenticating: false,
        statusMessage: message
      });
      return false;
    }
  },
  completeDeviceActivation: async (license, deviceId) => {
    const serverUrl = license.server?.url?.trim();
    const serverName = license.server?.name?.trim() || 'Smartifly Server';
    const username = license.xtreamUser?.trim();
    const password = license.xtreamPass?.trim();

    if (!serverUrl || !username || !password) {
      set({
        isAuthenticating: false,
        statusMessage: 'Activation is missing Xtream credentials. Contact your operator.'
      });
      return false;
    }

    set({
      isAuthenticating: true,
      statusMessage: 'Activation approved. Syncing your LG session...'
    });

    try {
      const api = createXtreamApi(serverUrl);
      const authResponse = await api.authenticate(username, password);
      const userInfo = authResponse.user_info;

      if (!userInfo || Number(userInfo.auth) !== 1) {
        set({
          isAuthenticating: false,
          statusMessage: userInfo?.message || 'Activated license could not authenticate'
        });
        return false;
      }

      const portalCode = serverName.toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'LG-ACTIVATED';
      const session: Session = {
        portalCode,
        portalBaseUrl: serverUrl,
        serverName,
        username,
        userInfo,
        serverInfo: authResponse.server_info,
        authenticatedAt: new Date().toISOString()
      };
      const profiles = createDefaultProfiles(username);

      persistSessionState(session, profiles);
      writeString('smartifly-lg-device-id', deviceId);
      applyAuthenticatedState(set, session, profiles);
      return true;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Activation succeeded, but the Xtream login handoff failed';
      set({
        isAuthenticating: false,
        statusMessage: message
      });
      return false;
    }
  },
  bootstrapHomeData: async () => {
    const { session, selectedProfile, bootstrapStatus } = useAppStore.getState();

    if (!session || !selectedProfile || bootstrapStatus === 'loading') {
      return;
    }

    set({
      bootstrapStatus: 'loading',
      bootstrapError: null,
      homeBootstrapData: null,
      statusMessage: `Loading home for ${selectedProfile.name}...`
    });

    try {
      const homeBootstrapData = await loadHomeBootstrapData(session);
      const latestState = useAppStore.getState();

      if (latestState.session !== session || latestState.selectedProfile?.id !== selectedProfile.id) {
        return;
      }

      set({
        bootstrapStatus: 'ready',
        bootstrapError: null,
        homeBootstrapData,
        statusMessage: `Home ready for ${selectedProfile.name}`
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'The portal request failed. Check the server URL, network, and credentials, then try again.';
      set({
        bootstrapStatus: 'error',
        bootstrapError: message,
        homeBootstrapData: null,
        statusMessage: message
      });
    }
  },
  resetBootstrap: () =>
    set({
      bootstrapStatus: 'idle',
      bootstrapError: null,
      homeBootstrapData: null
    }),
  selectProfile: (profileId) =>
    set((state) => {
      const selectedProfile = state.profiles.find((profile) => profile.id === profileId) ?? null;
      writeString(SELECTED_PROFILE_KEY, selectedProfile?.id ?? '');

      return {
        selectedProfile,
      profileSelectionSource: 'post-login',
      bootstrapStatus: selectedProfile ? 'idle' : state.bootstrapStatus,
      bootstrapError: null,
      homeBootstrapData: null,
      sidebarFocusTarget: 'home',
      statusMessage: selectedProfile ? `Profile selected: ${selectedProfile.name}` : state.statusMessage
      };
    }),
  clearSelectedProfile: () =>
    set({
      selectedProfile: null,
      profileSelectionSource: 'post-login',
      bootstrapStatus: 'idle',
      bootstrapError: null,
      homeBootstrapData: null
    }),
  openProfileSelectionFromHome: () =>
    set({
      profileSelectionSource: 'home-sidebar',
      currentDestination: 'home',
      sidebarDestination: 'home',
      sidebarFocusTarget: 'profile',
      statusMessage: 'Choose a profile'
    }),
  leaveProfileSelection: () =>
    set((state) => {
      if (state.profileSelectionSource === 'home-sidebar') {
        return {
          profileSelectionSource: 'post-login',
          currentDestination: 'home',
          sidebarDestination: 'home',
          sidebarFocusTarget: 'profile',
          statusMessage: state.statusMessage
        };
      }

      if (canUseStorage()) {
        try {
          window.localStorage.removeItem(SESSION_KEY);
          window.localStorage.removeItem(PROFILES_KEY);
          window.localStorage.removeItem(SELECTED_PROFILE_KEY);
        } catch {
          // Ignore storage failures on restricted browsers or private modes.
        }
      }

      return {
        session: null,
        profiles: [],
        selectedProfile: null,
        profileSelectionSource: 'post-login',
        onboardingScreen: 'login',
        bootstrapStatus: 'idle',
        bootstrapError: null,
        homeBootstrapData: null,
        statusMessage: 'Return to sign in'
      };
    }),
  setCurrentDestination: (currentDestination) =>
    set((state) => ({
      currentDestination,
      sidebarDestination: currentDestination === 'details' ? state.sidebarDestination : currentDestination,
      sidebarFocusTarget:
        currentDestination === 'details'
          ? state.sidebarFocusTarget
          : currentDestination
    })),
  setSidebarFocusTarget: (sidebarFocusTarget) =>
    set({
      sidebarFocusTarget
    }),
  setHomeFocusId: (homeFocusId) =>
    set({
      homeFocusId
    }),
  setMoviesBrowseState: ({ categoryId, focusId, lastFocusedCardId }) =>
    set((state) => ({
      moviesCategoryId: categoryId ?? state.moviesCategoryId,
      moviesFocusId: focusId ?? state.moviesFocusId,
      moviesLastFocusedCardId: lastFocusedCardId ?? state.moviesLastFocusedCardId
    })),
  setSeriesBrowseState: ({ categoryId, focusId, lastFocusedCardId }) =>
    set((state) => ({
      seriesCategoryId: categoryId ?? state.seriesCategoryId,
      seriesFocusId: focusId ?? state.seriesFocusId,
      seriesLastFocusedCardId: lastFocusedCardId ?? state.seriesLastFocusedCardId
    })),
  setLiveBrowseState: ({ categoryId, focusId, lastFocusedCardId }) =>
    set((state) => ({
      liveCategoryId: categoryId ?? state.liveCategoryId,
      liveFocusId: focusId ?? state.liveFocusId,
      liveLastFocusedCardId: lastFocusedCardId ?? state.liveLastFocusedCardId
    })),
  setSearchQuery: (searchQuery) =>
    set({
      searchQuery
    }),
  setSearchFocusId: (searchFocusId) =>
    set({
      searchFocusId
    }),
  openContentDetails: (content, returnDestination) =>
    set({
      selectedContent: content,
      detailReturnDestination: returnDestination,
      sidebarDestination: returnDestination,
      currentDestination: 'details'
    }),
  openPlayback: (playback) =>
    set({
      selectedPlayback: playback,
      currentDestination: 'player',
      statusMessage: `Playing ${playback.title}`
    }),
  closePlayback: () =>
    set((state) => ({
      currentDestination: state.selectedPlayback?.returnDestination ?? state.sidebarDestination,
      selectedPlayback: null
    })),
  closeContentDetails: () =>
    set((state) => ({
      currentDestination: state.sidebarDestination,
      selectedContent: null
    })),
  changePortal: () => {
    if (canUseStorage()) {
      try {
        window.localStorage.removeItem(SESSION_KEY);
        window.localStorage.removeItem(PROFILES_KEY);
        window.localStorage.removeItem(SELECTED_PROFILE_KEY);
        window.localStorage.removeItem(PORTAL_KEY);
      } catch {
        // Ignore storage failures on restricted browsers or private modes.
      }
    }

    set({
      onboardingScreen: 'login',
      lastPortal: 'Default Server',
      session: null,
      profiles: [],
      selectedProfile: null,
      profileSelectionSource: 'post-login',
      bootstrapStatus: 'idle',
      bootstrapError: null,
      homeBootstrapData: null,
      currentDestination: 'home',
      sidebarDestination: 'home',
      sidebarFocusTarget: 'home',
      homeFocusId: 'play',
      moviesCategoryId: '',
      moviesFocusId: '',
      moviesLastFocusedCardId: '',
      seriesCategoryId: '',
      seriesFocusId: '',
      seriesLastFocusedCardId: '',
      liveCategoryId: '',
      liveFocusId: '',
      liveLastFocusedCardId: '',
      searchQuery: '',
      searchFocusId: 'query',
      selectedContent: null,
      selectedPlayback: null,
      detailReturnDestination: 'home',
      isAuthenticating: false,
      statusMessage: 'Enter a new Server Identity'
    });
  },
  signOut: () => {
    if (canUseStorage()) {
      try {
        window.localStorage.removeItem(SESSION_KEY);
        window.localStorage.removeItem(PROFILES_KEY);
        window.localStorage.removeItem(SELECTED_PROFILE_KEY);
        window.localStorage.removeItem(SEARCH_QUERY_KEY);
      } catch {
        // Ignore storage failures on restricted browsers or private modes.
      }
    }

    set({
      onboardingScreen: 'welcome',
      session: null,
      profiles: [],
      selectedProfile: null,
      profileSelectionSource: 'post-login',
      bootstrapStatus: 'idle',
      bootstrapError: null,
      homeBootstrapData: null,
      currentDestination: 'home',
      sidebarDestination: 'home',
      sidebarFocusTarget: 'home',
      homeFocusId: 'play',
      moviesCategoryId: '',
      moviesFocusId: '',
      moviesLastFocusedCardId: '',
      seriesCategoryId: '',
      seriesFocusId: '',
      seriesLastFocusedCardId: '',
      liveCategoryId: '',
      liveFocusId: '',
      liveLastFocusedCardId: '',
      searchQuery: '',
      searchFocusId: 'query',
      selectedContent: null,
      selectedPlayback: null,
      detailReturnDestination: 'home',
      isAuthenticating: false,
      statusMessage: 'Signed out'
    });
  }
}));
