import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    Easing
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Stop, Rect, Path, G, Circle } from 'react-native-svg';
import useStore from '../../store';
import { scale, scaleFont } from '../../theme';

const { width, height } = Dimensions.get('window');

const BlockedScreen = ({ navigation, route }: any) => {
    const message = route.params?.message || 'This device is globally banned from using Smartifly Services.';
    const status = route.params?.status || 'BANNED';
    const resetStore = useStore((state) => state.resetStore);

    // Card Animations (Entrance only)
    const cardOpacity = useSharedValue(0);
    const cardScale = useSharedValue(0.95);
    const cardTranslateY = useSharedValue(10);

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
                            <Stop offset="0" stopColor="#0B0F1A" />
                            <Stop offset="1" stopColor="#000000" />
                        </LinearGradient>
                        <LinearGradient id="blobGrad1" x1="0" y1="0" x2="1" y2="1">
                            <Stop offset="0" stopColor="#1E293B" stopOpacity="0.4" />
                            <Stop offset="1" stopColor="#1E293B" stopOpacity="0" />
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
                        <Svg width={scale(64)} height={scale(64)} viewBox="0 0 24 24">
                            <Path
                                d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM4 12c0-4.42 3.58-8 8-8 1.85 0 3.55.63 4.9 1.69L5.69 16.9C4.63 15.55 4 13.85 4 12zm8 8c-1.85 0-3.55-.63-4.9-1.69L18.31 7.1C19.37 8.45 20 10.15 20 12c0 4.42-3.58 8-8 8z"
                                fill="#EF4444"
                            />
                        </Svg>
                    </View>

                    {/* Typography */}
                    <Text style={styles.title}>{status}</Text>
                    <Text style={styles.message}>{message}</Text>

                    {/* Action Button */}
                    <TouchableOpacity
                        activeOpacity={0.8}
                        style={styles.button}
                        onPress={async () => {
                            await resetStore();
                            navigation.replace('Login');
                        }}
                    >
                        <Text style={styles.buttonText}>Return to Login</Text>
                    </TouchableOpacity>
                </View>
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
    },
    mainWrapper: {
        width: '88%',
        maxWidth: 420,
        zIndex: 10,
    },
    contentCard: {
        backgroundColor: '#111827',
        borderRadius: 24,
        paddingHorizontal: 32,
        paddingVertical: 48,
        alignItems: 'center',
        width: '100%',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    iconContainer: {
        marginBottom: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: scaleFont(28),
        color: '#FFFFFF',
        marginBottom: 12,
        fontWeight: '900',
        letterSpacing: 2,
        textAlign: 'center',
        textTransform: 'uppercase',
    },
    message: {
        fontSize: scaleFont(16),
        color: 'rgba(255, 255, 255, 0.5)',
        textAlign: 'center',
        marginBottom: 40,
        lineHeight: 24,
        fontWeight: '500',
    },
    button: {
        backgroundColor: '#EF4444',
        height: 56,
        borderRadius: 16,
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonText: {
        color: '#FFFFFF',
        fontWeight: '800',
        fontSize: scaleFont(15),
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
});

export default BlockedScreen;

