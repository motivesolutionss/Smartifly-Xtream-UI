/**
 * Smartifly TV Loading Screen - Premium Edition
 * 
 * TV-optimized loading screen shown ONCE after login during content prefetch.
 * Features:
 * - Horizontal layout for landscape TV
 * - Premium animations (pulse, progress, step indicators)
 * - Movie poster backdrop
 * - D-pad support for retry button
 * - Large TV-readable typography
 */

import React, { useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Animated,
    Easing,
    ActivityIndicator,
    StatusBar,
    Pressable,
    Image,
} from 'react-native';
import useStore from '../../../store';
import { logger } from '../../../config';
import { colors, scale, scaleFont } from '../../../theme';

interface TVLoadingScreenProps {
    navigation: any;
}

const TV_SAFE_AREA = {
    horizontal: scale(48),
    vertical: scale(27),
};

interface StepIndicatorProps {
    steps: Array<{ number: number; label: string; icon: string }>;
    currentStep: number;
}

const LoadingStepIndicator: React.FC<StepIndicatorProps> = ({ steps, currentStep }) => (
    <View style={styles.stepsContainer}>
        {steps.map((step, index) => {
            const isComplete = currentStep > step.number;
            const isActive = currentStep === step.number;

            return (
                <View key={step.number} style={styles.stepWrapper}>
                    <Animated.View
                        style={[
                            styles.stepItem,
                            isComplete && styles.stepItemComplete,
                            isActive && styles.stepItemActive,
                        ]}
                    >
                        {isActive ? (
                            <ActivityIndicator size="small" color={colors.accent} />
                        ) : isComplete ? (
                            <Text style={styles.stepCheck}>✔</Text>
                        ) : (
                            <Text style={styles.stepIcon}>{step.icon}</Text>
                        )}
                    </Animated.View>
                    <Text style={[
                        styles.stepLabel,
                        isComplete && styles.stepLabelComplete,
                        isActive && styles.stepLabelActive,
                    ]}>
                        {step.label}
                    </Text>
                    {index < steps.length - 1 && (
                        <View style={[
                            styles.stepConnector,
                            isComplete && styles.stepConnectorComplete,
                        ]} />
                    )}
                </View>
            );
        })}
    </View>
);

interface ErrorOverlayProps {
    error: { message: string };
    onRetry: () => void;
}

const ErrorOverlay: React.FC<ErrorOverlayProps> = ({ error, onRetry }) => {
    const [isFocused, setIsFocused] = useState(false);

    return (
        <View style={styles.errorOverlay}>
            <View style={styles.errorCard}>
                <Text style={styles.errorIcon}>⚠️</Text>
                <Text style={styles.errorText}>{error.message}</Text>
                <Pressable
                    onPress={onRetry}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    style={[
                        styles.retryButton,
                        isFocused && styles.retryButtonFocused,
                    ]}
                >
                    <Text style={[
                        styles.retryButtonText,
                        isFocused && styles.retryButtonTextFocused,
                    ]}>
                        Try Again
                    </Text>
                </Pressable>
            </View>
        </View>
    );
};

