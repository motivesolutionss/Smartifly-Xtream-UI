/**
 * Smartifly TV Input Component - Clean Edition
 *
 * TV-optimized text input with:
 * - Focus glow effects
 * - Password visibility toggle
 * - Icon support
 * - Error states
 * - D-pad navigation support
 */

import React, { useState, forwardRef, useCallback } from 'react';
import {
    View,
    Text,
    TextInput,
    Pressable,
    StyleSheet,
    TextInputProps,
    ViewStyle,
} from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
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

export interface TVInputProps extends Omit<TextInputProps, 'tabIndex'> {
    label?: string;
    leftIcon?: 'user' | 'lock' | 'email' | 'search' | 'server';
    showPasswordToggle?: boolean;
    error?: string;
    isValid?: boolean;
    containerStyle?: ViewStyle;
    hint?: string;
    required?: boolean;
    disabled?: boolean;
}

const AnimatedPressable = createAnimatedComponent(Pressable);
const FOCUS_BORDER_REST = scale(2);
const FOCUS_BORDER_ACTIVE = scale(4);
const GLOW_RADIUS = scale(10);

const TVInput = forwardRef<TextInput, TVInputProps>(({
    label,
    leftIcon,
    showPasswordToggle = false,
    error,
    isValid,
    containerStyle,
    hint,
    required,
    disabled,
    secureTextEntry,
    style,
    onFocus,
    onBlur,
    ...props
}, ref) => {
    const { colors: themeColors } = useTheme();
    const [isPasswordVisible, setIsPasswordVisible] = useState(true);

    const focusProgress = useSharedValue(0);
    const toggleFocusProgress = useSharedValue(0);
    const scaleProgress = useSharedValue(1);

    const togglePasswordVisibility = useCallback(() => {
        setIsPasswordVisible((prev) => !prev);
    }, []);

    const handleFocus = useCallback((e: any) => {
        focusProgress.value = withTiming(1, { duration: 180 });
        scaleProgress.value = withSpring(1.02, { damping: 14, stiffness: 180, mass: 0.7 });
        onFocus?.(e);
    }, [focusProgress, onFocus, scaleProgress]);

    const handleBlur = useCallback((e: any) => {
        focusProgress.value = withTiming(0, { duration: 180 });
        scaleProgress.value = withSpring(1, { damping: 14, stiffness: 180, mass: 0.7 });
        onBlur?.(e);
    }, [focusProgress, onBlur, scaleProgress]);

    const handleFieldPress = useCallback(() => {
        if (showPasswordToggle && secureTextEntry && !disabled) {
            togglePasswordVisibility();
        }
    }, [disabled, secureTextEntry, showPasswordToggle, togglePasswordVisibility]);

    const shouldHidePassword = secureTextEntry && !isPasswordVisible;
    const iconName = leftIcon ? ({
        user: 'user',
        lock: 'lock',
        email: 'email',
        search: 'search',
        server: 'server',
    }[leftIcon] || leftIcon) : undefined;

    const isError = Boolean(error);
    const successColor = colors.success || '#10B981';
    const accentColor = colors.accent || '#00E5FF';
    const borderRestColor = disabled
        ? 'rgba(255, 255, 255, 0.08)'
        : isError
            ? themeColors.error
            : isValid
                ? successColor
                : '#1E3448';
    const borderFocusColor = isError ? themeColors.error : isValid ? successColor : '#1E3448';
    const backgroundColor = disabled
        ? 'rgba(0, 0, 0, 0.3)'
        : isError
            ? themeColors.errorBackground
            : 'transparent';

    const containerAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scaleProgress.value }],
    }));

    const glowAnimatedStyle = useAnimatedStyle(() => ({
        opacity: isError ? 0 : interpolate(focusProgress.value, [0, 1], [0, 0.75]),
    }));

    const inputShellAnimatedStyle = useAnimatedStyle(() => ({
        borderWidth: interpolate(focusProgress.value, [0, 1], [FOCUS_BORDER_REST, FOCUS_BORDER_ACTIVE]),
        borderColor: interpolateColor(focusProgress.value, [0, 1], [borderRestColor, borderFocusColor]),
        backgroundColor,
    }));

    const labelAnimatedStyle = useAnimatedStyle(() => ({
        color: isError
            ? '#FBBF24'
            : interpolateColor(focusProgress.value, [0, 1], ['#E7ECF4', accentColor]),
    }));

    const baseIconOpacityStyle = useAnimatedStyle(() => ({
        opacity: interpolate(focusProgress.value, [0, 1], [1, 0]),
    }));

    const focusedIconOpacityStyle = useAnimatedStyle(() => ({
        opacity: focusProgress.value,
    }));

    const toggleButtonAnimatedStyle = useAnimatedStyle(() => ({
        backgroundColor: interpolateColor(
            toggleFocusProgress.value,
            [0, 1],
            ['rgba(0, 229, 255, 0)', 'rgba(0, 229, 255, 0.12)']
        ),
        borderWidth: interpolate(toggleFocusProgress.value, [0, 1], [0, 1]),
        borderColor: interpolateColor(
            toggleFocusProgress.value,
            [0, 1],
            ['rgba(0, 229, 255, 0)', accentColor]
        ),
    }));

    const renderStaticIndicator = () => {
        if (!showPasswordToggle && isValid && !error) {
            return (
                <View style={styles.statusIcon}>
                    <Icon name="checkCircle" size={scale(24)} color={successColor} />
                </View>
            );
        }

        if (!showPasswordToggle && error) {
            return (
                <View style={styles.statusIcon}>
                    <Icon name="alert" size={scale(24)} color={themeColors.error} />
                </View>
            );
        }

        return null;
    };

    return (
        <Animated.View style={[styles.container, containerStyle, containerAnimatedStyle]}>
            {label && (
                <View style={styles.labelContainer}>
                    <Animated.Text style={[styles.label, labelAnimatedStyle]}>
                        {label}
                    </Animated.Text>
                    {required && <Text style={styles.required}>*</Text>}
                </View>
            )}

            <View style={styles.inputWrapper}>
                <Animated.View
                    pointerEvents="none"
                    style={[
                        styles.glowEffect,
                        glowAnimatedStyle,
                        { shadowColor: accentColor, shadowRadius: GLOW_RADIUS },
                    ]}
                />

                <Pressable
                    onPress={handleFieldPress}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    disabled={disabled}
                    style={styles.touchableInput}
                    focusable={!disabled}
                >
                    <Animated.View
                        style={[
                            styles.inputContainer,
                            inputShellAnimatedStyle,
                            disabled && styles.inputContainerDisabled,
                        ]}
                    >
                        {!error && !disabled && (
                            <Svg pointerEvents="none" style={styles.fieldGradient}>
                                <Defs>
                                    <LinearGradient id="fieldGradient" x1="0" y1="0" x2="0" y2="1">
                                        <Stop offset="0" stopColor="#13263A" />
                                        <Stop offset="1" stopColor="#0E1C2C" />
                                    </LinearGradient>
                                </Defs>
                                <Rect x="0" y="0" width="100%" height="100%" rx={scale(12)} ry={scale(12)} fill="url(#fieldGradient)" />
                            </Svg>
                        )}

                        {leftIcon && iconName && (
                            <View style={styles.leftIconCapsule}>
                                <Animated.View style={[styles.iconLayer, baseIconOpacityStyle]} pointerEvents="none">
                                    <Icon
                                        name={iconName}
                                        size={scale(22)}
                                        color={isError ? themeColors.error : isValid ? successColor : '#E7ECF4'}
                                    />
                                </Animated.View>
                                {!isError && !isValid && (
                                    <Animated.View style={[styles.iconLayer, focusedIconOpacityStyle]} pointerEvents="none">
                                        <Icon name={iconName} size={scale(22)} color="#FFFFFF" />
                                    </Animated.View>
                                )}
                            </View>
                        )}

                        <TextInput
                            ref={ref}
                            style={[
                                styles.input,
                                leftIcon && styles.inputWithLeftIcon,
                                (showPasswordToggle || isValid || error) && styles.inputWithRightIcon,
                                disabled && styles.inputDisabled,
                                style,
                            ]}
                            placeholderTextColor="rgba(255, 255, 255, 0.3)"
                            secureTextEntry={shouldHidePassword}
                            editable={false}
                            showSoftInputOnFocus={false}
                            caretHidden={true}
                            contextMenuHidden={true}
                            selectTextOnFocus={false}
                            {...props}
                        />

                        <View style={styles.rightContainer}>
                            {renderStaticIndicator()}

                            {showPasswordToggle && secureTextEntry && (
                                <AnimatedPressable
                                    style={[styles.toggleButton, toggleButtonAnimatedStyle]}
                                    onPress={togglePasswordVisibility}
                                    focusable={!disabled}
                                    onFocus={() => {
                                        toggleFocusProgress.value = withTiming(1, { duration: 90 });
                                    }}
                                    onBlur={() => {
                                        toggleFocusProgress.value = withTiming(0, { duration: 90 });
                                    }}
                                    accessibilityLabel={isPasswordVisible ? 'Hide password' : 'Show password'}
                                    accessibilityRole="button"
                                >
                                    <Icon
                                        name={isPasswordVisible ? 'eyeOff' : 'eye'}
                                        size={scale(28)}
                                        color={isError ? themeColors.error : '#FFFFFF'}
                                    />
                                </AnimatedPressable>
                            )}
                        </View>
                    </Animated.View>
                </Pressable>
            </View>

            {error && (
                <View style={styles.errorContainer}>
                    <Icon name="alert" size={scale(18)} color={themeColors.error} />
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            )}

            {hint && !error && (
                <Text style={styles.hintText}>{hint}</Text>
            )}
        </Animated.View>
    );
});

