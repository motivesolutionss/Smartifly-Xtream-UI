/**
 * Mobile theme builder.
 */

import { colors } from './colors';
import { typographyMobile } from './typography';
import { spacing } from './spacing';
import { elevation, glowEffects } from './shadows';
import { borderRadius, iconSize, cardSize } from './sizes';

export const getTheme = () => ({
    colors,
    typography: typographyMobile,
    spacing,
    elevation,
    glowEffects,
    borderRadius,
    iconSize,
    cardSize: cardSize.mobile,
});

export const theme = getTheme();
