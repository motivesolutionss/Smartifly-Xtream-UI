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
  nextFocusLeft?: number | null;
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
const FOCUS_BLEED = scale(8);

const isUsableUri = (value?: string): value is string => {
  if (!value || typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  return /^(https?:\/\/|\/\/|file:\/\/|content:\/\/|data:|asset:)/i.test(trimmed);
};

const pickBackdropUri = (item: WatchProgress): string | undefined => {
  const data = (item?.data || {}) as any;
  const movieCandidates: Array<string | undefined> = [
    // Prefer 16:9-ish covers for continue cards; ultra-wide backdrops crop too aggressively.
    data?.cover_big,
    Array.isArray(data?.backdrop_path) ? data.backdrop_path[0] : data?.backdrop_path,
    data?.backdrop,
    // Some providers return extra backdrop-like slots in movie payload.
    data?.background,
    data?.fanart,
    item?.thumbnail,
  ];
  const seriesCandidates: Array<string | undefined> = [
    Array.isArray(data?.backdrop_path) ? data.backdrop_path[0] : data?.backdrop_path,
    data?.backdrop,
    data?.fanart,
    // Series often has this as a wide image, but keep after explicit backdrops.
    data?.cover_big,
    item?.thumbnail,
  ];
  const candidates = item.type === 'movie' ? movieCandidates : seriesCandidates;

  for (const candidate of candidates) {
    if (isUsableUri(candidate)) return candidate;
  }
  return undefined;
};

const TVContinueCard: React.FC<TVContinueCardProps> = ({
  item,
  onPress,
  onRemove,
  width = scale(220),
  height = scale(130),
  nextFocusLeft,
}) => {
  const { theme } = useTheme();
  const accentColor = theme.colors.accent ?? '#00E5FF';

  // UI-thread focus state
  const focused = useSharedValue(0);
  const zoom = useSharedValue(1);
  const removeOpacity = useSharedValue(0);

  const isLive = item.type === 'live';
  const backdropUri = useMemo(() => pickBackdropUri(item), [item]);
  const imageSource = backdropUri ? { uri: backdropUri } : FALLBACK_POSTER;
  const displayTitle = item.episodeTitle || item.title;
  const progressPercent = useMemo(() => {
    const value = Number(item.progress || 0);
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.min(100, value));
  }, [item.progress]);

  const formatTime = useCallback((seconds?: number) => {
    if (!seconds || seconds <= 0) return '00:00';
    const total = Math.max(0, Math.floor(seconds));
    const hh = Math.floor(total / 3600);
    const mm = Math.floor((total % 3600) / 60);
    const ss = total % 60;
    if (hh > 0) {
      return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
    }
    return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
  }, []);

  const watchedLabel = useMemo(() => {
    if (isLive) return 'Live Now';
    const watched = formatTime(item.position);
    const remaining = formatTime(Math.max(0, (item.duration || 0) - (item.position || 0)));
    return `${watched} watched  •  ${remaining} left`;
  }, [formatTime, isLive, item.duration, item.position]);

  const containerSize = useMemo(() => ({ width, height: height + FOCUS_BLEED * 2 }), [height, width]);
  const cardSize = useMemo(() => ({ width, height }), [width, height]);
  const cardOffset = useMemo(() => ({ marginTop: FOCUS_BLEED }), []);

  const cardAnimatedStyle = useAnimatedStyle(() => {
    const f = focused.value === 1;

    return {
      transform: [{ scale: zoom.value }],
      borderWidth: f ? FOCUS_BORDER_WIDTH : 1,
      borderColor: f ? accentColor : 'rgba(255,255,255,0.10)',
      // lightweight glow – noticeable but not heavy
      shadowOpacity: 0,
      shadowRadius: 0,
      shadowOffset: { width: 0, height: 0 },
      shadowColor: accentColor,
      elevation: 0,
    };
  }, [accentColor]);

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
      // @ts-ignore TV-only focus prop
      nextFocusLeft={nextFocusLeft ?? undefined}
      style={[styles.container, containerSize]}
    >
      <Animated.View style={[styles.card, cardSize, cardOffset, cardAnimatedStyle]}>
        <FastImageComponent
          source={imageSource}
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
              focusable={false}
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
        {!isLive && progressPercent > 0 ? (
          <View style={styles.progressContainer} pointerEvents="none">
            <View style={[styles.progressBar, { width: `${progressPercent}%` }]} />
          </View>
        ) : null}

        {/* Type badge */}
        <View style={[styles.typeBadge, isLive && styles.liveBadge]} pointerEvents="none">
          {isLive && <View style={styles.liveDot} />}
          <Text style={styles.typeBadgeText}>
            {isLive ? 'LIVE' : item.type === 'series' ? 'SERIES' : 'MOVIE'}
          </Text>
        </View>

        {/* Content metadata */}
        <View style={styles.metaWrap} pointerEvents="none">
          <View style={styles.metaBg} />
          <Text style={styles.metaTitle} numberOfLines={1}>
            {displayTitle}
          </Text>
          <Text style={styles.metaSubTitle} numberOfLines={1}>
            {watchedLabel}
          </Text>
        </View>
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
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
  metaWrap: {
    position: 'absolute',
    left: scale(10),
    right: scale(10),
    bottom: scale(10),
    paddingHorizontal: scale(8),
    paddingVertical: scale(6),
    borderRadius: scale(8),
    overflow: 'hidden',
  },
  metaBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.56)',
  },
  metaTitle: {
    color: '#FFFFFF',
    fontSize: scaleFont(16),
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.65)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: scale(2),
  },
  metaSubTitle: {
    marginTop: scale(2),
    color: 'rgba(255,255,255,0.9)',
    fontSize: scaleFont(12.5),
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: scale(2),
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

