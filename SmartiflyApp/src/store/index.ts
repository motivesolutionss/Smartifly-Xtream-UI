/**
 * Smartifly Global Store
 * 
 * Zustand store with:
 * - Authentication state
 * - Content prefetching (Live, Movies, Series)
 * - AsyncStorage persistence
 * - 6-hour cache refresh
 * - Instant access after login
 * 
 * ARCHITECTURE (Enterprise-Grade):
 * - Per-domain content structure with individual `loaded` flags
 * - Isolated domain writes prevent race conditions
 * - Dynamic contentReady computed from domain states
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import XtreamAPI, {
    XtreamAuthResponse,
    XtreamCategory,
    XtreamLiveStream,
    XtreamMovie,
    XtreamSeries,
} from '../api/xtream';
import { logger } from '../config';

// Import filterStore for resetting on auth events
import useFilterStore from './filterStore';

let cachedApi: { key: string; instance: XtreamAPI } | null = null;

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
    password: string; // Only kept in memory for active session, but persisted in SavedAccounts
    status: string;
    expDate: string | null;
    isTrial: boolean;
    activeCons: number;
    maxConnections: number;
    createdAt: string;
}

export interface SavedAccount {
    id: string; // Unique ID (e.g., portalId_username)
    username: string;
    password: string;
    portal: Portal;
    userInfo: UserInfo;
    lastActive: number;
}

// =============================================================================
// ENTERPRISE-GRADE CONTENT STRUCTURE
// =============================================================================

/**
 * Per-domain content structure with individual loading state.
 * This prevents race conditions and enables granular UI feedback.
 */
export interface ContentDomain<T> {
    categories: XtreamCategory[];
    items: T[];
    loaded: boolean;
}

/**
 * Domain-structured content cache.
 * Each domain (live, movies, series) has its own `loaded` flag.
 */
export interface CachedContent {
    live: ContentDomain<XtreamLiveStream>;
    movies: ContentDomain<XtreamMovie>;
    series: ContentDomain<XtreamSeries>;
    lastFetchTime: number;
}

// Initial content state - used instead of null
const initialContent: CachedContent = {
    live: { categories: [], items: [], loaded: false },
    movies: { categories: [], items: [], loaded: false },
    series: { categories: [], items: [], loaded: false },
    lastFetchTime: 0,
};

export interface PrefetchProgress {
    current: number;
    total: number;
    currentTask: string;
}

export interface AppError {
    code: string;
    message: string;
    category: 'network' | 'auth' | 'data' | 'unknown';
    timestamp: number;
    retryable: boolean;
    suggestion?: string;
}

interface StoreState {
    // Auth
    isAuthenticated: boolean;
    userInfo: UserInfo | null;
    serverInfo: XtreamAuthResponse['server_info'] | null;

    // Portal
    portals: Portal[];
    selectedPortal: Portal | null;

    // Accounts (Multi-Account Switcher)
    savedAccounts: SavedAccount[];

    // Credentials (for API calls)
    credentials: {
        serverUrl: string;
        username: string;
        password: string;
    } | null;

    // Content Cache - now uses domain structure (never null)
    content: CachedContent;

    // Loading States
    isLoading: boolean;
    isPrefetching: boolean;
    prefetchProgress: PrefetchProgress;
    error: AppError | null;

    // Retry State
    retryCount: number;
    maxRetries: number;
    isRetrying: boolean;

    // Network State
    isOffline: boolean;
    isConnected: boolean;
    connectionType: string | null;

    // Cache Settings
    cacheMaxAge: number; // in milliseconds (6 hours default)
}

interface StoreActions {
    // Portal Actions
    setPortals: (portals: Portal[]) => void;
    addPortal: (portal: Portal) => void;
    removePortal: (portalId: string) => void;
    selectPortal: (portal: Portal | null) => void;

    // Auth Actions
    login: (username: string, password: string) => Promise<boolean>;
    logout: () => void;
    switchAccount: (accountId: string) => Promise<boolean>;
    removeAccount: (accountId: string) => void;

