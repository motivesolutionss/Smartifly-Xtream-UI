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

import React, { useState, forwardRef, useCallback, useRef } from 'react';
import {
    View,
    Text,
    TextInput,
    Pressable,
    StyleSheet,
    TextInputProps,
    ViewStyle,
    Animated,
} from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import {
    colors,
    Icon,
    scale,
    scaleFont,
    typographyTV,
    useTheme,
} from '../../../../theme';

// =============================================================================
// TYPES
// =============================================================================

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

// =============================================================================
// TV INPUT COMPONENT
// =============================================================================

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
    const [isFocused, setIsFocused] = useState(false);
    const [isPasswordVisible, setIsPasswordVisible] = useState(true);
    const [isPasswordToggleFocused, setIsPasswordToggleFocused] = useState(false);

    const focusAnim = useRef(new Animated.Value(0)).current;
    const glowAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(1)).current;

    // Animate focus state
    const animateFocus = useCallback((focused: boolean) => {
        Animated.parallel([
            Animated.timing(focusAnim, {
                toValue: focused ? 1 : 0,
                duration: 200,
                useNativeDriver: false,
            }),
            Animated.timing(glowAnim, {
                toValue: focused ? 1 : 0,
                duration: 200,
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
                toValue: focused ? 1.02 : 1,
                tension: 120,
                friction: 8,
                useNativeDriver: true,
            }),
        ]).start();
    }, [focusAnim, glowAnim, scaleAnim]);

    // Color helpers
    const getBorderColor = () => {
        if (disabled) return 'rgba(255, 255, 255, 0.08)';
        if (error) return themeColors.error;
        if (isValid) return colors.success || '#10B981';
        if (isFocused) return '#1E3448';
        return '#1E3448';
    };

    const getBackgroundColor = () => {
        if (disabled) return 'rgba(0, 0, 0, 0.3)';
        if (error) return themeColors.errorBackground;
        return 'transparent';
    };

    const getIconColor = () => {
        if (error) return themeColors.error;
        if (isValid) return colors.success || '#10B981';
        if (isFocused) return '#FFFFFF';
        return '#E7ECF4';
    };

    // Icon renderer
    const renderLeftIcon = () => {
        if (!leftIcon) return null;
        const iconSize = scale(22);
        const iconColor = getIconColor();

        const iconMap: Record<string, string> = {
            user: 'user',
            lock: 'lock',
            email: 'email',
            search: 'search',
            server: 'server',
        };

        return <Icon name={iconMap[leftIcon] || leftIcon} size={iconSize} color={iconColor} />;
    };

    // Event handlers
    const handleFocus = (e: any) => {
        setIsFocused(true);
        animateFocus(true);
        onFocus?.(e);
    };

    const handleBlur = (e: any) => {
        setIsFocused(false);
        animateFocus(false);
        onBlur?.(e);
    };

    const togglePasswordVisibility = () => {
        setIsPasswordVisible(!isPasswordVisible);
    };

    const handleFieldPress = () => {
        // TV fallback: some devices won't move focus into nested controls.
        // Pressing OK on focused password field toggles visibility.
        if (showPasswordToggle && secureTextEntry && !disabled) {
            togglePasswordVisibility();
        }
    };

    const shouldHidePassword = secureTextEntry && !isPasswordVisible;

    // Animated values
    const borderWidth = focusAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [scale(2), scale(4)],
    });

    const glowOpacity = glowAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 0.75],
    });

    return (
        <Animated.View
            style={[
                styles.container,
                containerStyle,
                { transform: [{ scale: scaleAnim }] },
            ]}
        >
            {/* Label */}
            {label && (
                <View style={styles.labelContainer}>
                    <Text
                        style={[
                            styles.label,
                            error && styles.labelError,
                            isFocused && styles.labelFocused,
                        ]}
                    >
                        {label}
                    </Text>
                    {required && <Text style={styles.required}>*</Text>}
                </View>
            )}

            {/* Input Container */}
            <View style={styles.inputWrapper}>
                {/* Glow Effect */}
                {isFocused && !error && (
                    <Animated.View
                        style={[
                            styles.glowEffect,
                            {
                                opacity: glowOpacity,
                                shadowColor: colors.accent || '#00E5FF',
                            },
                        ]}
                    />
                )}

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
                            {
                                borderWidth,
                                borderColor: getBorderColor(),
                                backgroundColor: getBackgroundColor(),
                            },
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

                        {/* Left Icon */}
                        {leftIcon && (
                            <View style={styles.leftIconCapsule}>
                                {renderLeftIcon()}
                            </View>
                        )}

                        {/* Text Input - Read-only from system (uses custom keyboard) */}
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

                        {/* Right Side Icons */}
                        <View style={styles.rightContainer}>
                            {/* Validation Icon */}
                            {!showPasswordToggle && isValid && !error && (
                                <View style={styles.statusIcon}>
                                    <Icon
                                        name="checkCircle"
                                        size={scale(24)}
                                        color={colors.success || '#10B981'}
                                    />
                                </View>
                            )}

                            {!showPasswordToggle && error && (
                                <View style={styles.statusIcon}>
                                    <Icon name="alert" size={scale(24)} color={themeColors.error} />
                                </View>
                            )}

                            {/* Password Toggle */}
                            {showPasswordToggle && secureTextEntry && (
                                <Pressable
                                    style={[
                                        styles.toggleButton,
                                        isPasswordToggleFocused && styles.toggleButtonFocused,
                                    ]}
                                    onPress={togglePasswordVisibility}
                                    focusable={!disabled}
                                    onFocus={() => setIsPasswordToggleFocused(true)}
                                    onBlur={() => setIsPasswordToggleFocused(false)}
                                    accessibilityLabel={isPasswordVisible ? 'Hide password' : 'Show password'}
                                    accessibilityRole="button"
                                >
                                    <Icon
                                        name={isPasswordVisible ? 'eyeOff' : 'eye'}
                                        size={scale(28)}
                                        color={getIconColor()}
                                    />
                                </Pressable>
                            )}
                        </View>
                    </Animated.View>
                </Pressable>
            </View>

            {/* Error Message */}
            {error && (
                <View style={styles.errorContainer}>
                    <Icon name="alert" size={scale(18)} color={themeColors.error} />
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            )}

            {/* Hint Text */}
            {hint && !error && (
                <Text style={styles.hintText}>{hint}</Text>
            )}
        </Animated.View>
    );
});

TVInput.displayName = 'TVInput';

// =============================================================================
// STYLES
// =============================================================================

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
        color: '#E7ECF4',
        letterSpacing: 1.3,
        textTransform: 'uppercase',
    },
    labelError: {
        color: '#FBBF24',
    },
    labelFocused: {
        color: colors.accent || '#00E5FF',
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
        shadowRadius: scale(10),
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
    toggleButtonFocused: {
        backgroundColor: 'rgba(0, 229, 255, 0.12)',
        borderWidth: 1,
        borderColor: colors.accent || '#00E5FF',
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
