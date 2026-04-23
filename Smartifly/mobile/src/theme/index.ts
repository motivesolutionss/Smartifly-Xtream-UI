/**
 * Smartifly Design System
 * 
 * A comprehensive design system for the Smartifly IPTV application.
 * Supports both mobile and TV platforms with consistent tokens.
 * 
 * @version 1.0.0
 * @author Smartifly Team
 */

// =============================================================================
// EXPORTS
// =============================================================================


import { colors as themeColors } from './colors';
import { Platform, Dimensions } from 'react-native';
import { typographyMobile, getTypography } from './typography';
import { getSpacing } from './spacing';
import { getBorderRadius } from './sizes';
import { getElevation } from './shadows';
import {
    scale as tvScale,
    scaleX as tvScaleX,
    scaleY as tvScaleY,
    scaleFont as tvScaleFont,
    scaleMin as tvScaleMin,
    scaleMax as tvScaleMax,
    scaleBounded as tvScaleBounded,
    widthPercent as tvWidthPercent,
    heightPercent as tvHeightPercent,
    TV_SAFE_AREA,
    getSafeAreaPadding,
    tvDimensions,
    tvTypography,
    focusDimensions,
    calculateGridColumns,
    calculateItemWidth,
    getRailLayout,
    currentResolution,
    scaleFactor,
    getResolutionDebugInfo,
} from './tvScaling';

const selectPlatformTokens = (forceTV?: boolean) => {
    const isTV = forceTV ?? Platform.isTV;
    return {
        typography: getTypography(isTV),
        spacing: getSpacing(isTV),
        borderRadius: getBorderRadius(isTV),
        elevation: getElevation(isTV),
    } as const;
};

// Colors
export {
    colors,
    activeTheme,
    gradients,
    qualityColors,
    setActiveTheme,
    themeRegistry,
    defaultThemeId,
    getThemeById,
} from './colors';
export type { ThemeId, Gradients, Colors } from './colors';

// Typography
export {
    typography,
    typographyMobile,
    typographyTV,
    fontFamily,
    fontWeight,
    fontSizeMobile,
    fontSizeTV,
    lineHeight,
    letterSpacing,
    getTypography,
    getFontSize,
    textGlow,
} from './typography';
export type {
    Typography,
    TypographyMobile,
    TypographyTV,
    FontFamily,
    FontWeight,
    FontSizeMobile,
    FontSizeTV,
    LineHeight,
    LetterSpacing,
} from './typography';

// Spacing
export {
    spacing,
    spacingTV,
    screenPadding,
    cardSpacing,
    listSpacing,
    buttonSpacing,
    inputSpacing,
    headerSpacing,
    tabBarSpacing,
    modalSpacing,
    contentRowSpacing,
    playerSpacing,
    defaultInsets,
    layout,
    getSpacing,
    createPadding,
    createMargin,
} from './spacing';
export type {
    Spacing,
    SpacingTV,
    ScreenPadding,
    CardSpacing,
    ListSpacing,
    ButtonSpacing,
    InputSpacing,
    HeaderSpacing,
    TabBarSpacing,
    ModalSpacing,
    ContentRowSpacing,
    PlayerSpacing,
    Layout,
} from './spacing';

// Shadows
export {
    shadows,
    elevation,
    elevationTV,
    componentShadows,
    glowEffects,
    glowEffectsTV,
    shadowColors,
    getElevation,
    getGlowEffects,
    createShadow,
    combineShadows,
} from './shadows';
export type {
    Shadows,
    Elevation,
    ElevationTV,
    ComponentShadows,
    GlowEffects,
    GlowEffectsTV,
    ShadowColors,
} from './shadows';

// Sizes
export {
    borderRadius,
    borderRadiusTV,
    iconSize,
    iconSizeTV,
    buttonSize,
    inputSize,
    avatarSize,
    badgeSize,
    cardSize,
    headerSize,
    tabBarSize,
    sidebarSize,
    modalSize,
    touchTarget,
    playerSize,
    aspectRatio,
    screen,
    getBorderRadius,
    getIconSize,
    getCardSize,
    getResponsiveWidth,
    getResponsiveHeight,
    getGridColumns,
} from './sizes';
export type {
    BorderRadius,
    BorderRadiusTV,
    IconSize,
    IconSizeTV,
    ButtonSize,
    InputSize,
    AvatarSize,
    BadgeSize,
    CardSize,
    HeaderSize,
    TabBarSize,
    SidebarSize,
    ModalSize,
    TouchTarget,
    PlayerSize,
    AspectRatio,
} from './sizes';

// Icons
export {
    Icon,
    iconSizes,
    featureIcons,
} from './icons';
export type {
    IconName,
    IconProps,
    IconWeight,
} from './icons';

