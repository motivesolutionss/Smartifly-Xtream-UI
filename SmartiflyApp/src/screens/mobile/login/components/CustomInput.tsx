/**
 * Smartifly Custom Input Component
 * 
 * A premium styled text input with:
 * - Left icon support
 * - Right action button (e.g., password toggle)
 * - Validation states (error, success)
 * - Focus animations
 * - Inline error messages
 */

import React, { useState, forwardRef } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    TextInputProps,
    ViewStyle,
} from 'react-native';

// Theme imports
import {
    colors,
    spacing,
    borderRadius,
    typography,
    Icon,
} from '../../../../theme';

// Use mobile typography
const typo = typography.mobile;

// =============================================================================
// CUSTOM INPUT PROPS
// =============================================================================

export interface CustomInputProps extends TextInputProps {
    /** Label text above input */
    label?: string;
    /** Left icon type */
    leftIcon?: 'user' | 'lock' | 'email' | 'search' | 'server' | React.ReactNode;
    /** Show password toggle for secure text */
    showPasswordToggle?: boolean;
    /** Error message (shows error state if provided) */
    error?: string;
    /** Success state */
    isValid?: boolean;
    /** Container style override */
    containerStyle?: ViewStyle;
    /** Hint text below input */
    hint?: string;
    /** Is this field required */
    required?: boolean;
    /** Disable the input */
    disabled?: boolean;
}

// =============================================================================
// CUSTOM INPUT COMPONENT
// =============================================================================

const CustomInput = forwardRef<TextInput, CustomInputProps>(({
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

    // Determine border color based on state
    const getBorderColor = () => {
        if (disabled) return colors.border;
        if (error) return colors.error;
        if (isValid) return colors.success;
        if (isFocused) return colors.borderFocus;
        return colors.borderMedium;
    };

    // Determine background color based on state
    const getBackgroundColor = () => {
        if (disabled) return colors.backgroundSecondary;
        if (error) return colors.errorBackground;
        if (isFocused) return colors.backgroundTertiary;
        return colors.backgroundInput;
    };

    // Get left icon component
    const renderLeftIcon = () => {
        if (!leftIcon) return null;

        const iconColor = error ? colors.error :
            isValid ? colors.success :
                isFocused ? colors.accent :
                    colors.textMuted;

        if (React.isValidElement(leftIcon)) {
            return leftIcon;
        }

        switch (leftIcon) {
            case 'user':
                return <Icon name="user" size={20} color={iconColor} />;
            case 'lock':
                return <Icon name="lock" size={20} color={iconColor} />;
            case 'email':
                return <Icon name="email" size={20} color={iconColor} />;
            case 'search':
                return <Icon name="search" size={20} color={iconColor} />;
            case 'server':
                return <Icon name="server" size={20} color={iconColor} />;
            default:
                return null;
        }
    };

    // Handle focus
    const handleFocus = (e: any) => {
        setIsFocused(true);
        onFocus?.(e);
    };

    // Handle blur
    const handleBlur = (e: any) => {
        setIsFocused(false);
        onBlur?.(e);
    };

    // Toggle password visibility
    const togglePasswordVisibility = () => {
        setIsPasswordVisible(!isPasswordVisible);
    };

    // Determine if password should be hidden
    const shouldHidePassword = secureTextEntry && !isPasswordVisible;

    return (
        <View style={[styles.container, containerStyle]}>
            {/* Label */}
            {label && (
                <View style={styles.labelContainer}>
                    <Text style={[
                        styles.label,
                        error && styles.labelError,
                        isFocused && styles.labelFocused,
                    ]}>
                        {label}
                    </Text>
                    {required && <Text style={styles.required}>*</Text>}
                </View>
            )}

            {/* Input Container */}
            <View style={[
                styles.inputContainer,
                {
                    borderColor: getBorderColor(),
                    backgroundColor: getBackgroundColor(),
                },
                disabled && styles.inputContainerDisabled,
            ]}>
                {/* Left Icon */}
                {leftIcon && (
                    <View style={styles.leftIconContainer}>
                        {renderLeftIcon()}
                    </View>
                )}

                {/* Text Input */}
                <TextInput
                    ref={ref}
                    style={[
                        styles.input,
                        leftIcon ? styles.inputWithLeftIcon : undefined,
                        (showPasswordToggle || isValid || error) ? styles.inputWithRightIcon : undefined,
                        disabled ? styles.inputDisabled : undefined,
                        style,
                    ]}
                    placeholderTextColor={colors.textMuted}
                    secureTextEntry={shouldHidePassword}
                    editable={!disabled}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    {...props}
                />

                {/* Right Side (Password Toggle / Status Icon) */}
                <View style={styles.rightContainer}>
                    {/* Validation Status Icon */}
                    {!showPasswordToggle && isValid && !error && (
                        <View style={styles.statusIcon}>
                            <Icon name="checkCircle" size={18} color={colors.success} />
                        </View>
                    )}

                    {!showPasswordToggle && error && (
                        <View style={styles.statusIcon}>
                            <Icon name="alert" size={18} color={colors.error} />
                        </View>
                    )}

                    {/* Password Toggle */}
                    {showPasswordToggle && secureTextEntry && (
                        <TouchableOpacity
                            style={styles.toggleButton}
                            onPress={togglePasswordVisibility}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            activeOpacity={0.7}
                        >
                            {isPasswordVisible ? (
                                <Icon name="eyeOff" size={20} color={isFocused ? colors.accent : colors.textMuted} />
                            ) : (
                                <Icon name="eye" size={20} color={isFocused ? colors.accent : colors.textMuted} />
                            )}
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Error Message */}
            {error && (
                <View style={styles.errorContainer}>
                    <Icon name="alert" size={14} color={colors.error} />
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            )}

            {/* Hint Text */}
            {hint && !error && (
                <Text style={styles.hintText}>{hint}</Text>
            )}
        </View>
    );
});

CustomInput.displayName = 'CustomInput';

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
    container: {
        marginBottom: spacing.base,
    },
    labelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.xs,
    },
    label: {
        ...typo.labelSmall,
        color: colors.textSecondary,
        letterSpacing: 0.3,
    },
    labelError: {
        color: colors.error,
    },
    labelFocused: {
        color: colors.accent,
    },
    required: {
        ...typo.caption,
        color: colors.error,
        marginLeft: spacing.xxs,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: borderRadius.lg,
        borderWidth: 1.5,
        minHeight: 52,
    },
    inputContainerDisabled: {
        opacity: 0.6,
    },
    leftIconContainer: {
        paddingLeft: spacing.base,
        paddingRight: spacing.xs,
    },
    input: {
        flex: 1,
        paddingHorizontal: spacing.base,
        paddingVertical: spacing.md,
        ...typo.input,
        color: colors.textPrimary,
    },
    inputWithLeftIcon: {
        paddingLeft: spacing.xs,
    },
    inputWithRightIcon: {
        paddingRight: spacing.xxs,
    },
    inputDisabled: {
        color: colors.textDisabled,
    },
    rightContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingRight: spacing.sm,
    },
    toggleButton: {
        padding: spacing.sm,
    },
    statusIcon: {
        padding: spacing.sm,
    },
    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: spacing.xs,
        paddingHorizontal: spacing.xxs,
    },
    errorText: {
        flex: 1,
        ...typo.captionSmall,
        color: colors.error,
        marginLeft: spacing.xxs,
    },
    hintText: {
        ...typo.captionSmall,
        color: colors.textMuted,
        marginTop: spacing.xs,
        paddingHorizontal: spacing.xxs,
    },
});

export default React.memo(CustomInput);