/**
 * Smartifly Design System - Colors
 *
 * THEME MANAGER
 * Exposes the active color palette, gradients, and quality helpers.
 * The exported colors object is kept in sync when the theme changes so legacy
 * consumers can keep using the same import while newer code should prefer
 * the ThemeProvider / useTheme hook.
 */

import { premiumTheme } from './themes/premium';
import { defaultTheme } from './themes/default';
import { aetherTheme } from './themes/aether';
import { Theme, ThemeColors } from './themes/types';

// =============================================================================
// THEME REGISTRY
// =============================================================================

export const themeRegistry = {
    default: defaultTheme,
    premium: premiumTheme,
    aether: aetherTheme,
} as const;

export type ThemeId = keyof typeof themeRegistry;
export const defaultThemeId: ThemeId = defaultTheme.id as ThemeId;

// =============================================================================
// ACTIVATION STATE (mutable exports for legacy compatibility)
// =============================================================================

export let activeTheme: Theme = defaultTheme;
export const colors: ThemeColors = { ...defaultTheme.colors };

const updateColors = (source: ThemeColors) => {
    Object.assign(colors, source);
};

export type GradientStops = [string, string, string?];
export type Gradients = {
    heroOverlay: [string, string, string];
    cardHover: [string, string];
    primaryButton: [string, string];
    accentButton: [string, string];
    progress: [string, string];
    premium: [string, string];
    liveIndicator: [string, string];
    shimmer: [string, string, string];
    // Futuristic Gradients
    aetherPulse: [string, string, string];
    cyanNeon: [string, string];
    violetNeon: [string, string];
    meshBackground: string[];
};

export const gradients: Gradients = {
    heroOverlay: ['transparent', 'rgba(9, 12, 18, 0.58)', 'rgba(9, 12, 18, 0.97)'],
    cardHover: ['transparent', 'rgba(198, 214, 235, 0.10)'],
    primaryButton: [colors.primary, colors.primaryDark],
    accentButton: [colors.accent, colors.accentDark],
    progress: [colors.primary, colors.primaryLight],
    premium: ['#F5C518', '#E50914'],
    liveIndicator: ['#FF0000', colors.live],
    shimmer: ['rgba(255,255,255,0)', 'rgba(198,214,235,0.09)', 'rgba(255,255,255,0)'],
    // Initial placeholders
    aetherPulse: ['#00F3FF', '#7000FF', '#020408'],
    cyanNeon: ['#00F3FF', 'rgba(0, 243, 255, 0.1)'],
    violetNeon: ['#7000FF', 'rgba(112, 0, 255, 0.1)'],
    meshBackground: ['#020408', '#080C14', '#00F3FF', '#7000FF'],
};

export type QualityColors = {
    uhd: string;
    '4k': string;
    hd: string;
    sd: string;
    hdr: string;
    dolby: string;
};

export const qualityColors: QualityColors = {
    uhd: colors.qualityUHD,
    '4k': colors.qualityUHD,
    hd: colors.qualityHD,
    sd: colors.qualitySD,
    hdr: colors.primary,
    dolby: '#B4D7FF',
};

const refreshGradients = (palette: ThemeColors) => {
    gradients.primaryButton = [palette.primary, palette.primaryDark];
    gradients.accentButton = [palette.accent, palette.accentDark];
    gradients.progress = [palette.primary, palette.primaryLight];
    gradients.liveIndicator = ['#FF0000', palette.live];

    // Refresh futuristic gradients based on active palette
    if (activeTheme.id === 'aether') {
        gradients.aetherPulse = [palette.primary, palette.accent, palette.background];
        gradients.cyanNeon = [palette.primary, 'rgba(0, 243, 255, 0.1)'];
        gradients.violetNeon = [palette.accent, 'rgba(112, 0, 255, 0.1)'];
        gradients.meshBackground = [palette.background, palette.backgroundSecondary, palette.primary, palette.accent];
    }
};

const refreshQualityColors = (palette: ThemeColors) => {
    qualityColors.uhd = palette.qualityUHD;
    qualityColors['4k'] = palette.qualityUHD;
    qualityColors.hd = palette.qualityHD;
    qualityColors.sd = palette.qualitySD;
    qualityColors.hdr = palette.primary;
};

const applyTheme = (theme: Theme) => {
    activeTheme = theme;
    updateColors(theme.colors);
    refreshGradients(theme.colors);
    refreshQualityColors(theme.colors);
};

export const getThemeById = (themeId: ThemeId): Theme => themeRegistry[themeId] ?? defaultTheme;

export const setActiveTheme = (themeId: ThemeId): Theme => {
    const nextTheme = getThemeById(themeId);
    applyTheme(nextTheme);
    return nextTheme;
};

// Ensure gradients/quality colors are initialized
refreshGradients(colors);
refreshQualityColors(colors);

// =============================================================================
// LEGACY TYPES / EXPORTS
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

export type Colors = typeof colors;
