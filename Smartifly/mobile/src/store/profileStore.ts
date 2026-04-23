/**
 * Profile Store
 *
 * Netflix/Disney+ style user profile management.
 * Client-side profiles with parental controls, independent of Xtream connection limits.
 *
 * Features:
 * - Up to 5 profiles per app installation
 * - PIN protection for adult profiles
 * - Content rating filters (G, PG, PG-13, R, NC-17)
 * - Kids mode with restricted UI
 * - Per-profile watch history segregation
 *
 * @enterprise-grade
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useMemo } from 'react';
import { logger } from '../config';

// =============================================================================
// CONSTANTS
// =============================================================================

export const MAX_PROFILES = 5;
export const PIN_LENGTH = 4;

// Content ratings ordered by restrictiveness (index = max viewable for that level)
export const CONTENT_RATINGS = ['G', 'PG', 'PG-13', 'R', 'NC-17', 'UNRATED'] as const;

// Predefined avatar IDs
export const AVATAR_IDS = [
    'avatar_01', 'avatar_02', 'avatar_03', 'avatar_04',
    'avatar_05', 'avatar_06', 'avatar_07', 'avatar_08',
    'avatar_09', 'avatar_10', 'avatar_11', 'avatar_12',
    'avatar_13', 'avatar_14', 'avatar_15', 'avatar_16',
    'avatar_17', 'avatar_18', 'avatar_19', 'avatar_20',
    'avatar_21', 'avatar_22', 'avatar_23', 'avatar_24',
] as const;

// Avatar colors for default rendering (when images not available)
export const AVATAR_COLORS: Record<AvatarId, string> = {
    avatar_01: '#1F2937',
    avatar_02: '#0F172A',
    avatar_03: '#111827',
    avatar_04: '#334155',
    avatar_05: '#374151',
    avatar_06: '#475569',
    avatar_07: '#1E293B',
    avatar_08: '#155E75',
    avatar_09: '#134E4A',
    avatar_10: '#365314',
    avatar_11: '#4C1D95',
    avatar_12: '#581C87',
    avatar_13: '#7C2D12',
    avatar_14: '#78350F',
    avatar_15: '#3F3F46',
    avatar_16: '#312E81',
    avatar_17: '#0C4A6E',
    avatar_18: '#064E3B',
    avatar_19: '#1E3A8A',
    avatar_20: '#4A044E',
    avatar_21: '#7F1D1D',
    avatar_22: '#4338CA',
    avatar_23: '#52525B',
    avatar_24: '#0F766E',
};

// Realistic photo avatars (fallback to icon if network/image fails)
export const AVATAR_IMAGE_URLS: Record<AvatarId, string> = {
    avatar_01: 'https://i.pravatar.cc/400?img=1',
    avatar_02: 'https://i.pravatar.cc/400?img=2',
    avatar_03: 'https://i.pravatar.cc/400?img=3',
    avatar_04: 'https://i.pravatar.cc/400?img=4',
    avatar_05: 'https://i.pravatar.cc/400?img=5',
    avatar_06: 'https://i.pravatar.cc/400?img=6',
    avatar_07: 'https://i.pravatar.cc/400?img=7',
    avatar_08: 'https://i.pravatar.cc/400?img=8',
    avatar_09: 'https://i.pravatar.cc/400?img=9',
    avatar_10: 'https://i.pravatar.cc/400?img=10',
    avatar_11: 'https://i.pravatar.cc/400?img=11',
    avatar_12: 'https://i.pravatar.cc/400?img=12',
    avatar_13: 'https://i.pravatar.cc/400?img=13',
    avatar_14: 'https://i.pravatar.cc/400?img=14',
    avatar_15: 'https://i.pravatar.cc/400?img=15',
    avatar_16: 'https://i.pravatar.cc/400?img=16',
    avatar_17: 'https://i.pravatar.cc/400?img=17',
    avatar_18: 'https://i.pravatar.cc/400?img=18',
    avatar_19: 'https://i.pravatar.cc/400?img=19',
    avatar_20: 'https://i.pravatar.cc/400?img=20',
    avatar_21: 'https://i.pravatar.cc/400?img=21',
    avatar_22: 'https://i.pravatar.cc/400?img=22',
    avatar_23: 'https://i.pravatar.cc/400?img=23',
    avatar_24: 'https://i.pravatar.cc/400?img=24',
};

// Professional icon set for avatar identity
export const AVATAR_CHARACTERS: Record<AvatarId, string> = {
    avatar_01: 'user',
    avatar_02: 'users',
    avatar_03: 'television',
    avatar_04: 'monitorPlay',
    avatar_05: 'filmStrip',
    avatar_06: 'playCircle',
    avatar_07: 'star',
    avatar_08: 'heart',
    avatar_09: 'lock',
    avatar_10: 'eye',
    avatar_11: 'server',
    avatar_12: 'database',
    avatar_13: 'refresh',
    avatar_14: 'settings',
    avatar_15: 'home',
    avatar_16: 'live',
    avatar_17: 'movie',
    avatar_18: 'series',
    avatar_19: 'bell',
    avatar_20: 'downloadSimple',
    avatar_21: 'clock',
    avatar_22: 'checkCircle',
    avatar_23: 'layers',
    avatar_24: 'arrowCounterClockwise',
};

export const AVATAR_NAMES: Record<AvatarId, string> = {
    avatar_01: 'Ava',
    avatar_02: 'Liam',
    avatar_03: 'Noah',
    avatar_04: 'Emma',
    avatar_05: 'Olivia',
    avatar_06: 'Ethan',
    avatar_07: 'Mia',
    avatar_08: 'Lucas',
    avatar_09: 'Sophia',
    avatar_10: 'Mason',
    avatar_11: 'Isabella',
    avatar_12: 'Logan',
    avatar_13: 'Amelia',
    avatar_14: 'Elijah',
    avatar_15: 'Harper',
    avatar_16: 'James',
    avatar_17: 'Evelyn',
    avatar_18: 'Benjamin',
    avatar_19: 'Abigail',
    avatar_20: 'Alexander',
    avatar_21: 'Scarlett',
    avatar_22: 'Henry',
    avatar_23: 'Ella',
    avatar_24: 'Daniel',
};
// =============================================================================
// TYPES
// =============================================================================

export type ContentRating = typeof CONTENT_RATINGS[number];
export type AvatarId = typeof AVATAR_IDS[number];

export interface UserProfile {
    /** Unique profile ID */
    id: string;
    /** Display name */
    name: string;
    /** Avatar identifier */
    avatar: AvatarId;
    /** Is this a kids profile (simplified UI, restricted content) */
    isKidsProfile: boolean;
    /** Require PIN to access this profile */
    pinRequired: boolean;
    /** Hashed PIN (simple hash for local security) */
    pinHash?: string;
    /** Maximum content rating allowed */
    maxRating: ContentRating;
    /** Profile creation timestamp */
    createdAt: number;
    /** Last used timestamp */
    lastUsed: number;
}