TVInput.displayName = 'TVInput';

const styles = StyleSheet.create({
    container: {
        marginBottom: scale(24),
    },
    labelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: scale(8),
    },
    label: {
        fontSize: scaleFont(18),
        fontWeight: '700',
        letterSpacing: 1.3,
        textTransform: 'uppercase',
    },
    required: {
        fontSize: scaleFont(16),
        fontWeight: '600',
        color: '#FBBF24',
        marginLeft: scale(6),
    },
    inputWrapper: {
        position: 'relative',
    },
    glowEffect: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        borderRadius: scale(12),
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        elevation: 0,
    },
    touchableInput: {
        width: '100%',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: scale(12),
        minHeight: scale(74),
        overflow: 'hidden',
        position: 'relative',
    },
    fieldGradient: {
        ...StyleSheet.absoluteFillObject,
    },
    inputContainerDisabled: {
        opacity: 0.4,
    },
    leftIconCapsule: {
        marginLeft: scale(16),
        width: scale(64),
        height: scale(44),
        borderRadius: scale(14),
        backgroundColor: 'rgba(0, 229, 255, 0.20)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: scale(12),
    },
    iconLayer: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
    },
    input: {
        flex: 1,
        paddingHorizontal: scale(18),
        paddingVertical: scale(16),
        color: colors.textPrimary,
        fontSize: scaleFont(20),
        fontWeight: '500',
    },
    inputWithLeftIcon: {
        paddingLeft: scale(4),
    },
    inputWithRightIcon: {
        paddingRight: scale(10),
    },
    inputDisabled: {
        color: 'rgba(255, 255, 255, 0.35)',
    },
    rightContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingRight: scale(18),
    },
    toggleButton: {
        padding: scale(16),
        borderRadius: scale(14),
    },
    statusIcon: {
        padding: scale(16),
    },
    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: scale(14),
        paddingHorizontal: scale(6),
    },
    errorText: {
        flex: 1,
        fontSize: scaleFont(16),
        color: '#FCD34D',
        marginLeft: scale(12),
    },
    hintText: {
        fontSize: scaleFont(14),
        color: 'rgba(255, 255, 255, 0.45)',
        marginTop: scale(12),
        paddingHorizontal: scale(6),
    },
});

export default React.memo(TVInput);
