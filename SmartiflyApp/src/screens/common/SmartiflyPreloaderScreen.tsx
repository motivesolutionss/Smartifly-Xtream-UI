import React, { useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  withSequence,
  withRepeat,
  Easing,
} from 'react-native-reanimated';
import { scale, scaleFont } from '../../theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Premium Quartic-like Bezier for enterprise feel
const PREMIUM_EASING = Easing.bezier(0.16, 1, 0.3, 1);

/**
 * AnimatedCharacter Component
 * Layered bloom effect for professional typography radiance
 */
const AnimatedCharacter: React.FC<{ char: string; index: number }> = ({
  char,
  index
}) => {
  const opacity = useSharedValue(0);
  const scaleVal = useSharedValue(0.2);
  const translateY = useSharedValue(30);
  const blurOpacity = useSharedValue(0);

  useEffect(() => {
    const delay = index * 70;

    opacity.value = withDelay(delay, withTiming(1, { duration: 800, easing: PREMIUM_EASING }));
    scaleVal.value = withDelay(delay, withTiming(1, { duration: 1000, easing: PREMIUM_EASING }));
    translateY.value = withDelay(delay, withTiming(0, { duration: 900, easing: PREMIUM_EASING }));

    // Atmospheric breathing for the glow
    blurOpacity.value = withDelay(
      delay + 1000,
      withRepeat(
        withSequence(
          withTiming(0.6, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.3, { duration: 3000, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        true
      )
    );
  }, [index, opacity, scaleVal, translateY, blurOpacity]);

  const mainStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { scale: scaleVal.value },
      { translateY: translateY.value },
    ],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: blurOpacity.value * opacity.value,
  }));

  return (
    <View style={styles.charWrapper}>
      <Animated.View style={[styles.charContainer, mainStyle]}>
        <Text style={styles.title}>{char}</Text>

        {/* Layered Bloom System */}
        <Animated.View style={[StyleSheet.absoluteFill, glowStyle]}>
          <Text style={[styles.title, styles.glowInner]}>{char}</Text>
          <Text style={[styles.title, styles.glowOuter]}>{char}</Text>
        </Animated.View>
      </Animated.View>
    </View>
  );
};

/**
 * Atmospheric Dust Particles
 */
const AtmosphericParticle: React.FC<{ index: number }> = ({ index }) => {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(0);

  const startX = useMemo(() => Math.random() * SCREEN_WIDTH, []);
  const startY = useMemo(() => Math.random() * SCREEN_HEIGHT, []);
  const size = useMemo(() => 1 + Math.random() * 2, []);
  const duration = useMemo(() => 5000 + Math.random() * 5000, []);

  useEffect(() => {
    const delay = index * 150;
    opacity.value = withDelay(delay, withTiming(Math.random() * 0.4, { duration: 2000 }));
    translateY.value = withRepeat(
      withTiming(-40 - Math.random() * 60, { duration, easing: Easing.linear }),
      -1,
      false
    );
  }, [index, opacity, translateY, duration]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          left: startX,
          top: startY,
          width: size,
          height: size,
          borderRadius: size / 2,
        },
        animStyle,
      ]}
    />
  );
};

/**
 * Minimalist Enterprise Progress Indicator
 */
const ModernProgressBar: React.FC = () => {
  const progress = useSharedValue(0);
  const shimmer = useSharedValue(-100);

  useEffect(() => {
    progress.value = withTiming(1, { duration: 3500, easing: Easing.inOut(Easing.sin) });
    shimmer.value = withRepeat(
      withTiming(200, { duration: 1500, easing: Easing.linear }),
      -1,
      false
    );
  }, [progress, shimmer]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shimmer.value }],
  }));

  return (
    <View style={styles.progressContainer}>
      <View style={styles.progressBarTrack}>
        <Animated.View style={[styles.progressBarFill, barStyle]}>
          <Animated.View style={[styles.plasmaShimmer, shimmerStyle]} />
        </Animated.View>
      </View>
      <Text style={styles.loadingText}>INITIALIZING ENGINE</Text>
    </View>
  );
};

/**
 * Main Preloader Screen
 */
const SmartiflyPreloaderScreen: React.FC = () => {
  const logoText = "SMARTIFLY";
  const characters = useMemo(() => logoText.split(''), []);

  return (
    <View style={styles.container}>
      <StatusBar hidden />

      {/* Atmosphere */}
      <View style={StyleSheet.absoluteFill}>
        {Array.from({ length: 25 }).map((_, i) => (
          <AtmosphericParticle key={i} index={i} />
        ))}
      </View>

      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <View style={styles.charactersRow}>
            {characters.map((char, i) => (
              <AnimatedCharacter key={i} char={char} index={i} />
            ))}
          </View>
        </View>

        <View style={styles.footer}>
          <ModernProgressBar />
        </View>
      </View>

      {/* Cinematic Vignette */}
      <View style={styles.vignette} pointerEvents="none" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },

  vignette: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    borderWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 100,
  },
  particle: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  logoContainer: {
    marginBottom: scale(60),
  },
  charactersRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  charWrapper: {
    marginHorizontal: scale(2),
  },
  charContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: scaleFont(90),
    fontWeight: '900',
    color: '#E50914',
    letterSpacing: scale(4),
  },
  glowInner: {
    position: 'absolute',
    color: '#E50914',
    textShadowColor: '#E50914',
    textShadowRadius: 15,
    opacity: 0.8,
  },
  glowOuter: {
    position: 'absolute',
    color: '#E50914',
    textShadowColor: '#E50914',
    textShadowRadius: 40,
    opacity: 0.4,
  },
  footer: {
    width: '100%',
    alignItems: 'center',
    marginTop: scale(40),
  },
  progressContainer: {
    width: scale(240),
    alignItems: 'center',
  },
  progressBarTrack: {
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#E50914',
    position: 'relative',
    shadowColor: '#E50914',
    shadowRadius: 5,
    shadowOpacity: 0.5,
  },
  plasmaShimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 60,
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  loadingText: {
    marginTop: scale(15),
    fontSize: scaleFont(10),
    color: 'rgba(255, 255, 255, 0.4)',
    letterSpacing: scale(6),
    fontWeight: '600',
  },
});

export default SmartiflyPreloaderScreen;