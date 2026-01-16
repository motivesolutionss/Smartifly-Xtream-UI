/**
 * Smartifly Design System - Sizes & Dimensions
 * 
 * Consistent sizing for components, icons, and border radius.
 * Includes both mobile and TV specific dimensions.
 */

import { Dimensions, Platform } from 'react-native';

// =============================================================================
// SCREEN DIMENSIONS
// =============================================================================

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const screen = {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    isSmall: SCREEN_WIDTH < 375,
    isMedium: SCREEN_WIDTH >= 375 && SCREEN_WIDTH < 414,
    isLarge: SCREEN_WIDTH >= 414,
} as const;

// =============================================================================
// BORDER RADIUS
// =============================================================================

/**
 * Border radius scale
 */
export const borderRadius = {
    /** No radius - Sharp corners */
    none: 0,
    /** 2px - Subtle rounding */
    xs: 2,
    /** 4px - Light rounding */
    sm: 4,
    /** 8px - Medium rounding (default for cards) */
    md: 8,
    /** 12px - Large rounding */
    lg: 12,
    /** 16px - Extra large rounding */
    xl: 16,
    /** 20px - 2X large rounding */
    xxl: 20,
    /** 24px - 3X large rounding (modals) */
    '3xl': 24,
    /** 32px - Maximum rounding */
    '4xl': 32,
    /** Full rounding - Pills, circles */
    full: 9999,
    /** Alias for full - Commonly used for pills */
    round: 9999,
} as const;

/**
 * TV border radius (larger for 10-foot UI)
 */
export const borderRadiusTV = {
    none: 0,
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    '3xl': 32,
    '4xl': 40,
    full: 9999,
    round: 9999,
} as const;

// =============================================================================
// ICON SIZES
// =============================================================================

/**
 * Icon size scale
 */
export const iconSize = {
    /** 12px - Tiny icons (badges) */
    xs: 12,
    /** 16px - Small icons */
    sm: 16,
    /** 20px - Medium small icons */
    md: 20,
    /** 24px - Default icon size */
    base: 24,
    /** 28px - Large icons */
    lg: 28,
    /** 32px - Extra large icons */
    xl: 32,
    /** 40px - 2X large icons */
    xxl: 40,
    /** 48px - Hero icons */
    '3xl': 48,
    /** 64px - Display icons */
    '4xl': 64,
} as const;

/**
 * TV icon sizes (larger for viewing distance)
 */
export const iconSizeTV = {
    xs: 16,
    sm: 20,
    md: 24,
    base: 32,
    lg: 40,
    xl: 48,
    xxl: 56,
    '3xl': 64,
    '4xl': 80,
} as const;

// =============================================================================
// COMPONENT SIZES
// =============================================================================

/**
 * Button sizes
 */
export const buttonSize = {
    mobile: {
        sm: {
            height: 32,
            paddingHorizontal: 12,
            fontSize: 12,
            iconSize: 16,
            borderRadius: borderRadius.md,
        },
        md: {
            height: 40,
            paddingHorizontal: 16,
            fontSize: 14,
            iconSize: 20,
            borderRadius: borderRadius.md,
        },
        lg: {
            height: 48,
            paddingHorizontal: 20,
            fontSize: 16,
            iconSize: 24,
            borderRadius: borderRadius.lg,
        },
        xl: {
            height: 56,
            paddingHorizontal: 24,
            fontSize: 16,
            iconSize: 24,
            borderRadius: borderRadius.lg,
        },
    },
    tv: {
        sm: {
            height: 48,
            paddingHorizontal: 20,
            fontSize: 16,
            iconSize: 24,
            borderRadius: borderRadiusTV.md,
        },
        md: {
            height: 56,
            paddingHorizontal: 24,
            fontSize: 18,
            iconSize: 28,
            borderRadius: borderRadiusTV.md,
        },
        lg: {
            height: 64,
            paddingHorizontal: 32,
            fontSize: 20,
            iconSize: 32,
            borderRadius: borderRadiusTV.lg,
        },
        xl: {
            height: 72,
            paddingHorizontal: 40,
            fontSize: 22,
            iconSize: 36,
            borderRadius: borderRadiusTV.lg,
        },
    },
} as const;

/**
 * Input field sizes
 */
export const inputSize = {
    mobile: {
        sm: {
            height: 36,
            paddingHorizontal: 12,
            fontSize: 14,
            iconSize: 18,
            borderRadius: borderRadius.md,
        },
        md: {
            height: 44,
            paddingHorizontal: 16,
            fontSize: 16,
            iconSize: 20,
            borderRadius: borderRadius.lg,
        },
        lg: {
            height: 52,
            paddingHorizontal: 16,
            fontSize: 16,
            iconSize: 24,
            borderRadius: borderRadius.lg,
        },
    },
    tv: {
        sm: {
            height: 52,
            paddingHorizontal: 20,
            fontSize: 18,
            iconSize: 24,
            borderRadius: borderRadiusTV.md,
        },
        md: {
            height: 60,
            paddingHorizontal: 24,
            fontSize: 20,
            iconSize: 28,
            borderRadius: borderRadiusTV.lg,
        },
        lg: {
            height: 72,
            paddingHorizontal: 28,
            fontSize: 22,
            iconSize: 32,
            borderRadius: borderRadiusTV.lg,
        },
    },
} as const;

