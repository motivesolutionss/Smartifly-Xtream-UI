import React, { memo, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, StyleProp, ViewStyle } from 'react-native';
import FastImageComponent from '../../../../components/tv/TVFastImage';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scale, scaleFont, useTheme } from '../../../../theme';
import { usePerfProfile } from '../../../../utils/perf';
import { FALLBACK_POSTER } from '../HomeRailConfig';

export type ContentVariant = 'live' | 'movie' | 'series';

export interface TVContentItem {
  id: string | number;
  title: string;
  image: string;
  rating?: number;
  year?: string;
  quality?: string;
  type?: ContentVariant;
  data?: any;
}

interface TVContentCardProps {
  item: TVContentItem;
  onPress: (item: TVContentItem) => void;
  width?: number;
  height?: number;
  disableZoom?: boolean;
  onFocusItem?: () => void;
  onBlurItem?: () => void;
  focusRef?: React.Ref<View>;
  hasTVPreferredFocus?: boolean;
  nextFocusLeft?: number | null;
  nextFocusRight?: number | null;
  nextFocusUp?: number | null;
  nextFocusDown?: number | null;
  style?: StyleProp<ViewStyle>;
  focusable?: boolean;
  onKeyPress?: (event: any) => void;
  onKeyDown?: (event: any) => void;
  onKeyUp?: (event: any) => void;
}

const SPRING_CONFIG = {
  damping: 18,
  stiffness: 220,
  mass: 0.6,
};

const createStyles = (liveColor: string, accentColor: string) =>
  StyleSheet.create({
    container: {
      marginRight: scale(24),
      justifyContent: 'flex-start',
      alignItems: 'center',
    },

    cardBase: {
      overflow: 'hidden',
      backgroundColor: '#181818',
      borderRadius: scale(8),
    },
    cardLive: {
      backgroundColor: '#FFF',
      borderRadius: scale(12),
    },

    image: {
      width: '100%',
      height: '100%',
    },

    // Outer ring layer (ALWAYS visible on any poster)
    focusRing: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: scale(10),
      borderColor: accentColor,
    },
    focusRingLive: {
      borderColor: liveColor,
    },

    // Cheap live overlay (instead of SVG)
    liveOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.35)',
      opacity: 0, // animated
    },

    badge: {
      position: 'absolute',
      top: scale(10),
      right: scale(10),
      paddingHorizontal: scale(8),
      paddingVertical: scale(4),
      borderRadius: scale(6),
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      backgroundColor: 'rgba(0,0,0,0.85)',
      borderColor: 'rgba(255,255,255,0.1)',
    },
    badgeLive: {
      backgroundColor: liveColor,
      borderColor: 'transparent',
    },

    liveDot: {
      width: scale(8),
      height: scale(8),
      borderRadius: scale(4),
      backgroundColor: '#FFF',
      marginRight: scale(6),
    },

    badgeText: {
      fontSize: scaleFont(12),
      fontWeight: '900',
      letterSpacing: 1,
      color: '#FFF',
    },

    ratingBadge: {
      position: 'absolute',
      bottom: scale(10),
      left: scale(10),
      backgroundColor: 'rgba(0,0,0,0.8)',
      paddingHorizontal: scale(8),
      paddingVertical: scale(4),
      borderRadius: scale(4),
    },
    ratingText: {
      fontSize: scaleFont(12),
      color: '#FFD700',
      fontWeight: '900',
    },
  });

