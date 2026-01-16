import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    Pressable,
    StyleSheet,
    Animated,
} from 'react-native';
import { colors, scale, scaleFont } from '../../../../theme';

// =============================================================================
// TYPES
// =============================================================================

interface TVSearchKeypadProps {
    onKeyPress: (key: string) => void;
    onBackspace: () => void;
    onSpace: () => void;
    onClear: () => void;
}

interface KeyButtonProps {
    label: string;
    onPress: () => void;
    isActive?: boolean;
    icon?: string;
    width?: number; // Optional customization
    isControl?: boolean;
}

// =============================================================================
// KEY COMPONENT
// =============================================================================

const SearchKey: React.FC<KeyButtonProps> = ({
    label,
    onPress,
    icon,
    isControl
}) => {
    const [focused, setFocused] = useState(false);
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handleFocus = () => {
        setFocused(true);
        // Zoom removed as per request
        Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
            tension: 100,
            friction: 5,
        }).start();
    };

    const handleBlur = () => {
        setFocused(false);
        Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
            tension: 100,
            friction: 5,
        }).start();
    };

    return (
        <Animated.View style={[styles.keyWrapper, { transform: [{ scale: scaleAnim }] }]}>
            <Pressable
                onPress={onPress}
                onFocus={handleFocus}
                onBlur={handleBlur}
                style={[
                    styles.key,
                    isControl && styles.controlKey, // Apply control style base first
                    focused && styles.focusedKey, // Apply focus state last to override
                ]}
            >
                {icon ? (
                    <Text style={[styles.keyText, focused && styles.focusedKeyText]}>{icon}</Text>
                ) : (
                    <Text style={[styles.keyText, focused && styles.focusedKeyText]}>{label}</Text>
                )}
            </Pressable>
        </Animated.View>
    );
};

// =============================================================================
// MAIN KEYPAD COMPONENT
// =============================================================================

const TVSearchKeypad: React.FC<TVSearchKeypadProps> = ({
    onKeyPress,
    onBackspace,
    onSpace,
    onClear
}) => {
    // 6-Column Grid Layout
    const rows = [
        // Row 1: a-f
        { id: 'r1', keys: 'abcdef'.split('') },
        // Row 2: g-l
        { id: 'r2', keys: 'ghijkl'.split('') },
        // Row 3: m-r
        { id: 'r3', keys: 'mnopqr'.split('') },
        // Row 4: s-x
        { id: 'r4', keys: 'stuvwx'.split('') },
        // Row 5: y-z, 1-4
        { id: 'r5', keys: [...'yz'.split(''), ...'1234'.split('')] },
        // Row 6: 5-0
        { id: 'r6', keys: '567890'.split('') },
        // Row 7: Controls (Space, Clear, Backspace)
        {
            id: 'r7',
            keys: [
                { id: 'space', label: 'Space', action: onSpace, width: 2 },
                { id: 'clear', label: 'Clear All', action: onClear, width: 2 },
                { id: 'backspace', label: '⌫', action: onBackspace, width: 2 }
            ]
        },
    ];

    return (
        <View style={styles.container}>
            {rows.map((row, rowIndex) => (
                <View key={row.id} style={styles.row}>
                    {row.id === 'r7' ? (
                        // Special handling for control row
                        (row.keys as any[]).map((key: any) => (
                            <View key={key.id} style={{ flex: key.width }}>
                                <SearchKey
                                    label={key.label}
                                    onPress={key.action}
                                    isControl
                                />
                            </View>
                        ))
                    ) : (
                        // Standard grid rows
                        (row.keys as string[]).map((char) => (
                            <View key={char} style={{ flex: 1 }}>
                                <SearchKey
                                    label={char}
                                    onPress={() => onKeyPress(char)}
                                />
                            </View>
                        ))
                    )}
                </View>
            ))}
        </View>
    );
};

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
    container: {
        width: '100%',
        padding: scale(10),
    },
    row: {
        flexDirection: 'row',
        marginBottom: scale(8),
        gap: scale(8),
    },
    keyWrapper: {
        height: scale(50), // Fixed height for consistency
        width: '100%',
    },
    key: {
        flex: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.05)', // Glassy background
        borderRadius: scale(12),
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    controlKey: {
        backgroundColor: 'rgba(255, 255, 255, 0.08)', // Slightly distinctive for controls
        aspectRatio: undefined, // Allow non-square aspect ratio
        height: '100%',
    },
    focusedKey: {
        backgroundColor: colors.primary || '#E50914',
        borderColor: colors.primary || '#E50914',
        // Scale removed
        zIndex: 10,
        // Add shadow for glow effect
        shadowColor: colors.primary || '#E50914',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: scale(16),
        elevation: 10,
    },
    keyText: {
        color: 'rgba(255, 255, 255, 0.9)',
        fontSize: scaleFont(20), // Larger text
        fontWeight: '500',
    },
    focusedKeyText: {
        fontSize: scaleFont(22),
        fontWeight: '700',
        color: '#FFFFFF',
    },
});

export default TVSearchKeypad;
