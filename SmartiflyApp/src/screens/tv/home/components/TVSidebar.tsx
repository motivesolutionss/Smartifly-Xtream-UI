import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
    View,
    StyleSheet,
    Pressable,
} from 'react-native';
import {
    scale,
    scaleFont,
    Icon,
    useTheme,
    stylePresets
} from '../../../../theme';

// =============================================================================
// TYPES
// =============================================================================

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
    searchRef?: React.Ref<View>;
}

interface MenuItem {
    id: SidebarRoute;
    label: string;
    icon: string;
    section: 'content' | 'utility';
}

// =============================================================================
// MENU CONFIGURATION
// =============================================================================

const MENU_ITEMS: MenuItem[] = [
    { id: 'Search', label: 'Search', icon: 'magnifyingGlass', section: 'utility' },
    { id: 'Home', label: 'Home', icon: 'home', section: 'content' },
    { id: 'Live', label: 'Live TV', icon: 'television', section: 'content' },
    { id: 'Movies', label: 'Movies', icon: 'filmStrip', section: 'content' },
    { id: 'Series', label: 'Series', icon: 'layers', section: 'content' },
    { id: 'Announcements', label: 'Announcements', icon: 'bell', section: 'content' },
    { id: 'Favorites', label: 'Favorites', icon: 'heart', section: 'utility' },
    { id: 'Downloads', label: 'Downloads', icon: 'downloadSimple', section: 'utility' },
    { id: 'Settings', label: 'Settings', icon: 'settings', section: 'utility' },
];

// =============================================================================
// TV SIDEBAR COMPONENT
// =============================================================================

const TVSidebar: React.FC<TVSidebarProps> = ({
    activeRoute,
    onNavigate,
    searchRef,
}) => {
    // State
    const [focusedId, setFocusedId] = useState<SidebarRoute | null>(null);
    const { theme } = useTheme();
    const lastActiveRouteRef = useRef<SidebarRoute>(activeRoute);
    const suppressedFocusRef = useRef<SidebarRoute | null>(null);
    const suppressTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const suppressAllFocusRef = useRef(false);
    const suppressAllTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Keep focus highlight in sync with active route to avoid focus bounce
    useEffect(() => {
        if (focusedId !== activeRoute) {
            setFocusedId(activeRoute);
        }
    }, [activeRoute, focusedId]);

    // Suppress stale focus callbacks from the previous route after switching
    useEffect(() => {
        if (lastActiveRouteRef.current !== activeRoute) {
            suppressedFocusRef.current = lastActiveRouteRef.current;
            lastActiveRouteRef.current = activeRoute;

            if (suppressTimeoutRef.current) {
                clearTimeout(suppressTimeoutRef.current);
            }
            suppressTimeoutRef.current = setTimeout(() => {
                suppressedFocusRef.current = null;
            }, 150);

            suppressAllFocusRef.current = true;
            if (suppressAllTimeoutRef.current) {
                clearTimeout(suppressAllTimeoutRef.current);
            }
            suppressAllTimeoutRef.current = setTimeout(() => {
                suppressAllFocusRef.current = false;
            }, 400);
        }
    }, [activeRoute]);

    const handleNavigate = useCallback((id: SidebarRoute) => {
        if (activeRoute !== id) {
            onNavigate(id);
        }
    }, [activeRoute, onNavigate]);

    const handleFocus = useCallback((id: SidebarRoute) => {
        setFocusedId(id);
        if (suppressAllFocusRef.current) {
            return;
        }
        if (suppressedFocusRef.current === id && activeRoute !== id) {
            return;
        }
        handleNavigate(id);
    }, [activeRoute, handleNavigate]);

    const renderItem = (item: MenuItem) => {
        const isActive = activeRoute === item.id;
        const isFocused = focusedId === item.id;

        // Aether theme colors
        const activeColor = theme.colors.primary;
        const inactiveColor = theme.colors.textMuted || '#8E9AAF';

        return (
            <Pressable
                key={item.id}
                ref={item.id === 'Search' ? searchRef : undefined}
                onPress={() => handleNavigate(item.id)}
                onFocus={() => handleFocus(item.id)}
                onBlur={() => setFocusedId(null)}
                hasTVPreferredFocus={isActive}
                style={[
                    styles.menuItem,
                    isFocused && styles.menuItemFocused,
                    isFocused && { shadowColor: activeColor }
                ]}
            >
                <View style={[
                    styles.iconContainer,
                    (isActive || isFocused) && styles.iconActiveBorder,
                    isActive && !isFocused && { borderBottomColor: activeColor + '80' },
                    isFocused && { borderBottomColor: activeColor }
                ]}>
                    <Icon
                        name={item.icon}
                        size={scaleFont(28)}
                        color={isFocused ? '#FFF' : (isActive ? activeColor : inactiveColor)}
                    />
                </View>
            </Pressable>
        );
    };

    return (
        <View style={styles.outerContainer}>
            <View style={[styles.container, stylePresets.glassCard]}>
                <View style={styles.menuList}>
                    {MENU_ITEMS.map(renderItem)}
                </View>
            </View>
        </View>
    );
};

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
    outerContainer: {
        height: '100%',
        paddingVertical: scale(40),
        paddingLeft: scale(20),
        justifyContent: 'center',
    },
    container: {
        width: scale(90),
        height: '90%',
        borderRadius: scale(45), // Capsule shape floating HUD
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
        position: 'relative',
    },
    menuItemFocused: {
        transform: [{ scale: 1.15 }],
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        zIndex: 10,
    },
    iconContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingBottom: scale(4),
        zIndex: 2,
    },
    iconActiveBorder: {
        borderBottomWidth: scale(3),
        borderBottomColor: '#00F3FF',
        paddingHorizontal: scale(4),
    },
    focusAura: {
        position: 'absolute',
        width: scale(80),
        height: scale(80),
        borderRadius: scale(40),
        opacity: 0.15,
        zIndex: 1,
    }
});

export default React.memo(TVSidebar);
