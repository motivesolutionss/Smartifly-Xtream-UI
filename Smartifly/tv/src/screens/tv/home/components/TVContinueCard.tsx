/**
 * TV Continue Watching Card Component
 *
 * Performance upgrades:
 * - No React state for focus (no re-render on focus)
 * - Reanimated border/glow + tiny zoom (optional)
 * - Remove nested TouchableOpacity (bad on TV focus)
 * - Show "Remove" only when focused (cheap + clear)
 */

import React, { memo, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import FastImageComponent from '../../../../components/tv/TVFastImage';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { colors, scale, scaleFont, useTheme } from '../../../../theme';
import { FALLBACK_POSTER } from '../HomeRailConfig';
import { WatchProgress } from '../../../../store/watchHistoryStore';

// =============================================================================
// TYPES
// =============================================================================

interface TVContinueCardProps {
  item: WatchProgress;
  onPress: (item: WatchProgress) => void;
  onRemove?: (item: WatchProgress) => void;
  width?: number;
  height?: number;
}

// =============================================================================
// ANIMATION CONFIG
// =============================================================================

const SPRING = {
  damping: 18,
  stiffness: 220,
  mass: 0.6,
};
const FOCUS_BORDER_WIDTH = scale(3);
const FOCUS_SHADOW_RADIUS = scale(10);

const TVContinueCard: React.FC<TVContinueCardProps> = ({
  item,
  onPress,
  onRemove,
  width = scale(220),
  height = scale(130),
}) => {
  const { theme } = useTheme();

  // UI-thread focus state
  const focused = useSharedValue(0);
  const zoom = useSharedValue(1);
  const removeOpacity = useSharedValue(0);

  const isLive = item.type === 'live';
  const imageUri = item.thumbnail || FALLBACK_POSTER;

  const containerSize = useMemo(() => ({ width }), [width]);
  const cardSize = useMemo(() => ({ width, height }), [width, height]);

  const cardAnimatedStyle = useAnimatedStyle(() => {
    const f = focused.value === 1;

    return {
      transform: [{ scale: zoom.value }],
      borderWidth: f ? FOCUS_BORDER_WIDTH : 1,
      borderColor: f ? (theme.colors.accent || '#00E5FF') : 'rgba(255,255,255,0.10)',
      // lightweight glow – noticeable but not heavy
      shadowOpacity: f ? 0.55 : 0,
      shadowRadius: f ? FOCUS_SHADOW_RADIUS : 0,
      shadowOffset: { width: 0, height: 0 },
      shadowColor: theme.colors.accent || '#00E5FF',
      elevation: f ? 12 : 0,
    };
  }, [theme.colors.accent]);

  const removeAnimatedStyle = useAnimatedStyle(() => {
    return { opacity: removeOpacity.value };
  });

  const handleFocus = useCallback(() => {
    focused.value = 1;
    removeOpacity.value = withTiming(1, { duration: 120 });
    zoom.value = withSpring(1.03, SPRING);
  }, [focused, removeOpacity, zoom]);

  const handleBlur = useCallback(() => {
    focused.value = 0;
    removeOpacity.value = withTiming(0, { duration: 120 });
    zoom.value = withSpring(1, SPRING);
  }, [focused, removeOpacity, zoom]);

  const handlePress = useCallback(() => onPress(item), [onPress, item]);

  const handleRemove = useCallback(() => {
    if (onRemove) onRemove(item);
  }, [onRemove, item]);

  return (
    <Pressable
      onPress={handlePress}
      onFocus={handleFocus}
      onBlur={handleBlur}
      style={[styles.container, containerSize]}
    >
      <Animated.View style={[styles.card, cardSize, cardAnimatedStyle]}>
        <FastImageComponent
          source={{ uri: imageUri }}
          style={styles.image}
          resizeMode="cover"
          enableColdFade={false}
        />

        <View style={styles.overlay} pointerEvents="none" />

        {/* Remove button (only visible on focus) */}
        {onRemove ? (
          <Animated.View style={[styles.removeWrap, removeAnimatedStyle]}>
            <Pressable
              // TV behavior: doesn't steal focus; but still clickable if user presses OK on it
              onPress={handleRemove}
              style={styles.removeButton}
              accessibilityLabel="Remove from continue watching"
            >
              <Text style={styles.removeText}>Remove</Text>
            </Pressable>
          </Animated.View>
        ) : null}

        {/* Play icon */}
        <View style={styles.playIconContainer} pointerEvents="none">
          <View style={styles.playIcon}>
            <Text style={styles.playIconText}>▶</Text>
          </View>
        </View>

        {/* Progress bar */}
        {!isLive && item.progress > 0 ? (
          <View style={styles.progressContainer} pointerEvents="none">
            <View style={[styles.progressBar, { width: `${item.progress}%` }]} />
          </View>
        ) : null}

        {/* Type badge */}
        <View style={[styles.typeBadge, isLive && styles.liveBadge]} pointerEvents="none">
          {isLive && <View style={styles.liveDot} />}
          <Text style={styles.typeBadgeText}>
            {isLive ? 'LIVE' : item.type === 'series' ? 'SERIES' : 'MOVIE'}
          </Text>
        </View>
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    marginRight: scale(16),
  },
  card: {
    borderRadius: scale(10),
    overflow: 'hidden',
    backgroundColor: colors.backgroundSecondary || '#222',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },

  // Play icon
  playIconContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIconText: {
    fontSize: scaleFont(16),
    color: '#000',
    marginLeft: scale(2),
  },

  // Progress bar
  progressContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: scale(4),
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.primary || '#E50914',
  },

  // Type badge
  typeBadge: {
    position: 'absolute',
    top: scale(6),
    left: scale(6),
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    paddingHorizontal: scale(6),
    paddingVertical: scale(2),
    borderRadius: scale(4),
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveBadge: {
    backgroundColor: colors.live || '#E50914',
  },
  liveDot: {
    width: scale(5),
    height: scale(5),
    borderRadius: scale(3),
    backgroundColor: '#FFF',
    marginRight: scale(4),
  },
  typeBadgeText: {
    fontSize: scaleFont(9),
    fontWeight: 'bold',
    color: '#FFF',
    letterSpacing: 0.5,
  },

  // Remove button
  removeWrap: {
    position: 'absolute',
    top: scale(6),
    right: scale(8),
  },
  removeButton: {
    paddingHorizontal: scale(12),
    paddingVertical: scale(4),
    backgroundColor: 'rgba(0,0,0,0.62)',
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  removeText: {
    fontSize: scaleFont(10),
    color: colors.error || '#EF4444',
    fontWeight: '700',
  },
});

export default memo(TVContinueCard);
