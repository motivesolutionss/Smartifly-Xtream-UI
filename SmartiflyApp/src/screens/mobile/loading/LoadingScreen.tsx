/**
 * Smartifly Loading Screen
 * 
 * Premium loading screen shown ONCE after login during content prefetch.
 * This is the ONLY time users will see loading - after this, everything is instant!
 * 
 * Features:
 * - Animated progress bar
 * - Step-by-step status
 * - Content count display
 * - Smooth transition to main app
 * - Uses dynamic getContentReady() for navigation decision
 */

import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Animated,
    Easing,
    ActivityIndicator,
    Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useStore from '../../../store';
import { logger } from '../../../config';
import { colors, spacing } from '../../../theme';

// =============================================================================
// TYPES
// =============================================================================

interface LoadingScreenProps {
    navigation: any;
}

// =============================================================================
// LOADING SCREEN COMPONENT
// =============================================================================

const LoadingScreen: React.FC<LoadingScreenProps> = ({ navigation }) => {
    const insets = useSafeAreaInsets();

    // Store - using dynamic getContentReady() instead of stored contentReady
    const prefetchAllContent = useStore((state) => state.prefetchAllContent);
    const isPrefetching = useStore((state) => state.isPrefetching);
    const prefetchProgress = useStore((state) => state.prefetchProgress);
    const getContentReady = useStore((state) => state.getContentReady);
    const error = useStore((state) => state.error);
    const getContentStats = useStore((state) => state.getContentStats);
    const isRetrying = useStore((state) => state.isRetrying);
    const retryCount = useStore((state) => state.retryCount);
    const maxRetries = useStore((state) => state.maxRetries);

    // FIX: Guards to prevent double prefetch and multiple navigations
    const hasStarted = useRef(false);
    const hasNavigated = useRef(false);

    // Animations
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const progressAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.9)).current;

    // =============================================================================
    // EFFECTS
    // =============================================================================

    // Start prefetch on mount (with guard to prevent double prefetch)
    useEffect(() => {
        if (hasStarted.current) return;
        hasStarted.current = true;
        startPrefetch();
    }, []);

    // Animate progress bar
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

    // Pulse animation for logo
    useEffect(() => {
        const pulse = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.05,
                    duration: 1200,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 1200,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
            ])
        );
        pulse.start();
        return () => pulse.stop();
    }, []);

    // Fade and scale in animation
    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 600,
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

    // Navigate when complete (using dynamic getContentReady)
    useEffect(() => {
        if (hasNavigated.current) return;

        // Use dynamic getter instead of stored value
        const contentReady = getContentReady();

        if (contentReady && !isPrefetching) {
            hasNavigated.current = true;
            const stats = getContentStats();
            logger.info(`Content loaded: ${stats.live} channels, ${stats.movies} movies, ${stats.series} series`);

            // Celebrate with a small animation then navigate
            Animated.sequence([
                Animated.timing(scaleAnim, {
                    toValue: 1.1,
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
                        routes: [{ name: 'MainTabs' }],
                    });
                }, 300);
            });
        }
    }, [getContentReady, isPrefetching]);

    // =============================================================================
    // FUNCTIONS
    // =============================================================================

    const startPrefetch = async () => {
        logger.info('Starting content prefetch...');
        const success = await prefetchAllContent();

        if (!success && error) {
            logger.error('Prefetch failed', error);
        }
    };

    const handleRetry = async () => {
        // Reset guards to allow retry
        hasStarted.current = false;
        hasNavigated.current = false;
        // Reset retry count in store before manual retry
        useStore.setState({ retryCount: 0 });
        await startPrefetch();
    };

    // =============================================================================
    // COMPUTED VALUES
    // =============================================================================

    const progressWidth = progressAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0%', '100%'],
    });

    const progressPercentage = prefetchProgress.total > 0
        ? Math.round((prefetchProgress.current / prefetchProgress.total) * 100)
        : 0;

    // Use dynamic getter
    const contentReady = getContentReady();

    const getStepStatus = (stepNumber: number) => {
        if (prefetchProgress.current > stepNumber) return 'complete';
        if (prefetchProgress.current === stepNumber) return 'active';
        return 'pending';
    };

    const steps = [
        { number: 1, label: 'Live TV', icon: '📺' },
        { number: 2, label: 'Channels', icon: '📡' },
        { number: 3, label: 'Movies', icon: '🎬' },
        { number: 4, label: 'VOD', icon: '🎥' },
        { number: 5, label: 'Series', icon: '📺' },
        { number: 6, label: 'Shows', icon: '🎭' },
    ];

    // =============================================================================
    // RENDER
    // =============================================================================

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    paddingTop: insets.top,
                    paddingBottom: insets.bottom,
                    opacity: fadeAnim,
                    transform: [{ scale: scaleAnim }],
                }
            ]}
        >
            {/* Logo Section */}
            <View style={styles.logoSection}>
                <Animated.View
                    style={[
                        styles.logoContainer,
                        { transform: [{ scale: pulseAnim }] }
                    ]}
                >
                    <Image
                        source={require('../../../assets/smartifly_icon.png')}
                        style={styles.logoImage}
                        resizeMode="contain"
                    />
                </Animated.View>
                <Text style={styles.appName}>SMARTIFLY</Text>
                <Text style={styles.tagline}>Premium Streaming</Text>
            </View>

            {/* Progress Section */}
            <View style={styles.progressSection}>
                <Text style={styles.statusTitle}>
                    {contentReady ? 'Ready!' : isRetrying ? 'Retrying...' : 'Preparing Your Content'}
                </Text>
                <Text style={styles.statusSubtitle}>
                    {contentReady
                        ? 'Launching app...'
                        : isRetrying
                            ? `Attempt ${retryCount}/${maxRetries} - Auto-retry in progress`
                            : 'This only happens once after login'
                    }
                </Text>

                {/* Progress Bar */}
                <View style={styles.progressBarContainer}>
                    <Animated.View
                        style={[
                            styles.progressBar,
                            { width: progressWidth }
                        ]}
                    />
                    <View style={styles.progressGlow} />
                </View>

                {/* Percentage */}
                <Text style={styles.progressText}>
                    {progressPercentage}%
                </Text>

                {/* Current Task */}
                <Text style={styles.currentTask}>
                    {prefetchProgress.currentTask || 'Initializing...'}
                </Text>

                {/* Step Indicators */}
                <View style={styles.stepsContainer}>
                    {steps.map((step, index) => {
                        const status = getStepStatus(step.number);
                        return (
                            <View key={step.number} style={styles.stepWrapper}>
                                <View style={[
                                    styles.stepItem,
                                    status === 'complete' && styles.stepItemComplete,
                                    status === 'active' && styles.stepItemActive,
                                ]}>
                                    {status === 'active' ? (
                                        <ActivityIndicator size="small" color={colors.accent} />
                                    ) : status === 'complete' ? (
                                        <Text style={styles.stepCheck}>✓</Text>
                                    ) : (
                                        <Text style={styles.stepIcon}>{step.icon}</Text>
                                    )}
                                </View>
                                {index < steps.length - 1 && (
                                    <View style={[
                                        styles.stepConnector,
                                        status === 'complete' && styles.stepConnectorComplete,
                                    ]} />
                                )}
                            </View>
                        );
                    })}
                </View>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
                <View style={styles.footerDivider} />
                <Text style={styles.footerText}>
                    Content is cached for instant access
                </Text>
                <Text style={styles.footerSubtext}>
                    Next refresh in 6 hours
                </Text>
            </View>

            {/* Error State */}
            {error && !isPrefetching && !contentReady && (
                <View style={styles.errorOverlay}>
                    <Text style={styles.errorText}>{error.message}</Text>
                    <Text
                        style={styles.retryButton}
                        onPress={handleRetry}
                    >
                        Tap to Retry
                    </Text>
                </View>
            )}
        </Animated.View>
    );
};

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
        justifyContent: 'space-between',
    },

    // Logo Section
    logoSection: {
        alignItems: 'center',
        paddingTop: 60,
    },
    logoContainer: {
        marginBottom: spacing.lg,
    },
    logoImage: {
        width: 100,
        height: 100,
    },
    appName: {
        fontSize: 32,
        fontWeight: '800',
        color: colors.textPrimary,
        letterSpacing: 6,
    },
    tagline: {
        fontSize: 14,
        color: colors.textMuted,
        marginTop: spacing.xs,
        letterSpacing: 2,
    },

    // Progress Section
    progressSection: {
        alignItems: 'center',
        paddingHorizontal: spacing.xl,
    },
    statusTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: spacing.xs,
    },
    statusSubtitle: {
        fontSize: 14,
        color: colors.textSecondary,
        marginBottom: spacing.xl,
    },
    progressBarContainer: {
        width: '100%',
        height: 8,
        backgroundColor: colors.backgroundTertiary,
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: spacing.md,
    },
    progressBar: {
        height: '100%',
        backgroundColor: colors.primary,
        borderRadius: 4,
    },
    progressGlow: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: colors.primary,
        opacity: 0.2,
    },
    progressText: {
        fontSize: 36,
        fontWeight: '800',
        color: colors.textPrimary,
        marginBottom: spacing.xs,
    },
    currentTask: {
        fontSize: 14,
        color: colors.accent,
        fontWeight: '500',
        marginBottom: spacing.xxl,
    },

    // Steps
    stepsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    stepWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    stepItem: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.backgroundTertiary,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: colors.border,
    },
    stepItemActive: {
        borderColor: colors.accent,
        backgroundColor: colors.backgroundSecondary,
    },
    stepItemComplete: {
        borderColor: colors.success,
        backgroundColor: colors.success,
    },
    stepIcon: {
        fontSize: 14,
    },
    stepCheck: {
        fontSize: 16,
        color: colors.textPrimary,
        fontWeight: '700',
    },
    stepConnector: {
        width: 16,
        height: 2,
        backgroundColor: colors.border,
        marginHorizontal: 2,
    },
    stepConnectorComplete: {
        backgroundColor: colors.success,
    },

    // Footer
    footer: {
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.xl,
    },
    footerDivider: {
        width: 40,
        height: 3,
        backgroundColor: colors.border,
        borderRadius: 2,
        marginBottom: spacing.md,
    },
    footerText: {
        fontSize: 13,
        color: colors.textMuted,
    },
    footerSubtext: {
        fontSize: 11,
        color: colors.textMuted,
        opacity: 0.6,
        marginTop: spacing.xs,
    },

    // Error
    errorOverlay: {
        position: 'absolute',
        bottom: 100,
        left: spacing.xl,
        right: spacing.xl,
        backgroundColor: colors.backgroundSecondary,
        borderRadius: 12,
        padding: spacing.lg,
        borderWidth: 1,
        borderColor: colors.primary,
        alignItems: 'center',
    },
    errorText: {
        fontSize: 14,
        color: colors.primary,
        textAlign: 'center',
        marginBottom: spacing.md,
    },
    retryButton: {
        fontSize: 14,
        color: colors.accent,
        fontWeight: '600',
    },
});

export default LoadingScreen;
