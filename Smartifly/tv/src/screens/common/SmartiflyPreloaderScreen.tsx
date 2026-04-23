import React, { useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  useWindowDimensions,
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
import { colors, scale, scaleFont } from '../../theme';

// Premium Quartic-like Bezier for enterprise feel
const PREMIUM_EASING = Easing.bezier(0.16, 1, 0.3, 1);

/**
 * AnimatedCharacter Component
 * Layered bloom effect for professional typography radiance
 */
const AnimatedCharacter: React.FC<{
  char: string;
  index: number;
  fontSize: number;
  letterSpacing: number;
  horizontalGap: number;
  slotWidth: number;
}> = ({
  char,
  index,
  fontSize,
  letterSpacing,
  horizontalGap,
  slotWidth,
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
    <View style={[styles.charWrapper, { marginHorizontal: horizontalGap, width: slotWidth }]}>
      <Animated.View style={[styles.charContainer, mainStyle]}>
        <Text style={[styles.title, { fontSize, letterSpacing }]}>{char}</Text>

        {/* Layered Bloom System */}
        <Animated.View style={[StyleSheet.absoluteFill, glowStyle]}>
          <Text style={[styles.title, styles.glowInner, { fontSize, letterSpacing }]}>{char}</Text>
          <Text style={[styles.title, styles.glowOuter, { fontSize, letterSpacing }]}>{char}</Text>
        </Animated.View>
      </Animated.View>
    </View>
  );
};

/**
 * Atmospheric Dust Particles
 */
const AtmosphericParticle: React.FC<{ index: number; width: number; height: number }> = ({
  index,
  width,
  height,
}) => {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(0);

  const startX = useMemo(() => Math.random() * width, [width]);
  const startY = useMemo(() => Math.random() * height, [height]);
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
const ModernProgressBar: React.FC<{ width: number }> = ({ width }) => {
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
    <View style={[styles.progressContainer, { width }]}>
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
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const logoText = "SMARTIFLY";
  const characters = useMemo(() => logoText.split(''), []);
  const logoMetrics = useMemo(() => {
    const horizontalPadding = Math.max(16, Math.floor(screenWidth * 0.06));
    const availableWidth = Math.max(220, screenWidth - horizontalPadding * 2);
    const chars = logoText.length;
    const widthPerChar = availableWidth / chars;

    // Keep the cinematic look but ensure the full word fits every screen width.
    const fontSize = Math.max(34, Math.min(scaleFont(90), Math.floor(widthPerChar * 1.15)));
    const letterSpacing = Math.max(0, Math.min(scale(4), Math.floor(fontSize * 0.055)));
    const horizontalGap = Math.max(0, Math.min(scale(2), Math.floor(fontSize * 0.01)));
    const progressWidth = Math.max(220, Math.min(scale(240), Math.floor(screenWidth * 0.72)));
    const slotWidth = Math.max(22, Math.round(fontSize * 0.72));

    return {
      horizontalPadding,
      fontSize,
      letterSpacing,
      horizontalGap,
      slotWidth,
      progressWidth,
      logoCenterShift: -Math.round(fontSize * 0.52),
      progressCenterShift: Math.round(fontSize * 1.35),
    };
  }, [logoText.length, screenWidth]);

  return (
    <View style={styles.container}>
      <StatusBar hidden />

      {/* Atmosphere */}
      <View style={StyleSheet.absoluteFill}>
        {Array.from({ length: 25 }).map((_, i) => (
          <AtmosphericParticle key={i} index={i} width={screenWidth} height={screenHeight} />
        ))}
      </View>

      <View
        style={[
          styles.centerLogoLayer,
          { transform: [{ translateY: logoMetrics.logoCenterShift }] },
        ]}
      >
        <View style={styles.logoContainer}>
          <View style={[styles.charactersRow, { paddingHorizontal: logoMetrics.horizontalPadding }]}>
            {characters.map((char, i) => (
              <AnimatedCharacter
                key={i}
                char={char}
                index={i}
                fontSize={logoMetrics.fontSize}
                letterSpacing={logoMetrics.letterSpacing}
                horizontalGap={logoMetrics.horizontalGap}
                slotWidth={logoMetrics.slotWidth}
              />
            ))}
          </View>
        </View>
      </View>

      <View
        style={[
          styles.progressLayer,
          { transform: [{ translateY: logoMetrics.progressCenterShift }] },
        ]}
      >
        <View style={styles.footer}>
          <ModernProgressBar width={logoMetrics.progressWidth} />
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
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },

  vignette: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    borderWidth: 0,
    shadowColor: '#05080E',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 100,
  },
  particle: {
    position: 'absolute',
    backgroundColor: 'rgba(182, 205, 231, 0.18)',
  },
  centerLogoLayer: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  progressLayer: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: 0,
  },
  charactersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  charWrapper: {
    marginHorizontal: 0,
  },
  charContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontWeight: '900',
    color: '#E50914',
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
    marginTop: 0,
  },
  progressContainer: {
    width: scale(240),
    alignItems: 'center',
  },
  progressBarTrack: {
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(182, 205, 231, 0.16)',
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
    backgroundColor: 'rgba(214, 227, 243, 0.45)',
  },
  loadingText: {
    marginTop: scale(15),
    fontSize: scaleFont(10),
    color: 'rgba(198, 214, 235, 0.52)',
    letterSpacing: scale(6),
    fontWeight: '600',
  },
});

export default SmartiflyPreloaderScreen;
