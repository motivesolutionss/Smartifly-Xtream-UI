/**
 * Smartifly Bottom Tab Navigator
 * 
 * Main tab navigation for the app.
 * Uses custom styled tab bar with 5 tabs:
 * Home, Live TV, Movies, Series, Settings
 */

import React from 'react';
import { Platform, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { BottomTabParamList } from './types';
import CustomTabBar from './components/CustomTabBar';

// Stack imports
import HomeStack from './stacks/HomeStack';
import AnnouncementsStack from './stacks/AnnouncementsStack';
import FavoritesStack from './stacks/FavoritesStack';
import SettingsStack from './stacks/SettingsStack';

// Theme colors
import { colors } from '../theme';

// =============================================================================
// TAB NAVIGATOR
// =============================================================================

const Tab = createBottomTabNavigator<BottomTabParamList>();

/**
 * Bottom Tab Navigator
 * Main navigation structure after user is logged in
 */
const BottomTabNavigator: React.FC = () => {
    return (
        <Tab.Navigator
            tabBar={(props) => <CustomTabBar {...props} />}
            screenOptions={{
                headerShown: false,
                tabBarHideOnKeyboard: true,
                // Lazy loading - only render tab when focused for the first time
                lazy: true,
            }}
            initialRouteName="HomeTab"
        >
            {/* Home Tab */}
            <Tab.Screen
                name="HomeTab"
                component={HomeStack}
                options={{
                    title: 'Home',
                    tabBarLabel: 'Home',
                }}
            />

            {/* Announcements Tab */}
            <Tab.Screen
                name="AnnouncementsTab"
                component={AnnouncementsStack}
                options={{
                    title: 'Announcements',
                    tabBarLabel: 'Announcements',
                }}
            />

            {/* Favorites Tab */}
            <Tab.Screen
                name="FavoritesTab"
                component={FavoritesStack}
                options={{
                    title: 'Favorites',
                    tabBarLabel: 'Favorites',
                }}
            />

            {/* Settings Tab */}
            <Tab.Screen
                name="SettingsTab"
                component={SettingsStack}
                options={{
                    title: 'Settings',
                    tabBarLabel: 'Settings',
                }}
            />
        </Tab.Navigator>
    );
};

export default BottomTabNavigator;