    // Content Actions
    prefetchAllContent: () => Promise<boolean>;
    refreshCacheIfNeeded: () => Promise<void>;
    forceRefresh: () => Promise<boolean>;

    // Getters (dynamic computed values)
    getXtreamAPI: () => XtreamAPI | null;
    getContentStats: () => { live: number; movies: number; series: number };
    getContentReady: () => boolean; // Dynamic - computed from domain loaded flags
    isCacheStale: () => boolean;
    isCacheValid: () => boolean;

    // Network Actions
    setNetworkState: (isConnected: boolean, connectionType: string | null) => void;

    // Helpers
    getLiveStreamsByCategory: (categoryId: string) => XtreamLiveStream[];
    getMoviesByCategory: (categoryId: string) => XtreamMovie[];
    getSeriesByCategory: (categoryId: string) => XtreamSeries[];
    searchContent: (query: string) => {
        live: XtreamLiveStream[];
        movies: XtreamMovie[];
        series: XtreamSeries[];
    };

    // Reset
    clearError: () => void;
    resetStore: () => void;

    // Error Helpers
    createError: (code: string, message: string, category: AppError['category'], retryable: boolean, suggestion?: string) => AppError;
}

type Store = StoreState & StoreActions;

// =============================================================================
// CONSTANTS
// =============================================================================

const SIX_HOURS_MS = 6 * 60 * 60 * 1000; // 6 hours in milliseconds

// =============================================================================
// INITIAL STATE
// =============================================================================

const initialState: StoreState = {
    isAuthenticated: false,
    userInfo: null,
    serverInfo: null,
    portals: [],
    selectedPortal: null,
    savedAccounts: [],
    credentials: null,
    content: initialContent, // Now uses structured content, never null
    isLoading: false,
    isPrefetching: false,
    prefetchProgress: {
        current: 0,
        total: 6, // 6 steps: 3 categories + 3 content lists
        currentTask: '',
    },
    error: null,
    retryCount: 0,
    maxRetries: 3,
    isRetrying: false,
    isOffline: false,
    isConnected: true,
    connectionType: null,
    cacheMaxAge: SIX_HOURS_MS,
};

// =============================================================================
// STORE
// =============================================================================