const TVLoadingScreen: React.FC<TVLoadingScreenProps> = ({ navigation }) => {
    const prefetchAllContent = useStore((state) => state.prefetchAllContent);
    const isPrefetching = useStore((state) => state.isPrefetching);
    const prefetchProgress = useStore((state) => state.prefetchProgress);
    const getContentReady = useStore((state) => state.getContentReady);
    const error = useStore((state) => state.error);
    const getContentStats = useStore((state) => state.getContentStats);
    const isRetrying = useStore((state) => state.isRetrying);
    const retryCount = useStore((state) => state.retryCount);
    const maxRetries = useStore((state) => state.maxRetries);

    const hasStarted = useRef(false);
    const hasNavigated = useRef(false);

    const pulseAnim = useRef(new Animated.Value(1)).current;
    const progressAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.95)).current;
    const glowAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (hasStarted.current) return;
        hasStarted.current = true;
        startPrefetch();
    }, []);

    useEffect(() => {
        const progress = prefetchProgress.total > 0
            ? prefetchProgress.current / prefetchProgress.total
            : 0;

        Animated.timing(progressAnim, {
            toValue: progress,
            duration: 400,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
        }).start();
    }, [prefetchProgress.current, prefetchProgress.total]);

    useEffect(() => {
        const pulse = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.05,
                    duration: 1500,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 1500,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
            ])
        );
        pulse.start();
        return () => pulse.stop();
    }, []);

    useEffect(() => {
        const glow = Animated.loop(
            Animated.sequence([
                Animated.timing(glowAnim, {
                    toValue: 1,
                    duration: 2000,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(glowAnim, {
                    toValue: 0.3,
                    duration: 2000,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
            ])
        );
        glow.start();
        return () => glow.stop();
    }, []);

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                friction: 8,
                tension: 40,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    useEffect(() => {
        if (hasNavigated.current) return;

        const contentReady = getContentReady();

        if (contentReady && !isPrefetching) {
            hasNavigated.current = true;
            const stats = getContentStats();
            logger.info(`Content loaded: ${stats.live} channels, ${stats.movies} movies, ${stats.series} series`);

            Animated.sequence([
                Animated.timing(scaleAnim, {
                    toValue: 1.05,
                    duration: 200,
                    useNativeDriver: true,
                }),
                Animated.timing(scaleAnim, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start(() => {
                setTimeout(() => {
                    navigation.reset({
                        index: 0,
                        routes: [{ name: 'TVHome' }],
                    });
                }, 300);
            });
        }
    }, [getContentReady, isPrefetching]);

    const startPrefetch = async () => {
        logger.info('Starting TV content prefetch...');
        const success = await prefetchAllContent();

        if (!success && error) {
            logger.error('Prefetch failed', error);
        }
    };

    const handleRetry = async () => {
        hasStarted.current = false;
        hasNavigated.current = false;
        useStore.setState({ retryCount: 0 });
        await startPrefetch();
    };

    const progressWidth = progressAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0%', '100%'],
    });

    const progressPercentage = prefetchProgress.total > 0
        ? Math.round((prefetchProgress.current / prefetchProgress.total) * 100)
        : 0;

    const contentReady = getContentReady();

    const steps = [
        { number: 1, label: 'Live TV', icon: '📺' },
        { number: 2, label: 'Channels', icon: '💡' },
        { number: 3, label: 'Movies', icon: '🎬' },
        { number: 4, label: 'VOD', icon: '🎥' },
        { number: 5, label: 'Series', icon: '📺' },
        { number: 6, label: 'Complete', icon: '✨' },
    ];

    const glowOpacity = glowAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.3, 0.8],
    });

    return (
        <View style={styles.container}>
            <StatusBar hidden />

            <Image
                source={require('../../../assets/overlay_1.1.png')}
                style={styles.backgroundImage}
                resizeMode="cover"
            />
            <View style={styles.darkOverlay} />
            <View style={styles.vignetteTop} pointerEvents="none" />
            <View style={styles.vignetteBottom} pointerEvents="none" />

            <Animated.View
                style={[
                    styles.content,
                    {
                        opacity: fadeAnim,
                        transform: [{ scale: scaleAnim }],
                    }
                ]}
            >
                <View style={styles.leftSection}>
                    <View style={styles.logoContainer}>
                        <Image
                            source={require('../../../assets/smartifly_icon_5.png')}
                            style={styles.logoIcon}
                            resizeMode="contain"
                        />
                    </View>

                    <Image
                        source={require('../../../assets/smartifly_icon_6.png')}
                        style={styles.logoText}
                        resizeMode="contain"
                    />

                    <View style={styles.footerInfo}>
                        <View style={styles.footerDivider} />
                        <Text style={styles.footerText}>
                            Content is cached for instant access
                        </Text>
                        <Text style={styles.footerSubtext}>
                            Next refresh in 6 hours
                        </Text>
                    </View>
                </View>

                <View style={styles.rightSection}>
                    <Text style={styles.statusTitle}>
                        {contentReady
                            ? '🎉 Ready!'
                            : isRetrying
                                ? 'Retrying...'
                                : 'Preparing Your Content'
                        }
                    </Text>
                    <Text style={styles.statusSubtitle}>
                        {contentReady
                            ? 'Launching your entertainment...'
                            : isRetrying
                                ? `Attempt ${retryCount}/${maxRetries}`
                                : 'This only happens once after login'
                        }
                    </Text>

                    <View style={styles.progressBarContainer}>
                        <Animated.View
                            style={[
                                styles.progressBar,
                                { width: progressWidth }
                            ]}
                        />
                        <Animated.View
                            style={[
                                styles.progressGlow,
                                { opacity: glowOpacity }
                            ]}
                        />
                    </View>

                    <View style={styles.percentageContainer}>
                        <Text style={styles.percentageNumber}>
                            {progressPercentage}
                        </Text>
                        <Text style={styles.percentageSymbol}>%</Text>
                    </View>

                    <Text style={styles.currentTask}>
                        {prefetchProgress.currentTask || 'Initializing...'}
                    </Text>

                    <LoadingStepIndicator
                        steps={steps}
                        currentStep={prefetchProgress.current}
                    />
                </View>
            </Animated.View>

            {error && !isPrefetching && !contentReady && (
                <ErrorOverlay
                    error={error}
                    onRetry={handleRetry}
                />
            )}

            <View style={styles.bottomHint}>
                <View style={styles.hintIndicator} />
                <Text style={styles.hintText}>LOADING YOUR ENTERTAINMENT</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000000',
    },
    backgroundImage: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        opacity: 0.65,
    },
    darkOverlay: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
    },
    vignetteTop: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        left: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    vignetteBottom: {
        position: 'absolute',
        width: '100%',
        height: scale(120),
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
    },
    content: {
        flex: 1,
        flexDirection: 'row',
        paddingHorizontal: TV_SAFE_AREA.horizontal,
        paddingVertical: TV_SAFE_AREA.vertical,
    },
    leftSection: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingRight: scale(60),
    },
    logoContainer: {
        position: 'relative',
        marginBottom: 0,
    },
    logoIcon: {
        width: scale(180),
        height: scale(180),
    },
    logoText: {
        width: scale(550),
        height: scale(180),
    },
    footerInfo: {
        position: 'absolute',
        bottom: scale(40),
        alignItems: 'center',
    },
    footerDivider: {
        width: scale(60),
        height: scale(3),
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: scale(2),
        marginBottom: scale(16),
    },
    footerText: {
        fontSize: scaleFont(14),
        color: 'rgba(255, 255, 255, 0.5)',
    },
    footerSubtext: {
        fontSize: scaleFont(12),
        color: 'rgba(255, 255, 255, 0.3)',
        marginTop: scale(4),
    },
    rightSection: {
        flex: 1.2,
        justifyContent: 'center',
        paddingLeft: scale(60),
        borderLeftWidth: 1,
        borderLeftColor: 'rgba(255, 255, 255, 0.1)',
    },
    statusTitle: {
        fontSize: scaleFont(36),
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: scale(8),
    },
    statusSubtitle: {
        fontSize: scaleFont(16),
        color: 'rgba(255, 255, 255, 0.6)',
        marginBottom: scale(40),
    },
    progressBarContainer: {
        width: '100%',
        height: scale(12),
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: scale(6),
        overflow: 'hidden',
        marginBottom: scale(24),
    },
    progressBar: {
        height: '100%',
        backgroundColor: colors.accent || '#00E5FF',
        borderRadius: scale(6),
    },
    progressGlow: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: colors.accent || '#00E5FF',
    },
    percentageContainer: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginBottom: scale(8),
    },
    percentageNumber: {
        fontSize: scaleFont(72),
        fontWeight: '800',
        color: '#FFFFFF',
    },
    percentageSymbol: {
        fontSize: scaleFont(32),
        fontWeight: '700',
        color: colors.accent || '#00E5FF',
        marginLeft: scale(4),
    },
    currentTask: {
        fontSize: scaleFont(18),
        color: colors.accent || '#00E5FF',
        fontWeight: '600',
        marginBottom: scale(40),
    },
    stepsContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: scale(8),
    },
    stepWrapper: {
        alignItems: 'center',
        flexDirection: 'row',
    },
    stepItem: {
        width: scale(48),
        height: scale(48),
        borderRadius: scale(24),
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    stepItemActive: {
        borderColor: colors.accent || '#00E5FF',
        backgroundColor: 'rgba(0, 229, 255, 0.1)',
    },
    stepItemComplete: {
        borderColor: '#10B981',
        backgroundColor: '#10B981',
    },
    stepIcon: {
        fontSize: scaleFont(18),
    },
    stepCheck: {
        fontSize: scaleFont(20),
        color: '#FFFFFF',
        fontWeight: '700',
    },
    stepLabel: {
        fontSize: scaleFont(11),
        color: 'rgba(255, 255, 255, 0.5)',
        marginHorizontal: scale(8),
    },
    stepLabelActive: {
        color: colors.accent || '#00E5FF',
        fontWeight: '600',
    },
    stepLabelComplete: {
        color: '#10B981',
    },
    stepConnector: {
        width: scale(20),
        height: 2,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        marginHorizontal: scale(4),
    },
    stepConnectorComplete: {
        backgroundColor: '#10B981',
    },
    errorOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorCard: {
        backgroundColor: 'rgba(20, 20, 30, 0.95)',
        borderRadius: scale(20),
        padding: scale(40),
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E50914',
        maxWidth: scale(500),
    },
    errorIcon: {
        fontSize: scaleFont(48),
        marginBottom: scale(16),
    },
    errorText: {
        fontSize: scaleFont(18),
        color: '#FFFFFF',
        textAlign: 'center',
        marginBottom: scale(24),
    },
    retryButton: {
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: colors.accent || '#00E5FF',
        borderRadius: scale(12),
        paddingVertical: scale(16),
        paddingHorizontal: scale(48),
    },
    retryButtonFocused: {
        backgroundColor: colors.accent || '#00E5FF',
    },
    retryButtonText: {
        fontSize: scaleFont(18),
        color: colors.accent || '#00E5FF',
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 2,
    },
    retryButtonTextFocused: {
        color: '#000000',
    },
    bottomHint: {
        position: 'absolute',
        bottom: scale(20),
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    hintIndicator: {
        width: scale(8),
        height: scale(8),
        borderRadius: scale(4),
        backgroundColor: '#10B981',
        marginRight: scale(12),
    },
    hintText: {
        fontSize: scaleFont(12),
        color: 'rgba(255, 255, 255, 0.4)',
        letterSpacing: 3,
    },
});

export default TVLoadingScreen;
