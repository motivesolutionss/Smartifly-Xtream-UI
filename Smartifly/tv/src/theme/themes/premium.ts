import { Theme } from './types';

export const premiumTheme: Theme = {
    id: 'premium',
    name: 'Midnight Gold',
    dark: true,
    colors: {
        // Brand - Gold and Platinum
        primary: '#FFD700', // Gold
        primaryDark: '#B8860B', // Dark Goldenrod
        primaryLight: '#FFE55C', // Light Gold
        accent: '#E5E4E2', // Platinum
        accentDark: '#C0C0C0', // Silver
        accentLight: '#FFFFFF', // White
        tertiary: '#C0C0C0', // Silver

        // Backgrounds - Deep Rich Black/Charcoal
        background: '#000000', // True Black
        backgroundSecondary: '#121212', // Material Dark
        backgroundTertiary: '#1E1E1E', // Card bg
        backgroundElevated: '#2C2C2C', // Modal bg
        backgroundInput: '#121212',
        overlay: 'rgba(0, 0, 0, 0.85)',
        overlayLight: 'rgba(0, 0, 0, 0.6)',

        // Text - High Contrast
        textPrimary: '#FFFFFF',
        textSecondary: '#E0E0E0',
        textTertiary: '#A0A0A0',
        textMuted: '#666666',
        textDisabled: '#404040',
        textInverse: '#000000',
        textOnPrimary: '#000000',

        // Semantic - Muted elegance
        success: '#4ADE80',
        successBackground: 'rgba(74, 222, 128, 0.1)',
        warning: '#FBBF24',
        warningBackground: 'rgba(251, 191, 36, 0.1)',
        error: '#F87171',
        errorBackground: 'rgba(248, 113, 113, 0.1)',
        info: '#60A5FA',
        infoBackground: 'rgba(96, 165, 250, 0.1)',

        // Content Types - Elegant tones
        live: '#FFD700', // Gold
        liveGlow: 'rgba(255, 215, 0, 0.4)',
        movies: '#E5E4E2', // Platinum
        moviesGlow: 'rgba(229, 228, 226, 0.4)',
        series: '#C0C0C0', // Silver
        seriesGlow: 'rgba(192, 192, 192, 0.4)',
        sports: '#4ADE80',
        news: '#F472B6',
        kids: '#60A5FA',

        // UI Elements - Clean lines
        border: 'rgba(255, 215, 0, 0.15)', // Gold hint
        borderMedium: 'rgba(255, 215, 0, 0.25)',
        borderStrong: 'rgba(255, 215, 0, 0.40)',
        borderFocus: '#FFD700',
        divider: 'rgba(255, 255, 255, 0.1)',
        icon: '#A0A0A0',
        iconActive: '#FFD700', // Gold icons
        iconMuted: '#666666',
        tabInactive: '#666666',
        tabActive: '#FFD700',
        tabIndicator: '#FFD700',
        skeleton: 'rgba(255, 255, 255, 0.05)',
        skeletonHighlight: 'rgba(255, 255, 255, 0.1)',

        // Glass
        glass: 'rgba(30, 30, 30, 0.6)',
        glassMedium: 'rgba(30, 30, 30, 0.4)',
        glassDark: 'rgba(0, 0, 0, 0.8)',

        // Quality
        qualityUHD: '#FFD700',
        qualityHD: '#E5E4E2',
        qualitySD: '#666666',

        // Card specific
        cardBackground: '#1E1E1E',
        neon: '#FFD700',
        neonGlow: 'rgba(255, 215, 0, 0.2)',
    },
    effects: {
        blur: false,
        glow: 'high',
        meshBackground: false,
    }
};
