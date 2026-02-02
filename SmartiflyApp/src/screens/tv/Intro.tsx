/**
 * TV Intro Screen
 * 
 * A high-fidelity, futuristic introduction flow for the Smartifly TV experience.
 * Uses the "Aether" design system with glassmorphism and neon accents.
 */

import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    Animated,
    Dimensions,
} from 'react-native';
import { useIntroStore } from '../../store/introStore';
import {
    scale,
    scaleFont,
    useTheme,
    textGlow,
    Icon,
} from '../../theme';

const { width } = Dimensions.get('window');

const INTRO_DATA = [
    {
        title: 'NEURAL INTERFACE',
        description: 'Welcome to the next generation of IPTV. A seamless, high-performance interface designed for the modern viewer.',
        icon: 'cpu',
        color: '#00F3FF', // Cyan
    },
    {
        title: 'AETHER DEPTH',
        description: 'Experience content with stunning glassmorphic depth and neon precision. Every pixel is optimized for your TV.',
        icon: 'layers',
        color: '#7000FF', // Violet
    },
    {
        title: 'SYSTEM READY',
        description: 'Your portal is synchronized. Get ready to explore the vast library of channels, movies, and series.',
        icon: 'check-circle',
        color: '#39FF14', // Neon Green
    },
];

const TVIntroScreen: React.FC<any> = ({ navigation }) => {
    const { currentStep, advanceStep, completeIntro } = useIntroStore();
    const { theme } = useTheme();
    const fadeAnim = React.useRef(new Animated.Value(0)).current;
    const slideAnim = React.useRef(new Animated.Value(20)).current;

    useEffect(() => {
        // Reset and trigger animations on step change
        fadeAnim.setValue(0);
        slideAnim.setValue(20);

        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 800,
                useNativeDriver: true,
            }),
        ]).start();
    }, [currentStep, fadeAnim, slideAnim]);

    const handleNext = async () => {
        if (currentStep < INTRO_DATA.length - 1) {
            await advanceStep();
        } else {
            await completeIntro();
            // Explicitly navigate to ensure we move forward
            if (navigation && navigation.replace) {
                navigation.replace('Login');
            }
        }
    };

    const data = INTRO_DATA[currentStep] || INTRO_DATA[0];

    const [buttonFocused, setButtonFocused] = useState(false);

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            {/* Background Atmosphere */}
            <View style={styles.atmosphere}>
                <View style={[styles.glowOrb, { backgroundColor: data.color }]} />
            </View>

            <Animated.View style={[
                styles.content,
                { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
            ]}>
                {/* Icon HUD */}
                <View style={[styles.iconContainer, { borderColor: data.color + '40' }]}>
                    <Icon name={data.icon} size={scale(80)} color={data.color} />
                    <View style={[styles.iconGlow, { backgroundColor: data.color }]} />
                </View>

                {/* Text Content */}
                <View style={styles.textContainer}>
                    <Text style={[styles.title, textGlow.neon, { color: data.color }]}>
                        {data.title}
                    </Text>
                    <Text style={styles.description}>
                        {data.description}
                    </Text>
                </View>

                {/* Progress Indicators */}
                <View style={styles.progressContainer}>
                    {INTRO_DATA.map((_, index) => (
                        <View
                            key={index}
                            style={[
                                styles.progressDot,
                                index === currentStep ? [styles.progressDotActive, { backgroundColor: data.color, shadowColor: data.color }] : styles.progressDotInactive
                            ]}
                        />
                    ))}
                </View>

                {/* Action HUD */}
                <Pressable
                    onPress={handleNext}
                    onFocus={() => setButtonFocused(true)}
                    onBlur={() => setButtonFocused(false)}
                    style={[
                        styles.button,
                        buttonFocused && styles.buttonFocused,
                        buttonFocused && { borderColor: data.color }
                    ]}
                >
                    <Text style={[styles.buttonText, { color: data.color }]}>
                        {currentStep === INTRO_DATA.length - 1 ? 'INITIALIZE SYSTEM' : 'NEXT SEQUENCE'}
                    </Text>
                    <Icon name="chevron-right" size={scale(24)} color={data.color} style={{ marginLeft: scale(10) }} />
                </Pressable>
            </Animated.View>

            {/* Corner Decorations */}
            <View style={styles.cornerTL} />
            <View style={styles.cornerBR} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    atmosphere: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
    },
    glowOrb: {
        width: width * 0.8,
        height: width * 0.8,
        borderRadius: width * 0.4,
        filter: 'blur(100px)',
        opacity: 0.15,
    },
    content: {
        width: width * 0.6,
        alignItems: 'center',
        zIndex: 10,
    },
    iconContainer: {
        width: scale(160),
        height: scale(160),
        borderRadius: scale(80),
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.03)',
        marginBottom: scale(50),
    },
    iconGlow: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        borderRadius: scale(80),
        opacity: 0.1,
        filter: 'blur(20px)',
    },
    textContainer: {
        alignItems: 'center',
        marginBottom: scale(60),
    },
    title: {
        fontSize: scaleFont(48),
        fontWeight: '900',
        letterSpacing: 8,
        marginBottom: scale(20),
        textAlign: 'center',
    },
    description: {
        fontSize: scaleFont(22),
        color: '#8E9AAF',
        textAlign: 'center',
        lineHeight: scale(32),
        fontWeight: '500',
    },
    progressContainer: {
        flexDirection: 'row',
        marginBottom: scale(60),
        alignItems: 'center',
    },
    progressDot: {
        width: scale(10),
        height: scale(10),
        borderRadius: scale(5),
        marginHorizontal: scale(8),
    },
    progressDotInactive: {
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    progressDotActive: {
        width: scale(40),
        shadowOpacity: 0.5,
        shadowRadius: 10,
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: scale(20),
        paddingHorizontal: scale(40),
        borderRadius: scale(50),
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    buttonFocused: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        transform: [{ scale: 1.1 }],
    },
    buttonText: {
        fontSize: scaleFont(18),
        fontWeight: '900',
        letterSpacing: 2,
    },
    cornerTL: {
        position: 'absolute',
        top: scale(60),
        left: scale(60),
        width: scale(100),
        height: scale(100),
        borderLeftWidth: 2,
        borderTopWidth: 2,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    cornerBR: {
        position: 'absolute',
        bottom: scale(60),
        right: scale(60),
        width: scale(100),
        height: scale(100),
        borderRightWidth: 2,
        borderBottomWidth: 2,
        borderColor: 'rgba(255,255,255,0.1)',
    },
});

export default TVIntroScreen;
