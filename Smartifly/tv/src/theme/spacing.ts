/**
 * Smartifly Android TV spacing tokens.
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

export const spacing = spacingTV;

export const screenPadding = {
    horizontal: spacingTV.xl,
    vertical: spacingTV.xl,
    top: spacingTV.xxl,
    bottom: spacingTV.xxl,
} as const;

export const cardSpacing = {
    padding: spacingTV.lg,
    paddingSmall: spacingTV.md,
    gap: spacingTV.md,
    marginBottom: spacingTV.lg,
} as const;

export const listSpacing = {
    itemGap: spacingTV.md,
    rowGap: spacingTV.lg,
    sectionGap: spacingTV.xxl,
    headerMargin: spacingTV.lg,
} as const;

export const buttonSpacing = {
    paddingHorizontal: spacingTV.xl,
    paddingVertical: spacingTV.lg,
    paddingHorizontalSmall: spacingTV.lg,
    paddingVerticalSmall: spacingTV.md,
    iconGap: spacingTV.md,
} as const;

export const inputSpacing = {
    paddingHorizontal: spacingTV.lg,
    paddingVertical: spacingTV.base,
    iconPadding: spacingTV.lg,
    labelMargin: spacingTV.sm,
    helperMargin: spacingTV.xs,
} as const;

export const headerSpacing = {
    height: 80,
    paddingHorizontal: spacingTV.xl,
    iconSize: 32,
    titleGap: spacingTV.lg,
} as const;

export const NavigationBarSpacing = {
    height: 80,
    paddingBottom: spacingTV.sm,
    iconSize: 32,
    labelMargin: spacingTV.xs,
} as const;

export const modalSpacing = {
    padding: spacingTV.xxl,
    borderRadius: 24,
    headerMargin: spacingTV.lg,
    contentGap: spacingTV.lg,
    footerMargin: spacingTV.xl,
} as const;

export const contentRowSpacing = {
    titleMarginBottom: spacingTV.md,
    itemGap: spacingTV.md,
    paddingHorizontal: spacingTV.xl,
    sectionMarginBottom: spacingTV.xxl,
} as const;

export const playerSpacing = {
    controlsHeight: 120,
    controlsPadding: spacingTV.xl,
    buttonSize: 64,
    buttonGap: spacingTV.xl,
    progressHeight: 6,
    progressHitSlop: spacingTV.lg,
} as const;

export const defaultInsetsTV = {
    top: 40,
    bottom: 40,
    left: 40,
    right: 40,
} as const;

export const defaultInsets = defaultInsetsTV;

export const getDefaultInsets = () => defaultInsetsTV;

export const getSpacing = () => spacingTV;

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

export const layout = {
    containerPadded: {
        paddingHorizontal: spacingTV.base,
    },
    row: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
    },
    column: {
        flexDirection: 'column' as const,
    },
    center: {
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
    },
    spaceBetween: {
        flexDirection: 'row' as const,
        justifyContent: 'space-between' as const,
        alignItems: 'center' as const,
    },
    fill: {
        flex: 1,
    },
    absoluteFill: {
        position: 'absolute' as const,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
} as const;

export type Spacing = typeof spacing;
export type SpacingTV = typeof spacingTV;
export type ScreenPadding = typeof screenPadding;
export type CardSpacing = typeof cardSpacing;
export type ListSpacing = typeof listSpacing;
export type ButtonSpacing = typeof buttonSpacing;
export type InputSpacing = typeof inputSpacing;
export type HeaderSpacing = typeof headerSpacing;
export type NavigationBarSpacingTokens = typeof NavigationBarSpacing;
export type NavigationBarSpacing = typeof NavigationBarSpacing;
export type ModalSpacing = typeof modalSpacing;
export type ContentRowSpacing = typeof contentRowSpacing;
export type PlayerSpacing = typeof playerSpacing;
export type Layout = typeof layout;
