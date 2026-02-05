import React, { useState, useEffect, useRef } from 'react';
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
    const navTimer = useRef<any>(null);

    const handleFocus = (id: SidebarRoute) => {
        setFocusedId(id);

        // Debounce navigation slightly to let focus animations finish (approx 150ms)
        if (navTimer.current) clearTimeout(navTimer.current);

        navTimer.current = setTimeout(() => {
            onNavigate(id);
        }, 150);
    };

    // Clear timer on unmount
    useEffect(() => {
        return () => {
            if (navTimer.current) clearTimeout(navTimer.current);
        };
    }, []);

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
                onPress={() => onNavigate(item.id)}
                onFocus={() => handleFocus(item.id)}
                onBlur={() => setFocusedId(null)}
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
                {isFocused && (
                    <View style={[styles.focusAura, { backgroundColor: activeColor }]} />
                )}
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

export default TVSidebar;
