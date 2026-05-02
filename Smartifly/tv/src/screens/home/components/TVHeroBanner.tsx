import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  Animated,
  findNodeHandle,
} from 'react-native';
import FastImageComponent from '../.././../components/tv/TVFastImage';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import AnimatedRe, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { colors, scale, scaleFont } from '../.././../theme';
import { usePerfProfile } from '@smartifly/shared/src/utils/perf';
import { prefetchImage } from '@smartifly/shared/src/utils/image';

// =============================================================================
// TYPES
// =============================================================================

export interface TVHeroItem {
  id: string | number;
  title: string;
  description?: string;
  backdrop?: string;
  logo?: string;
  tags?: string[];
  rating?: number;
  year?: string;
  quality?: string;
  maturityRating?: string;
}

interface TVHeroBannerProps {
  item: TVHeroItem;
  onPlay: () => void;
  onInfo: () => void;
  onAddToList?: () => void;
  sidebarTargetRef?: React.RefObject<View | null>;
  primaryActionRef?: React.Ref<View>;
  hasPreferredFocus?: boolean;
}

// =============================================================================
// MEMOIZED GRADIENT LAYERS (safe)
// =============================================================================

const HeroGradients = React.memo(function HeroGradients({ bg }: { bg: string }) {
  return (
    <>
      <View style={styles.backdropLeftFade} pointerEvents="none">
        <Svg height="100%" width="100%">
          <Defs>
            <LinearGradient id="gradBackdropLeft" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor={bg} stopOpacity="1" />
              <Stop offset="0.5" stopColor={bg} stopOpacity="0.5" />
              <Stop offset="1" stopColor={bg} stopOpacity="0" />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#gradBackdropLeft)" />
        </Svg>
      </View>

      <View style={styles.leftGradient} pointerEvents="none">
        <Svg height="100%" width="100%">
          <Defs>
            <LinearGradient id="gradLeft" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor={bg} stopOpacity="1" />
              <Stop offset="0.4" stopColor={bg} stopOpacity="0.8" />
              <Stop offset="0.7" stopColor={bg} stopOpacity="0.3" />
              <Stop offset="1" stopColor={bg} stopOpacity="0" />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#gradLeft)" />
        </Svg>
      </View>

      <View style={styles.bottomGradient} pointerEvents="none">
        <Svg height="100%" width="100%">
          <Defs>
            <LinearGradient id="gradBottom" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={bg} stopOpacity="0" />
              <Stop offset="0.5" stopColor={bg} stopOpacity="0.3" />
              <Stop offset="0.8" stopColor={bg} stopOpacity="0.8" />
              <Stop offset="1" stopColor={bg} stopOpacity="1" />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#gradBottom)" />
        </Svg>
      </View>
    </>
  );
});

