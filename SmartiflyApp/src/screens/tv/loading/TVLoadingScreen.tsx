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
import { colors, scale, scaleFont, Icon } from '../../../theme';
import { TVLoadingScreenProps } from '../../../navigation/types';

// TV Safe Area
const TV_SAFE_AREA = {
    horizontal: scale(48),
    vertical: scale(27),
};

// =============================================================================
// LOADING STEP INDICATOR
// =============================================================================

interface StepIndicatorProps {
    steps: Array<{ number: number; label: string; icon: string }>;
    currentStep: number;
}

const LoadingStepIndicator: React.FC<StepIndicatorProps> = ({ steps, currentStep }) => {
    return (
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
                                <Icon name="checkMark" size={scale(24)} color="#FFFFFF" />
                            ) : (
                                <Icon name={step.icon} size={scale(24)} color="rgba(255, 255, 255, 0.6)" />
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
};

// =============================================================================
// ERROR OVERLAY COMPONENT
// =============================================================================

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

// =============================================================================
// TV LOADING SCREEN COMPONENT
// =============================================================================

const TVLoadingScreen: React.FC<TVLoadingScreenProps> = ({ navigation }) => {
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

    // Guards to prevent double prefetch and multiple navigations
    const hasStarted = useRef(false);
    const hasNavigated = useRef(false);

    // Animations
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const progressAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.95)).current;
    const glowAnim = useRef(new Animated.Value(0)).current;

    const startPrefetch = React.useCallback(async () => {
        logger.info('Starting TV content prefetch...');
        const success = await prefetchAllContent();

        if (!success && error) {
            logger.error('Prefetch failed', error);
        }
    }, [prefetchAllContent, error]);

    const handleRetry = React.useCallback(async () => {
        hasStarted.current = false;
        hasNavigated.current = false;
        useStore.setState({ retryCount: 0 });
        await startPrefetch();
    }, [startPrefetch]);

    // =============================================================================
    // EFFECTS
    // =============================================================================

    // Start prefetch on mount
    useEffect(() => {
        if (hasStarted.current) return;
        hasStarted.current = true;
        startPrefetch();
    }, [startPrefetch]);

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
    }, [prefetchProgress, progressAnim]);

    // Pulse animation for logo
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
    }, [pulseAnim]);

    // Glow animation
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
    }, [glowAnim]);

    // Fade and scale in animation
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
    }, [fadeAnim, scaleAnim]);

    // Navigate when complete
    useEffect(() => {
        if (hasNavigated.current) return;

        const contentReady = getContentReady();

        if (contentReady && !isPrefetching) {
            hasNavigated.current = true;
            const stats = getContentStats();
            logger.info(`Content loaded: ${stats.live} channels, ${stats.movies} movies, ${stats.series} series`);

            // Celebrate animation then navigate
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
    }, [getContentReady, isPrefetching, getContentStats, navigation, scaleAnim]);

    // =============================================================================
    // FUNCTIONS
    // =============================================================================



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

    const contentReady = getContentReady();

    const steps = [
        { number: 1, label: 'Live TV', icon: 'broadcast' },
        { number: 2, label: 'Channels', icon: 'server' },
        { number: 3, label: 'Movies', icon: 'movie' },
        { number: 4, label: 'VOD', icon: 'monitorPlay' },
        { number: 5, label: 'Series', icon: 'layers' },
        { number: 6, label: 'Complete', icon: 'checkCircle' },
    ];

    const glowOpacity = glowAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.3, 0.8],
    });

    // =============================================================================
    // RENDER
    // =============================================================================

    return (
        <View style={styles.container}>
            <StatusBar hidden />

            {/* BACKGROUND - Same as TV Login Screen */}
            <Image
                source={require('../../../assets/overlay.png')}
                style={styles.backgroundImage}
                resizeMode="cover"
            />
            <View style={styles.darkOverlay} />
            <View style={styles.vignetteTop} pointerEvents="none" />
            <View style={styles.vignetteBottom} pointerEvents="none" />

            {/* MAIN CONTENT */}
            <Animated.View
                style={[
                    styles.content,
                    {
                        opacity: fadeAnim,
                        transform: [{ scale: scaleAnim }],
                    }
                ]}
            >
                {/* LEFT SECTION - Logo & Branding */}
                <View style={styles.leftSection}>
                    {/* Text Logo (Top) */}
                    <Image
                        source={require('../../../assets/smartifly_original_icon.png')}
                        style={styles.logoText}
                        resizeMode="contain"
                    />

                    {/* Wing Logo Icon (Bottom) */}
                    <Image
                        source={require('../../../assets/smartifly_icon.png')}
                        style={styles.logoIcon}
                        resizeMode="contain"
                    />

                    {/* Tagline for Premium feel */}
                    <Text style={styles.tagline}>Elevating Entertainment</Text>

                    {/* Footer Info */}
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

                {/* RIGHT SECTION - Progress */}
                <View style={styles.rightSection}>
                    {/* Status Title */}
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

                    {/* Progress Bar */}
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

                    {/* Percentage Display */}
                    <View style={styles.percentageContainer}>
                        <Text style={styles.percentageNumber}>
                            {progressPercentage}
                        </Text>
                        <Text style={styles.percentageSymbol}>%</Text>
                    </View>

                    {/* Current Task */}
                    <Text style={styles.currentTask}>
                        {prefetchProgress.currentTask || 'Initializing...'}
                    </Text>

                    {/* Step Indicators */}
                    <LoadingStepIndicator
                        steps={steps}
                        currentStep={prefetchProgress.current}
                    />
                </View>
            </Animated.View>

            {/* Error Overlay */}
            {error && !isPrefetching && !contentReady && (
                <ErrorOverlay
                    error={error}
                    onRetry={handleRetry}
                />
            )}

            {/* Bottom Hint */}
            <View style={styles.bottomHint}>
                <View style={styles.hintIndicator} />
                <Text style={styles.hintText}>LOADING YOUR ENTERTAINMENT</Text>
            </View>
        </View>
    );
};

