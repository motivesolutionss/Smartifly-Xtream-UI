/**
 * Smartifly TV Navigator
 * 
 * Main navigation container for TV platform.
 * Handles TV-specific navigation patterns and screen transitions.
 * 
 * TV Navigation differs from mobile:
 * - No bottom tabs (uses sidebar navigation)
 * - D-pad focus-based navigation
 * - Larger touch targets
 * - Simplified navigation hierarchy
 * 
 * @enterprise-grade
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Theme
import { colors } from '../theme';
import useStore from '../store';
import { logger } from '../config';

// TV Screens
import {
    TVLoginScreen,
    TVLoadingScreen,
    TVHomeScreen,
    TVLiveScreen,
    TVMoviesScreen,
    TVSeriesScreen,
    TVPlayerScreen,
    TVMovieDetailScreen,
    TVSeriesDetailScreen,
} from '../screens/tv';

// Types
import { RootStackParamList } from './types';

// =============================================================================
// STACK NAVIGATOR
// =============================================================================

const Stack = createNativeStackNavigator<RootStackParamList>();

// =============================================================================
// TV NAVIGATOR COMPONENT
// =============================================================================

/**
 * TV Navigator
 * 
 * Root navigator for Android TV / Fire TV platform.
 * Features:
 * - Stack-based navigation (no tabs)
 * - TV-optimized screen transitions
 * - Focus management for D-pad navigation
 * - Sidebar-based content navigation
 */
const TVNavigator: React.FC = () => {
    // Get authentication and content state from store
    const isAuthenticated = useStore((state) => state.isAuthenticated);
    const isCacheValid = useStore((state) => state.isCacheValid);

    // Determine initial route with SMART CACHE VALIDATION
    const getInitialRoute = (): keyof RootStackParamList => {
        if (!isAuthenticated) {
            return 'Login';
        }

        // Check if cache is valid (exists, not stale, has data)
        if (!isCacheValid()) {
            logger.info('TV: Cache invalid or stale, forcing prefetch...');
            return 'Loading';
        }

        logger.debug('TV: Cache valid, proceeding to Home');
        return 'TVHome';
    };

    return (
        <Stack.Navigator
            initialRouteName={getInitialRoute()}
            screenOptions={{
                headerShown: false,
                animation: 'fade',
                animationDuration: 300,
                contentStyle: {
                    backgroundColor: colors.background,
                },
                // Prevent gesture navigation (not applicable for TV)
                gestureEnabled: false,
            }}
        >
            {/* ═══════════════════════════════════════════════════════════════
                AUTH FLOW
            ═══════════════════════════════════════════════════════════════ */}
            <Stack.Screen
                name="Login"
                component={TVLoginScreen}
                options={{
                    animationTypeForReplace: 'pop',
                }}
            />

            {/* ═══════════════════════════════════════════════════════════════
                LOADING
            ═══════════════════════════════════════════════════════════════ */}
            <Stack.Screen
                name="Loading"
                component={TVLoadingScreen}
            />

            {/* ═══════════════════════════════════════════════════════════════
                MAIN CONTENT SCREENS (Sidebar Navigation)
            ═══════════════════════════════════════════════════════════════ */}

            {/* Home - Curated content hub */}
            <Stack.Screen
                name="TVHome"
                component={TVHomeScreen}
            />

            {/* 
                NOTE: TVLive, TVMovies, and TVSeries are now rendered INTERNALLY 
                within TVHomeScreen to support the persistent sidebar. 
                They should NOT be navigated to directly via Stack.
            
            <Stack.Screen
                name="TVLive"
                component={TVLiveScreen}
            />

            <Stack.Screen
                name="TVMovies"
                component={TVMoviesScreen}
            />

            <Stack.Screen
                name="TVSeries"
                component={TVSeriesScreen}
            />
            */}

            {/* Player */}
            <Stack.Screen name="FullscreenPlayer" component={TVPlayerScreen} />

            {/* Details */}
            <Stack.Screen name="TVMovieDetail" component={TVMovieDetailScreen} />
            <Stack.Screen name="TVSeriesDetail" component={TVSeriesDetailScreen} />

            {/* Future Screens
            <Stack.Screen name="TVSearch" component={TVSearchScreen} />
            <Stack.Screen name="TVSettings" component={TVSettingsScreen} />
            */}
        </Stack.Navigator>
    );
};

export default TVNavigator;