const TVContentCard: React.FC<TVContentCardProps> = ({
  item,
  onPress,
  width = scale(200),
  height = scale(280),
  disableZoom = false,
  onFocusItem,
  onBlurItem,
  focusRef,
  hasTVPreferredFocus = false,
  nextFocusLeft,
  nextFocusRight,
  nextFocusUp,
  nextFocusDown,
  style,
  focusable = true,
  onKeyPress,
  onKeyDown,
  onKeyUp,
}) => {
  const { theme } = useTheme();
  const perf = usePerfProfile();
  const enableGlow = perf.enableFocusGlow;

  const variant: ContentVariant = item.type || 'movie';
  const isLive = variant === 'live';

  const imageUri = item.image || FALLBACK_POSTER;
  const finalHeight = isLive ? width : height;

  // Extract colors so worklets don't depend on whole theme object
  const liveColor = theme.colors.live || '#E50914';
  const accentColor = '#FFFFFF';


  const styles = useMemo(() => createStyles(liveColor, accentColor), [liveColor, accentColor]);
  const shadowRadiusFocused = useMemo(() => (enableGlow ? scale(18) : 0), [enableGlow]);
  const ringWidthFocused = useMemo(() => (enableGlow ? scale(3.5) : scale(2)), [enableGlow]);
  const ringWidthIdle = useMemo(() => 0, []);
  const ringOpacityIdle = 0;

  // UI-thread state (no React re-render)
  const focused = useSharedValue(0);
  const zoom = useSharedValue(1);
  const ringOpacity = useSharedValue(ringOpacityIdle);
  const ringWidth = useSharedValue(ringWidthIdle);
  const overlayOpacity = useSharedValue(0);

  const badge = useMemo(() => {
    if (isLive) return { text: 'LIVE', isLive: true };
    if (item.quality) return { text: item.quality, isLive: false };
    return null;
  }, [isLive, item.quality]);

  const cardAnimatedStyle = useAnimatedStyle(() => {
    const isFocused = focused.value === 1;

    // subtle glow: keep it only when focused
    // (shadow is native-side; minimal overhead vs SVG)
    return {
      transform: [{ scale: disableZoom ? 1 : zoom.value }],
      shadowOpacity: enableGlow && isFocused ? 0.7 : 0,
      shadowRadius: enableGlow && isFocused ? shadowRadiusFocused : 0,
      shadowOffset: { width: 0, height: 0 },
      shadowColor: isLive ? liveColor : accentColor,

      // Android
      elevation: enableGlow && isFocused ? 14 : 0,
    };
  }, [disableZoom, isLive, liveColor, accentColor, enableGlow, shadowRadiusFocused]);

  const ringAnimatedStyle = useAnimatedStyle(() => ({
    opacity: ringOpacity.value,
    borderWidth: ringWidth.value,
  }));

  const overlayAnimatedStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const handleFocus = useCallback(() => {
    focused.value = 1;
    ringOpacity.value = withTiming(1, { duration: 120 });
    ringWidth.value = withTiming(ringWidthFocused, { duration: 120 });
    overlayOpacity.value = withTiming(1, { duration: 120 });

    if (!disableZoom) {
      zoom.value = withSpring(1.05, SPRING_CONFIG);
    }
    if (onFocusItem) {
      onFocusItem();
    }
  }, [disableZoom, focused, onFocusItem, overlayOpacity, ringOpacity, ringWidth, ringWidthFocused, zoom]);

  const handleBlur = useCallback(() => {
    focused.value = 0;
    ringOpacity.value = withTiming(ringOpacityIdle, { duration: 120 });
    ringWidth.value = withTiming(ringWidthIdle, { duration: 120 });
    overlayOpacity.value = withTiming(0, { duration: 120 });

    if (!disableZoom) {
      zoom.value = withSpring(1, SPRING_CONFIG);
    }
    if (onBlurItem) {
      onBlurItem();
    }
  }, [disableZoom, focused, onBlurItem, overlayOpacity, ringOpacity, ringOpacityIdle, ringWidth, ringWidthIdle, zoom]);

  const containerSizeStyle = useMemo<StyleProp<ViewStyle>>(
    () => ({ width, height: finalHeight }),
    [width, finalHeight]
  );

  const cardSizeStyle = useMemo<StyleProp<ViewStyle>>(
    () => ({ width, height: finalHeight, borderRadius: isLive ? scale(12) : scale(8) }),
    [width, finalHeight, isLive]
  );

  return (
    <Pressable
      ref={focusRef}
      onPress={() => onPress(item)}
      onFocus={handleFocus}
      onBlur={handleBlur}
      focusable={focusable}
      // @ts-ignore
      onKeyPress={onKeyPress}
      // @ts-ignore - Android TV key events
      onKeyDown={onKeyDown}
      // @ts-ignore - Android TV key events
      onKeyUp={onKeyUp}
      hasTVPreferredFocus={hasTVPreferredFocus}
      // @ts-ignore TV-only focus props
      nextFocusLeft={nextFocusLeft ?? undefined}
      // @ts-ignore TV-only focus props
      nextFocusRight={nextFocusRight ?? undefined}
      // @ts-ignore TV-only focus props
      nextFocusUp={nextFocusUp ?? undefined}
      // @ts-ignore TV-only focus props
      nextFocusDown={nextFocusDown ?? undefined}
      style={[styles.container, containerSizeStyle, style]}
    >
      <Animated.View
        style={[
          styles.cardBase,
          isLive && styles.cardLive,
          cardSizeStyle,
          cardAnimatedStyle,
        ]}
      >
        <FastImageComponent
          source={{ uri: imageUri }}
          style={styles.image}
          resizeMode={isLive ? 'contain' : 'cover'}
        />

        {/* Focus ring sits ABOVE the image so it never disappears */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.focusRing,
            isLive && styles.focusRingLive,
            ringAnimatedStyle,
          ]}
        />

        {/* Live overlay (cheap) */}
        {isLive && (
          <Animated.View
            style={[styles.liveOverlay, overlayAnimatedStyle]}
            pointerEvents="none"
          />
        )}

        {/* Badge */}
        {badge && (
          <View style={[styles.badge, badge.isLive && styles.badgeLive]}>
            {badge.isLive && <View style={styles.liveDot} />}
            <Text style={styles.badgeText}>{badge.text}</Text>
          </View>
        )}

        {/* Rating */}
        {!isLive && item.rating ? (
          <View style={styles.ratingBadge}>
            <Text style={styles.ratingText}>
              ⭐ {!isNaN(Number(item.rating)) ? Number(item.rating).toFixed(1) : '0.0'}
            </Text>
          </View>
        ) : null}
      </Animated.View>
    </Pressable>
  );
};

export default memo(TVContentCard);
