/**
 * Smartifly Navigation
 * 
 * Main navigation module export.
 * Contains all navigators and navigation types.
 */

// Main navigators
export { default as MobileNavigator } from './MobileNavigator';
export { default as BottomTabNavigator } from './BottomTabNavigator';

// Stack navigators
export {
    HomeStack,
    LiveStack,
    MoviesStack,
    SeriesStack,
    SettingsStack,
} from './stacks';

// Components
export { default as CustomTabBar } from './components/CustomTabBar';

// Types
export * from './types';

// =============================================================================
// APP NAVIGATOR COMPONENT
// =============================================================================

import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { Platform } from 'react-native';
import MobileNavigator from './MobileNavigator';
import TVNavigator from './TVNavigator';

import { colors } from '../theme';

// Theme for navigation container
const navigationTheme = {
    ...DefaultTheme,
    dark: true,
    colors: {
        ...DefaultTheme.colors,
        primary: colors.primary,
        background: colors.background,
        card: colors.backgroundSecondary,
        text: colors.textPrimary,
        border: colors.border,
        notification: colors.primary,
    },
};

/**
 * Main App Navigator
 * 
 * Root navigation component that wraps the entire app.
 * Automatically selects mobile or TV navigator based on platform.
 */
export const AppNavigator: React.FC = () => {
    const isTV = Platform.isTV;

    return (
        <NavigationContainer theme={navigationTheme}>
            {isTV ? (
                <TVNavigator />
            ) : (
                <MobileNavigator />
            )}
        </NavigationContainer>
    );
};

export default AppNavigator;