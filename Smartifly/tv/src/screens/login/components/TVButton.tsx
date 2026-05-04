/**
 * Smartifly TV Button Component - Clean Edition
 *
 * TV-optimized button with:
 * - Focus states with glow effects
 * - Scale animations
 * - Loading states
 * - Multiple variants (primary, secondary, outline, ghost)
 * - Icon support
 */

import React, { useCallback } from 'react';
import {
    Pressable,
    Text,
    StyleSheet,
    ViewStyle,
    TextStyle,
    ActivityIndicator,
    View,
} from 'react-native';
import Animated, {
    createAnimatedComponent,
    interpolate,
    interpolateColor,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from 'react-native-reanimated';
import {
    colors,
    Icon,
    scale,
    scaleFont,
    useTheme,
} from '../.././../theme';

export type TVButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'accent';
export type TVButtonSize = 'medium' | 'large';

export interface TVButtonProps {
    title: string;
    onPress: () => void;
    variant?: TVButtonVariant;
    size?: TVButtonSize;
    loading?: boolean;
    disabled?: boolean;
    leftIcon?: string;
    rightIcon?: string;
    style?: ViewStyle;
    textStyle?: TextStyle;
    hasTVPreferredFocus?: boolean;
    accessibilityLabel?: string;
}

const AnimatedPressable = createAnimatedComponent(Pressable);
const BUTTON_BORDER_WIDTH = scale(2);
const BUTTON_SHADOW_RADIUS = scale(12);
const BUTTON_GLOW_RADIUS = scale(16);
const BUTTON_SHADOW_OFFSET_Y = scale(4);

const TVButton: React.FC<TVButtonProps> = ({
    title,
    onPress,
    variant = 'primary',
    size = 'large',
    loading = false,
    disabled = false,
    leftIcon,
    rightIcon,
    style,
    textStyle,
    hasTVPreferredFocus = false,
    accessibilityLabel,
}) => {
    const { colors: themeColors } = useTheme();
    const focusProgress = useSharedValue(0);
    const pressProgress = useSharedValue(0);
    const scaleProgress = useSharedValue(1);

    const handleFocus = useCallback(() => {
        focusProgress.value = withTiming(1, { duration: 160 });
        scaleProgress.value = withSpring(1.05, { damping: 16, stiffness: 220, mass: 0.65 });
    }, [focusProgress, scaleProgress]);

    const handleBlur = useCallback(() => {
        focusProgress.value = withTiming(0, { duration: 160 });
        pressProgress.value = withTiming(0, { duration: 90 });
        scaleProgress.value = withSpring(1, { damping: 16, stiffness: 220, mass: 0.65 });
    }, [focusProgress, pressProgress, scaleProgress]);

    const handlePressIn = useCallback(() => {
        pressProgress.value = withTiming(1, { duration: 70 });
    }, [pressProgress]);

    const handlePressOut = useCallback(() => {
        pressProgress.value = withTiming(0, { duration: 90 });
    }, [pressProgress]);

    const isDisabled = disabled || loading;
    const accentColor = colors.accent || '#00E5FF';

    const getVariantStyles = (): { container: ViewStyle; text: TextStyle; shadowColor: string } => {
        switch (variant) {
            case 'primary':
                return {
                    container: {
                        backgroundColor: isDisabled ? `${themeColors.primary}66` : themeColors.primary,
                        shadowColor: themeColors.primary,
                        shadowOpacity: 0,
                        elevation: 0,
                    },
                    text: {
                        color: isDisabled ? `${themeColors.textOnPrimary}80` : themeColors.textOnPrimary,
                    },
                    shadowColor: themeColors.primary,
                };
            case 'secondary':
                return {
                    container: {
                        backgroundColor: isDisabled ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.1)',
                        shadowColor: accentColor,
                    },
                    text: {
                        color: isDisabled ? 'rgba(255, 255, 255, 0.4)' : '#FFF',
                    },
                    shadowColor: accentColor,
                };
            case 'outline':
                return {
                    container: {
                        backgroundColor: 'transparent',
                        borderWidth: BUTTON_BORDER_WIDTH,
                        borderColor: isDisabled ? 'rgba(0, 229, 255, 0.3)' : accentColor,
                        shadowColor: 'transparent',
                        shadowOpacity: 0,
                        elevation: 0,
                    },
                    text: {
                        color: isDisabled ? 'rgba(0, 229, 255, 0.5)' : accentColor,
                    },
                    shadowColor: 'transparent',
                };
            case 'ghost':
                return {
                    container: {
                        backgroundColor: 'transparent',
                        shadowColor: 'transparent',
                    },
                    text: {
                        color: isDisabled ? 'rgba(255, 255, 255, 0.4)' : accentColor,
                    },
                    shadowColor: 'transparent',
                };
            case 'accent':
                return {
                    container: {
                        backgroundColor: isDisabled ? 'rgba(0, 229, 255, 0.4)' : accentColor,
                        shadowColor: accentColor,
                        shadowOpacity: 0,
                        elevation: 0,
                    },
                    text: {
                        color: isDisabled ? 'rgba(0, 0, 0, 0.5)' : '#000000',
                    },
                    shadowColor: accentColor,
                };
            default:
                return { container: {}, text: {}, shadowColor: accentColor };
        }
    };

    const getSizeStyles = (): { container: ViewStyle; text: TextStyle; iconSize: number } => {
        switch (size) {
            case 'medium':
                return {
                    container: {
                        paddingVertical: scale(18),
                        paddingHorizontal: scale(36),
                        minHeight: scale(60),
                    },
                    text: { fontSize: scaleFont(18) },
                    iconSize: scale(22),
                };
            case 'large':
            default:
                return {
                    container: {
                        paddingVertical: scale(22),
                        paddingHorizontal: scale(48),
                        minHeight: scale(72),
                    },
                    text: { fontSize: scaleFont(22) },
                    iconSize: scale(26),
                };
        }
    };

    const variantStyles = getVariantStyles();
    const sizeStyles = getSizeStyles();

    const scaleContainerStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scaleProgress.value }],
    }));

    const pressableAnimatedStyle = useAnimatedStyle(() => {
        const visual = Math.max(focusProgress.value, pressProgress.value);

        return {
            borderWidth: interpolate(visual, [0, 1], [0, BUTTON_BORDER_WIDTH]),
            borderColor: interpolateColor(visual, [0, 1], ['rgba(255,255,255,0)', '#FFFFFF']),
            shadowOpacity: interpolate(visual, [0, 1], [0, 0.4]),
            shadowRadius: interpolate(visual, [0, 1], [0, BUTTON_SHADOW_RADIUS]),
            elevation: visual > 0 ? 4 : 0,
        };
    });

    const glowContainerStyle = useAnimatedStyle(() => ({
        opacity: variant === 'primary' ? interpolate(focusProgress.value, [0, 1], [0, 0.3]) : 0,
    }));

    return (
        <View>
            <Animated.View style={[styles.glowContainer, glowContainerStyle]} pointerEvents="none">
                <View
                    style={[
                        styles.glow,
                        styles.glowTransparent,
                        {
                            shadowColor: variantStyles.shadowColor,
                            shadowRadius: BUTTON_GLOW_RADIUS,
                        },
                    ]}
                />
            </Animated.View>

            <Animated.View style={[styles.scaleContainer, scaleContainerStyle]}>
                <AnimatedPressable
                    onPress={onPress}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    onPressIn={handlePressIn}
                    onPressOut={handlePressOut}
                    disabled={isDisabled}
                    accessibilityLabel={accessibilityLabel || title}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: isDisabled }}
                    hasTVPreferredFocus={hasTVPreferredFocus}
                    style={[
                        styles.container,
                        sizeStyles.container,
                        variantStyles.container,
                        pressableAnimatedStyle,
                        {
                            shadowColor: variantStyles.shadowColor,
                            shadowOffset: { width: 0, height: BUTTON_SHADOW_OFFSET_Y },
                        },
                        style,
                    ]}
                >
                    {leftIcon && !loading && (
                        <View style={styles.iconContainer}>
                            <Icon
                                name={leftIcon}
                                size={sizeStyles.iconSize}
                                color={variantStyles.text.color as string}
                            />
                        </View>
                    )}

                    {loading ? (
                        <ActivityIndicator
                            size="small"
                            color={variantStyles.text.color}
                            style={styles.loader}
                        />
                    ) : (
                        <Text style={[styles.text, sizeStyles.text, variantStyles.text, textStyle]}>
                            {title}
                        </Text>
                    )}

                    {rightIcon && !loading && (
                        <View style={styles.iconContainer}>
                            <Icon
                                name={rightIcon}
                                size={sizeStyles.iconSize}
                                color={variantStyles.text.color as string}
                            />
                        </View>
                    )}
                </AnimatedPressable>
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: scale(14),
    },
    text: {
        fontWeight: '700',
        letterSpacing: 1.5,
        textTransform: 'uppercase',
    },
    iconContainer: {
        marginHorizontal: scale(8),
    },
    loader: {
        marginHorizontal: scale(10),
    },
    glowContainer: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: -1,
    },
    glow: {
        width: '102%',
        height: '102%',
        borderRadius: scale(16),
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        elevation: 0,
    },
    glowTransparent: {
        backgroundColor: 'transparent',
    },
    scaleContainer: {
        width: '100%',
    },
});

export default React.memo(TVButton);
