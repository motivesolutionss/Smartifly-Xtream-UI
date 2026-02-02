/**
 * Platform-aware theme builder.
 * Exposes helpers for both mobile and TV along with pre-computed themes.
 */

import { Platform } from 'react-native';
import { colors } from './colors';
import { typographyMobile, typographyTV } from './typography';
import { spacing, spacingTV } from './spacing';
import { elevation, elevationTV, glowEffects, glowEffectsTV } from './shadows';
import { borderRadius, borderRadiusTV, iconSize, iconSizeTV, cardSize } from './sizes';

export const isTV = Platform.isTV;

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

export const theme = getTheme(false);
export const tvTheme = getTheme(true);
