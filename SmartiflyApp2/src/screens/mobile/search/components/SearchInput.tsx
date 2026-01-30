/**
 * Smartifly SearchInput Component
 * 
 * Enhanced search input with:
 * - Auto-focus support
 * - Clear button
 * - Debounced input
 * - Cancel button
 * - Loading indicator
 * - Voice search placeholder
 */

import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Animated,
    ActivityIndicator,
    ViewStyle,
} from 'react-native';

// =============================================================================
// THEME
// =============================================================================

import { colors, spacing, borderRadius } from '../../../../theme';

// =============================================================================
// THEME
// =============================================================================
// Local definitions removed in favor of theme imports

// =============================================================================
// TYPES
// =============================================================================

export interface SearchInputProps {
    value: string;
    onChangeText: (text: string) => void;
    onSubmit?: (text: string) => void;
    onClear?: () => void;
    onCancel?: () => void;
    onFocus?: () => void;
    onBlur?: () => void;
    placeholder?: string;
    autoFocus?: boolean;
    showCancel?: boolean;
    showVoice?: boolean;
    isLoading?: boolean;
    debounceMs?: number;
    style?: ViewStyle;
}

export interface SearchInputRef {
    focus: () => void;
    blur: () => void;
    clear: () => void;
}

// =============================================================================
// SEARCH INPUT COMPONENT
// =============================================================================

const SearchInput = forwardRef<SearchInputRef, SearchInputProps>(({
    value,
    onChangeText,
    onSubmit,
    onClear,
    onCancel,
    onFocus,
    onBlur,
    placeholder = 'Search...',
    autoFocus = false,
    showCancel = true,
    showVoice = false,
    isLoading = false,
    debounceMs = 300,
    style,
}, ref) => {
    const inputRef = useRef<TextInput>(null);
    const [isFocused, setIsFocused] = useState(false);
    const [localValue, setLocalValue] = useState(value);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Animation values
    const focusAnim = useRef(new Animated.Value(0)).current;
    const cancelAnim = useRef(new Animated.Value(0)).current;

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
        focus: () => inputRef.current?.focus(),
        blur: () => inputRef.current?.blur(),
        clear: () => {
            setLocalValue('');
            onChangeText('');
            onClear?.();
        },
    }));

    // Sync local value with prop
    useEffect(() => {
        setLocalValue(value);
    }, [value]);

    // Debounced change handler
    const handleChangeText = (text: string) => {
        setLocalValue(text);

        // Clear previous timeout
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        // Set new timeout
        debounceRef.current = setTimeout(() => {
            onChangeText(text);
        }, debounceMs);
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
        };
    }, []);

    // Handle focus
    const handleFocus = () => {
        setIsFocused(true);
        onFocus?.();

        Animated.parallel([
            Animated.timing(focusAnim, {
                toValue: 1,
                duration: 200,
                useNativeDriver: false,
            }),
            Animated.timing(cancelAnim, {
                toValue: showCancel ? 1 : 0,
                duration: 200,
                useNativeDriver: false,
            }),
        ]).start();
    };

    // Handle blur
    const handleBlur = () => {
        setIsFocused(false);
        onBlur?.();

        Animated.timing(focusAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: false,
        }).start();

        // Keep cancel visible if there's text
        if (!localValue) {
            Animated.timing(cancelAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: false,
            }).start();
        }
    };

    // Handle clear
    const handleClear = () => {
        setLocalValue('');
        onChangeText('');
        onClear?.();
        inputRef.current?.focus();
    };

    // Handle cancel
    const handleCancel = () => {
        setLocalValue('');
        onChangeText('');
        inputRef.current?.blur();
        onCancel?.();

        Animated.timing(cancelAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: false,
        }).start();
    };

    // Handle submit
    const handleSubmit = () => {
        // Clear debounce and submit immediately
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }
        onChangeText(localValue);
        onSubmit?.(localValue);
    };

    // Animated styles
    const borderColor = focusAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [colors.border, colors.borderFocus],
    });

    const backgroundColor = focusAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [colors.backgroundTertiary, colors.backgroundElevated],
    });

    const cancelWidth = cancelAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 70],
    });

    const cancelOpacity = cancelAnim.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [0, 0, 1],
    });

    return (
        <View style={[styles.container, style]}>
            {/* Input Container */}
            <Animated.View style={[
                styles.inputContainer,
                {
                    borderColor,
                    backgroundColor,
                },
            ]}>
                {/* Search Icon */}
                <Text style={styles.searchIcon}>🔍</Text>

                {/* Input */}
                <TextInput
                    ref={inputRef}
                    style={styles.input}
                    value={localValue}
                    onChangeText={handleChangeText}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    onSubmitEditing={handleSubmit}
                    placeholder={placeholder}
                    placeholderTextColor={colors.textMuted}
                    autoFocus={autoFocus}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="search"
                    selectionColor={colors.accent}
                />

                {/* Loading Indicator */}
                {isLoading && (
                    <ActivityIndicator
                        size="small"
                        color={colors.textMuted}
                        style={styles.loadingIndicator}
                    />
                )}

                {/* Clear Button */}
                {localValue.length > 0 && !isLoading && (
                    <TouchableOpacity
                        style={styles.clearButton}
                        onPress={handleClear}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <View style={styles.clearButtonInner}>
                            <Text style={styles.clearIcon}>✕</Text>
                        </View>
                    </TouchableOpacity>
                )}

                {/* Voice Button (placeholder) */}
                {showVoice && localValue.length === 0 && !isLoading && (
                    <TouchableOpacity
                        style={styles.voiceButton}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Text style={styles.voiceIcon}>🎤</Text>
                    </TouchableOpacity>
                )}
            </Animated.View>

            {/* Cancel Button */}
            {showCancel && (
                <Animated.View style={[
                    styles.cancelContainer,
                    {
                        width: cancelWidth,
                        opacity: cancelOpacity,
                    },
                ]}>
                    <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={handleCancel}
                    >
                        <Text style={styles.cancelText}>Cancel</Text>
                    </TouchableOpacity>
                </Animated.View>
            )}
        </View>
    );
});

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    inputContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        height: 48,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        paddingHorizontal: spacing.md,
    },
    searchIcon: {
        fontSize: 18,
        marginRight: spacing.sm,
        opacity: 0.7,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: colors.textPrimary,
        paddingVertical: 0,
    },
    loadingIndicator: {
        marginLeft: spacing.sm,
    },
    clearButton: {
        marginLeft: spacing.sm,
    },
    clearButtonInner: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: colors.textMuted,
        alignItems: 'center',
        justifyContent: 'center',
    },
    clearIcon: {
        fontSize: 10,
        color: colors.background,
        fontWeight: '700',
    },
    voiceButton: {
        marginLeft: spacing.sm,
    },
    voiceIcon: {
        fontSize: 18,
        opacity: 0.7,
    },
    cancelContainer: {
        overflow: 'hidden',
    },
    cancelButton: {
        paddingLeft: spacing.md,
        paddingVertical: spacing.sm,
    },
    cancelText: {
        fontSize: 15,
        color: colors.accent,
        fontWeight: '500',
    },
});

SearchInput.displayName = 'SearchInput';

export default SearchInput;