/**
 * Avatar/Profile sizes
 */
export const avatarSize = {
    mobile: {
        xs: 24,
        sm: 32,
        md: 40,
        lg: 48,
        xl: 64,
        xxl: 80,
    },
    tv: {
        xs: 32,
        sm: 48,
        md: 56,
        lg: 72,
        xl: 96,
        xxl: 120,
    },
} as const;

/**
 * Badge sizes
 */
export const badgeSize = {
    mobile: {
        sm: {
            height: 16,
            paddingHorizontal: 4,
            fontSize: 9,
            borderRadius: borderRadius.sm,
        },
        md: {
            height: 20,
            paddingHorizontal: 6,
            fontSize: 10,
            borderRadius: borderRadius.sm,
        },
        lg: {
            height: 24,
            paddingHorizontal: 8,
            fontSize: 11,
            borderRadius: borderRadius.md,
        },
    },
    tv: {
        sm: {
            height: 24,
            paddingHorizontal: 8,
            fontSize: 12,
            borderRadius: borderRadiusTV.sm,
        },
        md: {
            height: 28,
            paddingHorizontal: 10,
            fontSize: 14,
            borderRadius: borderRadiusTV.sm,
        },
        lg: {
            height: 32,
            paddingHorizontal: 12,
            fontSize: 16,
            borderRadius: borderRadiusTV.md,
        },
    },
} as const;

// =============================================================================
// CARD/POSTER SIZES
// =============================================================================

/**
 * Content card sizes (posters, thumbnails)
 */
export const cardSize = {
    mobile: {
        /** Vertical poster (movies/series) - 2:3 aspect ratio */
        poster: {
            width: 120,
            height: 180,
            borderRadius: borderRadius.lg,
        },
        /** Small poster for compact lists */
        posterSmall: {
            width: 100,
            height: 150,
            borderRadius: borderRadius.md,
        },
        /** Large poster for featured content */
        posterLarge: {
            width: 140,
            height: 210,
            borderRadius: borderRadius.lg,
        },
        /** Horizontal thumbnail (16:9) */
        thumbnail: {
            width: 160,
            height: 90,
            borderRadius: borderRadius.md,
        },
        /** Wide thumbnail for featured rows */
        thumbnailWide: {
            width: 280,
            height: 158,
            borderRadius: borderRadius.lg,
        },
        /** Square channel logo */
        channel: {
            width: 100,
            height: 100,
            borderRadius: borderRadius.lg,
        },
        /** Featured hero card */
        featured: {
            width: SCREEN_WIDTH - 32, // Full width minus padding
            height: 200,
            borderRadius: borderRadius.xl,
        },
        /** Episode card (horizontal) */
        episode: {
            width: SCREEN_WIDTH - 32,
            height: 90,
            thumbnailWidth: 160,
            borderRadius: borderRadius.lg,
        },
    },
    tv: {
        poster: {
            width: 180,
            height: 270,
            borderRadius: borderRadiusTV.lg,
        },
        posterSmall: {
            width: 150,
            height: 225,
            borderRadius: borderRadiusTV.md,
        },
        posterLarge: {
            width: 220,
            height: 330,
            borderRadius: borderRadiusTV.xl,
        },
        thumbnail: {
            width: 320,
            height: 180,
            borderRadius: borderRadiusTV.lg,
        },
        thumbnailWide: {
            width: 400,
            height: 225,
            borderRadius: borderRadiusTV.lg,
        },
        channel: {
            width: 160,
            height: 160,
            borderRadius: borderRadiusTV.lg,
        },
        featured: {
            width: 800,
            height: 450,
            borderRadius: borderRadiusTV.xxl,
        },
        episode: {
            width: 600,
            height: 120,
            thumbnailWidth: 213,
            borderRadius: borderRadiusTV.lg,
        },
    },
} as const;

// =============================================================================
// LAYOUT SIZES
// =============================================================================

/**
 * Header sizes
 */
export const headerSize = {
    mobile: {
        height: 56,
        heightLarge: 64,
        iconSize: 24,
        logoHeight: 28,
    },
    tv: {
        height: 80,
        heightLarge: 100,
        iconSize: 32,
        logoHeight: 48,
    },
} as const;

/**
 * Tab bar sizes
 */
export const tabBarSize = {
    mobile: {
        height: 56,
        heightWithLabels: 64,
        iconSize: 24,
        indicatorHeight: 3,
    },
    tv: {
        height: 80,
        heightWithLabels: 96,
        iconSize: 32,
        indicatorHeight: 4,
    },
} as const;

