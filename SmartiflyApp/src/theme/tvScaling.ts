/**
 * Smartifly TV Scaling System
 * 
 * Professional TV resolution scaling utilities for multi-resolution support.
 * Designed for production TV applications following industry standards.
 * 
 * Base Design: 1920×1080 (Full HD)
 * - All dimensions are authored at FHD
 * - Scale factor applied for other resolutions
 * - Perfect 2× scaling for 4K (3840×2160)
 * 
 * Supported Resolutions:
 * - HD:   1280×720  (0.67× scale)
 * - FHD:  1920×1080 (1.0× scale - base)
 * - 4K:   3840×2160 (2.0× scale)
 * - 8K:   7680×4320 (4.0× scale - OS upscale)
 * 
 * @enterprise-grade
 */

import { Dimensions, PixelRatio, Platform } from 'react-native';

// =============================================================================
// RESOLUTION DETECTION
// =============================================================================

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * Base design dimensions (Full HD)
 * All UI is designed at this resolution and scaled appropriately
 */
export const BASE_DESIGN = {
    width: 1920,
    height: 1080,
} as const;

/**
 * TV Resolution tiers
 */
export type TVResolution = 'hd' | 'fhd' | '4k' | '8k';

/**
 * Detect current TV resolution tier
 */
export const detectResolution = (): TVResolution => {
    // Use the larger dimension (typically width in landscape TV)
    const maxDimension = Math.max(SCREEN_WIDTH, SCREEN_HEIGHT);

    if (maxDimension >= 7000) return '8k';
    if (maxDimension >= 3000) return '4k';
    if (maxDimension >= 1600) return 'fhd';
    return 'hd';
};

/**
 * Current detected resolution
 */
export const currentResolution = detectResolution();

/**
 * Scale factors for each resolution tier
 * Based on FHD (1920×1080) as 1.0×
 */
export const SCALE_FACTORS: Record<TVResolution, number> = {
    hd: 0.667,   // 1280/1920
    fhd: 1.0,    // Base
    '4k': 2.0,   // 3840/1920
    '8k': 4.0,   // 7680/1920 (OS upscaled)
};

/**
 * Get current scale factor based on screen resolution
 * Uses actual screen dimensions for precise scaling
 */
export const getScaleFactor = (): number => {
    // Calculate based on actual screen width relative to base design
    const widthScale = SCREEN_WIDTH / BASE_DESIGN.width;
    const heightScale = SCREEN_HEIGHT / BASE_DESIGN.height;

    // Use the smaller scale to ensure content fits
    return Math.min(widthScale, heightScale);
};

/**
 * Current scale factor
 */
export const scaleFactor = getScaleFactor();

// =============================================================================
// TV SAFE AREA (OVERSCAN-SAFE MARGINS)
// =============================================================================

/**
 * TV Safe Area Margins
 * 
 * Industry standard: 5% title-safe, 10% action-safe
 * We use 5% as default safe margin for modern TVs
 * Legacy TVs may need 10%
 */
export const TV_SAFE_AREA = {
    /** Safe margin percentage (5% of screen dimension) */
    marginPercent: 5,

    /** Title-safe zone (inner safe area for text/UI) */
    title: {
        horizontal: SCREEN_WIDTH * 0.05,
        vertical: SCREEN_HEIGHT * 0.05,
    },

    /** Action-safe zone (outer safe area for interactive elements) */
    action: {
        horizontal: SCREEN_WIDTH * 0.035,
        vertical: SCREEN_HEIGHT * 0.035,
    },

    /** Minimum margin for content (never go below this) */
    minimum: {
        horizontal: Math.max(SCREEN_WIDTH * 0.025, 32),
        vertical: Math.max(SCREEN_HEIGHT * 0.025, 18),
    },
} as const;

/**
 * Get safe area padding for screens
 */
export const getSafeAreaPadding = (type: 'title' | 'action' | 'minimum' = 'title') => ({
    paddingHorizontal: TV_SAFE_AREA[type].horizontal,
    paddingVertical: TV_SAFE_AREA[type].vertical,
});

// =============================================================================
// SCALING FUNCTIONS
// =============================================================================

/**
 * Scale a value based on screen width (horizontal scaling)
 * Use for horizontal dimensions like width, paddingHorizontal, marginLeft/Right
 * 
 * @param size - Size in base design pixels (FHD)
 * @returns Scaled size for current resolution
 */
export const scaleX = (size: number): number => {
    return Math.round(size * (SCREEN_WIDTH / BASE_DESIGN.width));
};

