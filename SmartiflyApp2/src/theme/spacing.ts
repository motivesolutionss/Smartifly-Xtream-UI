/**
 * Smartifly Design System - Spacing
 * 
 * Consistent spacing scale based on 4px base unit.
 * Includes padding, margins, gaps, and specific component spacing.
 */

// =============================================================================
// BASE SPACING SCALE
// =============================================================================

/**
 * Core spacing scale (4px base)
 * Usage: spacing.md, spacing.lg, etc.
 */
export const spacing = {
    /** 0px - No spacing */
    none: 0,
    /** 2px - Hairline spacing */
    hairline: 2,
    /** 4px - Extra extra small */
    xxs: 4,
    /** 6px - Extra small */
    xs: 6,
    /** 8px - Small */
    sm: 8,
    /** 12px - Medium small */
    md: 12,
    /** 16px - Medium (base) */
    base: 16,
    /** 20px - Medium large */
    lg: 20,
    /** 24px - Large */
    xl: 24,
    /** 32px - Extra large */
    xxl: 32,
    /** 40px - 2X Extra large */
    '3xl': 40,
    /** 48px - 3X Extra large */
    '4xl': 48,
    /** 64px - 4X Extra large */
    '5xl': 64,
    /** 80px - 5X Extra large */
    '6xl': 80,
    /** 96px - 6X Extra large */
    '7xl': 96,
} as const;

// =============================================================================
// TV SPACING SCALE (Larger for 10-foot UI)
// =============================================================================

/**
 * TV spacing scale - Everything larger for viewing distance
 */
export const spacingTV = {
    none: 0,
    hairline: 4,
    xxs: 8,
    xs: 12,
    sm: 16,
    md: 20,
    base: 24,
    lg: 32,
    xl: 40,
    xxl: 48,
    '3xl': 64,
    '4xl': 80,
    '5xl': 96,
    '6xl': 120,
    '7xl': 144,
} as const;

// =============================================================================
// COMPONENT-SPECIFIC SPACING
// =============================================================================

/**
 * Screen/Container padding
 */
export const screenPadding = {
    mobile: {
        horizontal: spacing.base,
        vertical: spacing.base,
        top: spacing.lg,
        bottom: spacing.xxl,
    },
    tv: {
        horizontal: spacingTV.xl,
        vertical: spacingTV.xl,
        top: spacingTV.xxl,
        bottom: spacingTV.xxl,
    },
} as const;

/**
 * Card spacing
 */
export const cardSpacing = {
    mobile: {
        padding: spacing.md,
        paddingSmall: spacing.sm,
        gap: spacing.sm,
        marginBottom: spacing.md,
    },
    tv: {
        padding: spacingTV.lg,
        paddingSmall: spacingTV.md,
        gap: spacingTV.md,
        marginBottom: spacingTV.lg,
    },
} as const;

/**
 * List/Grid spacing
 */
export const listSpacing = {
    mobile: {
        itemGap: spacing.sm,
        rowGap: spacing.md,
        sectionGap: spacing.xl,
        headerMargin: spacing.md,
    },
    tv: {
        itemGap: spacingTV.md,
        rowGap: spacingTV.lg,
        sectionGap: spacingTV.xxl,
        headerMargin: spacingTV.lg,
    },
} as const;

/**
 * Button spacing
 */
export const buttonSpacing = {
    mobile: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        paddingHorizontalSmall: spacing.md,
        paddingVerticalSmall: spacing.sm,
        iconGap: spacing.sm,
    },
    tv: {
        paddingHorizontal: spacingTV.xl,
        paddingVertical: spacingTV.lg,
        paddingHorizontalSmall: spacingTV.lg,
        paddingVerticalSmall: spacingTV.md,
        iconGap: spacingTV.md,
    },
} as const;

/**
 * Input spacing
 */
export const inputSpacing = {
    mobile: {
        paddingHorizontal: spacing.base,
        paddingVertical: spacing.md,
        iconPadding: spacing.md,
        labelMargin: spacing.xs,
        helperMargin: spacing.xxs,
    },
    tv: {
        paddingHorizontal: spacingTV.lg,
        paddingVertical: spacingTV.base,
        iconPadding: spacingTV.lg,
        labelMargin: spacingTV.sm,
        helperMargin: spacingTV.xs,
    },
} as const;

/**
 * Header spacing
 */
export const headerSpacing = {
    mobile: {
        height: 56,
        paddingHorizontal: spacing.base,
        iconSize: 24,
        titleGap: spacing.md,
    },
    tv: {
        height: 80,
        paddingHorizontal: spacingTV.xl,
        iconSize: 32,
        titleGap: spacingTV.lg,
    },
} as const;

