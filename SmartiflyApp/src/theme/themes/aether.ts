import { Theme } from './types';

export const aetherTheme: Theme = {
    id: 'aether',
    name: 'Aether (Futuristic)',
    dark: true,
    colors: {
        // Brand
        primary: '#00F3FF', // Neon Cyan
        primaryDark: '#00B8CC',
        primaryLight: '#33EAFF',
        accent: '#7000FF', // Electric Violet
        accentDark: '#5A00CC',
        accentLight: '#A366FF',
        tertiary: '#00FFB3',

        // Backgrounds
        background: '#020408', // Obsidian Black
        backgroundSecondary: '#080C14',
        backgroundTertiary: '#0F1624',
        backgroundElevated: '#1A2436',
        backgroundInput: '#050810',
        overlay: 'rgba(0, 0, 0, 0.85)',
        overlayLight: 'rgba(0, 0, 0, 0.6)',

        // Text
        textPrimary: '#FFFFFF',
        textSecondary: '#E1E5EE',
        textTertiary: '#8E9AAF',
        textMuted: '#5C677D',
        textDisabled: '#334155',
        textInverse: '#020408',
        textOnPrimary: '#000000',

        // Semantic
        success: '#00FFB3',
        successBackground: 'rgba(0, 255, 179, 0.1)',
        warning: '#FFD700',
        warningBackground: 'rgba(255, 215, 0, 0.1)',
        error: '#FF0055',
        errorBackground: 'rgba(255, 0, 85, 0.1)',
        info: '#00F3FF',
        infoBackground: 'rgba(0, 243, 255, 0.1)',

        // Content Types
        live: '#00F3FF',
        liveGlow: 'rgba(0, 243, 255, 0.4)',
        movies: '#7000FF',
        moviesGlow: 'rgba(112, 0, 255, 0.4)',
        series: '#00FFB3',
        seriesGlow: 'rgba(0, 255, 179, 0.4)',
        sports: '#00FFB3',
        news: '#FFD700',
        kids: '#A366FF',

        // UI Elements
        border: 'rgba(0, 243, 255, 0.15)',
        borderMedium: 'rgba(0, 243, 255, 0.25)',
        borderStrong: 'rgba(0, 243, 255, 0.4)',
        borderFocus: '#00F3FF',
        divider: 'rgba(255, 255, 255, 0.08)',
        icon: '#8E9AAF',
        iconActive: '#00F3FF',
        iconMuted: '#5C677D',
        tabInactive: '#5C677D',
        tabActive: '#00F3FF',
        tabIndicator: '#00F3FF',
        skeleton: 'rgba(0, 243, 255, 0.05)',
        skeletonHighlight: 'rgba(0, 243, 255, 0.1)',

        // Glass
        glass: 'rgba(15, 22, 36, 0.6)',
        glassMedium: 'rgba(15, 22, 36, 0.4)',
        glassDark: 'rgba(2, 4, 8, 0.8)',

        // Quality
        qualityUHD: '#00F3FF',
        qualityHD: '#7000FF',
        qualitySD: '#5C677D',

        // Card specific
        cardBackground: '#0F1624',
        neon: '#00F3FF',
        neonGlow: 'rgba(0, 243, 255, 0.3)',
    },
    effects: {
        blur: false,
        glow: 'high',
        meshBackground: true,
    }
};