// =============================================================================
// STYLES
// =============================================================================

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

    // Left Section - Logo
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
    logoGlow: {
        position: 'absolute',
        width: scale(320),
        height: scale(120),
        borderRadius: scale(20),
        backgroundColor: 'rgba(229, 9, 20, 0.3)',
        top: -scale(10),
        left: -scale(10),
        shadowColor: '#E50914',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: scale(40),
    },
    logoIcon: {
        width: scale(700),
        height: scale(250),
        marginTop: scale(-50), // Pull up to be "near" the top logo
    },
    logoText: {
        width: scale(250),
        height: scale(250),
        marginTop: 0,
    },
    BRAND_NAME_PLACEHOLDER: {
        fontSize: scaleFont(42),
        fontWeight: '800',
        color: '#FFFFFF',
        letterSpacing: 8,
        marginBottom: scale(8),
    },
    tagline: {
        fontSize: scaleFont(18),
        color: 'rgba(255, 255, 255, 0.6)',
        letterSpacing: 4,
        textTransform: 'uppercase',
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

    // Right Section - Progress
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
        fontSize: scaleFont(110),
        fontWeight: '900',
        color: '#FFFFFF',
        letterSpacing: -2,
    },
    percentageSymbol: {
        fontSize: scaleFont(42),
        fontWeight: '700',
        color: colors.accent || '#00E5FF',
        marginLeft: scale(4),
    },
    currentTask: {
        fontSize: scaleFont(20),
        color: colors.accent || '#00E5FF',
        fontWeight: '600',
        marginBottom: scale(50),
        textTransform: 'uppercase',
        letterSpacing: 2,
    },

    // Step Indicators
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
        marginLeft: scale(8),
        marginRight: scale(8),
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

    // Error Overlay
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

    // Bottom Hint
    bottomHint: {
        position: 'absolute',
        bottom: scale(30),
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    hintIndicator: {
        width: scale(10),
        height: scale(10),
        borderRadius: scale(5),
        backgroundColor: colors.accent || '#00E5FF',
        marginRight: scale(16),
        shadowColor: colors.accent || '#00E5FF',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: scale(10),
    },
    hintText: {
        fontSize: scaleFont(14),
        color: 'rgba(255, 255, 255, 0.5)',
        letterSpacing: 4,
        fontWeight: '600',
    },
});

export default TVLoadingScreen;
