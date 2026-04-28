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

import React, { useState } from 'react';
import {
    View,
    Text,
    Pressable,
    StyleSheet,
} from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { Icon, scale, scaleFont } from '../../../../theme';

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

// =============================================================================
// KEY BUTTON COMPONENT
// =============================================================================

const KeyButton: React.FC<KeyButtonProps> = ({
    label,
    onPress,
    isSpecial,
    isActive,
    icon,
    width = 'normal'
}) => {
    const [focused, setFocused] = useState(false);

    const handleFocus = () => {
        setFocused(true);
    };

    const handleBlur = () => {
        setFocused(false);
    };

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

    const gradientStops = isActive
        ? focused
            ? { top: '#D1001A', bottom: '#D1001A' }
            : { top: '#CC0000', bottom: '#CC0000' }
        : focused
            ? { top: '#B51525', bottom: '#B51525' }
            : { top: '#13263A', bottom: '#0E1C2C' };

    const baseFillColor = isActive
        ? (focused ? '#D1001A' : '#CC0000')
        : (focused ? '#B51525' : '#0E1C2C');

    return (
        <View style={[
            styles.keyWrapper,
            getWidthStyle(),
        ]}>
            <Pressable
                onPress={onPress}
                onFocus={handleFocus}
                onBlur={handleBlur}
                style={({ pressed }) => [
                    styles.key,
                    { backgroundColor: baseFillColor },
                    isSpecial && styles.specialKey,
                    isActive && styles.activeKey,
                    !isActive && (focused || pressed) && styles.focusedKey,
                    isActive && (focused || pressed) && styles.focusedActiveKey,
                ]}
            >
                {({ pressed }) => (
                    <>
                        <Svg pointerEvents="none" style={styles.keyGradient}>
                            <Defs>
                                <LinearGradient id="keyGradient" x1="0" y1="0" x2="0" y2="1">
                                    <Stop offset="0" stopColor={gradientStops.top} />
                                    <Stop offset="1" stopColor={gradientStops.bottom} />
                                </LinearGradient>
                            </Defs>
                            <Rect x="0" y="0" width="100%" height="100%" rx={scale(7)} ry={scale(7)} fill="url(#keyGradient)" />
                        </Svg>
                        {icon ? (
                            <Icon
                                name={icon}
                                size={scale(24)}
                                color={(focused || pressed || isActive) ? '#FFFFFF' : '#AAAAAA'}
                            />
                        ) : (
                            <Text style={[
                                styles.keyText,
                                isSpecial && styles.specialKeyText,
                                isActive && styles.activeKeyText,
                                (focused || pressed) && styles.focusedKeyText,
                            ]}>
                                {label}
                            </Text>
                        )}
                    </>
                )}
            </Pressable>
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

    // QWERTY layout - Netflix style (10-column)
    const numberRow = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

    const letterRowsRaw = [
        ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
        ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', '-'],
        ['z', 'x', 'c', 'v', 'b', 'n', 'm', '_'],
    ];

    // Apply uppercase if enabled
    const letterRows = isUppercase
        ? letterRowsRaw.map(row => row.map(char => /^[a-z]$/.test(char) ? char.toUpperCase() : char))
        : letterRowsRaw;

    // Symbol layout
    const symbolRows = [
        ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')'],
        ['+', '=', '{', '}', '[', ']', '|', '\\', ':', ';'],
        ['"', "'", '<', '>', ',', '.', '?', '/'],
    ];

    const currentLetterRows = showSymbols ? symbolRows : letterRows;

    // Email domain shortcuts
    const emailDomains = ['@gmail.com', '@yahoo.com', '@outlook.com'];

    return (
        <View style={styles.container}>
            {/* KEYBOARD GRID */}
            <View style={styles.grid}>
                {/* NUMBER ROW */}
                <View style={styles.row}>
                    {numberRow.map((key) => (
                        <KeyButton
                            key={key}
                            label={key}
                            onPress={() => onKeyPress(key)}
                        />
                    ))}
                </View>

                {/* LETTER/SYMBOL ROWS */}
                {currentLetterRows.map((row, i) => (
                    <View key={i} style={styles.row}>
                        {/* Shift key on last row - Now takes 2 slots */}
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

                {/* EMAIL DOMAIN SHORTCUTS */}
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

                {/* BOTTOM FUNCTION ROW */}
                <View style={styles.row}>
                    <KeyButton
                        label={showSymbols ? 'ABC' : '!#$'}
                        onPress={() => setShowSymbols(!showSymbols)}
                        isSpecial
                        isActive={showSymbols}
                        width="wide"
                    />
                    <KeyButton
                        label="@"
                        onPress={() => onKeyPress('@')}
                        isSpecial
                    />
                    <KeyButton
                        label="."
                        onPress={() => onKeyPress('.')}
                        isSpecial
                    />
                    <KeyButton
                        label=".com"
                        onPress={() => onKeyPress('.com')}
                        isSpecial
                        width="extraWide"
                    />
                    <KeyButton
                        label=""
                        icon="backspace"
                        onPress={onBackspace}
                        isSpecial
                        width="extraWide"
                    />
                </View>

                {/* SPACE BAR ROW */}
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
    },
    keyGradient: {
        ...StyleSheet.absoluteFillObject,
    },
    focusedKey: {
        borderColor: '#B51525',
        shadowColor: '#D32638',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.24,
        shadowRadius: scale(8),
        elevation: 4,
    },
    focusedActiveKey: {
        borderColor: '#D1001A',
        shadowColor: '#FF2A3D',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.32,
        shadowRadius: scale(12),
        elevation: 5,
    },
    keyText: {
        color: '#AAAAAA',
        fontSize: scaleFont(24),
        fontWeight: '600',
    },
    focusedKeyText: {
        fontWeight: '700',
        color: '#FFFFFF',
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
        borderColor: '#CC0000',
        shadowColor: '#FF1B2D',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.22,
        shadowRadius: scale(10),
        elevation: 5,
    },
    activeKeyText: {
        color: '#FFFFFF',
        fontWeight: '700',
    },
});

export default TVKeyboard;