const useStore = create<Store>()(
    persist(
        (set, get) => ({
            ...initialState,

            // =================================================================
            // PORTAL ACTIONS
            // =================================================================

            setPortals: (portals) => set({ portals }),

            addPortal: (portal) => set((state) => ({
                portals: [...state.portals, portal],
                // Auto-select if it's the first one
                selectedPortal: state.portals.length === 0 ? portal : state.selectedPortal
            })),

            removePortal: (portalId) => set((state) => ({
                portals: state.portals.filter(p => p.id !== portalId),
                selectedPortal: state.selectedPortal?.id === portalId ? null : state.selectedPortal
            })),

            selectPortal: (portal) => {
                // Allow null to clear selection
                if (portal === null) {
                    logger.info('selectPortal: Clearing portal selection');
                    set({ selectedPortal: null });
                    return;
                }

                logger.info('selectPortal called:', {
                    id: portal?.id,
                    name: portal?.name,
                    url: portal?.url,
                    urlType: typeof portal?.url
                });

                if (!portal) {
                    logger.error('selectPortal: portal is undefined');
                    return;
                }

                set({ selectedPortal: portal });
            },

            // =================================================================
            // AUTH ACTIONS
            // =================================================================

            login: async (username, password) => {
                const { selectedPortal, createError } = get();

                logger.info('login: Starting login', {
                    username,
                    selectedPortalExists: !!selectedPortal,
                    selectedPortalId: selectedPortal?.id,
                    selectedPortalName: selectedPortal?.name,
                });

                // FIX: Clear filters on login to prevent stale category selection
                useFilterStore.getState().clearFilters();

                // Validate portal exists
                if (!selectedPortal) {
                    logger.error('Login: No portal selected (selectedPortal is null)');
                    set({ error: createError('NO_PORTAL', 'Please select a server first', 'data', false) });
                    return false;
                }

                // Validate portal has URL
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
                        )
                    });
                    return false;
                }

                // Validate username
                if (!username || typeof username !== 'string' || username.trim() === '') {
                    logger.error('Login: Username is required');
                    set({ error: createError('INVALID_USERNAME', 'Username is required', 'auth', false) });
                    return false;
                }

                // Validate password
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
                        username: cleanUsername
                    });

                    const api = new XtreamAPI(serverUrl, cleanUsername, password);

                    logger.info('Login: XtreamAPI created, calling authenticate()');
                    const authResponse = await api.authenticate();

                    logger.info('Login: Auth response received', {
                        hasUserInfo: !!authResponse?.user_info,
                        auth: authResponse?.user_info?.auth
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
                            )
                        });
                        return false;
                    }

                    if (authResponse.user_info.auth !== 1) {
                        logger.warn('Login: Authentication failed', {
                            message: authResponse.user_info.message
                        });
                        set({
                            isLoading: false,
                            error: createError(
                                'AUTH_FAILED',
                                authResponse.user_info.message || 'Authentication failed',
                                'auth',
                                true,
                                'Please check your username and password'
                            )
                        });
                        return false;
                    }

                    // Parse user info
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

                    // CRITICAL: Reset content to initial state on login
                    // This ensures fresh prefetch with new credentials
                    set({
                        isAuthenticated: true,
                        userInfo,
                        serverInfo: authResponse.server_info,
                        credentials: {
                            serverUrl: serverUrl,
                            username: cleanUsername,
                            password,
                        },
                        // Reset content to initial state (not null)
                        content: initialContent,
                        retryCount: 0,
                    });

                    // Update Saved Accounts list
                    const accountId = `${selectedPortal.id}_${cleanUsername}`;
                    const existingAccounts = get().savedAccounts;
                    const otherAccounts = existingAccounts.filter(a => a.id !== accountId);

                    const newAccount: SavedAccount = {
                        id: accountId,
                        username: cleanUsername,
                        password,
                        portal: selectedPortal,
                        userInfo,
                        lastActive: Date.now(),
                    };

                    set({
                        savedAccounts: [newAccount, ...otherAccounts].slice(0, 10), // Limit to 10 accounts
                    });

                    return true;
                } catch (error: unknown) {
                    const errorMessage = error instanceof Error ? error.message : 'Connection failed. Please check server and credentials.';
                    logger.error('Login: Exception caught', error);
                    set({
                        isLoading: false,
                        error: createError(
                            'LOGIN_ERROR',
                            errorMessage,
                            'network',
                            true,
                            'Check your internet connection and try again'
                        ),
                    });
                    return false;
                }
            },

            logout: () => {
                // FIX: Clear filters on logout
                useFilterStore.getState().clearFilters();
                cachedApi = null;

                set({
                    ...initialState,
                    portals: get().portals, // Keep portals
                    savedAccounts: get().savedAccounts, // Keep saved accounts
                });
            },

            switchAccount: async (accountId: string) => {
                const { savedAccounts, login } = get();
                const account = savedAccounts.find(a => a.id === accountId);

                if (!account) {
                    logger.error('switchAccount: Account not found', { accountId });
                    return false;
                }

                logger.info('switchAccount: Switching to', { username: account.username, portal: account.portal.name });

                // Set the portal first so login() knows which one to use
                set({ selectedPortal: account.portal });

                // Perform fresh login to validate credentials and get fresh UserInfo
                return login(account.username, account.password);
            },

            removeAccount: (accountId: string) => {
                set(state => ({
                    savedAccounts: state.savedAccounts.filter(a => a.id !== accountId)
                }));
            },

            // =================================================================
            // CONTENT ACTIONS (ENTERPRISE-GRADE)
            // =================================================================

            prefetchAllContent: async () => {
                const { credentials, getXtreamAPI, maxRetries, createError } = get();

                // Validate credentials exist
                if (!credentials) {
                    logger.error('prefetchAllContent: No credentials');
                    set({ error: createError('NOT_AUTH', 'Not authenticated', 'auth', false, 'Please login first') });
                    return false;
                }

                // Validate serverUrl
                if (!credentials.serverUrl || credentials.serverUrl.trim() === '') {
                    logger.error('prefetchAllContent: Invalid serverUrl in credentials', { credentials });
                    set({
                        error: createError(
                            'INVALID_CREDENTIALS',
                            'Server URL is missing from credentials',
                            'data',
                            false,
                            'Please logout and login again'
                        )
                    });
                    return false;
                }

                // Validate username/password
                if (!credentials.username || !credentials.password) {
                    logger.error('prefetchAllContent: Missing username or password in credentials');
                    set({
                        error: createError(
                            'INVALID_CREDENTIALS',
                            'Username or password is missing',
                            'auth',
                            false,
                            'Please logout and login again'
                        )
                    });
                    return false;
                }

                set({
                    isPrefetching: true,
                    prefetchProgress: { current: 0, total: 6, currentTask: 'Starting...' },
                    error: null,
                });

                try {
                    const api = getXtreamAPI();

                    if (!api) {
                        logger.error('prefetchAllContent: Failed to create API instance');
                        throw new Error('API initialization failed - check server URL and credentials');
                    }

                    // ===========================================================
                    // PHASE 1: Fetch all categories (parallel, small payloads)
                    // ===========================================================
                    set({ prefetchProgress: { current: 1, total: 6, currentTask: 'Loading categories...' } });

                    const [liveCategoriesResult, vodCategoriesResult, seriesCategoriesResult] = await Promise.allSettled([
                        api.getLiveCategories(),
                        api.getVodCategories(),
                        api.getSeriesCategories(),
                    ]);

                    const liveCategories = liveCategoriesResult.status === 'fulfilled'
                        ? (Array.isArray(liveCategoriesResult.value) ? liveCategoriesResult.value : [])
                        : [];
                    const vodCategories = vodCategoriesResult.status === 'fulfilled'
                        ? (Array.isArray(vodCategoriesResult.value) ? vodCategoriesResult.value : [])
                        : [];
                    const seriesCategories = seriesCategoriesResult.status === 'fulfilled'
                        ? (Array.isArray(seriesCategoriesResult.value) ? seriesCategoriesResult.value : [])
                        : [];

                    logger.debug('Categories loaded', {
                        liveCategories: liveCategories.length,
                        vodCategories: vodCategories.length,
                        seriesCategories: seriesCategories.length
                    });

                    // ===========================================================
                    // PHASE 2: Fetch content streams with ISOLATED per-domain writes
                    // ===========================================================
                    set({ prefetchProgress: { current: 3, total: 6, currentTask: 'Loading content...' } });

                    // Fetch Live streams - XtreamAPI now normalizes responses using hybrid approach
                    logger.info('[Store] fetchLiveContent: started');
                    const safeLiveStreams = await api.getLiveStreams();
                    // XtreamAPI.normalizeArrayResponse handles: {}, errors, wrapped arrays, etc.
                    logger.info(`[Store] fetchLiveContent: completed, ${safeLiveStreams.length} channels`);

                    // ISOLATED WRITE: Live domain only
                    // FIX: Normalize category_id to string for consistent type matching
                    set(state => ({
                        content: {
                            ...state.content,
                            live: {
                                categories: liveCategories.map(cat => ({
                                    ...cat,
                                    category_id: String(cat.category_id),
                                })),
                                items: safeLiveStreams.map(item => ({
                                    ...item,
                                    category_id: String(item.category_id),
                                })),
                                loaded: true,
                            },
                        },
                        prefetchProgress: { current: 4, total: 6, currentTask: 'Loading movies...' },
                    }));

                    // Fetch Movies - XtreamAPI now normalizes responses using hybrid approach
                    logger.info('[Store] fetchVodContent: started');
                    const safeVodStreams = await api.getVodStreams();
                    // XtreamAPI.normalizeArrayResponse handles: {}, errors, wrapped arrays, etc.
                    logger.info(`[Store] fetchVodContent: completed, ${safeVodStreams.length} movies`);

                    // ISOLATED WRITE: Movies domain only
                    // FIX: Normalize category_id to string for consistent type matching
                    set(state => ({
                        content: {
                            ...state.content,
                            movies: {
                                categories: vodCategories.map(cat => ({
                                    ...cat,
                                    category_id: String(cat.category_id),
                                })),
                                items: safeVodStreams.map(item => ({
                                    ...item,
                                    category_id: String(item.category_id),
                                })),
                                loaded: true,
                            },
                        },
                        prefetchProgress: { current: 5, total: 6, currentTask: 'Loading series...' },
                    }));

                    // Fetch Series - XtreamAPI now normalizes responses using hybrid approach
                    logger.info('[Store] fetchSeriesContent: started');
                    const safeSeriesList = await api.getSeries();
                    // XtreamAPI.normalizeArrayResponse handles: {}, errors, wrapped arrays, etc.
                    logger.info(`[Store] fetchSeriesContent: completed, ${safeSeriesList.length} series`);

                    // ISOLATED WRITE: Series domain + lastFetchTime (all domains now loaded)
                    // FIX: Normalize category_id to string for consistent type matching
                    set(state => {
                        const updatedContent = {
                            ...state.content,
                            series: {
                                categories: seriesCategories.map(cat => ({
                                    ...cat,
                                    category_id: String(cat.category_id),
                                })),
                                items: safeSeriesList.map(item => ({
                                    ...item,
                                    category_id: String(item.category_id),
                                })),
                                loaded: true,
                            },
                        };

                        // Set lastFetchTime only when ALL domains are loaded
                        const allLoaded = updatedContent.live.loaded &&
                            updatedContent.movies.loaded &&
                            updatedContent.series.loaded;

                        return {
                            content: {
                                ...updatedContent,
                                lastFetchTime: allLoaded ? Date.now() : state.content.lastFetchTime,
                            },
                            isPrefetching: false,
                            prefetchProgress: { current: 6, total: 6, currentTask: 'Complete!' },
                            retryCount: 0,
                            isRetrying: false,
                        };
                    });

                    logger.info(`Prefetch complete: ${safeLiveStreams.length} channels, ${safeVodStreams.length} movies, ${safeSeriesList.length} series`);
                    return true;

                } catch (error: unknown) {
                    const errorMessage = error instanceof Error ? error.message : 'Failed to load content after multiple retries';
                    logger.error('Prefetch error', error);

                    const currentRetry = get().retryCount;
                    const shouldRetry = currentRetry < maxRetries;

                    if (shouldRetry) {
                        const delay = Math.pow(2, currentRetry) * 1000;

                        set({
                            isRetrying: true,
                            retryCount: currentRetry + 1,
                            prefetchProgress: {
                                current: 0,
                                total: 6,
                                currentTask: `Retry ${currentRetry + 1}/${maxRetries} in ${delay / 1000}s...`
                            },
                        });

                        logger.info(`Retrying prefetch (${currentRetry + 1}/${maxRetries}) after ${delay}ms...`);

                        await new Promise<void>(resolve => setTimeout(resolve, delay));

                        return get().prefetchAllContent();
                    } else {
                        set({
                            isPrefetching: false,
                            isRetrying: false,
                            error: createError(
                                'PREFETCH_FAILED',
                                errorMessage,
                                'network',
                                true,
                                'Check your internet connection and try again'
                            ),
                            prefetchProgress: { current: 0, total: 6, currentTask: 'Failed' },
                        });
                        return false;
                    }
                }
            },

            refreshCacheIfNeeded: async () => {
                const { isCacheStale, forceRefresh, getContentReady } = get();

                if (!getContentReady()) {
                    logger.debug('No cache exists, skipping refresh check');
                    return;
                }

                if (isCacheStale()) {
                    logger.info('Cache is stale, refreshing...');
                    await forceRefresh();
                } else {
                    logger.debug('Cache is fresh');
                }
            },

            forceRefresh: async () => {
                logger.info('Force refreshing content...');
                return get().prefetchAllContent();
            },

            // =================================================================
            // GETTERS (DYNAMIC COMPUTED VALUES)
            // =================================================================

            getXtreamAPI: () => {
                const { credentials } = get();

                if (!credentials) {
                    logger.error('getXtreamAPI: No credentials found');
                    return null;
                }

                if (!credentials.serverUrl || typeof credentials.serverUrl !== 'string' || credentials.serverUrl.trim() === '') {
                    logger.error('getXtreamAPI: Invalid serverUrl');
                    return null;
                }

                if (!credentials.username || typeof credentials.username !== 'string' || credentials.username.trim() === '') {
                    logger.error('getXtreamAPI: Invalid username');
                    return null;
                }

                if (!credentials.password) {
                    logger.error('getXtreamAPI: Password is missing');
                    return null;
                }

                try {
                    const key = `${credentials.serverUrl}|${credentials.username}|${credentials.password}`;
                    if (cachedApi?.key === key) {
                        return cachedApi.instance;
                    }

                    const instance = new XtreamAPI(
                        credentials.serverUrl,
                        credentials.username,
                        credentials.password
                    );
                    cachedApi = { key, instance };
                    return instance;
                } catch (error) {
                    logger.error('getXtreamAPI: Failed to create XtreamAPI instance', error);
                    return null;
                }
            },

            // Compute stats from domain items (no stored totals needed)
            getContentStats: () => {
                const { content } = get();
                return {
                    live: content.live.items.length,
                    movies: content.movies.items.length,
                    series: content.series.items.length,
                };
            },

            // Dynamic contentReady - computed from domain loaded flags
            // STRICT: All domains must be loaded before content is considered ready
            getContentReady: () => {
                const { content } = get();
                return !!(
                    content.live.loaded &&
                    content.movies.loaded &&
                    content.series.loaded
                );
            },

            isCacheStale: () => {
                const { content, cacheMaxAge } = get();
                if (!content.lastFetchTime) return true;

                const age = Date.now() - content.lastFetchTime;
                return age > cacheMaxAge;
            },

            isCacheValid: () => {
                const { content, isCacheStale, getContentReady } = get();

                if (!getContentReady()) {
                    return false;
                }

                const hasContent =
                    content.live.items.length > 0 ||
                    content.movies.items.length > 0 ||
                    content.series.items.length > 0;

                if (!hasContent) {
                    logger.warn('Cache marked as ready but no content data found');
                    return false;
                }

                if (isCacheStale()) {
                    logger.warn('Cache is stale (older than', get().cacheMaxAge / 1000 / 60 / 60, 'hours)');
                    return false;
                }

                logger.debug('Cache is valid and fresh');
                return true;
            },

            // =================================================================
            // CONTENT HELPERS (updated for domain structure)
            // =================================================================

            getLiveStreamsByCategory: (categoryId) => {
                const { content } = get();
                if (!content.live.loaded) return [];

                const streams = content.live.items;
                if (!categoryId || categoryId === 'all') {
                    return streams;
                }

                return streams.filter(
                    stream => stream.category_id === categoryId
                );
            },

            getMoviesByCategory: (categoryId) => {
                const { content } = get();
                if (!content.movies.loaded) return [];

                const movies = content.movies.items;
                if (!categoryId || categoryId === 'all') {
                    return movies;
                }

                return movies.filter(
                    movie => movie.category_id === categoryId
                );
            },

            getSeriesByCategory: (categoryId) => {
                const { content } = get();
                if (!content.series.loaded) return [];

                const series = content.series.items;
                if (!categoryId || categoryId === 'all') {
                    return series;
                }

                return series.filter(
                    s => s.category_id === categoryId
                );
            },

            searchContent: (query) => {
                const { content } = get();
                if (!query.trim()) {
                    return { live: [], movies: [], series: [] };
                }

                const lowerQuery = query.toLowerCase();

                return {
                    live: content.live.loaded
                        ? content.live.items.filter(stream => stream.name.toLowerCase().includes(lowerQuery))
                        : [],
                    movies: content.movies.loaded
                        ? content.movies.items.filter(movie => movie.name.toLowerCase().includes(lowerQuery))
                        : [],
                    series: content.series.loaded
                        ? content.series.items.filter(s => s.name.toLowerCase().includes(lowerQuery))
                        : [],
                };
            },

            // =================================================================
            // NETWORK ACTIONS
            // =================================================================

            setNetworkState: (isConnected, connectionType) => {
                const wasOffline = get().isOffline;
                const isNowOffline = !isConnected;

                set({
                    isConnected,
                    isOffline: isNowOffline,
                    connectionType,
                });

                if (wasOffline && !isNowOffline) {
                    logger.info('Network reconnected, type:', connectionType);
                    const { isAuthenticated, getContentReady } = get();
                    if (isAuthenticated && getContentReady()) {
                        get().refreshCacheIfNeeded();
                    }
                } else if (!wasOffline && isNowOffline) {
                    logger.info('Network disconnected - Offline mode');
                }
            },

            // =================================================================
            // RESET
            // =================================================================

            clearError: () => set({ error: null }),

            resetStore: async () => {
                // Clear filters
                useFilterStore.getState().clearFilters();
                cachedApi = null;

                // Clear AsyncStorage to fully reset persisted state
                try {
                    await AsyncStorage.removeItem('smartifly-storage');
                    logger.info('Persisted storage cleared');
                } catch (e) {
                    logger.error('Failed to clear persisted storage', e);
                }
                set(initialState);
            },

            // =================================================================
            // ERROR HELPERS
            // =================================================================

            createError: (code, message, category, retryable, suggestion) => ({
                code,
                message,
                category,
                timestamp: Date.now(),
                retryable,
                suggestion,
            }),
        }),
        {
            name: 'smartifly-storage-v2',
            storage: createJSONStorage(() => AsyncStorage),
            onRehydrateStorage: () => (state, error) => {
                if (error) {
                    logger.error('Store: Failed to rehydrate', error);
                    return;
                }

                if (!state) {
                    logger.warn('Store: Rehydrated state is null');
                    return;
                }

                logger.debug('Store: Rehydrating...', {
                    hasCredentials: !!state.credentials,
                    hasPassword: !!state.credentials?.password,
                    username: state.credentials?.username,
                    isAuthenticated: state.isAuthenticated
                });

                const hasPassword = !!state.credentials?.password;
                if (!hasPassword) {
                    logger.warn('Store: No password found in storage, forcing logout.', {
                        wasAuthenticated: state.isAuthenticated
                    });
                    state.isAuthenticated = false;
                    state.userInfo = null;
                    state.credentials = null;
                    state.content = initialContent;
                } else {
                    logger.info('Store: Successfully rehydrated with credentials.');
                }
            },
            partialize: (state) => ({
                // Persist these fields
                isAuthenticated: state.isAuthenticated,
                // Persist userInfo WITH password for auto-login
                // SECURITY WARN: In a production banking app, use Keychain/Keystore.
                // For IPTV, this allows staying logged in on restart.
                userInfo: state.userInfo,
                serverInfo: state.serverInfo,
                selectedPortal: state.selectedPortal,
                // Persist credentials WITH password
                credentials: state.credentials,
                // Persist portals
                portals: state.portals,
                // Persist saved accounts
                savedAccounts: state.savedAccounts,
                // NOTE: contentReady is NOT persisted - computed dynamically via getContentReady()
            }),
        }
    )
);

export default useStore;
export { useStore };
