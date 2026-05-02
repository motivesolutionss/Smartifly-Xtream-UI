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

import React, { useState, useCallback, useRef } from 'react';
import {
    Pressable,
    Text,
    StyleSheet,
    ViewStyle,
    TextStyle,
    ActivityIndicator,
    Animated,
    View,
} from 'react-native';
import {
    colors,
    Icon,
    scale,
    scaleFont,
    useTheme,
} from '../.././../theme';

// =============================================================================
// TYPES
// =============================================================================

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

// =============================================================================
// TV BUTTON COMPONENT
// =============================================================================

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
    const [isFocused, setIsFocused] = useState(false);
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const glowAnim = useRef(new Animated.Value(0)).current;

    const { colors: themeColors } = useTheme();

    // Animate focus state (scale + glow)
    const animateFocus = useCallback((focused: boolean) => {
        Animated.parallel([
            Animated.timing(scaleAnim, {
                toValue: focused ? 1.05 : 1, // Scale up slightly on focus
                duration: 200,
                useNativeDriver: true,
            }),
            Animated.timing(glowAnim, {
                toValue: focused ? 1 : 0,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start();
    }, [scaleAnim, glowAnim]);

    const handleFocus = () => {
        setIsFocused(true);
        animateFocus(true);
    };

    const handleBlur = () => {
        setIsFocused(false);
        animateFocus(false);
    };

    const handlePressIn = () => {
        animateFocus(true);
    };

    const handlePressOut = () => {
        if (!isFocused) {
            animateFocus(false);
        }
    };

    const handlePress = () => {
        onPress();
    };

    // Variant styles
    const getVariantStyles = (): { container: ViewStyle; text: TextStyle } => {
        const isDisabled = disabled || loading;
        const accentColor = colors.accent || '#00E5FF';

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
                };
            case 'outline':
                return {
                    container: {
                        backgroundColor: 'transparent',
                        borderWidth: scale(2),
                        borderColor: isDisabled ? 'rgba(0, 229, 255, 0.3)' : accentColor,
                        shadowColor: 'transparent',
                        shadowOpacity: 0,
                        elevation: 0,
                    },
                    text: {
                        color: isDisabled ? 'rgba(0, 229, 255, 0.5)' : accentColor,
                    },
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
                };
            default:
                return { container: {}, text: {} };
        }
    };

    // Size styles
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

    const glowOpacity = glowAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 0.3],
    });



    return (
        <View>
            {/* Subtle glow - only for primary */}
            {isFocused && variant === 'primary' && (
                <Animated.View
                    style={[
                        styles.glowContainer,
                        { opacity: glowOpacity },
                    ]}
                >
                    <View
                        style={[
                            styles.glow,
                            styles.glowTransparent,
                            {
                                shadowColor: variantStyles.container.shadowColor,
                            },
                        ]}
                    />
                </Animated.View>
            )}

            <Animated.View style={[styles.scaleContainer, { transform: [{ scale: scaleAnim }] }]}>
                <Pressable
                    onPress={handlePress}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    onPressIn={handlePressIn}
                    onPressOut={handlePressOut}
                    disabled={disabled || loading}
                    accessibilityLabel={accessibilityLabel || title}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: disabled || loading }}
                    hasTVPreferredFocus={hasTVPreferredFocus}
                    style={({ pressed }) => [
                        styles.container,
                        sizeStyles.container,
                        variantStyles.container,
                        (isFocused || pressed) && styles.containerFocused,
                        style,
                    ]}
                >
                    {/* Left Icon */}
                    {leftIcon && !loading && (
                        <View style={styles.iconContainer}>
                            <Icon
                                name={leftIcon}
                                size={sizeStyles.iconSize}
                                color={variantStyles.text.color as string}
                            />
                        </View>
                    )}

                    {/* Content */}
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

                    {/* Right Icon */}
                    {rightIcon && !loading && (
                        <View style={styles.iconContainer}>
                            <Icon
                                name={rightIcon}
                                size={sizeStyles.iconSize}
                                color={variantStyles.text.color as string}
                            />
                        </View>
                    )}
                </Pressable>
            </Animated.View>
        </View>
    );
};

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: scale(14),
        // No shadow by default
    },
    containerFocused: {
        // Add shadow/glow and border on focus
        shadowOffset: { width: 0, height: scale(4) },
        shadowOpacity: 0.4,
        shadowRadius: scale(12),
        elevation: 4,
        borderWidth: scale(2),
        borderColor: '#FFFFFF', // Clear white border for visibility
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
        shadowRadius: scale(16),
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