/**
 * Sidebar sizes (TV)
 */
export const sidebarSize = {
    collapsed: 80,
    expanded: 280,
    itemHeight: 56,
    iconSize: 28,
} as const;

/**
 * Modal sizes
 */
export const modalSize = {
    mobile: {
        small: {
            width: SCREEN_WIDTH - 64,
            maxHeight: SCREEN_HEIGHT * 0.5,
        },
        medium: {
            width: SCREEN_WIDTH - 32,
            maxHeight: SCREEN_HEIGHT * 0.7,
        },
        large: {
            width: SCREEN_WIDTH,
            maxHeight: SCREEN_HEIGHT * 0.9,
        },
        fullscreen: {
            width: SCREEN_WIDTH,
            height: SCREEN_HEIGHT,
        },
    },
    tv: {
        small: {
            width: 500,
            maxHeight: 400,
        },
        medium: {
            width: 700,
            maxHeight: 600,
        },
        large: {
            width: 900,
            maxHeight: 800,
        },
    },
} as const;

// =============================================================================
// TOUCH TARGETS
// =============================================================================

/**
 * Minimum touch target sizes (accessibility)
 */
export const touchTarget = {
    /** Minimum touch target for mobile (44px per Apple HIG) */
    mobile: 44,
    /** Minimum touch target for TV (larger for remote) */
    tv: 64,
    /** Hit slop for small interactive elements */
    hitSlop: {
        top: 8,
        right: 8,
        bottom: 8,
        left: 8,
    },
    /** Larger hit slop for icons */
    hitSlopLarge: {
        top: 12,
        right: 12,
        bottom: 12,
        left: 12,
    },
} as const;

// =============================================================================
// PLAYER SIZES
// =============================================================================

/**
 * Video player component sizes
 */
export const playerSize = {
    mobile: {
        controlBarHeight: 80,
        progressBarHeight: 4,
        progressBarHitHeight: 32,
        buttonSize: 48,
        buttonSizeSmall: 36,
        buttonSizeLarge: 64,
        seekTime: 10, // seconds
    },
    tv: {
        controlBarHeight: 120,
        progressBarHeight: 6,
        progressBarHitHeight: 48,
        buttonSize: 64,
        buttonSizeSmall: 48,
        buttonSizeLarge: 80,
        seekTime: 10,
    },
} as const;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get border radius based on platform
 */
export const getBorderRadius = (isTV: boolean) => {
    return isTV ? borderRadiusTV : borderRadius;
};

/**
 * Get icon size based on platform
 */
export const getIconSize = (isTV: boolean) => {
    return isTV ? iconSizeTV : iconSize;
};

/**
 * Get card size based on platform
 */
export const getCardSize = (isTV: boolean) => {
    return isTV ? cardSize.tv : cardSize.mobile;
};

/**
 * Calculate responsive width based on screen size
 */
export const getResponsiveWidth = (percentage: number): number => {
    return SCREEN_WIDTH * (percentage / 100);
};

/**
 * Calculate responsive height based on screen size
 */
export const getResponsiveHeight = (percentage: number): number => {
    return SCREEN_HEIGHT * (percentage / 100);
};

/**
 * Get number of columns for grid based on screen width
 */
export const getGridColumns = (itemWidth: number, gap: number, padding: number): number => {
    const availableWidth = SCREEN_WIDTH - (padding * 2);
    return Math.floor((availableWidth + gap) / (itemWidth + gap));
};

// =============================================================================
// ASPECT RATIOS
// =============================================================================

/**
 * Common aspect ratios for media content
 */
export const aspectRatio = {
    /** Poster (2:3) */
    poster: 2 / 3,
    /** Landscape (16:9) */
    landscape: 16 / 9,
    /** Square (1:1) */
    square: 1,
    /** Wide (21:9) */
    ultrawide: 21 / 9,
    /** Portrait (9:16) */
    portrait: 9 / 16,
    /** Standard (4:3) */
    standard: 4 / 3,
} as const;

// Type exports
export type BorderRadius = typeof borderRadius;
export type BorderRadiusTV = typeof borderRadiusTV;
export type IconSize = typeof iconSize;
export type IconSizeTV = typeof iconSizeTV;
export type ButtonSize = typeof buttonSize;
export type InputSize = typeof inputSize;
export type AvatarSize = typeof avatarSize;
export type BadgeSize = typeof badgeSize;
export type CardSize = typeof cardSize;
export type HeaderSize = typeof headerSize;
export type TabBarSize = typeof tabBarSize;
export type SidebarSize = typeof sidebarSize;
export type ModalSize = typeof modalSize;
export type TouchTarget = typeof touchTarget;
export type PlayerSize = typeof playerSize;
export type AspectRatio = typeof aspectRatio;