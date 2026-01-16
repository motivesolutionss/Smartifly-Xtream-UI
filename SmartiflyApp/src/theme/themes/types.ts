/**
 * Smartifly Theme Types
 * 
 * Defines the contract that all themes must implement.
 * Ensures consistent availability of tokens across all themes.
 */

// Imports removed to prevent circular dependency
// ThemeColors uses primitive strings, so we don't need to import types from colors.ts

export interface ThemeColors {
    // Brand
    primary: string;
    primaryDark: string;
    primaryLight: string;
    accent: string;
    accentDark: string;
    accentLight: string;
    tertiary: string;

    // Backgrounds
    background: string;
    backgroundSecondary: string;
    backgroundTertiary: string;
    backgroundElevated: string;
    backgroundInput: string;
    overlay: string;
    overlayLight: string;

    // Text
    textPrimary: string;
    textSecondary: string;
    textTertiary: string;
    textMuted: string;
    textDisabled: string;
    textInverse: string;
    textOnPrimary: string;

    // Semantic
    success: string;
    successBackground: string;
    warning: string;
    warningBackground: string;
    error: string;
    errorBackground: string;
    info: string;
    infoBackground: string;

    // Content Types
    live: string;
    liveGlow: string;
    movies: string;
    moviesGlow: string;
    series: string;
    seriesGlow: string;
    sports: string;
    news: string;
    kids: string;

    // UI Elements
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

    // Glass
    glass: string;
    glassMedium: string;
    glassDark: string;

    // Quality
    qualityUHD: string;
    qualityHD: string;
    qualitySD: string;

    // Card specific (legacy)
    cardBackground: string;
    neon: string;
    neonGlow: string;
}

export interface Theme {
    id: string;
    name: string;
    dark: boolean;
    colors: ThemeColors;
    // We can add validation for gradients later if needed, 
    // but they are usually complex objects.
}