/**
 * Tab bar spacing
 */
export const tabBarSpacing = {
    mobile: {
        height: 56,
        paddingBottom: spacing.xs,
        iconSize: 24,
        labelMargin: spacing.xxs,
    },
    tv: {
        height: 80,
        paddingBottom: spacingTV.sm,
        iconSize: 32,
        labelMargin: spacingTV.xs,
    },
} as const;

/**
 * Modal spacing
 */
export const modalSpacing = {
    mobile: {
        padding: spacing.lg,
        borderRadius: 16,
        headerMargin: spacing.base,
        contentGap: spacing.md,
        footerMargin: spacing.lg,
    },
    tv: {
        padding: spacingTV.xxl,
        borderRadius: 24,
        headerMargin: spacingTV.lg,
        contentGap: spacingTV.lg,
        footerMargin: spacingTV.xl,
    },
} as const;

/**
 * Content row spacing (horizontal scrolling sections)
 */
export const contentRowSpacing = {
    mobile: {
        titleMarginBottom: spacing.sm,
        itemGap: spacing.sm,
        paddingHorizontal: spacing.base,
        sectionMarginBottom: spacing.xl,
    },
    tv: {
        titleMarginBottom: spacingTV.md,
        itemGap: spacingTV.md,
        paddingHorizontal: spacingTV.xl,
        sectionMarginBottom: spacingTV.xxl,
    },
} as const;

/**
 * Player controls spacing
 */
export const playerSpacing = {
    mobile: {
        controlsHeight: 80,
        controlsPadding: spacing.base,
        buttonSize: 48,
        buttonGap: spacing.lg,
        progressHeight: 4,
        progressHitSlop: spacing.md,
    },
    tv: {
        controlsHeight: 120,
        controlsPadding: spacingTV.xl,
        buttonSize: 64,
        buttonGap: spacingTV.xl,
        progressHeight: 6,
        progressHitSlop: spacingTV.lg,
    },
} as const;

// =============================================================================
// INSETS (Safe Area)
// =============================================================================

/**
 * Default safe area insets (can be overridden by device)
 */
export const defaultInsets = {
    top: 44,
    bottom: 34,
    left: 0,
    right: 0,
} as const;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get spacing value based on platform
 */
export const getSpacing = (isTV: boolean) => {
    return isTV ? spacingTV : spacing;
};

/**
 * Create consistent padding object
 */
export const createPadding = (
    top: number,
    right?: number,
    bottom?: number,
    left?: number
) => ({
    paddingTop: top,
    paddingRight: right ?? top,
    paddingBottom: bottom ?? top,
    paddingLeft: left ?? right ?? top,
});

/**
 * Create consistent margin object
 */
export const createMargin = (
    top: number,
    right?: number,
    bottom?: number,
    left?: number
) => ({
    marginTop: top,
    marginRight: right ?? top,
    marginBottom: bottom ?? top,
    marginLeft: left ?? right ?? top,
});

// =============================================================================
// LAYOUT HELPERS
// =============================================================================

/**
 * Common layout patterns
 */
export const layout = {
    /** Full width with horizontal padding */
    containerPadded: {
        paddingHorizontal: spacing.base,
    },
    /** Row with centered items and gap */
    row: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
    },
    /** Column with gap */
    column: {
        flexDirection: 'column' as const,
    },
    /** Centered content */
    center: {
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
    },
    /** Space between items */
    spaceBetween: {
        flexDirection: 'row' as const,
        justifyContent: 'space-between' as const,
        alignItems: 'center' as const,
    },
    /** Fill available space */
    fill: {
        flex: 1,
    },
    /** Absolute fill */
    absoluteFill: {
        position: 'absolute' as const,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
} as const;

// Type exports
export type Spacing = typeof spacing;
export type SpacingTV = typeof spacingTV;
export type ScreenPadding = typeof screenPadding;
export type CardSpacing = typeof cardSpacing;
export type ListSpacing = typeof listSpacing;
export type ButtonSpacing = typeof buttonSpacing;
export type InputSpacing = typeof inputSpacing;
export type HeaderSpacing = typeof headerSpacing;
export type TabBarSpacing = typeof tabBarSpacing;
export type ModalSpacing = typeof modalSpacing;
export type ContentRowSpacing = typeof contentRowSpacing;
export type PlayerSpacing = typeof playerSpacing;
export type Layout = typeof layout;