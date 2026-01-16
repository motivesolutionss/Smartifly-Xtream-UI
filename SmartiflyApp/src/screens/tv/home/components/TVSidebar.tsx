/**
 * TV Sidebar Component - Enhanced Navigation
 * 
 * Netflix-style sidebar with content type navigation.
 * Handles navigation between Home, Live, Movies, Series screens.
 * 
 * @enterprise-grade
 */

import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Animated,
    Pressable,
} from 'react-native';
import { colors, scale, scaleFont, Icon } from '../../../../theme';

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
    | 'Settings';

export type ContentRoute = 'Home' | 'Live' | 'Movies' | 'Series';

interface TVSidebarProps {
    activeRoute: SidebarRoute;
    onNavigate: (route: SidebarRoute) => void;
    isExpanded: boolean;
    onExpand: () => void;
    onCollapse: () => void;
    searchRef?: React.Ref<View>; // Ref for the Search button
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
    { id: 'Settings', label: 'Settings', icon: 'settings', section: 'utility' },
];

// =============================================================================
// TV SIDEBAR COMPONENT
// =============================================================================

const TVSidebar: React.FC<TVSidebarProps> = ({
    activeRoute,
    onNavigate,
    searchRef,
    // Expansion props no longer needed but kept for interface compatibility if needed, 
    // or we can remove them from interface. 
    // For now, I'll ignore them in implementation.
}) => {
    // Focus State
    const [focusedId, setFocusedId] = useState<SidebarRoute | null>(null);

    const handleFocus = (id: SidebarRoute) => {
        setFocusedId(id);

        // For content navigation items, navigate on focus (TV UX pattern)
        const contentRoutes: SidebarRoute[] = ['Home', 'Live', 'Movies', 'Series', 'Announcements'];
        if (contentRoutes.includes(id)) {
            onNavigate(id);
        }
    };

    const renderItem = (item: MenuItem) => {
        const isActive = activeRoute === item.id;
        const isFocused = focusedId === item.id;
        const iconColor = isFocused ? '#FFF' : (isActive ? colors.primary || '#E50914' : '#FFF');

        return (
            <Pressable
                key={item.id}
                ref={item.id === 'Search' ? searchRef : undefined}
                onPress={() => onNavigate(item.id)}
                onFocus={() => handleFocus(item.id)}
                style={[
                    styles.menuItem,
                    isFocused && styles.menuItemFocused,
                ]}
            >
                <View style={[
                    styles.iconContainer,
                    (isActive || isFocused) && styles.iconActiveBorder
                ]}>
                    <Icon
                        name={item.icon}
                        size={scaleFont(30)}
                        color={iconColor}
                    />
                </View>
            </Pressable>
        );
    };

    return (
        <View style={styles.container}>
            {/* Single List of Items */}
            <View style={styles.menuList}>
                {MENU_ITEMS.map(renderItem)}
            </View>
        </View>
    );
};

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
    container: {
        width: scale(95), // Slightly wider sidebar
        height: '100%',
        backgroundColor: colors.background, // Match app background
        paddingTop: scale(210), // Push icons down to match Netflix style
        paddingBottom: scale(20),
        alignItems: 'center',
    },
    menuList: {
        flex: 1,
        width: '100%',
        alignItems: 'center',
    },
    menuItem: {
        width: scale(70), // Slightly wider touch area
        height: scale(50),
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: scale(8),
        marginBottom: scale(15), // Detailed spacing
    },
    menuItemActive: {
        // Border now on icon
    },
    menuItemFocused: {
        // Border now on icon
        transform: [{ scale: 1.1 }],
    },
    iconContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingBottom: scale(5),
    },
    iconActiveBorder: {
        borderBottomWidth: scale(3),
        borderBottomColor: colors.primary || '#E50914',
        paddingHorizontal: scale(2), // Just slightly wider than the icon
    },
});

export default TVSidebar;
