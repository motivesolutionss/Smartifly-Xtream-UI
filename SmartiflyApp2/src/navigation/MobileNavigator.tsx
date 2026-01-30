/**
 * Smartifly Mobile Navigator
 * 
 * Root navigator for mobile devices.
 * Handles authentication flow and main app navigation.
 * 
 * Flow:
 * - If not authenticated: Show Login screen
 * - If authenticated but no content: Show Loading screen (prefetch)
 * - If authenticated with content: Show Bottom Tab Navigator
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import BottomTabNavigator from './BottomTabNavigator';
import useStore from '../store';
import { colors } from '../theme';
import { logger } from '../config';

// Screen imports
import LoginScreen from '../screens/mobile/login/LoginScreen';
import LoadingScreen from '../screens/mobile/LoadingScreen';
import PlayerScreen from '../screens/mobile/PlayerScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * Mobile Navigator Component
 * 
 * Checks authentication and content state to determine initial route:
 * - Not authenticated → Login
 * - Authenticated, no content → Loading (prefetch)
 * - Authenticated, has content → MainTabs
 */
const MobileNavigator: React.FC = () => {
    // Get authentication and content state from store
    const isAuthenticated = useStore((state) => state.isAuthenticated);
    const isCacheValid = useStore((state) => state.isCacheValid);

    // Determine initial route with SMART CACHE VALIDATION
    const getInitialRoute = (): keyof RootStackParamList => {
        if (!isAuthenticated) {
            return 'Login';
        }

        // NEW: Check if cache is valid (exists, not stale, has data)
        // This prevents showing stale content or empty screens
        if (!isCacheValid()) {
            logger.info('Cache invalid or stale, forcing prefetch...');
            return 'Loading';
        }

        logger.debug('Cache valid, proceeding to MainTabs');
        return 'MainTabs';
    };

    return (
        <Stack.Navigator
            screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.background },
                animation: 'fade',
            }}
            initialRouteName={getInitialRoute()}
        >
            {/* Authentication Screen */}
            <Stack.Screen
                name="Login"
                component={LoginScreen}
                options={{
                    gestureEnabled: false,
                }}
            />

            {/* Loading/Prefetch Screen */}
            <Stack.Screen
                name="Loading"
                component={LoadingScreen}
                options={{
                    gestureEnabled: false,
                    animation: 'fade',
                }}
            />

            {/* Main App (Bottom Tabs) */}
            <Stack.Screen
                name="MainTabs"
                component={BottomTabNavigator}
                options={{
                    gestureEnabled: false,
                    animation: 'fade',
                }}
            />

            {/* Fullscreen Player (accessible from any tab) */}
            <Stack.Screen
                name="FullscreenPlayer"
                component={PlayerScreen}
                options={{
                    orientation: 'landscape',
                    animation: 'fade',
                    presentation: 'fullScreenModal',
                }}
            />
        </Stack.Navigator>
    );
};

export default MobileNavigator;