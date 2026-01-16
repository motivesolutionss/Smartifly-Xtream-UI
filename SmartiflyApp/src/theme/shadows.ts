/**
 * Smartifly Design System - Shadows & Elevation
 * 
 * Shadow presets for creating depth and visual hierarchy.
 * Includes standard elevations and special glow effects.
 */

import { Platform, ViewStyle } from 'react-native';

// =============================================================================
// SHADOW COLORS
// =============================================================================

/**
 * Shadow color definitions
 */
export const shadowColors = {
    /** Default shadow color */
    default: '#000000',
    /** Primary brand shadow (for glowing buttons) */
    primary: '#E50914',
    /** Accent shadow (for neon effects) */
    accent: '#00E5FF',
    /** Tertiary shadow */
    tertiary: '#00FFB3',
    /** Live indicator glow */
    live: '#FF0000',
    /** Success glow */
    success: '#22C55E',
    /** Warning glow */
    warning: '#F59E0B',
    /** Error glow */
    error: '#EF4444',
} as const;

// =============================================================================
// ELEVATION LEVELS
// =============================================================================

/**
 * Standard elevation shadows (Material Design inspired)
 * Each level increases the visual "lift" of the element
 */
export const elevation = {
    /** No elevation - flat on surface */
    none: {
        shadowColor: shadowColors.default,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0,
        shadowRadius: 0,
        elevation: 0,
    } as ViewStyle,

    /** Level 1 - Subtle lift (cards at rest) */
    xs: {
        shadowColor: shadowColors.default,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.18,
        shadowRadius: 1,
        elevation: 1,
    } as ViewStyle,

    /** Level 2 - Light elevation (raised cards) */
    sm: {
        shadowColor: shadowColors.default,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.20,
        shadowRadius: 3,
        elevation: 2,
    } as ViewStyle,

    /** Level 3 - Medium elevation (floating elements) */
    md: {
        shadowColor: shadowColors.default,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.22,
        shadowRadius: 6,
        elevation: 4,
    } as ViewStyle,

    /** Level 4 - High elevation (dropdowns, popovers) */
    lg: {
        shadowColor: shadowColors.default,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 8,
    } as ViewStyle,

    /** Level 5 - Very high elevation (modals) */
    xl: {
        shadowColor: shadowColors.default,
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.30,
        shadowRadius: 16,
        elevation: 12,
    } as ViewStyle,

    /** Level 6 - Maximum elevation (dialogs, sheets) */
    xxl: {
        shadowColor: shadowColors.default,
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.35,
        shadowRadius: 24,
        elevation: 16,
    } as ViewStyle,
} as const;

// =============================================================================
// COMPONENT-SPECIFIC SHADOWS
// =============================================================================

/**
 * Pre-defined shadows for common components
 */
export const componentShadows = {
    /** Card shadow - Standard content cards */
    card: {
        shadowColor: shadowColors.default,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 6,
    } as ViewStyle,

    /** Card hover/focus shadow - Elevated state */
    cardHover: {
        shadowColor: shadowColors.default,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.30,
        shadowRadius: 16,
        elevation: 10,
    } as ViewStyle,

    /** Featured content shadow - Hero sections */
    featured: {
        shadowColor: shadowColors.default,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
        elevation: 12,
    } as ViewStyle,

    /** Button shadow - CTA buttons */
    button: {
        shadowColor: shadowColors.default,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.20,
        shadowRadius: 4,
        elevation: 3,
    } as ViewStyle,

    /** Button pressed shadow - Reduced elevation */
    buttonPressed: {
        shadowColor: shadowColors.default,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 2,
        elevation: 1,
    } as ViewStyle,

    /** Input shadow - Text inputs, dropdowns */
    input: {
        shadowColor: shadowColors.default,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.10,
        shadowRadius: 4,
        elevation: 2,
    } as ViewStyle,

    /** Input focus shadow */
    inputFocus: {
        shadowColor: shadowColors.accent,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    } as ViewStyle,

    /** Modal/Dialog shadow */
    modal: {
        shadowColor: shadowColors.default,
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.5,
        shadowRadius: 32,
        elevation: 24,
    } as ViewStyle,

    /** Bottom sheet shadow */
    bottomSheet: {
        shadowColor: shadowColors.default,
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 16,
    } as ViewStyle,

    /** Tab bar shadow */
    tabBar: {
        shadowColor: shadowColors.default,
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 8,
    } as ViewStyle,

    /** Header shadow */
    header: {
        shadowColor: shadowColors.default,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 4,
    } as ViewStyle,

    /** Poster/Thumbnail shadow */
    poster: {
        shadowColor: shadowColors.default,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    } as ViewStyle,

    /** Floating action button shadow */
    fab: {
        shadowColor: shadowColors.default,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
        elevation: 12,
    } as ViewStyle,
} as const;

