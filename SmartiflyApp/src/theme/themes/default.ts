import { Theme } from './types';

export const defaultTheme: Theme = {
    id: 'default',
    name: 'Netflix Red',
    dark: true,
    colors: {
        // Brand
        primary: '#E50914',
        primaryDark: '#B20710',
        primaryLight: '#FF1A1A',
        accent: '#00E5FF',
        accentDark: '#00B8CC',
        accentLight: '#33EAFF',
        tertiary: '#00FFB3',

        // Backgrounds
        background: '#0B1220',
        backgroundSecondary: '#0F1A2E',
        backgroundTertiary: '#142238',
        backgroundElevated: '#1A2D4A',
        backgroundInput: '#0D1526',
        overlay: 'rgba(0, 0, 0, 0.75)',
        overlayLight: 'rgba(0, 0, 0, 0.5)',

        // Text
        textPrimary: '#FFFFFF',
        textSecondary: '#E1E5EE',
        textTertiary: '#A8B3C7',
        textMuted: '#6B7A94',
        textDisabled: '#4A5568',
        textInverse: '#0B1220',
        textOnPrimary: '#FFFFFF',

        // Semantic
        success: '#22C55E',
        successBackground: 'rgba(34, 197, 94, 0.15)',
        warning: '#F59E0B',
        warningBackground: 'rgba(245, 158, 11, 0.15)',
        error: '#EF4444',
        errorBackground: 'rgba(239, 68, 68, 0.15)',
        info: '#3B82F6',
        infoBackground: 'rgba(59, 130, 246, 0.15)',

        // Content Types
        live: '#E50914',
        liveGlow: 'rgba(229, 9, 20, 0.4)',
        movies: '#9333EA',
        moviesGlow: 'rgba(147, 51, 234, 0.4)',
        series: '#0EA5E9',
        seriesGlow: 'rgba(14, 165, 233, 0.4)',
        sports: '#22C55E',
        news: '#F97316',
        kids: '#EC4899',

        // UI Elements
        border: 'rgba(255, 255, 255, 0.08)',
        borderMedium: 'rgba(255, 255, 255, 0.12)',
        borderStrong: 'rgba(255, 255, 255, 0.20)',
        borderFocus: '#00E5FF',
        divider: 'rgba(255, 255, 255, 0.06)',
        icon: '#A8B3C7',
        iconActive: '#FFFFFF',
        iconMuted: '#6B7A94',
        tabInactive: '#6B7A94',
        tabActive: '#FFFFFF',
        tabIndicator: '#E50914',
        skeleton: 'rgba(255, 255, 255, 0.06)',
        skeletonHighlight: 'rgba(255, 255, 255, 0.12)',

        // Glass
        glass: 'rgba(255, 255, 255, 0.08)',
        glassMedium: 'rgba(255, 255, 255, 0.05)',
        glassDark: 'rgba(0, 0, 0, 0.6)',

        // Quality
        qualityUHD: '#FFD700',
        qualityHD: '#00E5FF',
        qualitySD: '#6B7A94',

        // Card specific
        cardBackground: '#142238',
        neon: '#00E5FF',
        neonGlow: 'rgba(0, 229, 255, 0.25)',
    },
    effects: {
        blur: false,
        glow: 'low',
        meshBackground: false,
    }
};
