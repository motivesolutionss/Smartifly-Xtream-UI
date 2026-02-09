import React, { useMemo, useState } from 'react';
import {
    View,
    Text,
    Pressable,
    StyleSheet,
} from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
} from 'react-native-reanimated';
import { colors, scale, scaleFont } from '../../../../theme';

// =============================================================================
// TYPES
// =============================================================================

interface TVSearchKeypadProps {
    onKeyPress: (key: string) => void;
    onBackspace: () => void;
    onSpace: () => void;
    onClear: () => void;
    firstKeyRef?: React.Ref<View>;
}

interface KeyButtonProps {
    label: string;
    onPress: () => void;
    isActive?: boolean;
    icon?: string;
    width?: number; // Optional customization
    isControl?: boolean;
    pressableRef?: React.Ref<View>;
}

// =============================================================================
// KEY COMPONENT
// =============================================================================

// Spring config - SAME as TVContentCard for consistency
const SPRING_CONFIG = {
    damping: 15,
    stiffness: 200,
    mass: 0.5,
};

const SearchKey: React.FC<KeyButtonProps> = React.memo(({
    label,
    onPress,
    icon,
    isControl,
    pressableRef
}) => {
    const [focused, setFocused] = useState(false);

    // Reanimated shared value for 60fps UI-thread animations
    const scaleValue = useSharedValue(1);

    // Animated style - runs on UI thread
    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scaleValue.value }],
    }));

    const handleFocus = () => {
        scaleValue.value = withSpring(1.05, SPRING_CONFIG);
        setFocused(true);
    };

    const handleBlur = () => {
        scaleValue.value = withSpring(1, SPRING_CONFIG);
        setFocused(false);
    };

    return (
        <Animated.View style={[styles.keyWrapper, animatedStyle]}>
            <Pressable
                ref={pressableRef}
                onPress={onPress}
                onFocus={handleFocus}
                onBlur={handleBlur}
                style={[
                    styles.key,
                    isControl && styles.controlKey,
                    focused && styles.focusedKey,
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
});

// =============================================================================
// MAIN KEYPAD COMPONENT
// =============================================================================

const TVSearchKeypad = ({
    onKeyPress,
    onBackspace,
    onSpace,
    onClear,
    firstKeyRef
}: TVSearchKeypadProps) => {
    // 6-Column Grid Layout
    const rows = useMemo(() => ([
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
        // Row 7: Space (Full Width)
        {
            id: 'r7',
            type: 'control',
            keys: [
                { id: 'space', label: 'Space', action: onSpace, width: 1 }
            ]
        },
        // Row 8: Actions (Clear, Backspace)
        {
            id: 'r8',
            type: 'control',
            keys: [
                { id: 'clear', label: 'Clear All', action: onClear, width: 1 },
                { id: 'backspace', label: '⌫', action: onBackspace, width: 1 } // Using flex 1 for equal split
            ]
        },
    ]), [onSpace, onClear, onBackspace]);

    return (
        <View style={styles.container}>
            {rows.map((row, rowIndex) => (
                <View key={row.id} style={styles.row}>
                    {(row as any).type === 'control' ? (
                        // Special handling for control row
                        (row.keys as any[]).map((key: any) => (
                            <View key={key.id} style={key.width === 1 ? styles.flex1 : { flex: key.width }}>
                                <SearchKey
                                    label={key.label}
                                    onPress={key.action}
                                    isControl
                                />
                            </View>
                        ))
                    ) : (
                        // Standard grid rows
                        (row.keys as string[]).map((char, colIndex) => (
                            <View key={char} style={styles.flex1}>
                                <SearchKey
                                    label={char}
                                    onPress={() => onKeyPress(char)}
                                    pressableRef={rowIndex === 0 && colIndex === 0 ? firstKeyRef : undefined}
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
        marginBottom: scale(6), // Reduced margin
        gap: scale(6), // Reduced gap
    },
    keyWrapper: {
        height: scale(60), // Increased height (was 50)
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
        fontSize: scaleFont(24), // Increased font size (was 20)
        fontWeight: '500',
    },
    focusedKeyText: {
        fontSize: scaleFont(26), // Increased focused font size (was 22)
        fontWeight: '700',
        color: '#FFFFFF',
    },
    flex1: {
        flex: 1,
    }
});

export default React.memo(TVSearchKeypad);
