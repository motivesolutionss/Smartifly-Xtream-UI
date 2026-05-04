/**
 * PIN Input Component
 *
 * 4-digit PIN entry with TV-optimized virtual numpad.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    Animated,
} from 'react-native';
import Reanimated, {
    interpolateColor,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from 'react-native-reanimated';
import { PIN_LENGTH } from '@smartifly/shared/src/store/profileStore';
import { colors, scale, scaleFont, Icon } from '../../theme';

interface PinInputProps {
    onComplete: (pin: string) => void;
    onChange?: (pin: string) => void;
    error?: boolean;
    errorMessage?: string;
    title?: string;
    subtitle?: string;
    profileName?: string;
    onCancel?: () => void;
}

const SPRING = {
    damping: 16,
    stiffness: 220,
    mass: 0.6,
};

type PinKeyProps = {
    label?: string;
    onPress: () => void;
    hasTVPreferredFocus?: boolean;
};

const PinKey: React.FC<PinKeyProps> = ({ label, onPress, hasTVPreferredFocus = false }) => {
    const focused = useSharedValue(0);
    const scaleValue = useSharedValue(1);

    const shellStyle = useAnimatedStyle(() => ({
        backgroundColor: interpolateColor(
            focused.value,
            [0, 1],
            ['rgba(255,255,255,0.1)', colors.accent || '#00E5FF']
        ),
        borderColor: interpolateColor(
            focused.value,
            [0, 1],
            ['rgba(255,255,255,0.1)', '#FFFFFF']
        ),
        transform: [{ scale: scaleValue.value }],
    }));

    const textStyle = useAnimatedStyle(() => ({
        color: interpolateColor(
            focused.value,
            [0, 1],
            ['#FFFFFF', '#000000']
        ),
    }));

    const handleFocus = useCallback(() => {
        focused.value = withTiming(1, { duration: 90 });
        scaleValue.value = withSpring(1.05, SPRING);
    }, [focused, scaleValue]);

    const handleBlur = useCallback(() => {
        focused.value = withTiming(0, { duration: 90 });
        scaleValue.value = withSpring(1, SPRING);
    }, [focused, scaleValue]);

    return (
        <Reanimated.View style={[styles.key, shellStyle]}>
            <Pressable
                onPress={onPress}
                onFocus={handleFocus}
                onBlur={handleBlur}
                focusable
                hasTVPreferredFocus={hasTVPreferredFocus}
                style={styles.keyPressable}
            >
                <Reanimated.Text style={[styles.keyText, textStyle]}>
                    {label}
                </Reanimated.Text>
            </Pressable>
        </Reanimated.View>
    );
};

const CancelButton: React.FC<{ onPress: () => void }> = ({ onPress }) => {
    const focused = useSharedValue(0);

    const shellStyle = useAnimatedStyle(() => ({
        backgroundColor: interpolateColor(
            focused.value,
            [0, 1],
            ['rgba(0,0,0,0)', 'rgba(255,255,255,0.1)']
        ),
        borderColor: interpolateColor(
            focused.value,
            [0, 1],
            ['rgba(255,255,255,0.2)', colors.accent || '#00E5FF']
        ),
    }));

    const textStyle = useAnimatedStyle(() => ({
        color: interpolateColor(
            focused.value,
            [0, 1],
            ['rgba(255,255,255,0.7)', '#FFFFFF']
        ),
    }));

    return (
        <Reanimated.View style={[styles.cancelButton, shellStyle]}>
            <Pressable
                onPress={onPress}
                onFocus={() => {
                    focused.value = withTiming(1, { duration: 90 });
                }}
                onBlur={() => {
                    focused.value = withTiming(0, { duration: 90 });
                }}
                style={styles.cancelPressable}
            >
                <Reanimated.Text style={[styles.cancelText, textStyle]}>
                    Cancel
                </Reanimated.Text>
            </Pressable>
        </Reanimated.View>
    );
};

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
    const shakeAnim = useRef(new Animated.Value(0)).current;

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

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                {profileName ? <Text style={styles.profileName}>{profileName}</Text> : null}
                <Text style={styles.title}>{title}</Text>
                {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            </View>

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

            {error && errorMessage ? (
                <Text style={styles.errorText}>{errorMessage}</Text>
            ) : null}

            <View style={styles.numpad}>
                <View style={styles.numpadRow}>
                    <PinKey label="1" onPress={() => handleKeyPress('1')} hasTVPreferredFocus />
                    <PinKey label="2" onPress={() => handleKeyPress('2')} />
                    <PinKey label="3" onPress={() => handleKeyPress('3')} />
                </View>
                <View style={styles.numpadRow}>
                    <PinKey label="4" onPress={() => handleKeyPress('4')} />
                    <PinKey label="5" onPress={() => handleKeyPress('5')} />
                    <PinKey label="6" onPress={() => handleKeyPress('6')} />
                </View>
                <View style={styles.numpadRow}>
                    <PinKey label="7" onPress={() => handleKeyPress('7')} />
                    <PinKey label="8" onPress={() => handleKeyPress('8')} />
                    <PinKey label="9" onPress={() => handleKeyPress('9')} />
                </View>
                <View style={styles.numpadRow}>
                    <PinKey label="CLR" onPress={() => handleKeyPress('clear')} />
                    <PinKey label="0" onPress={() => handleKeyPress('0')} />
                    <PinKey label="DEL" onPress={() => handleKeyPress('delete')} />
                </View>
            </View>

            {onCancel ? <CancelButton onPress={onCancel} /> : null}
        </View>
    );
};

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
        borderRadius: scale(12),
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    keyPressable: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    keyText: {
        fontSize: scaleFont(24),
        color: '#FFF',
        fontWeight: '600',
    },
    cancelButton: {
        marginTop: scale(30),
        borderRadius: scale(8),
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    cancelPressable: {
        paddingVertical: scale(12),
        paddingHorizontal: scale(40),
    },
    cancelText: {
        fontSize: scaleFont(16),
        color: 'rgba(255,255,255,0.7)',
        fontWeight: '600',
    },
});

export default PinInput;
