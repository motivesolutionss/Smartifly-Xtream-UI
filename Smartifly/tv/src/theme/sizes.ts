/**
 * Smartifly Android TV size tokens.
 */

import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const screen = {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    isSmall: SCREEN_WIDTH < 1280,
    isMedium: SCREEN_WIDTH >= 1280 && SCREEN_WIDTH < 1920,
    isLarge: SCREEN_WIDTH >= 1920,
} as const;

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

export const borderRadius = borderRadiusTV;

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

export const iconSize = iconSizeTV;

export const buttonSize = {
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
} as const;

export const inputSize = {
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
} as const;

export const avatarSize = {
    xs: 32,
    sm: 48,
    md: 56,
    lg: 72,
    xl: 96,
    xxl: 120,
} as const;

export const badgeSize = {
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
} as const;

export const cardSizeTV = {
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
} as const;

export const cardSize = cardSizeTV;

export const headerSize = {
    height: 80,
    heightLarge: 100,
    iconSize: 32,
    logoHeight: 48,
} as const;

export const NavigationBarSize = {
    height: 80,
    heightWithLabels: 96,
    iconSize: 32,
    indicatorHeight: 4,
} as const;

export const sidebarSize = {
    collapsed: 80,
    expanded: 280,
    itemHeight: 56,
    iconSize: 28,
} as const;

export const modalSize = {
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
} as const;

export const touchTarget = {
    tv: 64,
    hitSlop: {
        top: 8,
        right: 8,
        bottom: 8,
        left: 8,
    },
    hitSlopLarge: {
        top: 12,
        right: 12,
        bottom: 12,
        left: 12,
    },
} as const;

export const playerSize = {
    controlBarHeight: 120,
    progressBarHeight: 6,
    progressBarHitHeight: 48,
    buttonSize: 64,
    buttonSizeSmall: 48,
    buttonSizeLarge: 80,
    seekTime: 10,
} as const;

export const getBorderRadius = () => borderRadiusTV;
export const getIconSize = () => iconSizeTV;
export const getCardSize = () => cardSizeTV;

export const getResponsiveWidth = (percentage: number): number => {
    return SCREEN_WIDTH * (percentage / 100);
};

export const getResponsiveHeight = (percentage: number): number => {
    return SCREEN_HEIGHT * (percentage / 100);
};

export const getGridColumns = (itemWidth: number, gap: number, padding: number): number => {
    const availableWidth = SCREEN_WIDTH - (padding * 2);
    return Math.floor((availableWidth + gap) / (itemWidth + gap));
};

export const aspectRatio = {
    poster: 2 / 3,
    landscape: 16 / 9,
    square: 1,
    ultrawide: 21 / 9,
    portrait: 9 / 16,
    standard: 4 / 3,
} as const;

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
export type NavigationBarSizeTokens = typeof NavigationBarSize;
export type NavigationBarSize = typeof NavigationBarSize;
export type SidebarSize = typeof sidebarSize;
export type ModalSize = typeof modalSize;
export type TouchTarget = typeof touchTarget;
export type PlayerSize = typeof playerSize;
export type AspectRatio = typeof aspectRatio;
