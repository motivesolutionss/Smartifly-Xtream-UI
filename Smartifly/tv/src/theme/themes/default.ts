import { Theme } from './types';

export const defaultTheme: Theme = {
    id: 'default',
    name: 'Metallic Noir',
    dark: true,
    colors: {
        // Brand - keep Smartifly red signature
        primary: '#E50914',
        primaryDark: '#B20710',
        primaryLight: '#FF1A1A',
        accent: '#FFFFFF',
        accentDark: '#E5E5E5',
        accentLight: '#FFFFFF',
        tertiary: '#46D369',

        // Backgrounds - deeper metallic black
        background: '#040507',
        backgroundSecondary: '#0B0F15',
        backgroundTertiary: '#141A23',
        backgroundElevated: '#1C2531',
        backgroundInput: '#222D3C',
        overlay: 'rgba(2, 3, 6, 0.86)',
        overlayLight: 'rgba(6, 9, 14, 0.62)',

        // Text
        textPrimary: '#FFFFFF',
        textSecondary: '#E7ECF4',
        textTertiary: '#B6C0D1',
        textMuted: '#8D9AAF',
        textDisabled: '#5A6576',
        textInverse: '#0C1118',
        textOnPrimary: '#FFFFFF',

        // Semantic
        success: '#46D369',
        successBackground: 'rgba(70, 211, 105, 0.15)',
        warning: '#F5C518',
        warningBackground: 'rgba(245, 197, 24, 0.15)',
        error: '#E50914',
        errorBackground: 'rgba(229, 9, 20, 0.15)',
        info: '#3B82F6',
        infoBackground: 'rgba(59, 130, 246, 0.15)',

        // Content Types
        live: '#E50914',
        liveGlow: 'rgba(229, 9, 20, 0.4)',
        movies: '#9333EA',
        moviesGlow: 'rgba(147, 51, 234, 0.4)',
        series: '#0EA5E9',
        seriesGlow: 'rgba(14, 165, 233, 0.4)',
        sports: '#46D369',
        news: '#F97316',
        kids: '#EC4899',

        // UI Elements
        border: 'rgba(170, 189, 214, 0.16)',
        borderMedium: 'rgba(170, 189, 214, 0.26)',
        borderStrong: 'rgba(170, 189, 214, 0.38)',
        borderFocus: '#FFFFFF',
        divider: 'rgba(176, 198, 226, 0.12)',
        icon: '#C6CFDB',
        iconActive: '#FFFFFF',
        iconMuted: '#8B97A8',
        tabInactive: '#8B97A8',
        tabActive: '#FFFFFF',
        tabIndicator: '#E50914',
        skeleton: 'rgba(176, 198, 226, 0.09)',
        skeletonHighlight: 'rgba(198, 214, 235, 0.18)',

        // Glass
        glass: 'rgba(170, 189, 214, 0.1)',
        glassMedium: 'rgba(170, 189, 214, 0.07)',
        glassDark: 'rgba(7, 10, 16, 0.8)',

        // Quality
        qualityUHD: '#F5C518',
        qualityHD: '#46D369',
        qualitySD: '#8B97A8',

        // Card specific
        cardBackground: '#0F151E',
        neon: '#D9E4F2',
        neonGlow: 'rgba(193, 214, 240, 0.22)',
    },
    effects: {
        blur: false,
        glow: 'low',
        meshBackground: false,
    },
};
