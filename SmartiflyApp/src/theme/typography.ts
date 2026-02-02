/**
 * Smartifly Design System - Typography
 * 
 * Consistent typography scale for both mobile and TV platforms.
 * Uses system fonts for performance, with carefully crafted sizes and weights.
 */

import { Platform, TextStyle } from 'react-native';

// =============================================================================
// FONT FAMILIES
// =============================================================================

/**
 * Font family definitions
 * Using system fonts for optimal performance and native feel
 */
export const fontFamily = {
    /** Primary font for body text */
    regular: Platform.select({
        ios: 'System',
        android: 'Roboto',
        default: 'System',
    }),
    /** Futuristic body font (Optional) */
    inter: Platform.select({
        ios: 'Inter-Regular',
        android: 'Inter-Regular',
        default: 'System',
    }),
    /** Futuristic heading font (Optional) */
    spaceGrotesk: Platform.select({
        ios: 'SpaceGrotesk-Medium',
        android: 'SpaceGrotesk-Medium',
        default: 'System',
    }),
    /** Medium weight for emphasis */
    medium: Platform.select({
        ios: 'System',
        android: 'Roboto-Medium',
        default: 'System',
    }),
    /** Semi-bold for headings */
    semiBold: Platform.select({
        ios: 'System',
        android: 'Roboto-Medium',
        default: 'System',
    }),
    /** Bold for strong emphasis */
    bold: Platform.select({
        ios: 'System',
        android: 'Roboto-Bold',
        default: 'System',
    }),
    /** Monospace for codes/numbers */
    mono: Platform.select({
        ios: 'Menlo',
        android: 'monospace',
        default: 'monospace',
    }),
} as const;

// =============================================================================
// TEXT GLOW EFFECTS (Futuristic)
// =============================================================================

/**
 * Token-only glow presets (TextStyle)
 * Usable on focused TV items or display text.
 */
export const textGlow = {
    none: {
        textShadowColor: 'transparent',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 0,
    } as TextStyle,

    soft: {
        textShadowColor: 'rgba(255, 255, 255, 0.3)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 4,
    } as TextStyle,

    neon: {
        textShadowColor: '#00F3FF', // Cyan default, can be overridden
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 8,
    } as TextStyle,
} as const;


// =============================================================================
// FONT WEIGHTS
// =============================================================================

/**
 * Font weight scale
 */
export const fontWeight = {
    regular: '400' as TextStyle['fontWeight'],
    medium: '500' as TextStyle['fontWeight'],
    semiBold: '600' as TextStyle['fontWeight'],
    bold: '700' as TextStyle['fontWeight'],
    extraBold: '800' as TextStyle['fontWeight'],
} as const;

// =============================================================================
// FONT SIZES - MOBILE
// =============================================================================

/**
 * Mobile font size scale (base: 16px)
 */
export const fontSizeMobile = {
    /** Extra small - badges, timestamps */
    xs: 10,
    /** Small - captions, hints */
    sm: 12,
    /** Base - body text */
    base: 14,
    /** Medium - emphasized body */
    md: 16,
    /** Large - subheadings */
    lg: 18,
    /** Extra large - section titles */
    xl: 20,
    /** 2XL - screen titles */
    '2xl': 24,
    /** 3XL - hero titles */
    '3xl': 28,
    /** 4XL - display text */
    '4xl': 32,
    /** 5XL - large display */
    '5xl': 40,
} as const;

// =============================================================================
// FONT SIZES - TV
// =============================================================================

/**
 * TV font size scale (10-foot UI, everything larger)
 */
export const fontSizeTV = {
    /** Extra small - badges */
    xs: 14,
    /** Small - captions */
    sm: 16,
    /** Base - body text */
    base: 18,
    /** Medium - emphasized body */
    md: 20,
    /** Large - subheadings */
    lg: 24,
    /** Extra large - section titles */
    xl: 28,
    /** 2XL - screen titles */
    '2xl': 32,
    /** 3XL - hero titles */
    '3xl': 40,
    /** 4XL - display text */
    '4xl': 48,
    /** 5XL - large display */
    '5xl': 64,
} as const;

// =============================================================================
// LINE HEIGHTS
// =============================================================================

/**
 * Line height multipliers
 */
export const lineHeight = {
    /** Tight - headings, single line */
    tight: 1.1,
    /** Snug - subheadings */
    snug: 1.25,
    /** Normal - body text */
    normal: 1.5,
    /** Relaxed - long form text */
    relaxed: 1.625,
    /** Loose - extra spacing */
    loose: 2,
} as const;

// =============================================================================
// LETTER SPACING
// =============================================================================

