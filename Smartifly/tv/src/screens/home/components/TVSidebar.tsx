import React, { memo, useCallback, useEffect, useRef } from 'react';
import { View, StyleSheet, Pressable, Text, findNodeHandle } from 'react-native';
import Animated, {
  Easing,
  Extrapolate,
  createAnimatedComponent,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scale, scaleFont, Icon, useTheme } from '../.././../theme';

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

type SidebarItemId = SidebarRoute | 'Profile';

interface TVSidebarProps {
  activeRoute: SidebarRoute;
  onNavigate: (route: SidebarRoute) => void;
  isExpanded?: boolean;
  onExpand?: () => void;
  onCollapse?: () => void;
  onProfilePress?: () => void;
  searchRef?: React.RefObject<View | null>;
  onHomeNodeReady?: (node: number | undefined) => void;
  onSearchNodeReady?: (node: number | undefined) => void;
  focusTargets?: Partial<Record<SidebarRoute, number | null>>;
}

interface MenuItem {
  id: SidebarRoute;
  icon: string;
  label: string;
}

interface SidebarNavItemProps {
  id: SidebarItemId;
  icon: string;
  label: string;
  isActive: boolean;
  activeColor: string;
  inactiveColor: string;
  expandProgress: SharedValue<number>;
  itemRef: React.RefObject<View | null>;
  onPress: () => void;
  onFocusItem: (id: SidebarItemId) => void;
  onBlurItem: (id: SidebarItemId) => void;
  nextFocusLeft?: number;
  nextFocusRight?: number;
  nextFocusUp?: number;
  nextFocusDown?: number;
  onHomeNodeReady?: (node: number | undefined) => void;
  onSearchNodeReady?: (node: number | undefined) => void;
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

const AnimatedPressable = createAnimatedComponent(Pressable);

const SidebarNavItem = memo(({
  id,
  icon,
  label,
  isActive,
  activeColor,
  inactiveColor,
  expandProgress,
  itemRef,
  onPress,
  onFocusItem,
  onBlurItem,
  nextFocusLeft,
  nextFocusRight,
  nextFocusUp,
  nextFocusDown,
  onHomeNodeReady,
  onSearchNodeReady,
}: SidebarNavItemProps) => {
  const focusProgress = useSharedValue(0);

  const handleFocus = useCallback(() => {
    focusProgress.value = withTiming(1, { duration: 110, easing: Easing.out(Easing.quad) });
    onFocusItem(id);
  }, [focusProgress, id, onFocusItem]);

  const handleBlur = useCallback(() => {
    focusProgress.value = withTiming(0, { duration: 110, easing: Easing.out(Easing.quad) });
    onBlurItem(id);
  }, [focusProgress, id, onBlurItem]);

  const handleLayout = useCallback(() => {
    if (id === 'Home' && onHomeNodeReady) {
      const node = findNodeHandle(itemRef.current) ?? undefined;
      if (node) onHomeNodeReady(node);
    }

    if (id === 'Search' && onSearchNodeReady) {
      const node = findNodeHandle(itemRef.current) ?? undefined;
      if (node) onSearchNodeReady(node);
    }
  }, [id, itemRef, onHomeNodeReady, onSearchNodeReady]);

  const animatedItemStyle = useAnimatedStyle(() => {
    const visualFocusProgress = focusProgress.value * expandProgress.value;

    return {
      backgroundColor: interpolateColor(
        visualFocusProgress,
        [0, 1],
        ['rgba(255, 255, 255, 0)', 'rgba(255, 255, 255, 0.18)']
      ),
      borderColor: interpolateColor(
        visualFocusProgress,
        [0, 1],
        ['rgba(255, 255, 255, 0)', 'rgba(255, 255, 255, 0.22)']
      ),
      transform: [{ scale: interpolate(visualFocusProgress, [0, 1], [1, 1.02]) }],
    };
  });

  const animatedLabelContainerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(expandProgress.value, [0, 1], [0, 1], Extrapolate.CLAMP),
    transform: [
      {
        translateX: interpolate(expandProgress.value, [0, 1], [-18, 0], Extrapolate.CLAMP),
      },
    ],
  }));

  const baseIconStyle = useAnimatedStyle(() => ({
    opacity: interpolate(focusProgress.value, [0, 1], [1, 0], Extrapolate.CLAMP),
  }));

  const focusedIconStyle = useAnimatedStyle(() => ({
    opacity: focusProgress.value,
  }));

  const baseLabelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(focusProgress.value, [0, 1], [1, 0], Extrapolate.CLAMP),
  }));

  const focusedLabelStyle = useAnimatedStyle(() => ({
    opacity: focusProgress.value,
  }));

  const iconBaseColor = isActive ? activeColor : inactiveColor;

  return (
    <AnimatedPressable
      ref={itemRef as React.RefObject<any>}
      collapsable={false}
      onPress={onPress}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onLayout={handleLayout}
      {...({
        nextFocusLeft,
        nextFocusRight,
        nextFocusUp,
        nextFocusDown,
      } as any)}
      style={[styles.menuItem, animatedItemStyle]}
    >
      {isActive && <View style={styles.activeHalo} pointerEvents="none" />}
      {isActive && <View style={styles.activeIndicator} pointerEvents="none" />}

      <View style={styles.menuItemContent}>
        <View
          style={[
            styles.iconWrapper,
            isActive && styles.iconActiveBorder,
            isActive && { borderBottomColor: activeColor },
          ]}
        >
          <Animated.View style={[styles.iconLayer, baseIconStyle]} pointerEvents="none">
            <Icon name={icon} size={scaleFont(28)} color={iconBaseColor} />
          </Animated.View>
          <Animated.View style={[styles.iconLayer, focusedIconStyle]} pointerEvents="none">
            <Icon name={icon} size={scaleFont(28)} color="#FFFFFF" />
          </Animated.View>
        </View>

        <Animated.View style={[styles.labelContainer, animatedLabelContainerStyle]} pointerEvents="none">
          <Animated.Text
            numberOfLines={1}
            style={[styles.label, isActive && { color: activeColor }, baseLabelStyle]}
          >
            {label}
          </Animated.Text>
          <Animated.Text
            numberOfLines={1}
            style={[styles.label, styles.labelFocused, styles.labelOverlay, focusedLabelStyle]}
          >
            {label}
          </Animated.Text>
        </Animated.View>
      </View>
    </AnimatedPressable>
  );
});