interface ProfileState {
    /** All user profiles */
    profiles: UserProfile[];
    /** Currently active profile ID */
    activeProfileId: string | null;
    /** Whether active profile is currently locked (needs PIN) */
    isLocked: boolean;
    /** Has completed initial profile setup */
    hasCompletedSetup: boolean;
}

interface ProfileActions {
    /** Create a new profile */
    createProfile: (profile: Omit<UserProfile, 'id' | 'createdAt' | 'lastUsed'>) => UserProfile | null;
    /** Update an existing profile */
    updateProfile: (id: string, updates: Partial<Omit<UserProfile, 'id' | 'createdAt'>>) => boolean;
    /** Delete a profile */
    deleteProfile: (id: string) => boolean;
    /** Switch to a different profile (requires PIN if protected) */
    switchProfile: (id: string, pin?: string) => boolean;
    /** Lock the current profile (require PIN on next access) */
    lockProfile: () => void;
    /** Verify PIN for a profile */
    verifyPin: (id: string, pin: string) => boolean;
    /** Set PIN for a profile */
    setPin: (id: string, pin: string) => boolean;
    /** Remove PIN from a profile */
    removePin: (id: string) => boolean;
    /** Get the active profile */
    getActiveProfile: () => UserProfile | null;
    /** Check if content is allowed for active profile */
    isContentAllowed: (contentRating: ContentRating | string | undefined) => boolean;
    /** Mark setup as complete */
    completeSetup: () => void;
    /** Get profile by ID */
    getProfile: (id: string) => UserProfile | undefined;
    /** Check if can create more profiles */
    canCreateProfile: () => boolean;
    /** Sync the "Main" profile name with login user */
    syncMainProfileName: (login: string) => void;
}

type ProfileStore = ProfileState & ProfileActions;

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Generate a unique profile ID
 */
