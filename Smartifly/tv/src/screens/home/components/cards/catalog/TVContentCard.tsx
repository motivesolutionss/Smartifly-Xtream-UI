import React, { memo, useMemo, useCallback, useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle, Image } from 'react-native';
import FastImageComponent from '../../../.././../components/tv/TVFastImage';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { scale, scaleFont, useTheme } from '../../../.././../theme';
import { ThemeColors } from '../../../.././../theme/themes/types';
import { usePerfProfile } from '@smartifly/shared/src/utils/perf';
import { optimizeCardImageUri } from '@smartifly/shared/src/utils/image';
import BaseInteractiveCard from '../base/BaseInteractiveCard';
import { useCardFocus } from '../base/useCardFocus';

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
  onFocusItem?: (item: TVContentItem) => void;
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
  onRequestSidebarFocus?: () => void;
}

const SPRING_CONFIG = {
  damping: 18,
  stiffness: 220,
  mass: 0.6,
};

const DEFAULT_MOVIE_CARD_WIDTH = scale(240);
const DEFAULT_MOVIE_CARD_HEIGHT = scale(336);
const DEFAULT_LIVE_CARD_HEIGHT_RATIO = 0.6;

const normalizeCardImageUri = (value?: string): string => {
  return optimizeCardImageUri(value || '');
};

const isUsableCardImageUri = (value?: string): boolean => {
  const normalized = normalizeCardImageUri(value);
  return /^(https?:\/\/|file:\/\/|content:\/\/|data:|asset:)/i.test(normalized);
};

const getFallbackInitials = (title?: string): string => {
  const normalized = String(title || '').trim();
  if (!normalized) return 'TV';
  const parts = normalized.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
};

const collectImageCandidates = (item: TVContentItem): string[] => {
  const data = item.data as any;
  const rawCandidates = [
    item.image,
    data?.stream_icon,
    data?.movie_image,
    data?.cover_big,
    data?.cover,
    Array.isArray(data?.backdrop_path) ? data.backdrop_path[0] : data?.backdrop_path,
    data?.backdrop,
    data?.poster,
    data?.thumbnail,
  ];

  const deduped: string[] = [];
  const seen = new Set<string>();

  for (const candidate of rawCandidates) {
    const normalized = normalizeCardImageUri(candidate);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    deduped.push(normalized);
  }

  return deduped;
};

/**
 * Resolves the quality badge background color from theme tokens.
 * Requirements: 2.2
 */
export const resolveQualityBadgeColor = (quality: string, themeColors: ThemeColors): string => {
  const q = quality.toLowerCase();
  if (q === '4k' || q === 'uhd') return themeColors.qualityUHD;
  if (q === 'hd' || q === 'fhd') return themeColors.qualityHD;
  if (q === 'sd') return themeColors.qualitySD;
  return themeColors.primary;
};

const createStyles = (
  liveColor: string,
  borderFocusColor: string,
  cardBgColor: string,
  warningColor: string,
) =>
  StyleSheet.create({
    container: {
      justifyContent: 'flex-start',
      alignItems: 'center',
    },

    // Requirements: 2.4 — card background uses theme.colors.cardBackground
    cardBase: {
      overflow: 'hidden',
      backgroundColor: cardBgColor,
      borderRadius: scale(8),
    },
    cardLive: {
      backgroundColor: '#FFFFFF',
      borderRadius: scale(12),
    },

    image: {
      width: '100%',
      height: '100%',
    },
    // Requirements: 1.5 — live logo: white surface, contain resize, padded inner frame
    imageLive: {
      backgroundColor: '#FFFFFF',
      borderRadius: scale(10),
    },
    liveImageFrame: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#FFFFFF',
    },
    liveImageInner: {
      width: '76%',
      height: '76%',
      borderRadius: scale(10),
      overflow: 'hidden',
      backgroundColor: '#FFFFFF',
    },
    livePlaceholder: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#FFFFFF',
    },
    livePlaceholderIconWrap: {
      width: scale(54),
      height: scale(54),
      borderRadius: scale(16),
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(0,0,0,0.06)',
    },

    // Requirements: 2.1 — focus ring uses borderFocus for movie/series, live for live cards
    fallbackCard: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: scale(16),
      paddingVertical: scale(16),
      backgroundColor: 'rgba(12,16,22,0.96)',
    },
    fallbackImage: {
      ...StyleSheet.absoluteFillObject,
      opacity: 1,
    },
    fallbackScrim: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(8,12,18,0.48)',
    },
    fallbackCardLive: {
      backgroundColor: '#FFFFFF',
    },
    fallbackInitialWrap: {
      width: scale(54),
      height: scale(54),
      borderRadius: scale(16),
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.08)',
      marginBottom: scale(12),
    },
    fallbackInitialWrapLive: {
      backgroundColor: 'rgba(0,0,0,0.06)',
    },
    fallbackInitial: {
      color: '#FFFFFF',
      fontSize: scaleFont(20),
      fontWeight: '900',
      letterSpacing: 1,
    },
    fallbackInitialLive: {
      color: '#111111',
    },
    fallbackTitle: {
      color: '#FFFFFF',
      fontSize: scaleFont(16),
      fontWeight: '800',
      textAlign: 'center',
    },
    fallbackTitleLive: {
      color: '#111111',
    },
    fallbackSubtitle: {
      marginTop: scale(6),
      color: 'rgba(255,255,255,0.72)',
      fontSize: scaleFont(11),
      fontWeight: '700',
      textAlign: 'center',
      letterSpacing: 0.6,
    },
    fallbackSubtitleLive: {
      color: 'rgba(17,17,17,0.68)',
    },
    focusRing: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: scale(10),
      borderColor: borderFocusColor,
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
    // Requirements: 2.3 — rating star color uses theme.colors.warning
    ratingText: {
      fontSize: scaleFont(12),
      color: warningColor,
      fontWeight: '900',
    },
    metaWrap: {
      position: 'absolute',
      left: scale(10),
      right: scale(10),
      bottom: scale(10),
      borderRadius: scale(8),
      overflow: 'hidden',
      paddingHorizontal: scale(8),
      paddingVertical: scale(6),
    },
    metaBg: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.55)',
    },
    metaTitle: {
      color: '#FFF',
      fontSize: scaleFont(14),
      fontWeight: '700',
    },
    metaSubTitle: {
      marginTop: scale(2),
      color: 'rgba(255,255,255,0.88)',
      fontSize: scaleFont(11),
      fontWeight: '600',
    },
  });