SidebarNavItem.displayName = 'SidebarNavItem';

const TVSidebar = ({
  activeRoute,
  onNavigate,
  isExpanded: _isExpanded,
  onExpand,
  onCollapse,
  onProfilePress,
  searchRef: providedSearchRef,
  onHomeNodeReady,
  onSearchNodeReady,
  focusTargets,
}: TVSidebarProps) => {
  const { theme } = useTheme();

  const profileRef = useRef<View>(null);
  const internalSearchRef = useRef<View>(null);
  const homeRef = useRef<View>(null);
  const liveRef = useRef<View>(null);
  const moviesRef = useRef<View>(null);
  const seriesRef = useRef<View>(null);
  const announcementsRef = useRef<View>(null);
  const favoritesRef = useRef<View>(null);
  const downloadsRef = useRef<View>(null);
  const settingsRef = useRef<View>(null);

  const searchRef = providedSearchRef ?? internalSearchRef;

  const expandProgress = useSharedValue(0);
  const focusedItemsRef = useRef<Set<SidebarItemId>>(new Set());
  const isExpandedRef = useRef(false);
  const blurTokenRef = useRef(0);

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
      if (tryResolve()) clearInterval(interval);
    }, 120);

    return () => clearInterval(interval);
  }, [onHomeNodeReady]);

  useEffect(() => {
    if (!onHomeNodeReady || !homeRef.current) return;
    const node = findNodeHandle(homeRef.current) ?? undefined;
    if (node) onHomeNodeReady(node);
  }, [activeRoute, onHomeNodeReady]);

  useEffect(() => {
    if (!onSearchNodeReady || !searchRef.current) return;
    const node = findNodeHandle(searchRef.current) ?? undefined;
    if (node) onSearchNodeReady(node);
  }, [activeRoute, onSearchNodeReady, searchRef]);

  const setSidebarExpanded = useCallback((expanded: boolean) => {
    if (isExpandedRef.current === expanded) return;
    isExpandedRef.current = expanded;

    if (expanded) {
      expandProgress.value = withSpring(1, SPRING_CONFIG);
      onExpand?.();
      return;
    }

    expandProgress.value = withTiming(0, {
      duration: 165,
      easing: Easing.bezier(0.22, 0.61, 0.36, 1),
    });
    onCollapse?.();
  }, [expandProgress, onCollapse, onExpand]);

  const handleItemFocus = useCallback((id: SidebarItemId) => {
    blurTokenRef.current += 1;
    focusedItemsRef.current.add(id);
    setSidebarExpanded(true);
  }, [setSidebarExpanded]);

  const handleItemBlur = useCallback((id: SidebarItemId) => {
    focusedItemsRef.current.delete(id);
    const token = ++blurTokenRef.current;

    Promise.resolve().then(() => {
      if (blurTokenRef.current !== token) return;
      if (focusedItemsRef.current.size === 0) {
        setSidebarExpanded(false);
      }
    });
  }, [setSidebarExpanded]);

  const collapseSidebar = useCallback(() => {
    focusedItemsRef.current.clear();
    blurTokenRef.current += 1;
    setSidebarExpanded(false);
  }, [setSidebarExpanded]);

  const animatedContainerStyle = useAnimatedStyle(() => ({
    width: interpolate(expandProgress.value, [0, 1], [MINI_WIDTH, MAX_WIDTH], Extrapolate.CLAMP),
    backgroundColor: interpolateColor(
      expandProgress.value,
      [0, 1],
      ['rgba(18, 20, 23, 0.82)', 'rgba(18, 20, 23, 0.92)']
    ),
  }));

  const activeColor = theme.colors.primary || '#E50914';
  const inactiveColor = theme.colors.icon || theme.colors.textMuted || '#9CA3AF';

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

  const handleRoutePress = useCallback((id: SidebarRoute) => {
    collapseSidebar();
    if (id !== activeRoute) onNavigate(id);
  }, [activeRoute, collapseSidebar, onNavigate]);

  const handleProfilePress = useCallback(() => {
    collapseSidebar();
    onProfilePress?.();
  }, [collapseSidebar, onProfilePress]);

  const renderMenuItem = useCallback((item: MenuItem) => {
    const itemRef = getItemRef(item.id);
    const selfNode = getNode(itemRef);
    const rightNode = getFocusTarget(item.id) ?? getFocusTarget(activeRoute);

    return (
      <SidebarNavItem
        key={item.id}
        id={item.id}
        icon={item.icon}
        label={item.label}
        isActive={activeRoute === item.id}
        activeColor={activeColor}
        inactiveColor={inactiveColor}
        expandProgress={expandProgress}
        itemRef={itemRef}
        onPress={() => handleRoutePress(item.id)}
        onFocusItem={handleItemFocus}
        onBlurItem={handleItemBlur}
        nextFocusLeft={selfNode}
        nextFocusRight={rightNode}
        nextFocusUp={getUpNode(item.id)}
        nextFocusDown={getDownNode(item.id)}
        onHomeNodeReady={onHomeNodeReady}
        onSearchNodeReady={onSearchNodeReady}
      />
    );
  }, [
    activeColor,
    activeRoute,
    expandProgress,
    getDownNode,
    getFocusTarget,
    getItemRef,
    getNode,
    getUpNode,
    handleItemBlur,
    handleItemFocus,
    handleRoutePress,
    inactiveColor,
    onHomeNodeReady,
    onSearchNodeReady,
  ]);

  return (
    <View style={styles.outerContainer}>
      <Animated.View style={[styles.container, animatedContainerStyle]}>
        <View style={styles.rimLight} pointerEvents="none" />
        <View style={styles.innerLiquidGlow} pointerEvents="none" />

        <View style={styles.header}>
          <SidebarNavItem
            id="Profile"
            icon="user"
            label="Profile"
            isActive={false}
            activeColor={activeColor}
            inactiveColor={inactiveColor}
            expandProgress={expandProgress}
            itemRef={profileRef}
            onPress={handleProfilePress}
            onFocusItem={handleItemFocus}
            onBlurItem={handleItemBlur}
            nextFocusUp={getNode(profileRef)}
            nextFocusLeft={getNode(profileRef)}
            nextFocusRight={getFocusTarget(activeRoute)}
            nextFocusDown={getNode(searchRef)}
          />
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
  iconLayer: {
    ...StyleSheet.absoluteFillObject,
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
    minHeight: scale(28),
    justifyContent: 'center',
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
  labelOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
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