// Platform-aware scaling
const MOBILE_BASE = {
    width: 375,
    height: 812,
} as const;

const getMobileFactors = () => {
    const { width, height } = Dimensions.get('window');
    return {
        x: width / MOBILE_BASE.width,
        y: height / MOBILE_BASE.height,
    };
};

export const scaleX = (size: number): number => {
    if (Platform.isTV) return tvScaleX(size);
    const { x } = getMobileFactors();
    return Math.round(size * x);
};

export const scaleY = (size: number): number => {
    if (Platform.isTV) return tvScaleY(size);
    const { y } = getMobileFactors();
    return Math.round(size * y);
};

export const scale = (size: number): number => {
    if (Platform.isTV) return tvScale(size);
    const { x, y } = getMobileFactors();
    const factor = Math.min(x, y);
    return Math.round(size * factor);
};

export const scaleFont = (size: number): number => {
    if (Platform.isTV) return tvScaleFont(size);
    const { x, y } = getMobileFactors();
    const clamped = Math.max(0.9, Math.min(Math.min(x, y), 1.2));
    return Math.round(size * clamped);
};

export const scaleMin = (size: number, min: number): number => {
    if (Platform.isTV) return tvScaleMin(size, min);
    return Math.max(scale(size), min);
};

export const scaleMax = (size: number, max: number): number => {
    if (Platform.isTV) return tvScaleMax(size, max);
    return Math.min(scale(size), max);
};

export const scaleBounded = (size: number, min: number, max: number): number => {
    if (Platform.isTV) return tvScaleBounded(size, min, max);
    return Math.max(min, Math.min(scale(size), max));
};

export const widthPercent = (percent: number): number => {
    if (Platform.isTV) return tvWidthPercent(percent);
    const { width } = Dimensions.get('window');
    return Math.round((width * percent) / 100);
};

export const heightPercent = (percent: number): number => {
    if (Platform.isTV) return tvHeightPercent(percent);
    const { height } = Dimensions.get('window');
    return Math.round((height * percent) / 100);
};

export {
    TV_SAFE_AREA,
    getSafeAreaPadding,
    tvDimensions,
    tvTypography,
    focusDimensions,
    calculateGridColumns,
    calculateItemWidth,
    getRailLayout,
    currentResolution,
    scaleFactor,
    getResolutionDebugInfo,
};

// =============================================================================
// PROVIDERS / CONTEXT
// =============================================================================

export { ThemeProvider, useTheme, useThemeId } from './ThemeProvider';
export type { ThemeContextValue, ThemeProviderProps } from './ThemeProvider';

export { getTheme, isTV, theme, tvTheme } from './platformTheme';

// =============================================================================
// STYLE HELPERS
// =============================================================================

/**
 * Create a text style with color
 */
export const createTextStyle = (
    variant: keyof typeof typographyMobile,
    color: string = themeColors.textPrimary
) => {
    const { typography: platformTypography } = selectPlatformTokens();

    const variantStyle =
        (platformTypography as typeof typographyMobile)[variant] ?? typographyMobile[variant];

    return {
        ...variantStyle,
        color,
    };
};

/**
 * Create a card style with common properties
 */
export const createCardStyle = (elevated: boolean = false) => {
    const { borderRadius: platformBorderRadius, elevation: platformElevation } = selectPlatformTokens();

    return {
        backgroundColor: themeColors.cardBackground,
        borderRadius: platformBorderRadius.lg,
        borderWidth: 1,
        borderColor: themeColors.border,
        ...(elevated ? platformElevation.md : platformElevation.sm),
    };
};

/**
 * Create a button style
 */
export const createButtonStyle = (
    variant: 'primary' | 'secondary' | 'ghost' = 'primary',
    size: 'sm' | 'md' | 'lg' = 'md'
) => {
    const { spacing: platformSpacing, borderRadius: platformBorderRadius, elevation: platformElevation } = selectPlatformTokens();

    const baseStyle = {
        borderRadius: platformBorderRadius.lg,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
    };

    const sizeStyles = {
        sm: { height: 36, paddingHorizontal: platformSpacing.md },
        md: { height: 44, paddingHorizontal: platformSpacing.lg },
        lg: { height: 52, paddingHorizontal: platformSpacing.xl },
    };

    const variantStyles = {
        primary: {
            backgroundColor: themeColors.primary,
            ...platformElevation.sm,
        },
        secondary: {
            backgroundColor: themeColors.backgroundTertiary,
            borderWidth: 1,
            borderColor: themeColors.border,
        },
        ghost: {
            backgroundColor: 'transparent',
        },
    };

    return {
        ...baseStyle,
        ...sizeStyles[size],
        ...variantStyles[variant],
    };
};