// =============================================================================
// GLOW EFFECTS
// =============================================================================

/**
 * Glow effects for premium UI elements
 * Note: These work best on iOS. Android has limited shadow support.
 */
export const glowEffects = {
    /** Primary brand glow (red) */
    primary: {
        shadowColor: shadowColors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 12,
        elevation: 8,
    } as ViewStyle,

    /** Accent neon glow (cyan) */
    accent: {
        shadowColor: shadowColors.accent,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 12,
        elevation: 8,
    } as ViewStyle,

    /** Tertiary glow (teal) */
    tertiary: {
        shadowColor: shadowColors.tertiary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 12,
        elevation: 8,
    } as ViewStyle,

    /** Live indicator glow */
    live: {
        shadowColor: shadowColors.live,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 8,
        elevation: 6,
    } as ViewStyle,

    /** Success glow */
    success: {
        shadowColor: shadowColors.success,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
        elevation: 6,
    } as ViewStyle,

    /** Warning glow */
    warning: {
        shadowColor: shadowColors.warning,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
        elevation: 6,
    } as ViewStyle,

    /** Error glow */
    error: {
        shadowColor: shadowColors.error,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
        elevation: 6,
    } as ViewStyle,

    /** Soft white glow */
    soft: {
        shadowColor: '#FFFFFF',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 8,
    } as ViewStyle,

    /** Neon glow - Strong accent */
    neon: {
        shadowColor: shadowColors.accent,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.7,
        shadowRadius: 20,
        elevation: 12,
    } as ViewStyle,
} as const;

// =============================================================================
// TV-SPECIFIC SHADOWS (Larger for 10-foot UI)
// =============================================================================

/**
 * TV elevation shadows - Scaled up for viewing distance
 */
export const elevationTV = {
    none: elevation.none,

    xs: {
        shadowColor: shadowColors.default,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.20,
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
        shadowOpacity: 0.30,
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
        shadowOpacity: 0.40,
        shadowRadius: 40,
        elevation: 24,
    } as ViewStyle,
} as const;

/**
 * TV glow effects - Larger and more prominent
 */
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

    /** Focus ring glow for TV navigation */
    focus: {
        shadowColor: shadowColors.accent,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 16,
        elevation: 10,
    } as ViewStyle,
} as const;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get elevation based on platform
 */
export const getElevation = (isTV: boolean) => {
    return isTV ? elevationTV : elevation;
};

/**
 * Get glow effects based on platform
 */
export const getGlowEffects = (isTV: boolean) => {
    return isTV ? glowEffectsTV : glowEffects;
};

/**
 * Create custom shadow
 */
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

/**
 * Combine multiple shadow styles (for layered effects)
 * Note: React Native doesn't support multiple shadows, so this picks the most prominent
 */
export const combineShadows = (...shadows: ViewStyle[]): ViewStyle => {
    // Return the shadow with the highest elevation
    return shadows.reduce((prev, current) => {
        const prevElevation = (prev.elevation as number) || 0;
        const currentElevation = (current.elevation as number) || 0;
        return currentElevation > prevElevation ? current : prev;
    }, shadows[0]);
};

// =============================================================================
// LEGACY COMPATIBILITY EXPORT
// =============================================================================

/**
 * Legacy shadows export for backwards compatibility
 */
export const shadows = {
    neonGlow: glowEffects.accent,
    ...elevation,
    ...componentShadows,
} as const;

// Type exports
export type ShadowColors = typeof shadowColors;
export type Elevation = typeof elevation;
export type ElevationTV = typeof elevationTV;
export type ComponentShadows = typeof componentShadows;
export type GlowEffects = typeof glowEffects;
export type GlowEffectsTV = typeof glowEffectsTV;
export type Shadows = typeof shadows;