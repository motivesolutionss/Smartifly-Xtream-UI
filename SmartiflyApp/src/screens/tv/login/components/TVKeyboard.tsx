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

import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    Pressable,
    StyleSheet,
    Animated,
} from 'react-native';
import { colors, Icon, scale, scaleFont } from '../../../../theme';

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
                    isSpecial && styles.specialKey,
                    isActive && styles.activeKey,
                    (focused || pressed) && styles.focusedKey,
                ]}
            >
                {({ pressed }) => (
                    <>
                        {icon ? (
                            <Icon
                                name={icon}
                                size={scale(24)}
                                color={(focused || pressed || isActive) ? '#FFFFFF' : 'rgba(255, 255, 255, 0.8)'}
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
                                icon={showSymbols ? undefined : 'arrowUp'}
                                onPress={() => showSymbols ? setShowSymbols(false) : setIsUppercase(!isUppercase)}
                                isSpecial
                                isActive={!showSymbols && isUppercase}
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
                            label="space"
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
        paddingHorizontal: scale(8),
        paddingVertical: scale(12),
    },
    grid: {
        gap: scale(4),
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: scale(4),
        paddingHorizontal: scale(4),
    },
    spaceBarWrapper: {
        flex: 3,
    },
    keyWrapper: {
        height: scale(52),
    },
    key: {
        flex: 1,
        backgroundColor: 'rgba(1, 20, 30, 0.7)',
        borderRadius: scale(8),
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.12)',
    },
    focusedKey: {
        backgroundColor: '#E50914',
        borderColor: '#E50914',
        shadowColor: '#E50914',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: scale(16),
        elevation: 10,
    },
    keyText: {
        color: 'rgba(255, 255, 255, 0.9)',
        fontSize: scaleFont(20),
        fontWeight: '500',
    },
    focusedKeyText: {
        fontWeight: '700',
        color: '#FFFFFF',
    },
    specialKey: {
        backgroundColor: 'rgba(0, 20, 30, 0.75)',
    },
    specialKeyText: {
        fontSize: scaleFont(14),
        color: 'rgba(255, 255, 255, 0.8)',
    },
    activeKey: {
        backgroundColor: '#E50914',
        borderColor: '#E50914',
    },
    activeKeyText: {
        color: '#FFFFFF',
        fontWeight: '700',
    },
});

export default TVKeyboard;