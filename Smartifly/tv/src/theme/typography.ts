/**
 * Smartifly Android TV typography tokens.
 */

import { TextStyle } from 'react-native';

export const fontFamily = {
    regular: 'Roboto',
    inter: 'Inter-Regular',
    spaceGrotesk: 'SpaceGrotesk-Medium',
    medium: 'Roboto-Medium',
    semiBold: 'Roboto-Medium',
    bold: 'Roboto-Bold',
    mono: 'monospace',
} as const;

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
        textShadowColor: '#00F3FF',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 8,
    } as TextStyle,
} as const;

export const fontWeight = {
    regular: '400' as TextStyle['fontWeight'],
    medium: '500' as TextStyle['fontWeight'],
    semiBold: '600' as TextStyle['fontWeight'],
    bold: '700' as TextStyle['fontWeight'],
    extraBold: '800' as TextStyle['fontWeight'],
} as const;

export const fontSizeTV = {
    xs: 14,
    sm: 16,
    base: 18,
    md: 20,
    lg: 24,
    xl: 28,
    '2xl': 32,
    '3xl': 40,
    '4xl': 48,
    '5xl': 64,
} as const;

export const lineHeight = {
    tight: 1.1,
    snug: 1.25,
    normal: 1.5,
    relaxed: 1.625,
    loose: 2,
} as const;

export const letterSpacing = {
    tighter: -0.5,
    tight: -0.25,
    normal: 0,
    wide: 0.5,
    wider: 1,
    widest: 2,
} as const;

export const typographyTV = {
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
    body: {
        fontSize: fontSizeTV.base,
        fontWeight: fontWeight.regular,
        lineHeight: fontSizeTV.base * lineHeight.normal,
        letterSpacing: letterSpacing.normal,
    } as TextStyle,
} as const;

export const getTypography = () => typographyTV;
export const getFontSize = () => fontSizeTV;
export const typography = typographyTV;

export type FontFamily = typeof fontFamily;
export type FontWeight = typeof fontWeight;
export type FontSizeTV = typeof fontSizeTV;
export type LineHeight = typeof lineHeight;
export type LetterSpacing = typeof letterSpacing;
export type TypographyTV = typeof typographyTV;
export type Typography = typeof typography;
