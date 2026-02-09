import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
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

  // ✅ match useRef<View>(null)
  searchRef?: React.RefObject<View | null>;
  focusTargets?: Partial<Record<SidebarRoute, number | null>>;
}

interface MenuItem {
  id: SidebarRoute;
  icon: string;
}

const MENU_ITEMS: MenuItem[] = [
  { id: 'Search', icon: 'magnifyingGlass' },
  { id: 'Home', icon: 'home' },
  { id: 'Live', icon: 'television' },
  { id: 'Movies', icon: 'filmStrip' },
  { id: 'Series', icon: 'layers' },
  { id: 'Announcements', icon: 'bell' },
  { id: 'Favorites', icon: 'heart' },
  { id: 'Downloads', icon: 'downloadSimple' },
  { id: 'Settings', icon: 'settings' },
];

const createStyles = () =>
  StyleSheet.create({
    outerContainer: {
      height: '100%',
      paddingVertical: scale(40),
      paddingLeft: scale(20),
      justifyContent: 'center',
    },
    container: {
      width: scale(90),
      height: '90%',
      borderRadius: scale(45),
      justifyContent: 'center',
      alignItems: 'center',
    },
    menuList: {
      width: '100%',
      alignItems: 'center',
      paddingVertical: scale(20),
    },
    menuItem: {
      width: scale(70),
      height: scale(70),
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: scale(35),
      marginBottom: scale(10),
    },
    menuItemFocused: {
      transform: [{ scale: 1.12 }],
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
    },
    iconContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingBottom: scale(4),
    },
    iconActiveBorder: {
      borderBottomWidth: scale(3),
      paddingHorizontal: scale(4),
    },
  });

const TVSidebar = ({
  activeRoute,
  onNavigate,
  isExpanded: _isExpanded,
  onExpand: _onExpand,
  onCollapse: _onCollapse,
  searchRef,
  focusTargets
}: TVSidebarProps) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(), []);
  const [focusedId, setFocusedId] = useState<SidebarRoute>(activeRoute);

  // Keep highlight synced (but no navigation on focus)
  useEffect(() => {
    setFocusedId(activeRoute);
  }, [activeRoute]);

  const handlePress = useCallback(
    (id: SidebarRoute) => {
      if (id !== activeRoute) onNavigate(id);
    },
    [activeRoute, onNavigate]
  );

  const activeColor = theme.colors.primary;
  const inactiveColor = theme.colors.textMuted || '#8E9AAF';
  const activeBorderStyle = useMemo(() => ({ borderBottomColor: activeColor }), [activeColor]);
  const getFocusTarget = useCallback(
    (route: SidebarRoute) => {
      const target = focusTargets?.[route];
      return target ?? undefined;
    },
    [focusTargets]
  );

  return (
    <View style={styles.outerContainer}>
      <View style={[styles.container, stylePresets.glassCard]}>
        <View style={styles.menuList}>
          {MENU_ITEMS.map((item) => {
            const isActive = activeRoute === item.id;
            const isFocused = focusedId === item.id;

            return (
              <Pressable
                key={item.id}
                // ✅ Only attach ref to the Search item. Otherwise pass nothing.
                ref={item.id === 'Search' ? searchRef : undefined}
                onPress={() => handlePress(item.id)}
                onFocus={() => setFocusedId(item.id)}
                onBlur={() => setFocusedId(activeRoute)}
                hasTVPreferredFocus={isActive}
                // ✅ Right from sidebar goes to section entry target (when available)
                // @ts-ignore TV-only focus prop
                nextFocusRight={isActive ? getFocusTarget(item.id) : undefined}
                style={[styles.menuItem, isFocused && styles.menuItemFocused]}
              >
                <View
                  style={[
                    styles.iconContainer,
                    (isActive || isFocused) && styles.iconActiveBorder,
                    (isActive || isFocused) && activeBorderStyle,
                  ]}
                >
                  <Icon
                    name={item.icon}
                    size={scaleFont(28)}
                    color={isFocused ? '#FFF' : isActive ? activeColor : inactiveColor}
                  />
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
};

export default memo(TVSidebar);