const isUsableUri = (value?: string): boolean => {
  if (!value || typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  return /^(https?:\/\/|\/\/|file:\/\/|content:\/\/|data:|asset:)/i.test(trimmed);
};

const getBackdropUri = (hero?: TVHeroItem | null): string => {
  const raw = (hero as any)?.backdrop;
  if (isUsableUri(raw)) return raw;
  return '';
};

const HeroTextBlock = React.memo(function HeroTextBlock({ item }: { item: TVHeroItem }) {
  const titleText = item?.title ?? '';
  const descText = item?.description ?? 'No description available.';
  const tags = Array.isArray(item?.tags) ? item.tags : [];
  const ratingNumber = Number(item?.rating);
  const hasRating = Number.isFinite(ratingNumber);

  return (
    <>
      <Text style={styles.title} numberOfLines={2}>
        {titleText}
      </Text>

      <View style={styles.metadataRow}>
        {item?.year ? (
          <>
            <Text style={styles.metadataText}>{item.year}</Text>
            <View style={styles.metadataDot} />
          </>
        ) : null}

        {hasRating ? (
          <View style={styles.ratingBadge}>
            <Text style={styles.ratingLabel}>IMDb</Text>
            <Text style={styles.ratingValue}>{ratingNumber.toFixed(1)}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.tagsRow}>
        {tags.length > 0
          ? tags.slice(0, 3).map((tag, index) => (
            <React.Fragment key={`${tag}-${index}`}>
              <Text style={styles.tagText}>{tag}</Text>
              {index < Math.min(tags.length, 3) - 1 && (
                <Text style={styles.tagSeparator}> • </Text>
              )}
            </React.Fragment>
          ))
          : null}
      </View>

      <Text style={styles.description} numberOfLines={3}>
        {descText}
      </Text>
    </>
  );
});
// =============================================================================
// COMPONENT
// =============================================================================

const TVHeroBanner: React.FC<TVHeroBannerProps> = ({
  item,
  onPlay,
  onInfo,
  onAddToList,
  sidebarTargetRef,
  primaryActionRef,
  hasPreferredFocus,
}) => {
  const [initialFocusHandled, setInitialFocusHandled] = useState(false);
  const [sidebarNode, setSidebarNode] = useState<number | undefined>(undefined);
  const baseOpacity = useRef(new Animated.Value(1)).current;
  const incomingOpacity = useRef(new Animated.Value(0)).current;

  const [displayItem, setDisplayItem] = useState<TVHeroItem>(item);
  const [incomingItem, setIncomingItem] = useState<TVHeroItem | null>(null);
  const currentKeyRef = useRef<string>('');
  const incomingKeyRef = useRef<string>('');
  const incomingItemRef = useRef<TVHeroItem | null>(null);
  const queuedKeyRef = useRef<string>('');
  const queuedItemRef = useRef<TVHeroItem | null>(null);
  const isTransitioningRef = useRef(false);

  // UI-thread focus flags (no React setState)
  const playFocus = useSharedValue(0);
  const infoFocus = useSharedValue(0);
  const listFocus = useSharedValue(0);

  const bg = colors.background || '#141414';
  const infoBorderWidth = useRef(scale(3)).current;
  const perf = usePerfProfile();

  const nextBackdropUri = getBackdropUri(item);
  const displayBackdropUri = getBackdropUri(displayItem);
  const incomingBackdropUri = incomingItem ? getBackdropUri(incomingItem) : '';

  const logoUri =
    typeof item?.logo === 'string' && item.logo.trim().length > 0 ? item.logo : '';

  useEffect(() => {
    if (!sidebarTargetRef) return;
    const tryResolve = () => {
      const node = sidebarTargetRef.current
        ? (findNodeHandle(sidebarTargetRef.current) ?? undefined)
        : undefined;
      if (node && node !== sidebarNode) {
        setSidebarNode(node);
        return true;
      }
      return false;
    };

    if (tryResolve()) return;

    const interval = setInterval(() => {
      if (tryResolve()) {
        clearInterval(interval);
      }
    }, 120);

    return () => clearInterval(interval);
  }, [sidebarNode, sidebarTargetRef]);

  const startCrossfade = useCallback(() => {
    if (!incomingItemRef.current || !incomingKeyRef.current) return;
    if (isTransitioningRef.current) return;

    isTransitioningRef.current = true;

    baseOpacity.stopAnimation();
    incomingOpacity.stopAnimation();
    baseOpacity.setValue(1);
    incomingOpacity.setValue(0);

    Animated.parallel([
      Animated.timing(baseOpacity, {
        toValue: 0,
        duration: 320,
        useNativeDriver: true,
      }),
      Animated.timing(incomingOpacity, {
        toValue: 1,
        duration: 320,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (!finished) {
        isTransitioningRef.current = false;
        return;
      }
      const nextItem = incomingItemRef.current;
      const nextKey = incomingKeyRef.current;
      if (nextItem && nextKey) {
        setDisplayItem(nextItem);
        currentKeyRef.current = nextKey;
      }
      setIncomingItem(null);
      incomingItemRef.current = null;
      incomingKeyRef.current = '';
      baseOpacity.setValue(1);
      incomingOpacity.setValue(0);
      isTransitioningRef.current = false;

      if (queuedItemRef.current && queuedKeyRef.current) {
        const queuedItem = queuedItemRef.current;
        const queuedKey = queuedKeyRef.current;
        queuedItemRef.current = null;
        queuedKeyRef.current = '';
        if (queuedKey !== currentKeyRef.current) {
          incomingItemRef.current = queuedItem;
          incomingKeyRef.current = queuedKey;
          setIncomingItem(queuedItem);
          incomingOpacity.setValue(0);
        }
      }
    });
  }, [baseOpacity, incomingOpacity]);

  const cancelIncoming = useCallback(() => {
    if (!incomingItemRef.current) return;
    incomingItemRef.current = null;
    incomingKeyRef.current = '';
    setIncomingItem(null);
    baseOpacity.setValue(1);
    incomingOpacity.setValue(0);
    isTransitioningRef.current = false;
  }, [baseOpacity, incomingOpacity]);

  // Soft crossfade on hero change (only after image loads)
  useEffect(() => {
    const nextKey = `${item.id}-${nextBackdropUri}`;

    if (!currentKeyRef.current) {
      currentKeyRef.current = nextKey;
      setDisplayItem(item);
      return;
    }

    if (currentKeyRef.current === nextKey) {
      setDisplayItem(item);
      return;
    }

    if (isTransitioningRef.current) {
      queuedKeyRef.current = nextKey;
      queuedItemRef.current = item;
      return;
    }

    incomingKeyRef.current = nextKey;
    incomingItemRef.current = item;
    incomingOpacity.setValue(0);
    setIncomingItem(item);
  }, [item, nextBackdropUri, incomingOpacity]);

  // Prefetch only when strings change (no whole item in deps)
  useEffect(() => {
    if (nextBackdropUri) prefetchImage(nextBackdropUri);
    if (logoUri && perf.tier !== 'low') prefetchImage(logoUri);
  }, [nextBackdropUri, logoUri, perf.tier]);

  // Focus styles
  const playBtnStyle = useAnimatedStyle(() => ({
    backgroundColor: playFocus.value
      ? '#FFFFFF'
      : (colors.primary || '#E50914'),
    transform: [
      {
        scale: playFocus.value
          ? withTiming(1.05, { duration: 120 })
          : withTiming(1, { duration: 120 }),
      },
    ],
  }));

  const playTextStyle = useAnimatedStyle(() => ({
    color: playFocus.value ? '#141414' : '#FFF',
  }));

  const infoBtnStyle = useAnimatedStyle(() => ({
    backgroundColor: infoFocus.value
      ? 'rgba(109,109,110,0.95)'
      : 'rgba(109,109,110,0.70)',
    borderWidth: infoFocus.value ? infoBorderWidth : 0,
    borderColor: infoFocus.value ? '#FFF' : 'transparent',
    transform: [
      {
        scale: infoFocus.value
          ? withTiming(1.05, { duration: 120 })
          : withTiming(1, { duration: 120 }),
      },
    ],
  }));

  const listBtnStyle = useAnimatedStyle(() => ({
    backgroundColor: listFocus.value
      ? 'rgba(255,255,255,0.20)'
      : 'rgba(42,42,42,0.65)',
    borderColor: listFocus.value ? '#FFF' : 'rgba(255,255,255,0.4)',
    transform: [
      {
        scale: listFocus.value
          ? withTiming(1.08, { duration: 120 })
          : withTiming(1, { duration: 120 }),
      },
    ],
  }));

  const displayBackdropSource = useMemo(
    () => (displayBackdropUri ? { uri: displayBackdropUri } : null),
    [displayBackdropUri]
  );
  const incomingBackdropSource = useMemo(
    () => (incomingBackdropUri ? { uri: incomingBackdropUri } : null),
    [incomingBackdropUri]
  );

  const handleBaseError = useCallback(() => {
  }, []);

  const handleIncomingLoad = useCallback(() => {
    startCrossfade();
  }, [startCrossfade]);

  const handleIncomingError = useCallback(() => {
    cancelIncoming();
  }, [cancelIncoming]);

  const baseLayerOpacity = baseOpacity;
  const incomingLayerOpacity = incomingOpacity;
  const baseTextLayerStyle = useMemo(() => ({ opacity: baseLayerOpacity }), [baseLayerOpacity]);

  return (
    <View style={styles.container}>
      <View style={styles.backdropContainer}>
        <Animated.View style={[styles.backdropLayer, { opacity: baseLayerOpacity }]}>
          {displayBackdropSource ? (
            <FastImageComponent
              source={displayBackdropSource}
              style={styles.backdropImage}
              resizeMode="cover"
              priority="high"
              enableColdFade={false}
              onError={handleBaseError}
            />
          ) : null}
        </Animated.View>

        {incomingItem && incomingBackdropSource ? (
          <Animated.View style={[styles.backdropLayer, { opacity: incomingLayerOpacity }]}>
            <FastImageComponent
              source={incomingBackdropSource}
              style={styles.backdropImage}
              resizeMode="cover"
              priority="high"
              enableColdFade={false}
              onLoad={handleIncomingLoad}
              onError={handleIncomingError}
            />
          </Animated.View>
        ) : null}

        <HeroGradients bg={bg} />
      </View>

      <View style={styles.contentContainer}>
        <Image
          source={require('../../../assets/smartifly_icon.png')}
          style={styles.appLogo}
          resizeMode="contain"
        />

        <View style={styles.textCrossfadeContainer}>
          <Animated.View style={baseTextLayerStyle}>
            <HeroTextBlock item={displayItem} />
          </Animated.View>

          {incomingItem ? (
            <Animated.View
              style={[styles.textLayer, { opacity: incomingLayerOpacity }]}
              pointerEvents="none"
            >
              <HeroTextBlock item={incomingItem} />
            </Animated.View>
          ) : null}
        </View>

        <View style={styles.actionsRow}>
          <Pressable
            ref={primaryActionRef}
            onPress={onPlay}
            onFocus={() => {
              playFocus.value = 1;
              setInitialFocusHandled(true);
            }}
            onBlur={() => { playFocus.value = 0; }}
            hasTVPreferredFocus={hasPreferredFocus && !initialFocusHandled}
            // @ts-ignore
            nextFocusLeft={sidebarNode}
            style={styles.buttonOuter}
          >
            <AnimatedRe.View style={[styles.buttonInner, playBtnStyle]}>
              <View style={styles.buttonContent}>
                <View style={styles.playIcon}>
                  <AnimatedRe.Text style={[styles.playIconText, playTextStyle]}>
                    ▶
                  </AnimatedRe.Text>
                </View>
                <AnimatedRe.Text style={[styles.buttonText, playTextStyle]}>
                  Play
                </AnimatedRe.Text>
              </View>
            </AnimatedRe.View>
          </Pressable>

          <Pressable
            onPress={onInfo}
            onFocus={() => { infoFocus.value = 1; }}
            onBlur={() => { infoFocus.value = 0; }}
            // @ts-ignore
            nextFocusLeft={sidebarNode}
            style={styles.buttonOuter}
          >
            <AnimatedRe.View style={[styles.buttonInner, infoBtnStyle]}>
              <View style={styles.buttonContent}>
                <View style={styles.infoIcon}>
                  <Text style={styles.infoIconText}>i</Text>
                </View>
                <Text style={styles.buttonText}>More Info</Text>
              </View>
            </AnimatedRe.View>
          </Pressable>

          {onAddToList ? (
            <Pressable
              onPress={onAddToList}
              onFocus={() => { listFocus.value = 1; }}
              onBlur={() => { listFocus.value = 0; }}
              style={styles.iconButtonOuter}
            >
              <AnimatedRe.View style={[styles.iconButton, listBtnStyle]}>
                <Text style={styles.iconButtonText}>+</Text>
              </AnimatedRe.View>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: scale(820),
    position: 'relative',
    marginBottom: scale(28),
  },
  backdropContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: '74%',
    height: '100%',
  },
  backdropLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  backdropImage: {
    width: '100%',
    height: '100%',
  },
  backdropLeftFade: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '30%',
  },
  leftGradient: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '60%',
    zIndex: 1,
  },
  bottomGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '60%',
    zIndex: 1,
  },

  contentContainer: {
    position: 'absolute',
    left: scale(30),
    bottom: scale(194),
    maxWidth: scale(600),
    zIndex: 2,
    alignItems: 'flex-start',
  },
  textCrossfadeContainer: {
    position: 'relative',
    width: '100%',
  },
  textLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  title: {
    fontSize: scaleFont(64),
    fontWeight: '700',
    color: colors.textPrimary || '#FFF',
    marginBottom: scale(20),
    letterSpacing: -1,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 8,
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scale(12),
    minHeight: scaleFont(24),
  },
  metadataText: {
    color: colors.textPrimary || '#FFF',
    fontSize: scaleFont(18),
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  metadataDot: {
    width: scale(4),
    height: scale(4),
    borderRadius: scale(2),
    backgroundColor: '#46D369',
    marginHorizontal: scale(8),
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scale(20),
    flexWrap: 'wrap',
    minHeight: scaleFont(20),
  },
  tagText: {
    color: colors.textPrimary || '#FFF',
    fontSize: scaleFont(18),
    fontWeight: '500',
  },
  tagSeparator: {
    color: '#999',
    fontSize: scaleFont(18),
    marginHorizontal: scale(4),
  },
  description: {
    fontSize: scaleFont(20),
    color: '#B3B3B3',
    lineHeight: scaleFont(28),
    marginBottom: scale(32),
    minHeight: scaleFont(28) * 3,
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 6,
  },

  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  buttonOuter: {
    marginRight: scale(16),
  },
  buttonInner: {
    paddingHorizontal: scale(32),
    paddingVertical: scale(14),
    borderRadius: scale(6),
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: scale(140),
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: scaleFont(20),
    fontWeight: '700',
    color: colors.textPrimary || '#FFF',
    letterSpacing: 0.5,
  },

  playIcon: {
    marginRight: scale(10),
    marginLeft: scale(-4),
  },
  playIconText: {
    fontSize: scaleFont(20),
    color: '#FFF',
    fontWeight: 'bold',
  },

  infoIcon: {
    width: scale(24),
    height: scale(24),
    borderRadius: scale(12),
    borderWidth: scale(2),
    borderColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scale(10),
  },
  infoIconText: {
    fontSize: scaleFont(16),
    color: '#FFF',
    fontWeight: 'bold',
    fontStyle: 'italic',
  },

  iconButtonOuter: {
    marginLeft: scale(8),
  },
  iconButton: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(24),
    borderWidth: scale(2),
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonText: {
    fontSize: scaleFont(28),
    color: '#FFF',
    fontWeight: '400',
  },

  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5C518',
    paddingHorizontal: scale(8),
    paddingVertical: scale(2),
    borderRadius: scale(4),
  },
  ratingLabel: {
    fontSize: scaleFont(14),
    color: '#000',
    fontWeight: '700',
    marginRight: scale(4),
  },
  ratingValue: {
    fontSize: scaleFont(16),
    color: '#000',
    fontWeight: '700',
  },

  appLogo: {
    width: scale(300),
    height: scale(80),
    marginBottom: scale(8),
    marginLeft: scale(-65),
    alignSelf: 'flex-start',
  },
});

export default React.memo(TVHeroBanner);
