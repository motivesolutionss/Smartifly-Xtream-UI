/**
 * PIN Input Component
 *
 * 4-digit PIN entry with TV-optimized virtual numpad.
 * Features shake animation on incorrect PIN.
 *
 * @enterprise-grade
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    Animated,
} from 'react-native';
import { PIN_LENGTH } from '../../store/profileStore';
import { colors, scale, scaleFont, Icon } from '../../theme';

// =============================================================================
// TYPES
// =============================================================================

interface PinInputProps {
    /** Callback when PIN is complete */
    onComplete: (pin: string) => void;
    /** Callback when PIN changes */
    onChange?: (pin: string) => void;
    /** Error state (triggers shake animation) */
    error?: boolean;
    /** Error message to display */
    errorMessage?: string;
    /** Title text */
    title?: string;
    /** Subtitle text */
    subtitle?: string;
    /** Profile name for display */
    profileName?: string;
    /** On cancel/back */
    onCancel?: () => void;
}

// =============================================================================
// COMPONENT
// =============================================================================

const PinInput: React.FC<PinInputProps> = ({
    onComplete,
    onChange,
    error = false,
    errorMessage,
    title = 'Enter PIN',
    subtitle,
    profileName,
    onCancel,
}) => {
    const [pin, setPin] = useState('');
    const [focusedKey, setFocusedKey] = useState<string | null>(null);
    const shakeAnim = useRef(new Animated.Value(0)).current;

    // Trigger shake on error
    useEffect(() => {
        if (error) {
            Animated.sequence([
                Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
                Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
                Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
                Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
                Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
            ]).start(() => {
                setPin('');
            });
        }
    }, [error, shakeAnim]);

    // Auto-submit when PIN is complete
    useEffect(() => {
        if (pin.length === PIN_LENGTH) {
            onComplete(pin);
        }
        onChange?.(pin);
    }, [pin, onComplete, onChange]);

    const handleKeyPress = useCallback((key: string) => {
        if (key === 'delete') {
            setPin((prev) => prev.slice(0, -1));
        } else if (key === 'clear') {
            setPin('');
        } else if (pin.length < PIN_LENGTH) {
            setPin((prev) => prev + key);
        }
    }, [pin]);

    // Render PIN dots
    const renderDots = () => (
        <Animated.View style={[styles.dotsContainer, { transform: [{ translateX: shakeAnim }] }]}>
            {Array.from({ length: PIN_LENGTH }).map((_, i) => (
                <View
                    key={i}
                    style={[
                        styles.dot,
                        i < pin.length && styles.dotFilled,
                        error && styles.dotError,
                    ]}
                />
            ))}
        </Animated.View>
    );

    // Render numpad key
    const renderKey = (key: string, label?: string, icon?: string, isWide = false) => {
        const isFocused = focusedKey === key;

        return (
            <Pressable
                key={key}
                onPress={() => handleKeyPress(key)}
                onFocus={() => setFocusedKey(key)}
                onBlur={() => setFocusedKey(null)}
                focusable
                hasTVPreferredFocus={key === '1'}
                style={[
                    styles.key,
                    isWide && styles.keyWide,
                    isFocused && styles.keyFocused,
                ]}
            >
                {icon ? (
                    <Icon
                        name={icon}
                        size={scale(24)}
                        color={isFocused ? '#000' : '#FFF'}
                    />
                ) : (
                    <Text style={[styles.keyText, isFocused && styles.keyTextFocused]}>
                        {label || key}
                    </Text>
                )}
            </Pressable>
        );
    };

    // Render virtual numpad
    const renderNumpad = () => (
        <View style={styles.numpad}>
            <View style={styles.numpadRow}>
                {renderKey('1')}
                {renderKey('2')}
                {renderKey('3')}
            </View>
            <View style={styles.numpadRow}>
                {renderKey('4')}
                {renderKey('5')}
                {renderKey('6')}
            </View>
            <View style={styles.numpadRow}>
                {renderKey('7')}
                {renderKey('8')}
                {renderKey('9')}
            </View>
            <View style={styles.numpadRow}>
                {renderKey('clear', 'CLR')}
                {renderKey('0')}
                {renderKey('delete', undefined, 'backspace')}
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                {profileName && (
                    <Text style={styles.profileName}>{profileName}</Text>
                )}
                <Text style={styles.title}>{title}</Text>
                {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
            </View>

            {/* PIN Dots */}
            {renderDots()}

            {/* Error Message */}
            {error && errorMessage && (
                <Text style={styles.errorText}>{errorMessage}</Text>
            )}

            {renderNumpad()}

            {/* Cancel Button */}
            {onCancel && (
                <Pressable
                    onPress={onCancel}
                    onFocus={() => setFocusedKey('cancel')}
                    onBlur={() => setFocusedKey(null)}
                    style={[
                        styles.cancelButton,
                        focusedKey === 'cancel' && styles.cancelButtonFocused,
                    ]}
                >
                    <Text
                        style={[
                            styles.cancelText,
                            focusedKey === 'cancel' && styles.cancelTextFocused,
                        ]}
                    >
                        Cancel
                    </Text>
                </Pressable>
            )}
        </View>
    );
};

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        paddingHorizontal: scale(20),
    },
    header: {
        alignItems: 'center',
        marginBottom: scale(30),
    },
    profileName: {
        fontSize: scaleFont(14),
        color: colors.accent || '#00E5FF',
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 2,
        marginBottom: scale(8),
    },
    title: {
        fontSize: scaleFont(28),
        color: '#FFF',
        fontWeight: '700',
        marginBottom: scale(8),
    },
    subtitle: {
        fontSize: scaleFont(16),
        color: 'rgba(255,255,255,0.6)',
        textAlign: 'center',
    },
    dotsContainer: {
        flexDirection: 'row',
        gap: scale(20),
        marginBottom: scale(20),
    },
    dot: {
        width: scale(20),
        height: scale(20),
        borderRadius: scale(10),
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.4)',
        backgroundColor: 'transparent',
    },
    dotFilled: {
        backgroundColor: colors.accent || '#00E5FF',
        borderColor: colors.accent || '#00E5FF',
    },
    dotError: {
        borderColor: '#EF4444',
        backgroundColor: 'transparent',
    },
    errorText: {
        fontSize: scaleFont(14),
        color: '#EF4444',
        marginBottom: scale(20),
    },
    numpad: {
        marginTop: scale(20),
    },
    numpadRow: {
        flexDirection: 'row',
        gap: scale(12),
        marginBottom: scale(12),
    },
    key: {
        width: scale(80),
        height: scale(60),
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: scale(12),
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    keyWide: {
        width: scale(124),
    },
    keyFocused: {
        backgroundColor: colors.accent || '#00E5FF',
        borderColor: '#FFF',
        transform: [{ scale: 1.05 }],
    },
    keyText: {
        fontSize: scaleFont(24),
        color: '#FFF',
        fontWeight: '600',
    },
    keyTextFocused: {
        color: '#000',
        fontWeight: '700',
    },
    cancelButton: {
        marginTop: scale(30),
        paddingVertical: scale(12),
        paddingHorizontal: scale(40),
        borderRadius: scale(8),
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    cancelButtonFocused: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderColor: colors.accent || '#00E5FF',
    },
    cancelText: {
        fontSize: scaleFont(16),
        color: 'rgba(255,255,255,0.7)',
        fontWeight: '600',
    },
    cancelTextFocused: {
        color: '#FFF',
    },
});

export default PinInput;