/**
 * Create input field style
 */
export const createInputStyle = (focused: boolean = false, error: boolean = false) => {
    const { spacing: platformSpacing, borderRadius: platformBorderRadius, typography: platformTypography } = selectPlatformTokens();

    return {
        backgroundColor: themeColors.backgroundInput,
        borderRadius: platformBorderRadius.lg,
        borderWidth: 1,
        borderColor: error ? themeColors.error : focused ? themeColors.borderFocus : themeColors.border,
        paddingHorizontal: platformSpacing.base,
        paddingVertical: platformSpacing.md,
        color: themeColors.textPrimary,
        ...(platformTypography as typeof typographyMobile).input,
    };
};

// =============================================================================
// COMMON STYLE PRESETS
// =============================================================================

/**
 * Common style presets for quick access
 */
const platformPresetTokens = selectPlatformTokens();
const presetSpacing = platformPresetTokens.spacing;
const presetBorderRadius = platformPresetTokens.borderRadius;
export const stylePresets = {
    // Screen container
    screenContainer: {
        flex: 1,
        backgroundColor: themeColors.background,
    },

    // Safe area padding
    safeArea: {
        flex: 1,
        backgroundColor: themeColors.background,
    },

    // Content container with padding
    contentContainer: {
        flex: 1,
        paddingHorizontal: presetSpacing.base,
    },

    // Centered content
    centered: {
        flex: 1,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
    },

    // Row layout
    row: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
    },

    // Row with space between
    rowBetween: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        justifyContent: 'space-between' as const,
    },

    // Card base
    card: {
        backgroundColor: themeColors.cardBackground,
        borderRadius: presetBorderRadius.lg,
        borderWidth: 1,
        borderColor: themeColors.border,
        overflow: 'hidden' as const,
    },

    // Glass card
    glassCard: {
        backgroundColor: themeColors.glass,
        borderRadius: presetBorderRadius.lg,
        borderWidth: 1,
        borderColor: themeColors.borderMedium,
    },

    // Divider
    divider: {
        height: 1,
        backgroundColor: themeColors.divider,
    },

    // Section header
    sectionHeader: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        justifyContent: 'space-between' as const,
        paddingHorizontal: presetSpacing.base,
        marginBottom: presetSpacing.sm,
    },

    // Badge base
    badge: {
        paddingHorizontal: presetSpacing.xs,
        paddingVertical: presetSpacing.xxs,
        borderRadius: presetBorderRadius.sm,
    },

    // Absolute fill
    absoluteFill: {
        position: 'absolute' as const,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },

    // Shadow overlay (for gradients on images)
    shadowOverlay: {
        position: 'absolute' as const,
        left: 0,
        right: 0,
        bottom: 0,
    },
} as const;

// =============================================================================
// CONTENT TYPE HELPERS
// =============================================================================

/**
 * Get color for content type
 */
export const getContentTypeColor = (type: 'live' | 'movie' | 'series' | 'sports' | 'news' | 'kids') => {
    const colorMap = {
        live: themeColors.live,
        movie: themeColors.movies,
        series: themeColors.series,
        sports: themeColors.sports,
        news: themeColors.news,
        kids: themeColors.kids,
    };
    return colorMap[type] || themeColors.primary;
};

/**
 * Get glow color for content type
 */
export const getContentTypeGlow = (type: 'live' | 'movie' | 'series') => {
    const glowMap = {
        live: themeColors.liveGlow,
        movie: themeColors.moviesGlow,
        series: themeColors.seriesGlow,
    };
    return glowMap[type] || themeColors.liveGlow;
};

// =============================================================================
// QUALITY BADGE HELPERS
// =============================================================================

/**
 * Get color for quality badge
 */
export const getQualityColor = (quality: 'uhd' | '4k' | 'hd' | 'sd' | 'hdr') => {
    const qualityMap = {
        uhd: themeColors.qualityUHD,
        '4k': themeColors.qualityUHD,
        hd: themeColors.qualityHD,
        sd: themeColors.qualitySD,
        hdr: themeColors.primary,
    };
    return qualityMap[quality.toLowerCase() as keyof typeof qualityMap] || themeColors.qualitySD;
};

/**
 * Get quality label text
 */
export const getQualityLabel = (quality: string): string => {
    const labelMap: Record<string, string> = {
        uhd: '4K',
        '4k': '4K',
        hd: 'HD',
        fhd: 'FHD',
        sd: 'SD',
        hdr: 'HDR',
    };
    return labelMap[quality.toLowerCase()] || quality.toUpperCase();
};