const TVContentCard: React.FC<TVContentCardProps> = ({
  item,
  onPress,
  width,
  height,
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
  onRequestSidebarFocus,
}) => {
  const { theme } = useTheme();
  const themeColors = theme.colors;
  const perf = usePerfProfile();
  const [imageCandidateIndex, setImageCandidateIndex] = useState(0);
  const [isCardFocused, setIsCardFocused] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const cardWidth = width ?? DEFAULT_MOVIE_CARD_WIDTH;
  const cardHeight = height ?? DEFAULT_MOVIE_CARD_HEIGHT;

  const variant: ContentVariant = item.type || 'movie';
  const isLive = variant === 'live';
  const enableGlow = perf.enableFocusGlow && perf.tier === 'high' && !isLive;

  const imageCandidates = useMemo(() => collectImageCandidates(item), [item]);
  const imageCandidatesKey = useMemo(() => imageCandidates.join('|'), [imageCandidates]);
  const imageUri = imageCandidates[imageCandidateIndex] || '';
  const hasUsableImage = useMemo(() => isUsableCardImageUri(imageUri), [imageUri]);
  const cardImageSource = useMemo(
    () => (hasUsableImage ? { uri: imageUri } : null),
    [hasUsableImage, imageUri]
  );
  const fallbackInitials = useMemo(() => getFallbackInitials(item.title), [item.title]);
  const imageVisibilityStyle = useMemo(
    () => ({ opacity: imageLoaded ? 1 : 0 }),
    [imageLoaded]
  );
  const imagePriority = isCardFocused ? 'high' : 'low';
  const finalHeight = isLive
    ? (height ?? Math.round(cardWidth * DEFAULT_LIVE_CARD_HEIGHT_RATIO))
    : cardHeight;

  useEffect(() => {
    setImageCandidateIndex(0);
    setImageLoaded(false);
  }, [item.id, imageCandidatesKey, isLive]);

  // Extract primitive color tokens — stable useMemo deps (prevents Issue 1 regression)
  // Requirements: 2.1 — borderFocus for movie/series ring, live for live ring
  const liveColor = themeColors.live ?? '#E50914';
  const borderFocusColor = themeColors.borderFocus ?? '#FFFFFF';
  const cardBgColor = themeColors.cardBackground ?? '#0F151E';
  const warningColor = themeColors.warning ?? '#F5C518';

  // Requirements: 2.5 — variant-specific glow color tokens
  const glowColor = isLive
    ? (themeColors.liveGlow ?? 'rgba(229,9,20,0.4)')
    : variant === 'series'
    ? (themeColors.seriesGlow ?? 'rgba(14,165,233,0.4)')
    : (themeColors.moviesGlow ?? 'rgba(147,51,234,0.4)');

  const styles = useMemo(
    () => createStyles(liveColor, borderFocusColor, cardBgColor, warningColor),
    [liveColor, borderFocusColor, cardBgColor, warningColor],
  );

  // Requirements: 2.2 — quality badge color resolved from theme tokens
  const qualityBadgeColor = item.quality ? resolveQualityBadgeColor(item.quality, themeColors) : null;

  const ringWidthFocused = useMemo(() => scale(isLive ? 4.5 : enableGlow ? 3.5 : 2.5), [enableGlow, isLive]);
  const focusShadowRadius = useRef(scale(18)).current;
  // Keep zoomed focus ring fully visible on all sides (no top/bottom clipping in rails).
  const focusBleed = useMemo(() => (disableZoom ? 0 : scale(8)), [disableZoom]);

  const overlayOpacity = useSharedValue(0);
  const metaOpacity = useSharedValue(0);

  const {
    focused,
    handleFocus,
    handleBlur,
    focusStyle,
    ringStyle,
  } = useCardFocus({
    zoomScaleFocused: isLive ? 1.03 : 1.04,
    zoomEnabled: !disableZoom,
    ringWidthFocused,
    onFocused: onFocusItem,
    onBlurred: onBlurItem,
    item,
    springConfig: SPRING_CONFIG,
  });

  const badge = useMemo(() => {
    if (isLive) return { text: 'LIVE', isLive: true };
    if (item.quality) return { text: item.quality, isLive: false };
    return null;
  }, [isLive, item.quality]);

  // Requirements: 2.5 — glow uses variant-specific *Glow tokens, gated by perf.enableFocusGlow
  // shadowOpacity: 0, elevation: 0 when enableFocusGlow === false
  const cardAnimatedStyle = useAnimatedStyle(() => {
    const isFocused = focused.value === 1;
    return {
      shadowOpacity: enableGlow && isFocused ? 0.38 : 0,
      shadowRadius: enableGlow && isFocused ? focusShadowRadius : 0,
      shadowOffset: { width: 0, height: 0 },
      shadowColor: glowColor,
      // Android
      elevation: enableGlow && isFocused ? 8 : 0,
    };
  }, [enableGlow, focusShadowRadius, focused, glowColor]);

  const overlayAnimatedStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const metaAnimatedStyle = useAnimatedStyle(() => ({
    opacity: metaOpacity.value,
  }));

  // Requirements: 10.2 — focus ring animation: withTiming(1, 120ms) / withSpring
  const handleCardFocus = useCallback(() => {
    setIsCardFocused(true);
    handleFocus();
    overlayOpacity.value = withTiming(isLive ? 0.18 : 0, { duration: 90 });
    metaOpacity.value = withTiming(1, { duration: 120 });
  }, [handleFocus, isLive, metaOpacity, overlayOpacity]);

  const handleCardBlur = useCallback(() => {
    setIsCardFocused(false);
    handleBlur();
    overlayOpacity.value = withTiming(0, { duration: 90 });
    metaOpacity.value = withTiming(0, { duration: 90 });
  }, [handleBlur, metaOpacity, overlayOpacity]);

  const handlePress = useCallback(() => {
    onPress(item);
  }, [item, onPress]);

  const handleImageError = useCallback(() => {
    setImageCandidateIndex((prev) => {
      const next = prev + 1;
      return next <= imageCandidates.length ? next : prev;
    });
  }, [imageCandidates.length]);
  const shouldRouteLeftToSidebar = useCallback((event: any) => {
    const key = String(event?.nativeEvent?.key ?? '').toLowerCase();
    const eventType = String(event?.nativeEvent?.eventType ?? '').toLowerCase();
    const keyCode = Number(event?.nativeEvent?.keyCode ?? -1);
    return key === 'arrowleft' || key === 'left' || key === 'dpadleft' || eventType === 'left' || keyCode === 21;
  }, []);
  const handleCardKeyDown = useCallback((event: any) => {
    if (shouldRouteLeftToSidebar(event)) {
      onRequestSidebarFocus?.();
    }
    onKeyDown?.(event);
  }, [onKeyDown, onRequestSidebarFocus, shouldRouteLeftToSidebar]);
  const handleCardKeyPress = useCallback((event: any) => {
    if (shouldRouteLeftToSidebar(event)) {
      onRequestSidebarFocus?.();
    }
    onKeyPress?.(event);
  }, [onKeyPress, onRequestSidebarFocus, shouldRouteLeftToSidebar]);

  const containerSizeStyle = useMemo<StyleProp<ViewStyle>>(
    () => ({ width: cardWidth, height: finalHeight + focusBleed * 2 }),
    [cardWidth, finalHeight, focusBleed],
  );

  const cardSizeStyle = useMemo<StyleProp<ViewStyle>>(
    () => ({ width: cardWidth, height: finalHeight, borderRadius: isLive ? scale(12) : scale(8) }),
    [cardWidth, finalHeight, isLive],
  );
  const cardOffsetStyle = useMemo<StyleProp<ViewStyle>>(
    () => ({ marginTop: focusBleed }),
    [focusBleed],
  );

  // Requirements: 2.2 — quality badge style with resolved color
  const qualityBadgeStyle = useMemo<StyleProp<ViewStyle>>(
    () => qualityBadgeColor ? { backgroundColor: qualityBadgeColor, borderColor: 'transparent' } : undefined,
    [qualityBadgeColor],
  );

  return (
    <BaseInteractiveCard
      cardRef={focusRef}
      onPress={handlePress}
      onFocus={handleCardFocus}
      onBlur={handleCardBlur}
      focusable={focusable}
      onKeyPress={handleCardKeyPress}
      onKeyDown={handleCardKeyDown}
      onKeyUp={onKeyUp}
      hasTVPreferredFocus={hasTVPreferredFocus}
      nextFocusLeft={nextFocusLeft}
      nextFocusRight={nextFocusRight}
      nextFocusUp={nextFocusUp}
      nextFocusDown={nextFocusDown}
      containerStyle={[styles.container, containerSizeStyle, style]}
      cardStyle={[
        styles.cardBase,
        isLive && styles.cardLive,
        cardSizeStyle,
        cardOffsetStyle,
        focusStyle,
        cardAnimatedStyle,
      ]}
    >
        <View style={styles.fallbackCard}>
          <Image
            source={require('../../../../../assets/fallback image.jpeg')}
            style={styles.fallbackImage}
            resizeMode="contain"
          />
          <View style={styles.fallbackScrim} />
          {!imageLoaded ? (
            <>
              <View style={styles.fallbackInitialWrap}>
                <Text style={styles.fallbackInitial}>
                  {fallbackInitials}
                </Text>
              </View>
              <Text style={styles.fallbackTitle} numberOfLines={3}>
                {item.title}
              </Text>
              <Text
                style={styles.fallbackSubtitle}
                numberOfLines={1}
              >
                {isLive ? 'LIVE CHANNEL' : item.year ? String(item.year) : String(item.type || 'content').toUpperCase()}
              </Text>
            </>
          ) : null}
        </View>
        {hasUsableImage ? (
          isLive ? (
            <View style={styles.liveImageFrame}>
              <View style={styles.liveImageInner}>
                <FastImageComponent
                  source={cardImageSource}
                  style={[styles.image, styles.imageLive, imageVisibilityStyle]}
                  resizeMode="contain"
                  priority={imagePriority}
                  showLoader={true}
                  suppressStateOverlays={true}
                  onLoad={() => setImageLoaded(true)}
                  onError={handleImageError}
                  enableColdFade={false}
                />
              </View>
            </View>
          ) : (
            <FastImageComponent
              source={cardImageSource}
              style={[styles.image, imageVisibilityStyle]}
              resizeMode="cover"
              priority={imagePriority}
              showLoader={true}
              suppressStateOverlays={true}
              onLoad={() => setImageLoaded(true)}
              onError={handleImageError}
              enableColdFade={false}
            />
          )
        ) : null}

        {/* Live overlay (cheap) */}
        {isLive && (
          <Animated.View
            style={[styles.liveOverlay, overlayAnimatedStyle]}
            pointerEvents="none"
          />
        )}

        {/* Badge — quality badge uses resolved theme color (req 2.2), live badge uses liveColor */}
        {badge && (
          <View style={[styles.badge, badge.isLive ? styles.badgeLive : qualityBadgeStyle]}>
            {badge.isLive && <View style={styles.liveDot} />}
            <Text style={styles.badgeText}>{badge.text}</Text>
          </View>
        )}

        {/* Rating — star color uses theme.colors.warning (req 2.3) */}
        {!isLive && item.rating ? (
          <View style={styles.ratingBadge}>
            <Text style={styles.ratingText}>
              {'\u2B50'} {!isNaN(Number(item.rating)) ? Number(item.rating).toFixed(1) : '0.0'}
            </Text>
          </View>
        ) : null}

        {hasUsableImage && imageLoaded ? (
          <Animated.View style={[styles.metaWrap, metaAnimatedStyle]} pointerEvents="none">
            <View style={styles.metaBg} />
            <Text style={styles.metaTitle} numberOfLines={1}>
              {item.title}
            </Text>
            {isLive ? (
              <Text style={styles.metaSubTitle} numberOfLines={1}>
                LIVE CHANNEL
              </Text>
            ) : item.year ? (
              <Text style={styles.metaSubTitle} numberOfLines={1}>
                {String(item.year)}
              </Text>
            ) : null}
          </Animated.View>
        ) : null}

        <Animated.View
          pointerEvents="none"
          style={[
            styles.focusRing,
            isLive && styles.focusRingLive,
            ringStyle,
          ]}
        />
    </BaseInteractiveCard>
  );
};

export default memo(TVContentCard);
