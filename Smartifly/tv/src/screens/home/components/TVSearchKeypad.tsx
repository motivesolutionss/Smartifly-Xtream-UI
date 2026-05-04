import React, { useCallback, useMemo } from 'react';
import {
    View,
    Pressable,
    StyleSheet,
} from 'react-native';
import Animated, {
    interpolateColor,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from 'react-native-reanimated';
import { colors, scale, scaleFont } from '../.././../theme';
import { usePerfProfile } from '@smartifly/shared/src/utils/perf';

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
    isControl?: boolean;
    pressableRef?: React.Ref<View>;
    enableGlow?: boolean;
    containerStyle?: object;
    textStyle?: object;
}

const SPRING_CONFIG = {
    damping: 15,
    stiffness: 200,
    mass: 0.5,
};
const KEY_GLOW_RADIUS = scale(16);

const SearchKey: React.FC<KeyButtonProps> = React.memo(({
    label,
    onPress,
    isControl,
    pressableRef,
    enableGlow = true,
    containerStyle,
    textStyle,
}) => {
    const focused = useSharedValue(0);
    const scaleValue = useSharedValue(1);

    const animatedShellStyle = useAnimatedStyle(() => ({
        backgroundColor: interpolateColor(
            focused.value,
            [0, 1],
            [isControl ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.05)', colors.primary || '#E50914']
        ),
        borderColor: interpolateColor(
            focused.value,
            [0, 1],
            ['rgba(255, 255, 255, 0.1)', colors.primary || '#E50914']
        ),
        shadowOpacity: enableGlow ? focused.value * 0.8 : 0,
        shadowRadius: focused.value > 0 ? KEY_GLOW_RADIUS : 0,
        elevation: focused.value > 0 ? 10 : 0,
        shadowColor: colors.primary || '#E50914',
        shadowOffset: { width: 0, height: 0 },
        transform: [{ scale: scaleValue.value }],
    }), [enableGlow, isControl, scaleValue]);

    const animatedTextStyle = useAnimatedStyle(() => ({
        color: interpolateColor(
            focused.value,
            [0, 1],
            ['rgba(255, 255, 255, 0.9)', '#FFFFFF']
        ),
    }));

    const handleFocus = useCallback(() => {
        focused.value = withTiming(1, { duration: 90 });
        scaleValue.value = withSpring(1.05, SPRING_CONFIG);
    }, [focused, scaleValue]);

    const handleBlur = useCallback(() => {
        focused.value = withTiming(0, { duration: 90 });
        scaleValue.value = withSpring(1, SPRING_CONFIG);
    }, [focused, scaleValue]);

    return (
        <Animated.View style={[styles.keyWrapper, styles.key, isControl && styles.controlKey, containerStyle, animatedShellStyle]}>
            <Pressable
                ref={pressableRef}
                onPress={onPress}
                onFocus={handleFocus}
                onBlur={handleBlur}
                style={styles.keyPressable}
            >
                <Animated.Text style={[styles.keyText, textStyle, animatedTextStyle]}>{label}</Animated.Text>
            </Pressable>
        </Animated.View>
    );
});

const TVSearchKeypad = ({
    onKeyPress,
    onBackspace,
    onSpace,
    onClear,
    firstKeyRef
}: TVSearchKeypadProps) => {
    const perf = usePerfProfile();
    const enableGlow = perf.enableFocusGlow;

    const rows = useMemo(() => ([
        { id: 'r1', keys: 'abcdef'.split('') },
        { id: 'r2', keys: 'ghijkl'.split('') },
        { id: 'r3', keys: 'mnopqr'.split('') },
        { id: 'r4', keys: 'stuvwx'.split('') },
        { id: 'r5', keys: [...'yz'.split(''), ...'1234'.split('')] },
        { id: 'r6', keys: '567890'.split('') },
        {
            id: 'r7',
            type: 'control',
            keys: [
                { id: 'space', label: 'Space', action: onSpace, width: 1 }
            ]
        },
        {
            id: 'r8',
            type: 'control',
            keys: [
                { id: 'clear', label: 'Clear All', action: onClear, width: 1 },
                { id: 'backspace', label: 'Backspace', action: onBackspace, width: 1 }
            ]
        },
    ]), [onSpace, onClear, onBackspace]);

    return (
        <View style={styles.container}>
            {rows.map((row, rowIndex) => (
                <View key={row.id} style={styles.row}>
                    {(row as any).type === 'control' ? (
                        (row.keys as any[]).map((key: any) => (
                            <View key={key.id} style={key.width === 1 ? styles.flex1 : { flex: key.width }}>
                                <SearchKey
                                    label={key.label}
                                    onPress={key.action}
                                    isControl
                                    enableGlow={enableGlow}
                                    containerStyle={row.id === 'r7' ? styles.spaceKey : styles.actionKey}
                                    textStyle={row.id === 'r7' ? styles.spaceKeyText : styles.actionKeyText}
                                />
                            </View>
                        ))
                    ) : (
                        (row.keys as string[]).map((char, colIndex) => (
                            <View key={char} style={styles.flex1}>
                                <SearchKey
                                    label={char}
                                    onPress={() => onKeyPress(char)}
                                    pressableRef={rowIndex === 0 && colIndex === 0 ? firstKeyRef : undefined}
                                    enableGlow={enableGlow}
                                />
                            </View>
                        ))
                    )}
                </View>
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
        padding: scale(10),
    },
    row: {
        flexDirection: 'row',
        marginBottom: scale(6),
        gap: scale(6),
    },
    keyWrapper: {
        height: scale(60),
        width: '100%',
    },
    key: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: scale(12),
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    controlKey: {
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        height: scale(60),
    },
    spaceKey: {
        height: scale(60),
        borderRadius: scale(14),
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
    },
    actionKey: {
        height: scale(60),
        borderRadius: scale(14),
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
    },
    keyPressable: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    keyText: {
        color: 'rgba(255, 255, 255, 0.9)',
        fontSize: scaleFont(24),
        fontWeight: '500',
    },
    spaceKeyText: {
        fontSize: scaleFont(22),
        fontWeight: '600',
        letterSpacing: 0.3,
    },
    actionKeyText: {
        fontSize: scaleFont(18),
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    flex1: {
        flex: 1,
    }
});

export default React.memo(TVSearchKeypad);
