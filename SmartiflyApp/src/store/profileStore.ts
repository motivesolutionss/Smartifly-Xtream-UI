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
] as const;

// Avatar colors for default rendering (when images not available)
export const AVATAR_COLORS: Record<AvatarId, string> = {
    avatar_01: '#E50914', // Netflix Red
    avatar_02: '#00E5FF', // Cyan
    avatar_03: '#FF6B35', // Orange
    avatar_04: '#7B2CBF', // Purple
    avatar_05: '#2EC4B6', // Teal
    avatar_06: '#FF006E', // Pink
    avatar_07: '#3A86FF', // Blue
    avatar_08: '#8338EC', // Violet
    avatar_09: '#FB5607', // Bright Orange
    avatar_10: '#06D6A0', // Mint
    avatar_11: '#FFD60A', // Yellow
    avatar_12: '#EF476F', // Coral
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
}

type ProfileStore = ProfileState & ProfileActions;

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Generate a unique profile ID
 */
const generateProfileId = (): string => {
    return `profile_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
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
            canCreateProfile: () => {
                return get().profiles.length < MAX_PROFILES;
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
    const activeProfile = useActiveProfile();
    return activeProfile?.isKidsProfile ?? false;
};

/**
 * Hook for content filtering based on active profile
 */
export const useContentFilter = () => {
    const isContentAllowed = useProfileStore((state) => state.isContentAllowed);
    const activeProfile = useActiveProfile();

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