const generateProfileId = (): string => {
    return Math.random().toString(36).substring(2, 11);
};

/**
 * Robustly formats a login string into a display name.
 * Strips email domains and capitalizes the first letter.
 */
export const formatProfileName = (login: string): string => {
    if (!login) return 'Guest';

    // Extract name from email if needed
    let name = login.split('@')[0];

    // Sanitize common junk or separators
    name = name.replace(/[._-]/g, ' ');

    // Capitalize first letter of each word
    return name
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ')
        .trim() || 'Guest';
};

/**
 * Simple hash function for PIN (not cryptographically secure, but adequate for local storage)
 */
const hashPin = (pin: string): string => {
    let hash = 0;
    const salt = 'smartifly_pin_salt_2024';
    const saltedPin = salt + pin + salt;
    for (let i = 0; i < saltedPin.length; i++) {
        const char = saltedPin.charCodeAt(i);
        // eslint-disable-next-line no-bitwise
        hash = ((hash << 5) - hash) + char;
        // eslint-disable-next-line no-bitwise
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(36);
};

/**
 * Get rating level (higher = more restrictive content allowed)
 */
const getRatingLevel = (rating: ContentRating): number => {
    return CONTENT_RATINGS.indexOf(rating);
};

/**
 * Parse content rating from various formats
 */
export const parseContentRating = (rating: string | undefined): ContentRating => {
    if (!rating) return 'UNRATED';

    const normalized = rating.toUpperCase().trim();

    // Direct matches
    if (CONTENT_RATINGS.includes(normalized as ContentRating)) {
        return normalized as ContentRating;
    }

    // Common variations
    const mappings: Record<string, ContentRating> = {
        'TV-G': 'G',
        'TV-Y': 'G',
        'TV-Y7': 'G',
        'TV-PG': 'PG',
        'TV-14': 'PG-13',
        'TV-MA': 'R',
        'NR': 'UNRATED',
        'NOT RATED': 'UNRATED',
        'UNRATED': 'UNRATED',
    };

    return mappings[normalized] || 'UNRATED';
};

/**
 * Estimate rating from 5-star rating (fallback when no MPAA rating)
 * Conservative mapping for kids safety
 */
export const estimateRatingFromStars = (stars: number | undefined): ContentRating => {
    if (!stars || stars <= 0) return 'UNRATED';
    if (stars <= 2) return 'G';      // Very low rated = probably kids OK
    if (stars <= 3) return 'PG';     // Average = general audience
    if (stars <= 4) return 'PG-13';  // Good = might have mature themes
    return 'R';                       // Highly rated = often adult content
};

// =============================================================================
// DEFAULT PROFILE
// =============================================================================

const createDefaultProfile = (): UserProfile => ({
    id: generateProfileId(),
    name: 'Main',
    avatar: 'avatar_01',
    isKidsProfile: false,
    pinRequired: false,
    maxRating: 'NC-17', // Full access
    createdAt: Date.now(),
    lastUsed: Date.now(),
});

// =============================================================================
// STORE
// =============================================================================

const initialState: ProfileState = {
    profiles: [],
    activeProfileId: null,
    isLocked: false,
    hasCompletedSetup: false,
};

export const useProfileStore = create<ProfileStore>()(
    persist(
        (set, get) => ({
            ...initialState,

            // -----------------------------------------------------------------
            // CREATE PROFILE
            // -----------------------------------------------------------------
            createProfile: (profileData) => {
                const state = get();

                // Check limit
                if (state.profiles.length >= MAX_PROFILES) {
                    return null;
                }

                const newProfile: UserProfile = {
                    ...profileData,
                    id: generateProfileId(),
                    createdAt: Date.now(),
                    lastUsed: Date.now(),
                    // Kids profiles have restricted ratings by default
                    maxRating: profileData.isKidsProfile ? 'PG' : profileData.maxRating,
                };

                set((s) => ({
                    profiles: [...s.profiles, newProfile],
                }));

                return newProfile;
            },

            // -----------------------------------------------------------------
            // UPDATE PROFILE
            // -----------------------------------------------------------------
            updateProfile: (id, updates) => {
                const state = get();
                const profileIndex = state.profiles.findIndex((p) => p.id === id);

                if (profileIndex === -1) return false;

                // If converting to kids profile, enforce rating limit
                const updatedProfile = { ...state.profiles[profileIndex], ...updates };
                if (updates.isKidsProfile && updatedProfile.maxRating) {
                    const maxKidsLevel = getRatingLevel('PG');
                    const currentLevel = getRatingLevel(updatedProfile.maxRating);
                    if (currentLevel > maxKidsLevel) {
                        updatedProfile.maxRating = 'PG';
                    }
                }

                set((s) => {
                    const newProfiles = [...s.profiles];
                    newProfiles[profileIndex] = updatedProfile;
                    return { profiles: newProfiles };
                });

                return true;
            },

            // -----------------------------------------------------------------
            // DELETE PROFILE
            // -----------------------------------------------------------------
            deleteProfile: (id) => {
                const state = get();

                // Don't delete the last profile
                if (state.profiles.length <= 1) return false;

                // Don't delete the active profile
                if (state.activeProfileId === id) return false;

                set((s) => ({
                    profiles: s.profiles.filter((p) => p.id !== id),
                }));

                return true;
            },

            // -----------------------------------------------------------------
            // SWITCH PROFILE
            // -----------------------------------------------------------------
            switchProfile: (id, pin) => {
                const state = get();
                const profile = state.profiles.find((p) => p.id === id);

                if (!profile) return false;

                // Check PIN if required
                if (profile.pinRequired && profile.pinHash) {
                    if (!pin || hashPin(pin) !== profile.pinHash) {
                        return false;
                    }
                }

                set({
                    activeProfileId: id,
                    isLocked: false,
                });

                // Update last used
                get().updateProfile(id, { lastUsed: Date.now() });

                return true;
            },

            // -----------------------------------------------------------------
            // LOCK PROFILE
            // -----------------------------------------------------------------
            lockProfile: () => {
                set({ isLocked: true });
            },

            // -----------------------------------------------------------------
            // VERIFY PIN
            // -----------------------------------------------------------------
            verifyPin: (id, pin) => {
                const profile = get().profiles.find((p) => p.id === id);
                if (!profile || !profile.pinHash) return false;
                return hashPin(pin) === profile.pinHash;
            },

            // -----------------------------------------------------------------
            // SET PIN
            // -----------------------------------------------------------------
            setPin: (id, pin) => {
                if (pin.length !== PIN_LENGTH || !/^\d+$/.test(pin)) {
                    return false;
                }

                return get().updateProfile(id, {
                    pinRequired: true,
                    pinHash: hashPin(pin),
                });
            },

            // -----------------------------------------------------------------
            // REMOVE PIN
            // -----------------------------------------------------------------
            removePin: (id) => {
                return get().updateProfile(id, {
                    pinRequired: false,
                    pinHash: undefined,
                });
            },

            // -----------------------------------------------------------------
            // GET ACTIVE PROFILE
            // -----------------------------------------------------------------
            getActiveProfile: () => {
                const state = get();
                if (!state.activeProfileId) return null;
                return state.profiles.find((p) => p.id === state.activeProfileId) || null;
            },

            // -----------------------------------------------------------------
            // IS CONTENT ALLOWED
            // -----------------------------------------------------------------
            isContentAllowed: (contentRating) => {
                const activeProfile = get().getActiveProfile();

                // No active profile = allow all (shouldn't happen in normal flow)
                if (!activeProfile) return true;

                // Parse the content rating
                const parsedRating = parseContentRating(contentRating as string);

                // UNRATED content is hidden in kids mode, allowed otherwise
                if (parsedRating === 'UNRATED') {
                    return !activeProfile.isKidsProfile;
                }

                // Compare rating levels
                const contentLevel = getRatingLevel(parsedRating);
                const profileLevel = getRatingLevel(activeProfile.maxRating);

                return contentLevel <= profileLevel;
            },

            // -----------------------------------------------------------------
            // COMPLETE SETUP
            // -----------------------------------------------------------------
            completeSetup: () => {
                set({ hasCompletedSetup: true });
            },

            // -----------------------------------------------------------------
            // GET PROFILE
            // -----------------------------------------------------------------
            getProfile: (id) => {
                return get().profiles.find((p) => p.id === id);
            },

            // -----------------------------------------------------------------
            // CAN CREATE PROFILE
            // -----------------------------------------------------------------
            // -----------------------------------------------------------------
            // CAN CREATE PROFILE
            // -----------------------------------------------------------------
            canCreateProfile: () => {
                return get().profiles.length < MAX_PROFILES;
            },

            // -----------------------------------------------------------------
            // SYNC MAIN PROFILE NAME
            // -----------------------------------------------------------------
            syncMainProfileName: (login: string) => {
                const state = get();
                if (!login) {
                    logger.warn('syncMainProfileName: No login provided');
                    return;
                }

                const formattedName = formatProfileName(login);
                const profiles = [...state.profiles];

                if (profiles.length === 0) {
                    logger.warn('syncMainProfileName: No profiles found to sync');
                    return;
                }

                const firstProfile = profiles[0];
                const currentName = firstProfile.name.trim().toLowerCase();

                // If it's still named "Main" or similar, OR if it's the only profile 
                // and it doesn't match the login, update it.
                const shouldSync =
                    currentName === 'main' ||
                    currentName === 'guest' ||
                    (profiles.length === 1 && firstProfile.name !== formattedName);

                if (shouldSync) {
                    profiles[0] = {
                        ...firstProfile,
                        name: formattedName,
                    };
                    set({ profiles });
                    logger.info('syncMainProfileName: Updated profile name', {
                        previous: firstProfile.name,
                        new: formattedName,
                        login
                    });
                } else {
                    logger.debug('syncMainProfileName: No sync needed', {
                        current: firstProfile.name,
                        desired: formattedName
                    });
                }
            },
        }),
        {
            name: 'smartifly-profiles',
            storage: createJSONStorage(() => AsyncStorage),
            partialize: (state) => ({
                profiles: state.profiles,
                activeProfileId: state.activeProfileId,
                hasCompletedSetup: state.hasCompletedSetup,
            }),
            // Migration: Create default profile on first load
            onRehydrateStorage: () => (state) => {
                if (state && state.profiles.length === 0) {
                    const defaultProfile = createDefaultProfile();
                    state.profiles = [defaultProfile];
                    state.activeProfileId = defaultProfile.id;
                }
            },
        }
    )
);

// =============================================================================
// HOOKS
// =============================================================================

/**
 * Hook to get the active profile with reactivity
 */
export const useActiveProfile = () => {
    return useProfileStore((state) => {
        if (!state.activeProfileId) return null;
        return state.profiles.find((p) => p.id === state.activeProfileId) || null;
    });
};

/**
 * Hook to check if current profile is a kids profile
 */
export const useIsKidsMode = () => {
    return useProfileStore((state) => {
        if (!state.activeProfileId) return false;
        const activeProfile = state.profiles.find((p) => p.id === state.activeProfileId);
        return activeProfile?.isKidsProfile ?? false;
    });
};

/**
 * Hook for content filtering based on active profile
 */
export const useContentFilter = () => {
    const isContentAllowed = useProfileStore((state) => state.isContentAllowed);
    const activeProfile = useProfileStore((state) => {
        if (!state.activeProfileId) return null;
        return state.profiles.find((p) => p.id === state.activeProfileId) || null;
    });

    /**
     * Filter an array of content items by profile rating
     */
    const filterContent = useCallback(<T extends { rating?: string; rating_5based?: number }>(
        items: T[]
    ): T[] => {
        if (!activeProfile) return items;

        return items.filter((item) => {
            // Try explicit rating first
            if (item.rating) {
                return isContentAllowed(item.rating);
            }

            // Fall back to star rating estimation
            if (item.rating_5based !== undefined) {
                const estimatedRating = estimateRatingFromStars(item.rating_5based);
                return isContentAllowed(estimatedRating);
            }

            // No rating info - hide in kids mode, show otherwise
            return !activeProfile.isKidsProfile;
        });
    }, [activeProfile, isContentAllowed]);

    /**
     * Check if a single item is allowed
     */
    const isAllowed = useCallback((rating?: string, starRating?: number): boolean => {
        if (rating) {
            return isContentAllowed(rating);
        }
        if (starRating !== undefined) {
            return isContentAllowed(estimateRatingFromStars(starRating));
        }
        return !activeProfile?.isKidsProfile;
    }, [activeProfile, isContentAllowed]);

    return useMemo(() => ({
        filterContent,
        isAllowed,
        /**
         * Get the current profile's max rating
         */
        maxRating: activeProfile?.maxRating ?? 'NC-17',

        /**
         * Is current profile a kids profile
         */
        isKidsMode: activeProfile?.isKidsProfile ?? false,
    }), [filterContent, isAllowed, activeProfile?.maxRating, activeProfile?.isKidsProfile]);
};

export default useProfileStore;

