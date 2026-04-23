/**
 * Android TV theme builder.
 */

import { colors } from './colors';
import { typographyTV } from './typography';
import { spacingTV } from './spacing';
import { elevationTV, glowEffectsTV } from './shadows';
import { borderRadiusTV, iconSizeTV, cardSize } from './sizes';

export const isTV = true;

export const getTheme = () => {
    return {
        colors,
        typography: typographyTV,
        spacing: spacingTV,
        elevation: elevationTV,
        glowEffects: glowEffectsTV,
        borderRadius: borderRadiusTV,
        iconSize: iconSizeTV,
        cardSize,
        isTV: true,
    };
};

export const theme = getTheme();
export const tvTheme = getTheme();
