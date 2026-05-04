/**
 * Smartifly TV Keyboard - Clean Edition
 *
 * Pure virtual keyboard component for TV login.
 * Features:
 * - QWERTY layout with number row
 * - Shift for capitalization
 * - Symbol mode toggle
 * - Email domain shortcuts
 * - D-pad navigation with focus states
 *
 * Note: Field indicator (Username/Password tabs) is now
 * handled by the parent screen, not this component.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
    View,
    Text,
    Pressable,
    StyleSheet,
} from 'react-native';
import Animated, {
    createAnimatedComponent,
    interpolate,
    interpolateColor,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';
import { Icon, scale, scaleFont } from '../.././../theme';

// =============================================================================
// TYPES
// =============================================================================

interface TVKeyboardProps {
    onKeyPress: (key: string) => void;
    onBackspace: () => void;
    onSubmit: () => void;
    onNextField?: () => void;
    onBack?: () => void;
}

interface KeyButtonProps {
    label: string;
    onPress: () => void;
    isSpecial?: boolean;
    isActive?: boolean;
    icon?: string;
    width?: 'normal' | 'wide' | 'extraWide';
}

const AnimatedPressable = createAnimatedComponent(Pressable);
const KEY_SHADOW_RADIUS = scale(8);
const ACTIVE_KEY_SHADOW_RADIUS = scale(10);
const ACTIVE_KEY_FOCUS_SHADOW_RADIUS = scale(12);

// =============================================================================
// KEY BUTTON COMPONENT
// =============================================================================

const KeyButton: React.FC<KeyButtonProps> = ({
    label,
    onPress,
    isSpecial,
    isActive = false,
    icon,
    width = 'normal',
}) => {
    const focusProgress = useSharedValue(0);
    const pressProgress = useSharedValue(0);

    const handleFocus = useCallback(() => {
        focusProgress.value = withTiming(1, { duration: 90 });
    }, [focusProgress]);

    const handleBlur = useCallback(() => {
        focusProgress.value = withTiming(0, { duration: 90 });
        pressProgress.value = withTiming(0, { duration: 70 });
    }, [focusProgress, pressProgress]);

    const handlePressIn = useCallback(() => {
        pressProgress.value = withTiming(1, { duration: 60 });
    }, [pressProgress]);

    const handlePressOut = useCallback(() => {
        pressProgress.value = withTiming(0, { duration: 80 });
    }, [pressProgress]);

    const getWidthStyle = () => {
        switch (width) {
            case 'wide':
                return { flex: 1.5 };
            case 'extraWide':
                return { flex: 2 };
            default:
                return { flex: 1 };
        }
    };

    const shellStyle = useAnimatedStyle(() => {
        const visual = Math.max(focusProgress.value, pressProgress.value);
        const fillStart = isActive ? '#CC0000' : '#0E1C2C';
        const fillEnd = isActive ? '#D1001A' : '#B51525';
        const borderStart = isActive ? '#CC0000' : '#1E3448';
        const borderEnd = isActive ? '#D1001A' : '#B51525';

        return {
            backgroundColor: interpolateColor(visual, [0, 1], [fillStart, fillEnd]),
            borderColor: interpolateColor(visual, [0, 1], [borderStart, borderEnd]),
            shadowOpacity: interpolate(visual, [0, 1], [isActive ? 0.22 : 0, isActive ? 0.32 : 0.24]),
            shadowRadius: interpolate(
                visual,
                [0, 1],
                [isActive ? ACTIVE_KEY_SHADOW_RADIUS : 0, isActive ? ACTIVE_KEY_FOCUS_SHADOW_RADIUS : KEY_SHADOW_RADIUS]
            ),
            elevation: visual > 0 ? (isActive ? 5 : 4) : isActive ? 5 : 0,
            transform: [{ scale: interpolate(visual, [0, 1], [1, 1.02]) }],
        };
    }, [isActive]);

    const textStyle = useAnimatedStyle(() => {
        const visual = Math.max(focusProgress.value, pressProgress.value);
        const textStart = isActive ? '#FFFFFF' : '#AAAAAA';

        return {
            color: interpolateColor(visual, [0, 1], [textStart, '#FFFFFF']),
        };
    }, [isActive]);

    const baseIconStyle = useAnimatedStyle(() => ({
        opacity: interpolate(Math.max(focusProgress.value, pressProgress.value), [0, 1], [1, 0]),
    }));

    const focusedIconStyle = useAnimatedStyle(() => ({
        opacity: Math.max(focusProgress.value, pressProgress.value),
    }));

    return (
        <View style={[styles.keyWrapper, getWidthStyle()]}>
            <AnimatedPressable
                onPress={onPress}
                onFocus={handleFocus}
                onBlur={handleBlur}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                style={[
                    styles.key,
                    isSpecial && styles.specialKey,
                    isActive && styles.activeKey,
                    shellStyle,
                ]}
            >
                {icon ? (
                    <View style={styles.iconSlot}>
                        <Animated.View style={[styles.iconLayer, baseIconStyle]} pointerEvents="none">
                            <Icon
                                name={icon}
                                size={scale(24)}
                                color={isActive ? '#FFFFFF' : '#AAAAAA'}
                            />
                        </Animated.View>
                        <Animated.View style={[styles.iconLayer, focusedIconStyle]} pointerEvents="none">
                            <Icon
                                name={icon}
                                size={scale(24)}
                                color="#FFFFFF"
                            />
                        </Animated.View>
                    </View>
                ) : (
                    <Animated.Text
                        style={[
                            styles.keyText,
                            isSpecial && styles.specialKeyText,
                            isActive && styles.activeKeyText,
                            textStyle,
                        ]}
                    >
                        {label}
                    </Animated.Text>
                )}
            </AnimatedPressable>
        </View>
    );
};

// =============================================================================
// MAIN KEYBOARD COMPONENT
// =============================================================================

const TVKeyboard: React.FC<TVKeyboardProps> = ({
    onKeyPress,
    onBackspace,
    onSubmit,
    onNextField,
    onBack,
}) => {
    const [showSymbols, setShowSymbols] = useState(false);
    const [isUppercase, setIsUppercase] = useState(false);

    const numberRow = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

    const letterRowsRaw = [
        ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
        ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', '-'],
        ['z', 'x', 'c', 'v', 'b', 'n', 'm', '_'],
    ];

    const letterRows = isUppercase
        ? letterRowsRaw.map(row => row.map(char => /^[a-z]$/.test(char) ? char.toUpperCase() : char))
        : letterRowsRaw;

    const symbolRows = [
        ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')'],
        ['+', '=', '{', '}', '[', ']', '|', '\\', ':', ';'],
        ['"', "'", '<', '>', ',', '.', '?', '/'],
    ];

    const currentLetterRows = showSymbols ? symbolRows : letterRows;
    const emailDomains = ['@gmail.com', '@yahoo.com', '@outlook.com'];

    return (
        <View style={styles.container}>
            <View style={styles.grid}>
                <View style={styles.row}>
                    {numberRow.map((key) => (
                        <KeyButton
                            key={key}
                            label={key}
                            onPress={() => onKeyPress(key)}
                        />
                    ))}
                </View>

                {currentLetterRows.map((row, i) => (
                    <View key={i} style={styles.row}>
                        {i === 2 && (
                            <KeyButton
                                label={showSymbols ? 'ABC' : ''}
                                onPress={() => showSymbols ? setShowSymbols(false) : setIsUppercase(!isUppercase)}
                                isSpecial
                                isActive={!showSymbols && isUppercase}
                                icon={showSymbols ? undefined : 'arrow-up'}
                                width="extraWide"
                            />
                        )}
                        {row.map((key) => (
                            <KeyButton
                                key={key}
                                label={key}
                                onPress={() => onKeyPress(key)}
                            />
                        ))}
                    </View>
                ))}

                <View style={styles.row}>
                    {emailDomains.map((domain) => (
                        <KeyButton
                            key={domain}
                            label={domain}
                            onPress={() => onKeyPress(domain)}
                            isSpecial
                            width="extraWide"
                        />
                    ))}
                </View>

                <View style={styles.row}>
                    <KeyButton
                        label={showSymbols ? 'ABC' : '!#$'}
                        onPress={() => setShowSymbols(!showSymbols)}
                        isSpecial
                        isActive={showSymbols}
                        width="wide"
                    />
                    <KeyButton label="@" onPress={() => onKeyPress('@')} isSpecial />
                    <KeyButton label="." onPress={() => onKeyPress('.')} isSpecial />
                    <KeyButton label=".com" onPress={() => onKeyPress('.com')} isSpecial width="extraWide" />
                    <KeyButton label="" icon="backspace" onPress={onBackspace} isSpecial width="extraWide" />
                </View>

                <View style={styles.row}>
                    <KeyButton
                        label="Back"
                        onPress={onBack || (() => { })}
                        isSpecial
                        width="wide"
                    />
                    <View style={styles.spaceBarWrapper}>
                        <KeyButton
                            label="Space"
                            onPress={() => onKeyPress(' ')}
                            isSpecial
                        />
                    </View>
                    <KeyButton
                        label="Next"
                        onPress={onNextField || onSubmit}
                        isActive
                        width="wide"
                    />
                </View>
            </View>
        </View>
    );
};

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
    container: {
        width: '100%',
        paddingHorizontal: scale(6),
        paddingVertical: scale(10),
    },
    grid: {
        gap: scale(3),
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: scale(3),
        paddingHorizontal: scale(3),
    },
    spaceBarWrapper: {
        flex: 3,
    },
    keyWrapper: {
        height: scale(54),
    },
    key: {
        flex: 1,
        backgroundColor: '#0E1C2C',
        borderRadius: scale(7),
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#1E3448',
        overflow: 'hidden',
        position: 'relative',
        shadowOffset: { width: 0, height: 0 },
        shadowColor: '#D32638',
    },
    keyText: {
        color: '#AAAAAA',
        fontSize: scaleFont(24),
        fontWeight: '600',
    },
    specialKey: {
        backgroundColor: '#0E1C2C',
    },
    specialKeyText: {
        fontSize: scaleFont(17),
        color: '#AAAAAA',
        fontWeight: '600',
    },
    activeKey: {
        shadowColor: '#FF1B2D',
    },
    activeKeyText: {
        color: '#FFFFFF',
        fontWeight: '700',
    },
    iconSlot: {
        width: scale(28),
        height: scale(28),
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconLayer: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
    },
});

export default TVKeyboard;
