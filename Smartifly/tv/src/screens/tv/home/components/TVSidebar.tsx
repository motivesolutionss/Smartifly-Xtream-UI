import React, { memo, useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, Pressable, Text, findNodeHandle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { scale, scaleFont, Icon, useTheme, stylePresets } from '../../../../theme';

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

  // ✅ match useRef<View>(null)
  searchRef?: React.RefObject<View | null>;
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
const ITEM_LEFT_PADDING = SIDEBAR_CENTER - ICON_SIZE_MAX / 2; // Perfectly centers the 36px wrapper at 48px

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
  searchRef: _providedSearchRef,
  focusTargets
}: TVSidebarProps) => {
  const { theme } = useTheme();
  const [focusedId, setFocusedId] = useState<SidebarRoute | 'Profile' | null>(null);

  // Refs for focus management
  const profileRef = React.useRef<View>(null);
  const internalSearchRef = React.useRef<View>(null);
  const downloadsRef = React.useRef<View>(null);
  const settingsRef = React.useRef<View>(null);

  // Use the provided searchRef if available, otherwise use our internal one
  const searchRef = (_providedSearchRef as React.RefObject<View>) || internalSearchRef;

  // Animation values
  const expandProgress = useSharedValue(0);

  // Sync animation with focus
  useEffect(() => {
    const isSidebarFocused = focusedId !== null;
    expandProgress.value = withSpring(isSidebarFocused ? 1 : 0, SPRING_CONFIG);

    if (isSidebarFocused && onExpand) onExpand();
    if (!isSidebarFocused && onCollapse) onCollapse();
  }, [focusedId, onExpand, onCollapse, expandProgress]);

  const animatedContainerStyle = useAnimatedStyle(() => {
    return {
      width: interpolate(
        expandProgress.value,
        [0, 1],
        [MINI_WIDTH, MAX_WIDTH],
        Extrapolate.CLAMP
      ),
      backgroundColor: `rgba(12, 12, 12, ${interpolate(expandProgress.value, [0, 1], [0.78, 0.88])})`,
    };
  });

  const animatedLabelStyle = useAnimatedStyle(() => {
    return {
      opacity: withTiming(expandProgress.value > 0.75 ? 1 : 0, { duration: 180 }),
      transform: [
        {
          translateX: interpolate(expandProgress.value, [0.4, 1], [-25, 0], Extrapolate.CLAMP),
        },
      ],
    };
  });

  const handlePress = useCallback(
    (id: SidebarRoute) => {
      if (id !== activeRoute) onNavigate(id);
    },
    [activeRoute, onNavigate]
  );

  const activeColor = '#E50914';
  const inactiveColor = theme.colors.textMuted || '#808080';

  const getFocusTarget = useCallback(
    (route: SidebarRoute) => {
      const target = focusTargets?.[route];
      return target ?? undefined;
    },
    [focusTargets]
  );

  const renderMenuItem = (item: MenuItem) => {
    const isActive = activeRoute === item.id;
    const isFocused = focusedId === item.id;

    // Assign specific refs for focus chaining
    let itemRef: React.RefObject<any> | undefined;
    if (item.id === 'Search') itemRef = searchRef;
    if (item.id === 'Downloads') itemRef = downloadsRef;
    if (item.id === 'Settings') itemRef = settingsRef;

    return (
      <Pressable
        key={item.id}
        ref={itemRef}
        onPress={() => handlePress(item.id)}
        onFocus={() => setFocusedId(item.id)}
        onBlur={() => setFocusedId(null)}
        // Focus Trapping and Chaining
        {...({
          nextFocusRight: getFocusTarget(activeRoute),
          nextFocusLeft: itemRef?.current ? findNodeHandle(itemRef.current) : undefined, // Trap Left
          nextFocusUp: item.id === 'Search'
            ? (profileRef.current ? findNodeHandle(profileRef.current) : undefined)
            : (item.id === 'Settings' ? (downloadsRef.current ? findNodeHandle(downloadsRef.current) : undefined) : undefined),
          nextFocusDown: item.id === 'Downloads'
            ? (settingsRef.current ? findNodeHandle(settingsRef.current) : undefined)
            : (item.id === 'Settings' ? (settingsRef.current ? findNodeHandle(settingsRef.current) : undefined) : undefined),
        } as any)}
        style={[
          styles.menuItem,
          isFocused && styles.menuItemFocused
        ]}
      >
        {isActive && (
          <View style={styles.activeHalo} pointerEvents="none" />
        )}
        {isActive && <View style={styles.activeIndicator} pointerEvents="none" />}

        <View style={styles.menuItemContent}>
          <View style={[
            styles.iconWrapper,
            (isActive || isFocused) && styles.iconActiveBorder,
            isActive && { borderBottomColor: activeColor }
          ]}>
            <Icon
              name={item.icon}
              size={scaleFont(28)}
              color={isFocused ? '#FFF' : isActive ? activeColor : inactiveColor}
            />
          </View>

          <Animated.View style={[styles.labelContainer, animatedLabelStyle]}>
            <Text style={[
              styles.label,
              isFocused && styles.labelFocused,
              isActive && !isFocused && { color: activeColor }
            ]}>
              {item.label}
            </Text>
          </Animated.View>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.outerContainer}>
      <Animated.View style={[styles.container, stylePresets.glassCard, animatedContainerStyle]}>
        {/* Rim Lighting / Edge highlight - Concentric curve (Radius - margin) */}
        <View style={styles.rimLight} pointerEvents="none" />

        {/* Secondary Inner Glow for "Liquid" feel */}
        <View style={styles.innerLiquidGlow} pointerEvents="none" />

        {/* Profile Section */}
        <View style={styles.header}>
          <Pressable
            ref={profileRef}
            onPress={onProfilePress}
            onFocus={() => setFocusedId('Profile')}
            onBlur={() => setFocusedId(null)}
            // Focus Trapping
            {...({
              nextFocusUp: findNodeHandle(profileRef.current), // Trap Up
              nextFocusLeft: findNodeHandle(profileRef.current), // Trap Left
              nextFocusRight: getFocusTarget(activeRoute),
              nextFocusDown: findNodeHandle(searchRef.current),
            } as any)}
            style={[
              styles.profileButton,
              focusedId === 'Profile' && styles.profileFocused
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
              <Animated.View style={[styles.labelContainer, animatedLabelStyle]}>
                <Text style={[styles.label, focusedId === 'Profile' && styles.labelFocused]}>Profile</Text>
              </Animated.View>
            </View>
          </Pressable>
          <View style={styles.divider} />
        </View>

        {/* Menu Items */}
        <View style={styles.menuList}>
          {MENU_ITEMS.map(renderMenuItem)}
        </View>

        {/* Footer Section (Settings) */}
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
    paddingLeft: scale(20),
    justifyContent: 'center',
    zIndex: 100,
  },
  container: {
    height: scale(820), // More balanced height for the content volume
    borderRadius: CONTAINER_RADIUS,
    backgroundColor: 'rgba(12, 12, 12, 0.82)',
    borderWidth: scale(1.5),
    borderColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: '#000',
    shadowOpacity: 0.85,
    shadowRadius: scale(35),
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
    overflow: 'hidden',
  },
  rimLight: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: CONTAINER_RADIUS - 1, // Concentric adjustment
    borderWidth: scale(0.8),
    borderColor: 'rgba(255, 255, 255, 0.12)',
    margin: scale(1.5),
  },
  innerLiquidGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: CONTAINER_RADIUS,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: scale(1),
    borderColor: 'rgba(255, 255, 255, 0.04)',
    margin: scale(4),
  },
  header: {
    width: '100%',
    alignItems: 'flex-start',
    paddingTop: scale(20), // Tighter header
  },
  profileButton: {
    width: '100%',
    height: scale(62),
    borderRadius: scale(31),
    justifyContent: 'center',
    paddingHorizontal: ITEM_LEFT_PADDING,
  },
  profileFocused: {
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    borderColor: 'rgba(255, 255, 255, 0.4)',
    borderWidth: 1.5,
    transform: [{ scale: 1.03 }],
  },
  divider: {
    width: '70%',
    alignSelf: 'center',
    height: scale(1), // Thinner divider
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    marginTop: scale(14),
    marginBottom: scale(4),
  },
  dividerFooter: {
    width: '70%',
    alignSelf: 'center',
    height: scale(1), // Thinner divider
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    marginTop: scale(4),
    marginBottom: scale(10),
  },
  menuList: {
    flex: 1,
    width: '100%',
    paddingVertical: scale(5),
    justifyContent: 'center', // Snug centering
  },
  footer: {
    width: '100%',
    paddingBottom: scale(16), // Tighter footer
  },
  menuItem: {
    width: '100%',
    height: scale(54),
    justifyContent: 'center',
    borderRadius: scale(27),
    marginBottom: scale(5),
    paddingHorizontal: ITEM_LEFT_PADDING,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  menuItemFocused: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#FFFFFF',
    shadowOpacity: 0.25,
    shadowRadius: scale(14),
    elevation: 6,
    transform: [{ scale: 1.06 }],
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
    letterSpacing: 0.8,
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
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 4,
  },
  activeHalo: {
    position: 'absolute',
    left: ITEM_LEFT_PADDING - (scale(56) - ICON_SIZE_MAX) / 2, // Centers 56px halo over 36px icon at established padding
    width: scale(56),
    height: scale(56),
    borderRadius: scale(28),
    backgroundColor: 'rgba(229, 9, 20, 0.25)',
    zIndex: -1,
  },
});

export default memo(TVSidebar);
