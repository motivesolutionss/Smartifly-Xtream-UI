/**
 * Smartifly Design System - Colors
 * 
 * THEME MANAGER
 * This file now exports the colors from the ACTIVE THEME.
 * To change the app theme, update the 'activeTheme' import.
 */

import { premiumTheme } from './themes/premium';
import { defaultTheme } from './themes/default';

// =============================================================================
// THEME REGISTRY
// =============================================================================

const themeRegistry = {
    default: defaultTheme,
    premium: premiumTheme,
} as const;

// =============================================================================
// ACTIVE THEME SELECTION
// =============================================================================

// Change this to themeRegistry.premium to unlock the premium palette
export const activeTheme = themeRegistry.default;

// Export the colors object from the active theme
export const colors = activeTheme.colors;

// =============================================================================
// TYPE DEFINITIONS (Re-defined for standalone usage)
// =============================================================================

export interface BrandColors {
    primary: string;
    primaryDark: string;
    primaryLight: string;
    accent: string;
    accentDark: string;
    accentLight: string;
    tertiary: string;
}

export interface BackgroundColors {
    background: string;
    backgroundSecondary: string;
    backgroundTertiary: string;
    backgroundElevated: string;
    backgroundInput: string;
    overlay: string;
    overlayLight: string;
}

export interface TextColors {
    textPrimary: string;
    textSecondary: string;
    textTertiary: string;
    textMuted: string;
    textDisabled: string;
    textInverse: string;
    textOnPrimary: string;
}

export interface SemanticColors {
    success: string;
    successBackground: string;
    warning: string;
    warningBackground: string;
    error: string;
    errorBackground: string;
    info: string;
    infoBackground: string;
}

export interface ContentColors {
    live: string;
    liveGlow: string;
    movies: string;
    moviesGlow: string;
    series: string;
    seriesGlow: string;
    sports: string;
    news: string;
    kids: string;
}

export interface UIColors {
    border: string;
    borderMedium: string;
    borderStrong: string;
    borderFocus: string;
    divider: string;
    icon: string;
    iconActive: string;
    iconMuted: string;
    tabInactive: string;
    tabActive: string;
    tabIndicator: string;
    skeleton: string;
    skeletonHighlight: string;
}

export interface GlassColors {
    glass: string;
    glassMedium: string;
    glassDark: string;
}

// Interface removed to avoid duplicate identifier with type alias below

// Gradients are still defined here as consts if not in theme, 
// OR we can move them to theme later. For now, keep as is.
export const gradients = {
    heroOverlay: ['transparent', 'rgba(11, 18, 32, 0.4)', 'rgba(11, 18, 32, 0.95)'],
    cardHover: ['transparent', 'rgba(0, 229, 255, 0.1)'],
    primaryButton: [activeTheme.colors.primary, activeTheme.colors.primaryDark],
    accentButton: [activeTheme.colors.accent, activeTheme.colors.accentDark],
    progress: [activeTheme.colors.primary, activeTheme.colors.primaryLight],
    premium: ['#FFD700', '#FFA500'],
    liveIndicator: ['#FF0000', activeTheme.colors.live],
    shimmer: ['rgba(255,255,255,0)', 'rgba(255,255,255,0.08)', 'rgba(255,255,255,0)'],
} as const;

// Legacy support for qualityColors usage
export const qualityColors = {
    uhd: activeTheme.colors.qualityUHD,
    '4k': activeTheme.colors.qualityUHD,
    hd: activeTheme.colors.qualityHD,
    sd: activeTheme.colors.qualitySD,
    hdr: activeTheme.colors.primary, // using primary as HDR color
    dolby: '#B4D7FF', // Static fallback
};

export type Gradients = typeof gradients;
export type Colors = typeof colors;
export type QualityColors = typeof qualityColors;
