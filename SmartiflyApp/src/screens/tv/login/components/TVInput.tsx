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
    TouchableOpacity,
    StyleSheet,
    TextInputProps,
    ViewStyle,
    Animated,
} from 'react-native';
import {
    colors,
    Icon,
    scale,
    scaleFont,
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
    const [isFocused, setIsFocused] = useState(false);
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);

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
        if (error) return '#EF4444';
        if (isValid) return colors.success || '#10B981';
        if (isFocused) return colors.accent || '#00E5FF';
        return 'rgba(255, 255, 255, 0.12)';
    };

    const getBackgroundColor = () => {
        if (disabled) return 'rgba(0, 0, 0, 0.3)';
        if (error) return 'rgba(239, 68, 68, 0.1)';
        if (isFocused) return 'rgba(0, 30, 40, 0.8)';
        return 'rgba(0, 20, 30, 0.7)';
    };

    const getIconColor = () => {
        if (error) return '#EF4444';
        if (isValid) return colors.success || '#10B981';
        if (isFocused) return '#FFFFFF';
        return 'rgba(255, 255, 255, 0.5)';
    };

    // Icon renderer
    const renderLeftIcon = () => {
        if (!leftIcon) return null;
        const iconSize = scale(30);
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

                <TouchableOpacity
                    activeOpacity={1}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    disabled={disabled}
                    style={styles.touchableInput}
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
                        {/* Left Icon */}
                        {leftIcon && (
                            <View style={styles.leftIconContainer}>
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
                                    <Icon name="alert" size={scale(24)} color="#EF4444" />
                                </View>
                            )}

                            {/* Password Toggle */}
                            {showPasswordToggle && secureTextEntry && (
                                <TouchableOpacity
                                    style={styles.toggleButton}
                                    onPress={togglePasswordVisibility}
                                    activeOpacity={0.7}
                                    accessibilityLabel={isPasswordVisible ? 'Hide password' : 'Show password'}
                                    accessibilityRole="button"
                                >
                                    <Icon
                                        name={isPasswordVisible ? 'eyeOff' : 'eye'}
                                        size={scale(28)}
                                        color={getIconColor()}
                                    />
                                </TouchableOpacity>
                            )}
                        </View>
                    </Animated.View>
                </TouchableOpacity>
            </View>

            {/* Error Message */}
            {error && (
                <View style={styles.errorContainer}>
                    <Icon name="alert" size={scale(18)} color="#EF4444" />
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
        marginBottom: scale(14),
    },
    label: {
        fontSize: scaleFont(17),
        fontWeight: '700',
        color: 'rgba(255, 255, 255, 0.65)',
        letterSpacing: 1,
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
        borderRadius: scale(18),
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: scale(30),
        elevation: 0,
    },
    touchableInput: {
        width: '100%',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: scale(18),
        minHeight: scale(76),
    },
    inputContainerDisabled: {
        opacity: 0.4,
    },
    leftIconContainer: {
        paddingLeft: scale(26),
        paddingRight: scale(14),
    },
    input: {
        flex: 1,
        paddingHorizontal: scale(26),
        paddingVertical: scale(20),
        color: '#FFFFFF',
        fontSize: scaleFont(22),
    },
    inputWithLeftIcon: {
        paddingLeft: scale(14),
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
        color: 'rgba(255, 255, 255, 0.35)',
        marginTop: scale(12),
        paddingHorizontal: scale(6),
    },
});

export default React.memo(TVInput);