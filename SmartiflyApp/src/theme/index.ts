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

// Colors
export {
    colors,
    activeTheme,
    gradients,
    qualityColors,
} from './colors';

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

// Icons
export {
    Icon,
    iconSizes,
    featureIcons,
} from './icons';

// TV Scaling (Resolution-aware scaling for TV platform)
export {
    scale,
    scaleX,
    scaleY,
    scaleFont,
    scaleMin,
    scaleMax,
    scaleBounded,
    widthPercent,
    heightPercent,
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

// Re-export types
export type {
    Colors,
    BrandColors,
    BackgroundColors,
    TextColors,
    SemanticColors,
    ContentColors,
    UIColors,
    GlassColors,
    Gradients,
    QualityColors,
} from './colors';

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

export type {
    Shadows,
    Elevation,
    ElevationTV,
    ComponentShadows,
    GlowEffects,
    GlowEffectsTV,
    ShadowColors,
} from './shadows';

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

export type {
    IconName,
    IconProps,
    IconWeight,
} from './icons';

// =============================================================================
// PLATFORM-AWARE THEME HELPER
// =============================================================================

import { Platform } from 'react-native';
import { colors } from './colors';
import { typographyMobile, typographyTV } from './typography';
import { spacing, spacingTV } from './spacing';
import { elevation, elevationTV, glowEffects, glowEffectsTV } from './shadows';
import { borderRadius, borderRadiusTV, iconSize, iconSizeTV, cardSize } from './sizes';

/**
 * Check if running on TV platform
 */
export const isTV = Platform.isTV;

/**
 * Get complete theme object based on platform
 * This provides a single import for all theme values
 */
export const getTheme = (forceTV?: boolean) => {
    const isTVPlatform = forceTV ?? isTV;

    return {
        colors,
        typography: isTVPlatform ? typographyTV : typographyMobile,
        spacing: isTVPlatform ? spacingTV : spacing,
        elevation: isTVPlatform ? elevationTV : elevation,
        glowEffects: isTVPlatform ? glowEffectsTV : glowEffects,
        borderRadius: isTVPlatform ? borderRadiusTV : borderRadius,
        iconSize: isTVPlatform ? iconSizeTV : iconSize,
        cardSize: isTVPlatform ? cardSize.tv : cardSize.mobile,
        isTV: isTVPlatform,
    };
};

/**
 * Default theme for mobile
 */
export const theme = getTheme(false);

/**
 * TV theme
 */
export const tvTheme = getTheme(true);

// =============================================================================
// STYLE HELPERS
// =============================================================================

/**
 * Create a text style with color
 */
export const createTextStyle = (
    variant: keyof typeof typographyMobile,
    color: string = colors.textPrimary
) => ({
    ...typographyMobile[variant],
    color,
});

/**
 * Create a card style with common properties
 */
export const createCardStyle = (elevated: boolean = false) => ({
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...(elevated ? elevation.md : elevation.sm),
});

/**
 * Create a button style
 */
export const createButtonStyle = (
    variant: 'primary' | 'secondary' | 'ghost' = 'primary',
    size: 'sm' | 'md' | 'lg' = 'md'
) => {
    const baseStyle = {
        borderRadius: borderRadius.lg,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
    };

    const sizeStyles = {
        sm: { height: 36, paddingHorizontal: spacing.md },
        md: { height: 44, paddingHorizontal: spacing.lg },
        lg: { height: 52, paddingHorizontal: spacing.xl },
    };

    const variantStyles = {
        primary: {
            backgroundColor: colors.primary,
            ...elevation.sm,
        },
        secondary: {
            backgroundColor: colors.backgroundTertiary,
            borderWidth: 1,
            borderColor: colors.border,
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
export const createInputStyle = (focused: boolean = false, error: boolean = false) => ({
    backgroundColor: colors.backgroundInput,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: error ? colors.error : focused ? colors.borderFocus : colors.border,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    color: colors.textPrimary,
    ...typographyMobile.input,
});

// =============================================================================
// COMMON STYLE PRESETS
// =============================================================================

/**
 * Common style presets for quick access
 */
export const stylePresets = {
    // Screen container
    screenContainer: {
        flex: 1,
        backgroundColor: colors.background,
    },

    // Safe area padding
    safeArea: {
        flex: 1,
        backgroundColor: colors.background,
    },

    // Content container with padding
    contentContainer: {
        flex: 1,
        paddingHorizontal: spacing.base,
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
        backgroundColor: colors.cardBackground,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: 'hidden' as const,
    },

    // Glass card
    glassCard: {
        backgroundColor: colors.glass,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.borderMedium,
    },

    // Divider
    divider: {
        height: 1,
        backgroundColor: colors.divider,
    },

    // Section header
    sectionHeader: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        justifyContent: 'space-between' as const,
        paddingHorizontal: spacing.base,
        marginBottom: spacing.sm,
    },

    // Badge base
    badge: {
        paddingHorizontal: spacing.xs,
        paddingVertical: spacing.xxs,
        borderRadius: borderRadius.sm,
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
        live: colors.live,
        movie: colors.movies,
        series: colors.series,
        sports: colors.sports,
        news: colors.news,
        kids: colors.kids,
    };
    return colorMap[type] || colors.primary;
};

/**
 * Get glow color for content type
 */
export const getContentTypeGlow = (type: 'live' | 'movie' | 'series') => {
    const glowMap = {
        live: colors.liveGlow,
        movie: colors.moviesGlow,
        series: colors.seriesGlow,
    };
    return glowMap[type] || colors.liveGlow;
};

// =============================================================================
// QUALITY BADGE HELPERS
// =============================================================================

/**
 * Get color for quality badge
 */
export const getQualityColor = (quality: 'uhd' | '4k' | 'hd' | 'sd' | 'hdr') => {
    const qualityMap = {
        uhd: colors.qualityUHD,
        '4k': colors.qualityUHD,
        hd: colors.qualityHD,
        sd: colors.qualitySD,
        hdr: colors.primary,
    };
    return qualityMap[quality.toLowerCase() as keyof typeof qualityMap] || colors.qualitySD;
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