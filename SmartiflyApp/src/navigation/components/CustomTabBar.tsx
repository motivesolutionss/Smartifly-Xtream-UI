/**
 * Smartifly Custom Tab Bar
 * 
 * A premium styled bottom tab bar with icons and labels.
 * Features smooth styling without heavy animations for performance.
 */

import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';

import { colors, spacing, borderRadius } from '../../theme';
import { Icon, IconName } from '../../theme/icons';

// =============================================================================
// TYPES
// =============================================================================

// =============================================================================
// TAB CONFIGURATION
// =============================================================================

interface TabItemConfig {
    route: string;
    label: string;
    icon: string;
    iconActive: string;
    activeColor: string;
}

const TAB_CONFIG: Record<string, TabItemConfig> = {
    HomeTab: {
        route: 'HomeTab',
        label: 'Home',
        icon: '⌂',
        iconActive: '⌂',
        activeColor: colors.primary,
    },
    FavoritesTab: {
        route: 'FavoritesTab',
        label: 'Favorites',
        icon: 'heart',
        iconActive: 'heart',
        activeColor: colors.primary,
    },
    AnnouncementsTab: {
        route: 'AnnouncementsTab',
        label: 'Announcements',
        icon: 'bell',
        iconActive: 'bell',
        activeColor: colors.accent,
    },
    SettingsTab: {
        route: 'SettingsTab',
        label: 'Settings',
        icon: '⚙',
        iconActive: '⚙',
        activeColor: colors.accent,
    },
};

// =============================================================================
// TAB ICON COMPONENT
// =============================================================================



interface TabIconProps {
    name: string;
    focused: boolean;
    color: string;
    size: number;
}

/**
 * Tab Icon - Using Phosphor icons from theme
 */
const TabIcon: React.FC<TabIconProps> = ({ name, focused, color, size }) => {
    // Icon mapping - route icon names to IconName type
    const iconNameMap: Record<string, IconName> = {
        home: 'home',
        favorites: 'heart',
        updates: 'bell',
        settings: 'settings',
    };

    const iconName = iconNameMap[name] || 'home';

    return (
        <Icon
            name={iconName}
            size={size}
            color={color}
            weight={focused ? 'fill' : 'regular'}
        />
    );
};

// =============================================================================
// TAB BAR ITEM COMPONENT
// =============================================================================

interface TabBarItemProps {
    route: any;
    index: number;
    state: any;
    descriptors: any;
    navigation: any;
}

const TabBarItem: React.FC<TabBarItemProps> = ({
    route,
    index,
    state,
    descriptors,
    navigation,
}) => {
    const { options } = descriptors[route.key];
    const isFocused = state.index === index;

    const config = TAB_CONFIG[route.name] || {
        label: options.tabBarLabel ?? route.name,
        icon: 'circle',
        activeColor: colors.primary,
    };

    const onPress = () => {
        const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
        });

        if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
        }
    };

    const onLongPress = () => {
        navigation.emit({
            type: 'tabLongPress',
            target: route.key,
        });
    };

    const iconNameMap: Record<string, string> = {
        HomeTab: 'home',
        FavoritesTab: 'favorites',
        AnnouncementsTab: 'updates',
        SettingsTab: 'settings',
    };
    const iconName = iconNameMap[route.name as string] || 'circle';

    const activeColor = config.activeColor;
    const inactiveColor = colors.textMuted;
    const currentColor = isFocused ? activeColor : inactiveColor;

    return (
        <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={options.tabBarTestID}
            onPress={onPress}
            onLongPress={onLongPress}
            style={styles.tabItem}
            activeOpacity={0.7}
        >
            {/* Active Indicator */}
            {isFocused && (
                <View style={[styles.activeIndicator, { backgroundColor: activeColor }]} />
            )}

            {/* Icon Container */}
            <View style={[
                styles.iconContainer,
                isFocused && styles.iconContainerActive,
            ]}>
                <TabIcon
                    name={iconName}
                    focused={isFocused}
                    color={currentColor}
                    size={22}
                />
            </View>

            {/* Label */}
            <Text
                style={[
                    styles.label,
                    { color: currentColor },
                    isFocused && styles.labelActive,
                ]}
                numberOfLines={1}
            >
                {config.label}
            </Text>


        </TouchableOpacity>
    );
};

// =============================================================================
// CUSTOM TAB BAR COMPONENT
// =============================================================================

const CustomTabBar: React.FC<BottomTabBarProps> = ({
    state,
    descriptors,
    navigation,
}) => {
    const insets = useSafeAreaInsets();

    // Calculate bottom padding for safe area
    const bottomPadding = Math.max(insets.bottom, spacing.sm);

    return (
        <View style={[
            styles.container,
            { paddingBottom: bottomPadding }
        ]}>
            {/* Top border line */}
            <View style={styles.topBorder} />

            {/* Tab items */}
            <View style={styles.tabsContainer}>
                {state.routes.map((route, index) => (
                    <TabBarItem
                        key={route.key}
                        route={route}
                        index={index}
                        state={state}
                        descriptors={descriptors}
                        navigation={navigation}
                    />
                ))}
            </View>
        </View>
    );
};

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
    container: {
        backgroundColor: colors.backgroundSecondary,
        borderTopWidth: 0,
        elevation: 0,
        shadowOpacity: 0,
    },
    topBorder: {
        height: 1,
        backgroundColor: colors.border,
    },
    tabsContainer: {
        flexDirection: 'row',
        paddingTop: spacing.sm,
    },
    tabItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.xs,
        position: 'relative',
    },
    activeIndicator: {
        position: 'absolute',
        top: -1,
        width: 32,
        height: 3,
        borderRadius: 2,
    },
    iconContainer: {
        width: 40,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 8,
    },
    iconContainerActive: {
        // Subtle background for active state
        // backgroundColor: 'rgba(255, 255, 255, 0.05)',
    },
    label: {
        fontSize: 10,
        fontWeight: '500',
        marginTop: 2,
        letterSpacing: 0.2,
    },
    labelActive: {
        fontWeight: '600',
    },
    liveDot: {
        position: 'absolute',
        top: 6,
        right: '50%',
        marginRight: -18,
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: colors.live,
    },
});

export default CustomTabBar;