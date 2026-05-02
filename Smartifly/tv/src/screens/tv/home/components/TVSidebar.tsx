import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Pressable, Text, findNodeHandle } from 'react-native';
import Animated, {
  Easing,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { scale, scaleFont, Icon, useTheme } from '../../../../theme';

export type SidebarRoute =
  | 'Home'
  | 'Live'
  | 'Movies'
  | 'Series'
  | 'Announcements'
  | 'Search'
  | 'Favorites'
  | 'Downloads'
  | 'Settings';

interface TVSidebarProps {
  activeRoute: SidebarRoute;
  onNavigate: (route: SidebarRoute) => void;
  isExpanded?: boolean;
  onExpand?: () => void;
  onCollapse?: () => void;
  onProfilePress?: () => void;
  searchRef?: React.RefObject<View | null>;
  onHomeNodeReady?: (node: number | undefined) => void;
  focusTargets?: Partial<Record<SidebarRoute, number | null>>;
}

interface MenuItem {
  id: SidebarRoute;
  icon: string;
  label: string;
}

const MENU_ITEMS: MenuItem[] = [
  { id: 'Search', icon: 'magnifyingGlass', label: 'Search' },
  { id: 'Home', icon: 'home', label: 'Home' },
  { id: 'Live', icon: 'television', label: 'Live TV' },
  { id: 'Movies', icon: 'filmStrip', label: 'Movies' },
  { id: 'Series', icon: 'layers', label: 'Series' },
  { id: 'Announcements', icon: 'bell', label: 'News' },
  { id: 'Favorites', icon: 'heart', label: 'My List' },
  { id: 'Downloads', icon: 'downloadSimple', label: 'Downloads' },
];

const SETTINGS_ITEM: MenuItem = { id: 'Settings', icon: 'settings', label: 'Settings' };

const MINI_WIDTH = scale(96);
const MAX_WIDTH = scale(285);
const CONTAINER_RADIUS = scale(48);
const ICON_SIZE_MAX = scale(36);
const SIDEBAR_CENTER = MINI_WIDTH / 2;
const ITEM_LEFT_PADDING = SIDEBAR_CENTER - ICON_SIZE_MAX / 2;

const SPRING_CONFIG = {
  damping: 24,
  stiffness: 120,
  mass: 1.2,
};

const TVSidebar = ({
  activeRoute,
  onNavigate,
  isExpanded: _isExpanded,
  onExpand,
  onCollapse,
  onProfilePress,
  searchRef: providedSearchRef,
  onHomeNodeReady,
  focusTargets,
}: TVSidebarProps) => {
  const { theme } = useTheme();
  const [focusedId, setFocusedId] = useState<SidebarRoute | 'Profile' | null>(null);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pressNavigateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pressUnlockTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isPressClosingRef = useRef(false);

  const profileRef = React.useRef<View>(null);
  const internalSearchRef = React.useRef<View>(null);
  const homeRef = React.useRef<View>(null);
  const liveRef = React.useRef<View>(null);
  const moviesRef = React.useRef<View>(null);
  const seriesRef = React.useRef<View>(null);
  const announcementsRef = React.useRef<View>(null);
  const favoritesRef = React.useRef<View>(null);
  const downloadsRef = React.useRef<View>(null);
  const settingsRef = React.useRef<View>(null);

  const searchRef = providedSearchRef ?? internalSearchRef;

  const expandProgress = useSharedValue(0);

  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
      }
      if (pressNavigateTimeoutRef.current) {
        clearTimeout(pressNavigateTimeoutRef.current);
      }
      if (pressUnlockTimeoutRef.current) {
        clearTimeout(pressUnlockTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const isSidebarFocused = focusedId !== null;
    if (isSidebarFocused) {
      expandProgress.value = withSpring(1, SPRING_CONFIG);
    } else {
      expandProgress.value = withTiming(0, {
        duration: 165,
        easing: Easing.bezier(0.22, 0.61, 0.36, 1),
      });
    }

    if (isSidebarFocused && onExpand) onExpand();
    if (!isSidebarFocused && onCollapse) onCollapse();
  }, [focusedId, onExpand, onCollapse, expandProgress]);

  useEffect(() => {
    if (!onHomeNodeReady) return;
    const tryResolve = () => {
      const node = homeRef.current ? (findNodeHandle(homeRef.current) ?? undefined) : undefined;
      if (node) {
        onHomeNodeReady(node);
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
  }, [onHomeNodeReady]);

  const clearPendingBlur = useCallback(() => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }
  }, []);

  const handleFocus = useCallback(
    (id: SidebarRoute | 'Profile') => {
      if (isPressClosingRef.current) return;
      clearPendingBlur();
      setFocusedId(id);
    },
    [clearPendingBlur]
  );

  const handleBlur = useCallback(() => {
    if (isPressClosingRef.current) {
      isPressClosingRef.current = false;
      if (pressUnlockTimeoutRef.current) {
        clearTimeout(pressUnlockTimeoutRef.current);
        pressUnlockTimeoutRef.current = null;
      }
      return;
    }
    clearPendingBlur();
    blurTimeoutRef.current = setTimeout(() => {
      setFocusedId(null);
      blurTimeoutRef.current = null;
    }, 90);
  }, [clearPendingBlur]);

  const animatedContainerStyle = useAnimatedStyle(() => ({
    width: interpolate(
      expandProgress.value,
      [0, 1],
      [MINI_WIDTH, MAX_WIDTH],
      Extrapolate.CLAMP
    ),
    backgroundColor: `rgba(18, 20, 23, ${interpolate(expandProgress.value, [0, 1], [0.82, 0.92])})`,
  }));

  const animatedLabelStyle = useAnimatedStyle(() => ({
    opacity: withTiming(expandProgress.value > 0.75 ? 1 : 0, { duration: 180 }),
    transform: [
      {
        translateX: interpolate(expandProgress.value, [0.4, 1], [-25, 0], Extrapolate.CLAMP),
      },
    ],
  }));

  const handlePress = useCallback(
    (id: SidebarRoute) => {
      if (id !== activeRoute) onNavigate(id);
    },
    [activeRoute, onNavigate]
  );

  const activeColor = theme.colors.primary || '#E50914';
  const inactiveColor = theme.colors.icon || theme.colors.textMuted || '#9CA3AF';
  const focusedFill = 'rgba(255, 255, 255, 0.18)';
  const focusedBorder = 'rgba(255, 255, 255, 0.22)';
  const focusedShadow = 'rgba(255, 255, 255, 0.18)';
  const shouldRenderLabels = focusedId !== null;

  const getFocusTarget = useCallback(
    (route: SidebarRoute) => focusTargets?.[route] ?? undefined,
    [focusTargets]
  );

  const getNode = useCallback((ref: React.RefObject<View | null>) => {
    if (!ref.current) return undefined;
    return findNodeHandle(ref.current) ?? undefined;
  }, []);

  const getItemRef = useCallback((id: SidebarRoute): React.RefObject<View | null> => {
    switch (id) {
      case 'Search':
        return searchRef;
      case 'Home':
        return homeRef;
      case 'Live':
        return liveRef;
      case 'Movies':
        return moviesRef;
      case 'Series':
        return seriesRef;
      case 'Announcements':
        return announcementsRef;
      case 'Favorites':
        return favoritesRef;
      case 'Downloads':
        return downloadsRef;
      case 'Settings':
      default:
        return settingsRef;
    }
  }, [searchRef]);

  const getUpNode = useCallback((id: SidebarRoute) => {
    switch (id) {
      case 'Search':
        return getNode(profileRef);
      case 'Home':
        return getNode(searchRef);
      case 'Live':
        return getNode(homeRef);
      case 'Movies':
        return getNode(liveRef);
      case 'Series':
        return getNode(moviesRef);
      case 'Announcements':
        return getNode(seriesRef);
      case 'Favorites':
        return getNode(announcementsRef);
      case 'Downloads':
        return getNode(favoritesRef);
      case 'Settings':
      default:
        return getNode(downloadsRef);
    }
  }, [announcementsRef, downloadsRef, favoritesRef, getNode, homeRef, liveRef, moviesRef, searchRef, seriesRef]);

  const getDownNode = useCallback((id: SidebarRoute) => {
    switch (id) {
      case 'Search':
        return getNode(homeRef);
      case 'Home':
        return getNode(liveRef);
      case 'Live':
        return getNode(moviesRef);
      case 'Movies':
        return getNode(seriesRef);
      case 'Series':
        return getNode(announcementsRef);
      case 'Announcements':
        return getNode(favoritesRef);
      case 'Favorites':
        return getNode(downloadsRef);
      case 'Downloads':
        return getNode(settingsRef);
      case 'Settings':
      default:
        return getNode(settingsRef);
    }
  }, [announcementsRef, downloadsRef, favoritesRef, getNode, homeRef, liveRef, moviesRef, seriesRef]);

  const renderMenuItem = useCallback((item: MenuItem) => {
    const isActive = activeRoute === item.id;
    const isFocused = focusedId === item.id;

    const itemRef = getItemRef(item.id);
    const selfNode = getNode(itemRef);
    const rightNode = getFocusTarget(item.id) ?? getFocusTarget(activeRoute);

    return (
      <Pressable
        key={item.id}
        ref={itemRef as React.RefObject<any>}
        onPress={() => {
          isPressClosingRef.current = true;
          clearPendingBlur();
          setFocusedId(null);
          expandProgress.value = withTiming(0, {
            duration: 145,
            easing: Easing.bezier(0.22, 0.61, 0.36, 1),
          });
          if (pressNavigateTimeoutRef.current) {
            clearTimeout(pressNavigateTimeoutRef.current);
          }
          if (pressUnlockTimeoutRef.current) {
            clearTimeout(pressUnlockTimeoutRef.current);
          }
          pressNavigateTimeoutRef.current = setTimeout(() => {
            handlePress(item.id);
            pressNavigateTimeoutRef.current = null;
          }, 100);
          pressUnlockTimeoutRef.current = setTimeout(() => {
            isPressClosingRef.current = false;
            pressUnlockTimeoutRef.current = null;
          }, 450);
        }}
        onFocus={() => handleFocus(item.id)}
        onBlur={handleBlur}
        {...({
          nextFocusRight: rightNode,
          nextFocusLeft: selfNode,
          nextFocusUp: getUpNode(item.id),
          nextFocusDown: getDownNode(item.id),
        } as any)}
        style={[
          styles.menuItem,
          isFocused && styles.menuItemFocused,
          isFocused && {
            backgroundColor: focusedFill,
            borderColor: focusedBorder,
            shadowColor: focusedShadow,
          },
        ]}
      >
        {isActive && <View style={styles.activeHalo} pointerEvents="none" />}
        {isActive && <View style={styles.activeIndicator} pointerEvents="none" />}

        <View style={styles.menuItemContent}>
          <View
            style={[
              styles.iconWrapper,
              (isActive || isFocused) && styles.iconActiveBorder,
              isActive && { borderBottomColor: activeColor },
            ]}
          >
            <Icon
              name={item.icon}
              size={scaleFont(28)}
              color={isFocused || isActive ? '#FFFFFF' : inactiveColor}
            />
          </View>

          {shouldRenderLabels && (
            <Animated.View style={[styles.labelContainer, animatedLabelStyle]}>
              <Text
                style={[
                  styles.label,
                  isFocused && styles.labelFocused,
                  isActive && !isFocused && { color: activeColor },
                  isActive && isFocused && { color: '#FFFFFF' },
                ]}
              >
                {item.label}
              </Text>
            </Animated.View>
          )}
        </View>
      </Pressable>
    );
  }, [
    activeRoute,
    focusedId,
    activeColor,
    inactiveColor,
    focusedFill,
    focusedBorder,
    focusedShadow,
    shouldRenderLabels,
    animatedLabelStyle,
    expandProgress,
    clearPendingBlur,
    handlePress,
    handleFocus,
    handleBlur,
    getItemRef,
    getNode,
    getFocusTarget,
    getUpNode,
    getDownNode,
  ]);

  return (
    <View style={styles.outerContainer}>
      <Animated.View style={[styles.container, animatedContainerStyle]}>
        <View style={styles.rimLight} pointerEvents="none" />
        <View style={styles.innerLiquidGlow} pointerEvents="none" />

        <View style={styles.header}>
          <Pressable
            ref={profileRef}
            onPress={onProfilePress}
            onFocus={() => handleFocus('Profile')}
            onBlur={handleBlur}
            {...({
              nextFocusUp: getNode(profileRef),
              nextFocusLeft: getNode(profileRef),
              nextFocusRight: getFocusTarget(activeRoute),
              nextFocusDown: getNode(searchRef),
            } as any)}
            style={[
              styles.profileButton,
              focusedId === 'Profile' && styles.profileFocused,
              focusedId === 'Profile' && {
                backgroundColor: focusedFill,
                borderColor: focusedBorder,
                shadowColor: focusedShadow,
              },
            ]}
          >
            <View style={styles.menuItemContent}>
              <View style={styles.iconWrapper}>
                <Icon
                  name="user"
                  size={scaleFont(26)}
                  color={focusedId === 'Profile' ? '#FFFFFF' : inactiveColor}
                />
              </View>
              {shouldRenderLabels && (
                <Animated.View style={[styles.labelContainer, animatedLabelStyle]}>
                  <Text style={[styles.label, focusedId === 'Profile' && styles.labelFocused]}>Profile</Text>
                </Animated.View>
              )}
            </View>
          </Pressable>
          <View style={styles.divider} />
        </View>

        <View style={styles.menuList}>{MENU_ITEMS.map(renderMenuItem)}</View>

        <View style={styles.footer}>
          <View style={styles.dividerFooter} />
          {renderMenuItem(SETTINGS_ITEM)}
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    height: '100%',
    paddingVertical: scale(24),
    paddingLeft: scale(18),
    justifyContent: 'center',
    zIndex: 100,
  },
  container: {
    height: scale(820),
    borderRadius: CONTAINER_RADIUS,
    backgroundColor: 'rgba(18, 20, 23, 0.88)',
    borderWidth: scale(1.5),
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000',
    shadowOpacity: 0.72,
    shadowRadius: scale(28),
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
    overflow: 'hidden',
  },
  rimLight: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: CONTAINER_RADIUS - 1,
    borderWidth: scale(0.8),
    borderColor: 'rgba(255, 255, 255, 0.1)',
    margin: scale(1.5),
  },
  innerLiquidGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: CONTAINER_RADIUS,
    backgroundColor: 'rgba(255, 255, 255, 0.012)',
    borderWidth: scale(1),
    borderColor: 'rgba(255, 255, 255, 0.03)',
    margin: scale(4),
  },
  header: {
    width: '100%',
    alignItems: 'flex-start',
    paddingTop: scale(20),
  },
  profileButton: {
    width: '100%',
    height: scale(62),
    borderRadius: scale(31),
    justifyContent: 'center',
    paddingHorizontal: ITEM_LEFT_PADDING,
  },
  profileFocused: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderColor: 'rgba(255, 255, 255, 0.22)',
    borderWidth: 1.5,
    shadowOpacity: 0.18,
    shadowRadius: scale(10),
    transform: [{ scale: 1.02 }],
  },
  divider: {
    width: '70%',
    alignSelf: 'center',
    height: scale(1),
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    marginTop: scale(14),
    marginBottom: scale(4),
  },
  dividerFooter: {
    width: '70%',
    alignSelf: 'center',
    height: scale(1),
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    marginTop: scale(4),
    marginBottom: scale(10),
  },
  menuList: {
    flex: 1,
    width: '100%',
    paddingVertical: scale(5),
    justifyContent: 'center',
  },
  footer: {
    width: '100%',
    paddingBottom: scale(16),
  },
  menuItem: {
    width: '100%',
    height: scale(58),
    justifyContent: 'center',
    borderRadius: scale(29),
    marginBottom: scale(6),
    paddingHorizontal: ITEM_LEFT_PADDING,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  menuItemFocused: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderColor: 'rgba(255, 255, 255, 0.22)',
    shadowColor: '#FFFFFF',
    shadowOpacity: 0.18,
    shadowRadius: scale(10),
    elevation: 4,
    transform: [{ scale: 1.02 }],
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrapper: {
    width: ICON_SIZE_MAX,
    height: scale(40),
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconActiveBorder: {
    borderBottomWidth: scale(3),
    borderBottomColor: 'transparent',
  },
  labelContainer: {
    marginLeft: scale(22),
    flex: 1,
  },
  label: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: scaleFont(19),
    fontWeight: '600',
    letterSpacing: 0.2,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1.5 },
    textShadowRadius: 3,
  },
  labelFocused: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  activeIndicator: {
    position: 'absolute',
    left: scale(-ITEM_LEFT_PADDING + 8),
    width: scale(5),
    height: scale(30),
    borderRadius: scale(3),
    backgroundColor: '#E50914',
    shadowColor: '#E50914',
    shadowOpacity: 0.45,
    shadowRadius: 4,
    elevation: 4,
  },
  activeHalo: {
    position: 'absolute',
    left: ITEM_LEFT_PADDING - (scale(56) - ICON_SIZE_MAX) / 2,
    width: scale(56),
    height: scale(56),
    borderRadius: scale(28),
    backgroundColor: 'rgba(229, 9, 20, 0.22)',
    zIndex: -1,
  },
});

export default memo(TVSidebar);