/**
 * Scale a value based on screen height (vertical scaling)
 * Use for vertical dimensions like height, paddingVertical, marginTop/Bottom
 * 
 * @param size - Size in base design pixels (FHD)
 * @returns Scaled size for current resolution
 */
export const scaleY = (size: number): number => {
    return Math.round(size * (SCREEN_HEIGHT / BASE_DESIGN.height));
};

/**
 * Scale a value uniformly (uses minimum of X/Y scale)
 * Use for elements that need to maintain aspect ratio (icons, logos, border-radius)
 * 
 * @param size - Size in base design pixels (FHD)
 * @returns Scaled size for current resolution
 */
export const scale = (size: number): number => {
    return Math.round(size * scaleFactor);
};

/**
 * Scale font size for TV
 * Uses moderate scaling to prevent text from becoming too large on 4K
 * 
 * @param size - Font size in base design pixels (FHD)
 * @returns Scaled font size
 */
export const scaleFont = (size: number): number => {
    const scaled = size * scaleFactor;
    // Apply a dampening factor for very high resolutions
    // to prevent text from becoming too large
    const dampening = scaleFactor > 1.5 ? 0.85 : 1;
    return Math.round(scaled * dampening);
};

/**
 * Scale with minimum value (ensures visibility on smaller screens)
 * 
 * @param size - Size in base design pixels (FHD)
 * @param min - Minimum size to return
 * @returns Scaled size, not less than min
 */
export const scaleMin = (size: number, min: number): number => {
    return Math.max(scale(size), min);
};

/**
 * Scale with maximum value (prevents oversizing on larger screens)
 * 
 * @param size - Size in base design pixels (FHD)
 * @param max - Maximum size to return
 * @returns Scaled size, not more than max
 */
export const scaleMax = (size: number, max: number): number => {
    return Math.min(scale(size), max);
};

/**
 * Scale with bounds (min and max)
 * 
 * @param size - Size in base design pixels (FHD)
 * @param min - Minimum size
 * @param max - Maximum size
 * @returns Scaled size within bounds
 */
export const scaleBounded = (size: number, min: number, max: number): number => {
    return Math.max(min, Math.min(scale(size), max));
};

// =============================================================================
// PERCENTAGE-BASED DIMENSIONS
// =============================================================================

/**
 * Get width as percentage of screen
 * 
 * @param percent - Percentage (0-100)
 * @returns Width in pixels
 */
export const widthPercent = (percent: number): number => {
    return Math.round((SCREEN_WIDTH * percent) / 100);
};

/**
 * Get height as percentage of screen
 * 
 * @param percent - Percentage (0-100)
 * @returns Height in pixels
 */
export const heightPercent = (percent: number): number => {
    return Math.round((SCREEN_HEIGHT * percent) / 100);
};

// =============================================================================
// TV-SPECIFIC LAYOUT HELPERS
// =============================================================================

/**
 * Calculate grid columns that fit based on item width and gap
 * 
 * @param itemWidth - Width of each grid item (in FHD design pixels)
 * @param gap - Gap between items (in FHD design pixels)
 * @returns Number of columns that fit
 */
export const calculateGridColumns = (itemWidth: number, gap: number): number => {
    const safeWidth = SCREEN_WIDTH - (TV_SAFE_AREA.title.horizontal * 2);
    const scaledItemWidth = scale(itemWidth);
    const scaledGap = scale(gap);

    return Math.floor((safeWidth + scaledGap) / (scaledItemWidth + scaledGap));
};

/**
 * Calculate optimal item width for a given number of columns
 * 
 * @param columns - Desired number of columns
 * @param gap - Gap between items (in FHD design pixels)
 * @returns Item width in pixels
 */
export const calculateItemWidth = (columns: number, gap: number): number => {
    const safeWidth = SCREEN_WIDTH - (TV_SAFE_AREA.title.horizontal * 2);
    const scaledGap = scale(gap);
    const totalGaps = (columns - 1) * scaledGap;

    return Math.floor((safeWidth - totalGaps) / columns);
};

/**
 * Get horizontal rail/row layout dimensions
 */
export const getRailLayout = (itemWidth: number, gap: number) => {
    const scaledWidth = scale(itemWidth);
    const scaledGap = scale(gap);

    return {
        itemWidth: scaledWidth,
        gap: scaledGap,
        paddingHorizontal: TV_SAFE_AREA.title.horizontal,
        // How many items are fully visible
        visibleItems: Math.floor(
            (SCREEN_WIDTH - TV_SAFE_AREA.title.horizontal * 2) / (scaledWidth + scaledGap)
        ),
    };
};

