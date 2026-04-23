/**
 * Smartifly Android TV shadow and glow tokens.
 */

import { ViewStyle } from 'react-native';

export const shadowColors = {
    default: '#000000',
    primary: '#E50914',
    accent: '#00E5FF',
    tertiary: '#00FFB3',
    live: '#FF0000',
    success: '#22C55E',
    warning: '#F59E0B',
    error: '#EF4444',
} as const;

export const elevationTV = {
    none: {
        shadowColor: shadowColors.default,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0,
        shadowRadius: 0,
        elevation: 0,
    } as ViewStyle,
    xs: {
        shadowColor: shadowColors.default,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 2,
    } as ViewStyle,
    sm: {
        shadowColor: shadowColors.default,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.22,
        shadowRadius: 6,
        elevation: 4,
    } as ViewStyle,
    md: {
        shadowColor: shadowColors.default,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 8,
    } as ViewStyle,
    lg: {
        shadowColor: shadowColors.default,
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 12,
    } as ViewStyle,
    xl: {
        shadowColor: shadowColors.default,
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.35,
        shadowRadius: 28,
        elevation: 16,
    } as ViewStyle,
    xxl: {
        shadowColor: shadowColors.default,
        shadowOffset: { width: 0, height: 24 },
        shadowOpacity: 0.4,
        shadowRadius: 40,
        elevation: 24,
    } as ViewStyle,
} as const;

export const elevation = elevationTV;

export const componentShadows = {
    card: elevationTV.md,
    cardHover: elevationTV.lg,
    featured: elevationTV.xl,
    button: elevationTV.sm,
    buttonPressed: elevationTV.xs,
    input: elevationTV.xs,
    inputFocus: {
        shadowColor: shadowColors.accent,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    } as ViewStyle,
    modal: elevationTV.xxl,
    NavigationBar: elevationTV.lg,
    header: elevationTV.sm,
    poster: elevationTV.md,
    fab: elevationTV.xl,
} as const;

export const glowEffectsTV = {
    primary: {
        shadowColor: shadowColors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 20,
        elevation: 12,
    } as ViewStyle,
    accent: {
        shadowColor: shadowColors.accent,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 20,
        elevation: 12,
    } as ViewStyle,
    tertiary: {
        shadowColor: shadowColors.tertiary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 20,
        elevation: 12,
    } as ViewStyle,
    live: {
        shadowColor: shadowColors.live,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.7,
        shadowRadius: 16,
        elevation: 10,
    } as ViewStyle,
    success: {
        shadowColor: shadowColors.success,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 16,
        elevation: 10,
    } as ViewStyle,
    warning: {
        shadowColor: shadowColors.warning,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 16,
        elevation: 10,
    } as ViewStyle,
    error: {
        shadowColor: shadowColors.error,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 16,
        elevation: 10,
    } as ViewStyle,
    soft: {
        shadowColor: '#FFFFFF',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
        elevation: 10,
    } as ViewStyle,
    neon: {
        shadowColor: shadowColors.accent,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 28,
        elevation: 16,
    } as ViewStyle,
    focus: {
        shadowColor: shadowColors.accent,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 24,
        elevation: 15,
    } as ViewStyle,
} as const;

export const glowEffects = glowEffectsTV;

export const getElevation = () => elevationTV;
export const getGlowEffects = () => glowEffectsTV;

export const createShadow = (
    color: string,
    offsetX: number,
    offsetY: number,
    opacity: number,
    radius: number,
    elevationValue: number
): ViewStyle => ({
    shadowColor: color,
    shadowOffset: { width: offsetX, height: offsetY },
    shadowOpacity: opacity,
    shadowRadius: radius,
    elevation: elevationValue,
});

export const combineShadows = (...shadows: ViewStyle[]): ViewStyle => {
    return shadows.reduce((prev, current) => {
        const prevElevation = (prev.elevation as number) || 0;
        const currentElevation = (current.elevation as number) || 0;
        return currentElevation > prevElevation ? current : prev;
    }, shadows[0]);
};

export const shadows = {
    neonGlow: glowEffectsTV.accent,
    ...elevationTV,
    ...componentShadows,
} as const;

export type ShadowColors = typeof shadowColors;
export type Elevation = typeof elevation;
export type ElevationTV = typeof elevationTV;
export type ComponentShadows = typeof componentShadows;
export type GlowEffects = typeof glowEffects;
export type GlowEffectsTV = typeof glowEffectsTV;
export type Shadows = typeof shadows;
