/**
 * Smartifly SearchInput Component
 *
 * Debounced search input with optional cancel and loading indicator.
 */

import React, {
    useState,
    useRef,
    useEffect,
    useCallback,
    forwardRef,
    useImperativeHandle,
} from 'react';
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
import { colors, spacing, borderRadius, Icon } from '../../../../theme';

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
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [localValue, setLocalValue] = useState(value);

    const focusAnim = useRef(new Animated.Value(0)).current;
    const cancelAnim = useRef(new Animated.Value(0)).current;

    useImperativeHandle(ref, () => ({
        focus: () => inputRef.current?.focus(),
        blur: () => inputRef.current?.blur(),
        clear: () => {
            setLocalValue('');
            onChangeText('');
            onClear?.();
        },
    }), [onChangeText, onClear]);

    useEffect(() => {
        setLocalValue(value);
    }, [value]);

    useEffect(() => () => {
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }
    }, []);

    const emitChange = useCallback((text: string) => {
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        if (debounceMs <= 0) {
            onChangeText(text);
            return;
        }

        debounceRef.current = setTimeout(() => {
            onChangeText(text);
        }, debounceMs);
    }, [debounceMs, onChangeText]);

    const handleChangeText = useCallback((text: string) => {
        setLocalValue(text);
        emitChange(text);
    }, [emitChange]);

    const handleFocus = useCallback(() => {
        onFocus?.();

        Animated.parallel([
            Animated.timing(focusAnim, {
                toValue: 1,
                duration: 180,
                useNativeDriver: false,
            }),
            Animated.timing(cancelAnim, {
                toValue: showCancel ? 1 : 0,
                duration: 180,
                useNativeDriver: false,
            }),
        ]).start();
    }, [cancelAnim, focusAnim, onFocus, showCancel]);

    const handleBlur = useCallback(() => {
        onBlur?.();

        Animated.timing(focusAnim, {
            toValue: 0,
            duration: 180,
            useNativeDriver: false,
        }).start();

        if (!localValue) {
            Animated.timing(cancelAnim, {
                toValue: 0,
                duration: 180,
                useNativeDriver: false,
            }).start();
        }
    }, [cancelAnim, focusAnim, localValue, onBlur]);

    const handleClear = useCallback(() => {
        setLocalValue('');
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }
        onChangeText('');
        onClear?.();
        inputRef.current?.focus();
    }, [onChangeText, onClear]);

    const handleCancel = useCallback(() => {
        setLocalValue('');
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }
        onChangeText('');
        inputRef.current?.blur();
        onCancel?.();

        Animated.timing(cancelAnim, {
            toValue: 0,
            duration: 180,
            useNativeDriver: false,
        }).start();
    }, [cancelAnim, onCancel, onChangeText]);

    const handleSubmit = useCallback(() => {
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }
        onChangeText(localValue);
        onSubmit?.(localValue);
    }, [localValue, onChangeText, onSubmit]);

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
            <Animated.View
                style={[
                    styles.inputContainer,
                    {
                        borderColor,
                        backgroundColor,
                    },
                ]}
            >
                <View style={styles.iconWrap}>
                    <Icon name="magnifyingGlass" size={18} color={colors.textMuted} />
                </View>

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

                {isLoading && (
                    <ActivityIndicator
                        size="small"
                        color={colors.textMuted}
                        style={styles.loadingIndicator}
                    />
                )}

                {localValue.length > 0 && !isLoading && (
                    <TouchableOpacity
                        style={styles.clearButton}
                        onPress={handleClear}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <View style={styles.clearButtonInner}>
                            <Icon name="x" size={10} color={colors.background} />
                        </View>
                    </TouchableOpacity>
                )}

                {showVoice && localValue.length === 0 && !isLoading && (
                    <TouchableOpacity
                        style={styles.voiceButton}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Icon name="broadcast" size={18} color={colors.textMuted} />
                    </TouchableOpacity>
                )}
            </Animated.View>

            {showCancel && (
                <Animated.View
                    style={[
                        styles.cancelContainer,
                        {
                            width: cancelWidth,
                            opacity: cancelOpacity,
                        },
                    ]}
                >
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
    iconWrap: {
        marginRight: spacing.sm,
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
    voiceButton: {
        marginLeft: spacing.sm,
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