/**
 * Letter spacing (tracking) scale
 */
export const letterSpacing = {
    /** Tighter - large headings */
    tighter: -0.5,
    /** Tight - headings */
    tight: -0.25,
    /** Normal - body text */
    normal: 0,
    /** Wide - buttons, labels */
    wide: 0.5,
    /** Wider - badges, all caps */
    wider: 1,
    /** Widest - logo, display */
    widest: 2,
} as const;

// =============================================================================
// TYPOGRAPHY PRESETS - MOBILE
// =============================================================================

/**
 * Pre-defined typography styles for mobile
 */
export const typographyMobile = {
    // Display styles (hero, splash)
    displayLarge: {
        fontSize: fontSizeMobile['5xl'],
        fontWeight: fontWeight.bold,
        lineHeight: fontSizeMobile['5xl'] * lineHeight.tight,
        letterSpacing: letterSpacing.tight,
    } as TextStyle,

    displayMedium: {
        fontSize: fontSizeMobile['4xl'],
        fontWeight: fontWeight.bold,
        lineHeight: fontSizeMobile['4xl'] * lineHeight.tight,
        letterSpacing: letterSpacing.tight,
    } as TextStyle,

    displaySmall: {
        fontSize: fontSizeMobile['3xl'],
        fontWeight: fontWeight.bold,
        lineHeight: fontSizeMobile['3xl'] * lineHeight.tight,
        letterSpacing: letterSpacing.tight,
    } as TextStyle,

    // Heading styles
    h1: {
        fontSize: fontSizeMobile['2xl'],
        fontWeight: fontWeight.bold,
        lineHeight: fontSizeMobile['2xl'] * lineHeight.snug,
        letterSpacing: letterSpacing.tight,
    } as TextStyle,

    h2: {
        fontSize: fontSizeMobile.xl,
        fontWeight: fontWeight.semiBold,
        lineHeight: fontSizeMobile.xl * lineHeight.snug,
        letterSpacing: letterSpacing.normal,
    } as TextStyle,

    h3: {
        fontSize: fontSizeMobile.lg,
        fontWeight: fontWeight.semiBold,
        lineHeight: fontSizeMobile.lg * lineHeight.snug,
        letterSpacing: letterSpacing.normal,
    } as TextStyle,

    h4: {
        fontSize: fontSizeMobile.md,
        fontWeight: fontWeight.semiBold,
        lineHeight: fontSizeMobile.md * lineHeight.snug,
        letterSpacing: letterSpacing.normal,
    } as TextStyle,

    // Body styles
    bodyLarge: {
        fontSize: fontSizeMobile.md,
        fontWeight: fontWeight.regular,
        lineHeight: fontSizeMobile.md * lineHeight.normal,
        letterSpacing: letterSpacing.normal,
    } as TextStyle,

    bodyMedium: {
        fontSize: fontSizeMobile.base,
        fontWeight: fontWeight.regular,
        lineHeight: fontSizeMobile.base * lineHeight.normal,
        letterSpacing: letterSpacing.normal,
    } as TextStyle,

    bodySmall: {
        fontSize: fontSizeMobile.sm,
        fontWeight: fontWeight.regular,
        lineHeight: fontSizeMobile.sm * lineHeight.normal,
        letterSpacing: letterSpacing.normal,
    } as TextStyle,

    // Label styles (buttons, inputs)
    labelLarge: {
        fontSize: fontSizeMobile.md,
        fontWeight: fontWeight.semiBold,
        lineHeight: fontSizeMobile.md * lineHeight.tight,
        letterSpacing: letterSpacing.wide,
    } as TextStyle,

    labelMedium: {
        fontSize: fontSizeMobile.base,
        fontWeight: fontWeight.medium,
        lineHeight: fontSizeMobile.base * lineHeight.tight,
        letterSpacing: letterSpacing.wide,
    } as TextStyle,

    labelSmall: {
        fontSize: fontSizeMobile.sm,
        fontWeight: fontWeight.medium,
        lineHeight: fontSizeMobile.sm * lineHeight.tight,
        letterSpacing: letterSpacing.wide,
    } as TextStyle,

    // Caption styles
    caption: {
        fontSize: fontSizeMobile.sm,
        fontWeight: fontWeight.regular,
        lineHeight: fontSizeMobile.sm * lineHeight.normal,
        letterSpacing: letterSpacing.normal,
    } as TextStyle,

    captionSmall: {
        fontSize: fontSizeMobile.xs,
        fontWeight: fontWeight.regular,
        lineHeight: fontSizeMobile.xs * lineHeight.normal,
        letterSpacing: letterSpacing.normal,
    } as TextStyle,

    // Special styles
    badge: {
        fontSize: fontSizeMobile.xs,
        fontWeight: fontWeight.bold,
        lineHeight: fontSizeMobile.xs * lineHeight.tight,
        letterSpacing: letterSpacing.wider,
        textTransform: 'uppercase',
    } as TextStyle,

    button: {
        fontSize: fontSizeMobile.base,
        fontWeight: fontWeight.semiBold,
        lineHeight: fontSizeMobile.base * lineHeight.tight,
        letterSpacing: letterSpacing.wide,
    } as TextStyle,

    buttonSmall: {
        fontSize: fontSizeMobile.sm,
        fontWeight: fontWeight.semiBold,
        lineHeight: fontSizeMobile.sm * lineHeight.tight,
        letterSpacing: letterSpacing.wide,
    } as TextStyle,

    input: {
        fontSize: fontSizeMobile.md,
        fontWeight: fontWeight.regular,
        lineHeight: fontSizeMobile.md * lineHeight.normal,
        letterSpacing: letterSpacing.normal,
    } as TextStyle,

    placeholder: {
        fontSize: fontSizeMobile.md,
        fontWeight: fontWeight.regular,
        lineHeight: fontSizeMobile.md * lineHeight.normal,
        letterSpacing: letterSpacing.normal,
    } as TextStyle,

    tabLabel: {
        fontSize: fontSizeMobile.xs,
        fontWeight: fontWeight.medium,
        lineHeight: fontSizeMobile.xs * lineHeight.tight,
        letterSpacing: letterSpacing.normal,
    } as TextStyle,

    logo: {
        fontSize: fontSizeMobile['3xl'],
        fontWeight: fontWeight.bold,
        lineHeight: fontSizeMobile['3xl'] * lineHeight.tight,
        letterSpacing: letterSpacing.widest,
    } as TextStyle,
} as const;

