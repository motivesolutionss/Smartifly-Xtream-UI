import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    Easing
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Stop, Rect, G, Circle } from 'react-native-svg';
import useAuthStore from '@smartifly/shared/src/store/authStore';
import { borderRadius, colors, scale, scaleFont, Icon } from '../theme';

const { width, height } = Dimensions.get('window');

const BlockedScreen = ({ navigation, route }: any) => {
    const message = route.params?.message || 'This device is globally banned from using Smartifly Services.';
    const status = route.params?.status || 'BANNED';
    const resetStore = useAuthStore((state) => state.resetAuthStore);

    // Card Animations (Entrance only)
    const cardOpacity = useSharedValue(0);
    const cardScale = useSharedValue(0.95);
    const cardTranslateY = useSharedValue(10);
    const [buttonFocused, setButtonFocused] = React.useState(false);

    useEffect(() => {
        cardOpacity.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.exp) });
        cardScale.value = withSpring(1, { damping: 15, stiffness: 100 });
        cardTranslateY.value = withSpring(0, { damping: 15, stiffness: 100 });
    }, [cardOpacity, cardScale, cardTranslateY]);

    const animatedCardStyle = useAnimatedStyle(() => ({
        opacity: cardOpacity.value,
        transform: [{ scale: cardScale.value }, { translateY: cardTranslateY.value }],
    }));

    return (
        <View style={styles.container}>
            {/* 1. Static Cinematic Background */}
            <View style={StyleSheet.absoluteFill}>
                <Svg height="100%" width="100%">
                    <Defs>
                        <LinearGradient id="bgBase" x1="0" y1="0" x2="0" y2="1">
                            <Stop offset="0" stopColor={colors.backgroundSecondary} />
                            <Stop offset="1" stopColor={colors.background} />
                        </LinearGradient>
                        <LinearGradient id="blobGrad1" x1="0" y1="0" x2="1" y2="1">
                            <Stop offset="0" stopColor={colors.backgroundElevated} stopOpacity="0.5" />
                            <Stop offset="1" stopColor={colors.backgroundElevated} stopOpacity="0" />
                        </LinearGradient>
                    </Defs>

                    <Rect width="100%" height="100%" fill="url(#bgBase)" />

                    {/* Static, subtle background shapes */}
                    <G opacity={0.3}>
                        <Circle cx={width * 0.2} cy={height * 0.2} r={width * 0.6} fill="url(#blobGrad1)" />
                        <Circle cx={width * 0.8} cy={height * 0.8} r={width * 0.5} fill="url(#blobGrad1)" />
                    </G>
                </Svg>
            </View>

            {/* 2. Content Card */}
            <Animated.View style={[styles.mainWrapper, animatedCardStyle]}>
                <View style={styles.contentCard}>
                    {/* Clean Icon */}
                    <View style={styles.iconContainer}>
                        <Icon name="warning" size={scale(56)} color={colors.error} />
                    </View>

                    {/* Typography */}
                    <Text style={styles.title}>{status}</Text>
                    <Text style={styles.message}>{message}</Text>

                    {/* Action Button */}
                    <Pressable
                        style={[
                            styles.button,
                            buttonFocused && styles.buttonFocused,
                        ]}
                        focusable
                        hasTVPreferredFocus
                        onFocus={() => setButtonFocused(true)}
                        onBlur={() => setButtonFocused(false)}
                        onPress={async () => {
                            await resetStore();
                            navigation.replace('Login');
                        }}
                    >
                        <Text style={styles.buttonText}>Return to Login</Text>
                    </Pressable>
                </View>
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
        justifyContent: 'center',
        alignItems: 'center',
    },
    mainWrapper: {
        width: '88%',
        maxWidth: 420,
        zIndex: 10,
    },
    contentCard: {
        backgroundColor: colors.backgroundSecondary,
        borderRadius: borderRadius.xl,
        paddingHorizontal: 32,
        paddingVertical: 48,
        alignItems: 'center',
        width: '100%',
        borderWidth: 1,
        borderColor: colors.borderMedium,
    },
    iconContainer: {
        marginBottom: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: scaleFont(28),
        color: colors.textPrimary,
        marginBottom: 12,
        fontWeight: '900',
        letterSpacing: 1.2,
        textAlign: 'center',
        textTransform: 'uppercase',
    },
    message: {
        fontSize: scaleFont(16),
        color: colors.textMuted,
        textAlign: 'center',
        marginBottom: 40,
        lineHeight: 24,
        fontWeight: '600',
    },
    button: {
        backgroundColor: colors.primary,
        height: 56,
        borderRadius: borderRadius.lg,
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.primaryLight,
    },
    buttonFocused: {
        transform: [{ scale: 1.04 }],
        borderColor: colors.textPrimary,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.45,
        shadowRadius: 14,
        elevation: 8,
    },
    buttonText: {
        color: colors.textPrimary,
        fontWeight: '800',
        fontSize: scaleFont(15),
        letterSpacing: 0.8,
        textTransform: 'uppercase',
    },
});

export default BlockedScreen;
