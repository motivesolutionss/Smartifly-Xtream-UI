/**
 * Auth Store (Performance Split)
 *
 * Holds auth + portals + accounts to isolate from heavy content re-renders.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { MMKV } from 'react-native-mmkv';
import type { StateStorage } from 'zustand/middleware';

import AsyncStorage from '@react-native-async-storage/async-storage';

const isJsiAvailable = (): boolean => {
    return typeof (globalThis as any)?.nativeCallSyncHook === 'function';
};

let authMmkv: MMKV | null = null;
const getAuthMmkv = (): MMKV | null => {
    if (!isJsiAvailable()) return null;
    if (authMmkv) return authMmkv;
    try {
        authMmkv = new MMKV({ id: 'smartifly-auth-v3' });
        return authMmkv;
    } catch {
        return null;
    }
};

const mmkvStorage: StateStorage = {
    getItem: (name: string) => {
        const mmkv = getAuthMmkv();
        if (mmkv) return mmkv.getString(name) ?? null;
        return AsyncStorage.getItem(name);
    },
    setItem: (name: string, value: string) => {
        const mmkv = getAuthMmkv();
        if (mmkv) {
            mmkv.set(name, value);
        } else {
            return AsyncStorage.setItem(name, value);
        }
    },
    removeItem: (name: string) => {
        const mmkv = getAuthMmkv();
        if (mmkv) {
            mmkv.delete(name);
        } else {
            return AsyncStorage.removeItem(name);
        }
    },
};
import XtreamAPI, { XtreamAuthResponse } from '../api/xtream';
import { logger } from '../config';
import useFilterStore from './filterStore';
import useContentStore from './contentStore';
import { useProfileStore } from './profileStore';
import { buildSafeAppError, inferErrorCategory } from '../utils/errorHandling';

// =============================================================================
// TYPES
// =============================================================================

export interface Portal {
    id: string;
    name: string;
    url: string;
    status?: 'online' | 'offline' | 'maintenance';
    isPrimary?: boolean;
}

export interface UserInfo {
    username: string;
    password: string;
    status: string;
    expDate: string | null;
    isTrial: boolean;
    activeCons: number;
    maxConnections: number;
    createdAt: string;
}

export interface SavedAccount {
    id: string;
    username: string;
    password: string;
    portal: Portal;
    userInfo: UserInfo;
    lastActive: number;
}

export interface AppError {
    code: string;
    message: string;
    category: 'network' | 'auth' | 'data' | 'unknown';
    timestamp: number;
    retryable: boolean;
    suggestion?: string;
}

interface AuthState {
    isAuthenticated: boolean;
    userInfo: UserInfo | null;
    serverInfo: XtreamAuthResponse['server_info'] | null;
    hasHydrated: boolean;

    portals: Portal[];
    selectedPortal: Portal | null;

    savedAccounts: SavedAccount[];

    credentials: {
        serverUrl: string;
        username: string;
        password: string;
    } | null;

    isLoading: boolean;
    error: AppError | null;
}

interface AuthActions {
    setPortals: (portals: Portal[]) => void;
    addPortal: (portal: Portal) => void;
    removePortal: (portalId: string) => void;
    selectPortal: (portal: Portal | null) => void;

    login: (username: string, password: string) => Promise<boolean>;
    logout: () => void;
    switchAccount: (accountId: string) => Promise<boolean>;
    removeAccount: (accountId: string) => void;

    clearError: () => void;
    setHasHydrated: (value: boolean) => void;
    resetAuthStore: () => Promise<void>;

    createError: (code: string, message: string, category: AppError['category'], retryable: boolean, suggestion?: string) => AppError;
}

type AuthStore = AuthState & AuthActions;

// =============================================================================
// INITIAL STATE
// =============================================================================

const initialState: AuthState = {
    isAuthenticated: false,
    userInfo: null,
    serverInfo: null,
    hasHydrated: false,
    portals: [],
    selectedPortal: null,
    savedAccounts: [],
    credentials: null,
    isLoading: false,
    error: null,
};

let markHydrated: ((value: boolean) => void) | null = null;

// =============================================================================
// STORE
// =============================================================================

const useAuthStore = create<AuthStore>()(
    persist(
        (set, get) => {
            const setHasHydrated = (value: boolean) => {
                if (get().hasHydrated === value) return;
                set({ hasHydrated: value });
            };
            markHydrated = setHasHydrated;

            return {
                ...initialState,

                setPortals: (portals) => set({ portals }),

                addPortal: (portal) => set((state) => ({
                    portals: [...state.portals, portal],
                    selectedPortal: state.portals.length === 0 ? portal : state.selectedPortal,
                })),

                removePortal: (portalId) => set((state) => ({
                    portals: state.portals.filter((p) => p.id !== portalId),
                    selectedPortal: state.selectedPortal?.id === portalId ? null : state.selectedPortal,
                })),

                selectPortal: (portal) => {
                    if (portal === null) {
                        logger.info('selectPortal: Clearing portal selection');
                        set({ selectedPortal: null });
                        return;
                    }

                    logger.info('selectPortal called:', {
                        id: portal?.id,
                        name: portal?.name,
                        url: portal?.url,
                        urlType: typeof portal?.url,
                    });

                    if (!portal) {
                        logger.error('selectPortal: portal is undefined');
                        return;
                    }

                    set({ selectedPortal: portal });
                },

                login: async (username, password) => {
                    const { selectedPortal, createError } = get();

                    logger.info('login: Starting login', {
                        username,
                        selectedPortalExists: !!selectedPortal,
                        selectedPortalId: selectedPortal?.id,
                        selectedPortalName: selectedPortal?.name,
                    });

                    useFilterStore.getState().clearFilters();

                    if (!selectedPortal) {
                        logger.error('Login: No portal selected (selectedPortal is null)');
                        set({ error: createError('NO_PORTAL', 'Please select a server first', 'data', false) });
                        return false;
                    }

                    if (!selectedPortal.url || typeof selectedPortal.url !== 'string' || selectedPortal.url.trim() === '') {
                        logger.error('Login: Portal URL is missing or invalid', {
                            portalId: selectedPortal.id,
                            portalName: selectedPortal.name,
                            url: selectedPortal.url,
                        });
                        set({
                            error: createError(
                                'INVALID_PORTAL',
                                'Selected server has an invalid URL',
                                'data',
                                false,
                                'Please select a different server or contact support'
                            ),
                        });
                        return false;
                    }

                    if (!username || typeof username !== 'string' || username.trim() === '') {
                        logger.error('Login: Username is required');
                        set({ error: createError('INVALID_USERNAME', 'Username is required', 'auth', false) });
                        return false;
                    }

                    if (!password || typeof password !== 'string') {
                        logger.error('Login: Password is required');
                        set({ error: createError('INVALID_PASSWORD', 'Password is required', 'auth', false) });
                        return false;
                    }

                    set({ isLoading: true, error: null });

                    try {
                        const serverUrl = selectedPortal.url.trim();
                        const cleanUsername = username.trim();

                        logger.info('Login: Creating XtreamAPI instance', {
                            serverUrl,
                            username: cleanUsername,
                        });

                        const api = new XtreamAPI(serverUrl, cleanUsername, password);

                        logger.info('Login: XtreamAPI created, calling authenticate()');
                        const authResponse = await api.authenticate();

                        logger.info('Login: Auth response received', {
                            hasUserInfo: !!authResponse?.user_info,
                            auth: authResponse?.user_info?.auth,
                        });

                        if (!authResponse || !authResponse.user_info) {
                            logger.error('Login: Invalid response from server', { authResponse });
                            set({
                                isLoading: false,
                                error: createError(
                                    'AUTH_INVALID',
                                    'Invalid response from server',
                                    'auth',
                                    true,
                                    'Please check your server URL'
                                ),
                            });
                            return false;
                        }

                        if (authResponse.user_info.auth !== 1) {
                            logger.warn('Login: Authentication failed', {
                                message: authResponse.user_info.message,
                            });
                            set({
                                isLoading: false,
                                error: createError(
                                    'AUTH_FAILED',
                                    authResponse.user_info.message || 'Authentication failed',
                                    'auth',
                                    true,
                                    'Please check your username and password'
                                ),
                            });
                            return false;
                        }

                        const userInfo: UserInfo = {
                            username: authResponse.user_info.username,
                            password: authResponse.user_info.password,
                            status: authResponse.user_info.status,
                            expDate: authResponse.user_info.exp_date
                                ? String(authResponse.user_info.exp_date)
                                : null,
                            isTrial: authResponse.user_info.is_trial === '1',
                            activeCons: parseInt(authResponse.user_info.active_cons, 10) || 0,
                            maxConnections: parseInt(authResponse.user_info.max_connections, 10) || 1,
                            createdAt: authResponse.user_info.created_at,
                        };

                        logger.info('Login: Success', { username: userInfo.username });

                        const credentials = {
                            serverUrl,
                            username: cleanUsername,
                            password,
                        };

                        const contentStore = useContentStore.getState();
                        const previousCredentials = contentStore.credentials;
                        const credentialsChanged = !previousCredentials ||
                            previousCredentials.serverUrl !== credentials.serverUrl ||
                            previousCredentials.username !== credentials.username ||
                            previousCredentials.password !== credentials.password;

                        contentStore.resetForLogin(credentialsChanged);
                        contentStore.setCredentials(credentials);

                        set({
                            isAuthenticated: true,
                            userInfo,
                            serverInfo: authResponse.server_info,
                            credentials,
                            isLoading: false,
                        });

                        // Sync main profile name with login
                        useProfileStore.getState().syncMainProfileName(userInfo.username);

                        (async () => {
                            try {
                                const MasterService = (await import('../services/MasterService')).default;
                                await MasterService.reportLogin(serverUrl, cleanUsername, password);
                                logger.info('Login reported to Master Control');
                            } catch {
                                // Silent fail
                            }
                        })();

                        const accountId = `${selectedPortal.id}_${cleanUsername}`;
                        const existingAccounts = get().savedAccounts;
                        const otherAccounts = existingAccounts.filter((a) => a.id !== accountId);

                        const newAccount: SavedAccount = {
                            id: accountId,
                            username: cleanUsername,
                            password,
                            portal: selectedPortal,
                            userInfo,
                            lastActive: Date.now(),
                        };

                        set({
                            savedAccounts: [newAccount, ...otherAccounts].slice(0, 10),
                        });

                        return true;
                    } catch (error: unknown) {
                        const errorMessage = error instanceof Error
                            ? error.message
                            : 'Connection failed. Please check server and credentials.';
                        const inferredCategory = inferErrorCategory(error, 'network');
                        logger.error('Login: Exception caught', error);
                        set({
                            isLoading: false,
                            error: createError(
                                'LOGIN_ERROR',
                                errorMessage,
                                inferredCategory,
                                true,
                                'Check your internet connection and try again'
                            ),
                        });
                        return false;
                    }
                },

                logout: () => {
                    useFilterStore.getState().clearFilters();

                    const contentStore = useContentStore.getState();
                    contentStore.resetContentState();
                    contentStore.clearContentCache();
                    contentStore.clearCredentials();

                    const hydrated = get().hasHydrated;
                    set({
                        ...initialState,
                        hasHydrated: hydrated,
                        portals: get().portals,
                        savedAccounts: get().savedAccounts,
                    });
                },

                switchAccount: async (accountId: string) => {
                    const { savedAccounts, login } = get();
                    const account = savedAccounts.find((a) => a.id === accountId);

                    if (!account) {
                        logger.error('switchAccount: Account not found', { accountId });
                        return false;
                    }

                    logger.info('switchAccount: Switching to', { username: account.username, portal: account.portal.name });

                    set({ selectedPortal: account.portal });

                    return login(account.username, account.password);
                },

                removeAccount: (accountId: string) => {
                    set((state) => ({
                        savedAccounts: state.savedAccounts.filter((a) => a.id !== accountId),
                    }));
                },

                clearError: () => set({ error: null }),

                setHasHydrated,

                resetAuthStore: async () => {
                    useFilterStore.getState().clearFilters();
                    const hydrated = get().hasHydrated;

                    const contentStore = useContentStore.getState();
                    contentStore.resetContentState();
                    contentStore.clearContentCache();
                    contentStore.clearCredentials();

                    try {
                        const mmkv = getAuthMmkv();
                        if (mmkv) {
                            mmkv.clearAll();
                            logger.info('Persisted auth storage cleared (MMKV)');
                        } else {
                            await AsyncStorage.clear();
                            logger.info('Persisted auth storage cleared (AsyncStorage)');
                        }
                    } catch (e) {
                        logger.error('Failed to clear persisted storage', e);
                    }

                    set({ ...initialState, hasHydrated: hydrated });
                },

                createError: (code, message, category, retryable, suggestion) => ({
                    ...buildSafeAppError({
                        code,
                        message,
                        category,
                        retryable,
                        suggestion,
                    }),
                }),
            };
        },
        {
            name: 'smartifly-auth-v3',
            storage: createJSONStorage(() => mmkvStorage),
            onRehydrateStorage: () => (state: AuthStore | undefined, error) => {
                if (error) {
                    logger.error('Store: Failed to rehydrate', error);
                    markHydrated?.(true);
                    return;
                }

                if (!state) {
                    logger.warn('Store: Rehydrated state is null');
                    markHydrated?.(true);
                    return;
                }

                logger.debug('Store: Rehydrating...', {
                    hasCredentials: !!state.credentials,
                    hasPassword: !!state.credentials?.password,
                    username: state.credentials?.username,
                    isAuthenticated: state.isAuthenticated,
                });

                const hasPassword = !!state.credentials?.password;
                const contentStore = useContentStore.getState();

                if (!hasPassword) {
                    logger.warn('Store: No password found in storage, forcing logout.', {
                        wasAuthenticated: state.isAuthenticated,
                    });
                    state.isAuthenticated = false;
                    state.userInfo = null;
                    state.credentials = null;
                    contentStore.clearCredentials();
                    contentStore.resetContentState({ keepCacheLoaded: true });
                } else if (state.credentials) {
                    contentStore.setCredentials(state.credentials);
                }

                markHydrated?.(true);
            },
            partialize: (state) => ({
                isAuthenticated: state.isAuthenticated,
                userInfo: state.userInfo,
                serverInfo: state.serverInfo,
                selectedPortal: state.selectedPortal,
                credentials: state.credentials,
                portals: state.portals,
                savedAccounts: state.savedAccounts,
            }),
        }
    )
);

export default useAuthStore;
export { useAuthStore };