// =============================================================================
// TYPOGRAPHY PRESETS - TV
// =============================================================================

/**
 * Pre-defined typography styles for TV (10-foot UI)
 */
export const typographyTV = {
    // Display styles
    displayLarge: {
        fontSize: fontSizeTV['5xl'],
        fontWeight: fontWeight.bold,
        lineHeight: fontSizeTV['5xl'] * lineHeight.tight,
        letterSpacing: letterSpacing.tight,
    } as TextStyle,

    displayMedium: {
        fontSize: fontSizeTV['4xl'],
        fontWeight: fontWeight.bold,
        lineHeight: fontSizeTV['4xl'] * lineHeight.tight,
        letterSpacing: letterSpacing.tight,
    } as TextStyle,

    displaySmall: {
        fontSize: fontSizeTV['3xl'],
        fontWeight: fontWeight.bold,
        lineHeight: fontSizeTV['3xl'] * lineHeight.tight,
        letterSpacing: letterSpacing.tight,
    } as TextStyle,

    // Heading styles
    h1: {
        fontSize: fontSizeTV['2xl'],
        fontWeight: fontWeight.bold,
        lineHeight: fontSizeTV['2xl'] * lineHeight.snug,
        letterSpacing: letterSpacing.tight,
    } as TextStyle,

    h2: {
        fontSize: fontSizeTV.xl,
        fontWeight: fontWeight.semiBold,
        lineHeight: fontSizeTV.xl * lineHeight.snug,
        letterSpacing: letterSpacing.normal,
    } as TextStyle,

    h3: {
        fontSize: fontSizeTV.lg,
        fontWeight: fontWeight.semiBold,
        lineHeight: fontSizeTV.lg * lineHeight.snug,
        letterSpacing: letterSpacing.normal,
    } as TextStyle,

    h4: {
        fontSize: fontSizeTV.md,
        fontWeight: fontWeight.semiBold,
        lineHeight: fontSizeTV.md * lineHeight.snug,
        letterSpacing: letterSpacing.normal,
    } as TextStyle,

    // Body styles
    bodyLarge: {
        fontSize: fontSizeTV.md,
        fontWeight: fontWeight.regular,
        lineHeight: fontSizeTV.md * lineHeight.normal,
        letterSpacing: letterSpacing.normal,
    } as TextStyle,

    bodyMedium: {
        fontSize: fontSizeTV.base,
        fontWeight: fontWeight.regular,
        lineHeight: fontSizeTV.base * lineHeight.normal,
        letterSpacing: letterSpacing.normal,
    } as TextStyle,

    bodySmall: {
        fontSize: fontSizeTV.sm,
        fontWeight: fontWeight.regular,
        lineHeight: fontSizeTV.sm * lineHeight.normal,
        letterSpacing: letterSpacing.normal,
    } as TextStyle,

    // Label styles
    labelLarge: {
        fontSize: fontSizeTV.md,
        fontWeight: fontWeight.semiBold,
        lineHeight: fontSizeTV.md * lineHeight.tight,
        letterSpacing: letterSpacing.wide,
    } as TextStyle,

    labelMedium: {
        fontSize: fontSizeTV.base,
        fontWeight: fontWeight.medium,
        lineHeight: fontSizeTV.base * lineHeight.tight,
        letterSpacing: letterSpacing.wide,
    } as TextStyle,

    labelSmall: {
        fontSize: fontSizeTV.sm,
        fontWeight: fontWeight.medium,
        lineHeight: fontSizeTV.sm * lineHeight.tight,
        letterSpacing: letterSpacing.wide,
    } as TextStyle,

    // Caption styles
    caption: {
        fontSize: fontSizeTV.sm,
        fontWeight: fontWeight.regular,
        lineHeight: fontSizeTV.sm * lineHeight.normal,
        letterSpacing: letterSpacing.normal,
    } as TextStyle,

    captionSmall: {
        fontSize: fontSizeTV.xs,
        fontWeight: fontWeight.regular,
        lineHeight: fontSizeTV.xs * lineHeight.normal,
        letterSpacing: letterSpacing.normal,
    } as TextStyle,

    // Special styles
    badge: {
        fontSize: fontSizeTV.xs,
        fontWeight: fontWeight.bold,
        lineHeight: fontSizeTV.xs * lineHeight.tight,
        letterSpacing: letterSpacing.wider,
        textTransform: 'uppercase',
    } as TextStyle,

    button: {
        fontSize: fontSizeTV.md,
        fontWeight: fontWeight.semiBold,
        lineHeight: fontSizeTV.md * lineHeight.tight,
        letterSpacing: letterSpacing.wide,
    } as TextStyle,

    buttonSmall: {
        fontSize: fontSizeTV.base,
        fontWeight: fontWeight.semiBold,
        lineHeight: fontSizeTV.base * lineHeight.tight,
        letterSpacing: letterSpacing.wide,
    } as TextStyle,

    input: {
        fontSize: fontSizeTV.md,
        fontWeight: fontWeight.regular,
        lineHeight: fontSizeTV.md * lineHeight.normal,
        letterSpacing: letterSpacing.normal,
    } as TextStyle,

    placeholder: {
        fontSize: fontSizeTV.md,
        fontWeight: fontWeight.regular,
        lineHeight: fontSizeTV.md * lineHeight.normal,
        letterSpacing: letterSpacing.normal,
    } as TextStyle,

    logo: {
        fontSize: fontSizeTV['4xl'],
        fontWeight: fontWeight.bold,
        lineHeight: fontSizeTV['4xl'] * lineHeight.tight,
        letterSpacing: letterSpacing.widest,
    } as TextStyle,

    tabLabel: {
        fontSize: fontSizeTV.xs,
        fontWeight: fontWeight.medium,
        lineHeight: fontSizeTV.xs * lineHeight.tight,
        letterSpacing: letterSpacing.normal,
    } as TextStyle,

    // Alias for backwards compatibility
    body: {
        fontSize: fontSizeTV.base,
        fontWeight: fontWeight.regular,
        lineHeight: fontSizeTV.base * lineHeight.normal,
        letterSpacing: letterSpacing.normal,
    } as TextStyle,
} as const;

// =============================================================================
// PLATFORM-AWARE TYPOGRAPHY HELPER
// =============================================================================

/**
 * Get typography based on platform (mobile vs TV)
 */
export const getTypography = (isTV: boolean) => {
    return isTV ? typographyTV : typographyMobile;
};

/**
 * Get font size based on platform
 */
export const getFontSize = (isTV: boolean) => {
    return isTV ? fontSizeTV : fontSizeMobile;
};

// =============================================================================
// LEGACY COMPATIBILITY EXPORT
// =============================================================================

/**
 * Legacy typography export for backwards compatibility
 */
export const typography = {
    mobile: typographyMobile,
    tv: typographyTV,
} as const;

// Type exports
export type FontFamily = typeof fontFamily;
export type FontWeight = typeof fontWeight;
export type FontSizeMobile = typeof fontSizeMobile;
export type FontSizeTV = typeof fontSizeTV;
export type LineHeight = typeof lineHeight;
export type LetterSpacing = typeof letterSpacing;
export type TypographyMobile = typeof typographyMobile;
export type TypographyTV = typeof typographyTV;
export type Typography = typeof typography;