// =============================================================================
// TV FOCUS DIMENSIONS
// =============================================================================

/**
 * Focus indicator dimensions (glow, border)
 */
export const focusDimensions = {
    /** Border width when focused */
    borderWidth: scale(3),
    /** Glow spread radius */
    glowRadius: scale(15),
    /** Scale transform on focus */
    scaleTransform: 1.02,
    /** Minimum touch target size */
    minTouchTarget: scale(64),
};

// =============================================================================
// TV COMPONENT DIMENSIONS (Pre-calculated)
// =============================================================================

/**
 * Pre-calculated dimensions for common TV components
 * All values designed at FHD and automatically scaled
 */
export const tvDimensions = {
    // Navigation
    sidebarCollapsed: scale(80),
    sidebarExpanded: scale(280),
    headerHeight: scale(80),

    // Content Cards
    posterCard: {
        width: scale(180),
        height: scale(270),
        borderRadius: scale(12),
    },
    thumbnailCard: {
        width: scale(320),
        height: scale(180),
        borderRadius: scale(12),
    },
    channelCard: {
        width: scale(200),
        height: scale(120),
        borderRadius: scale(12),
    },
    featuredCard: {
        width: widthPercent(80),
        height: scale(450),
        borderRadius: scale(20),
    },

    // Inputs
    inputHeight: scale(72),
    buttonHeight: scale(72),
    buttonHeightSmall: scale(56),

    // Icons
    iconSmall: scale(24),
    iconMedium: scale(32),
    iconLarge: scale(48),
    iconXLarge: scale(64),

    // Logo
    logoSize: scale(160),

    // Spacing
    screenPadding: TV_SAFE_AREA.title.horizontal,
    sectionGap: scale(48),
    itemGap: scale(24),

    // Player
    controlBarHeight: scale(120),
    progressBarHeight: scale(6),
    seekButtonSize: scale(64),
};

// =============================================================================
// TYPOGRAPHY SCALING
// =============================================================================

/**
 * Scaled typography for TV
 * Designed at FHD, automatically scaled for other resolutions
 */
export const tvTypography = {
    // Display (Hero/Splash)
    displayLarge: scaleFont(56),
    displayMedium: scaleFont(48),
    displaySmall: scaleFont(40),

    // Headings
    h1: scaleFont(36),
    h2: scaleFont(32),
    h3: scaleFont(28),
    h4: scaleFont(24),

    // Body
    bodyLarge: scaleFont(22),
    body: scaleFont(20),
    bodySmall: scaleFont(18),

    // Labels
    labelLarge: scaleFont(20),
    labelMedium: scaleFont(18),
    labelSmall: scaleFont(16),

    // Caption
    caption: scaleFont(16),
    captionSmall: scaleFont(14),

    // Input
    input: scaleFont(22),

    // Button
    button: scaleFont(22),
    buttonSmall: scaleFont(18),
};

// =============================================================================
// DEBUG UTILITIES
// =============================================================================

/**
 * Get debug info about current TV resolution setup
 */
export const getResolutionDebugInfo = () => ({
    screenWidth: SCREEN_WIDTH,
    screenHeight: SCREEN_HEIGHT,
    resolution: currentResolution,
    scaleFactor,
    pixelRatio: PixelRatio.get(),
    isTV: Platform.isTV,
    safeArea: TV_SAFE_AREA,
    baseDesign: BASE_DESIGN,
});

/**
 * Log resolution debug info to console
 */
export const logResolutionInfo = () => {
    if (__DEV__) {
        console.log('[TV Scaling] Resolution Info:', JSON.stringify(getResolutionDebugInfo(), null, 2));
    }
};

// =============================================================================
// EXPORTS
// =============================================================================

export default {
    // Resolution
    currentResolution,
    scaleFactor,
    detectResolution,
    getScaleFactor,

    // Safe Area
    TV_SAFE_AREA,
    getSafeAreaPadding,

    // Scaling Functions
    scale,
    scaleX,
    scaleY,
    scaleFont,
    scaleMin,
    scaleMax,
    scaleBounded,

    // Percentages
    widthPercent,
    heightPercent,

    // Layout Helpers
    calculateGridColumns,
    calculateItemWidth,
    getRailLayout,

    // Pre-calculated
    focusDimensions,
    tvDimensions,
    tvTypography,

    // Debug
    getResolutionDebugInfo,
    logResolutionInfo,
};
