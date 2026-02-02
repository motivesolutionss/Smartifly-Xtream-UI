/**
 * Smartifly TV Navigator
 *
 * Root stack navigator for Android TV / Fire TV.
 * Uses the migrated TV screens to drive the platform experience.
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
// Theme
import { colors } from '../theme';
import useStore from '../store';
import { logger } from '../config';

// TV Screens
import TVLoginScreen from '../screens/tv/login/TVLoginScreen';
import TVLoadingScreen from '../screens/tv/loading/TVLoadingScreen';
import TVHomeScreen from '../screens/tv/home/TVHomeScreen';
import TVPlayerScreen from '../screens/tv/player/TVPlayerScreen';
// Re-importing to fix Metro resolution
import TVMovieDetailScreen from '../screens/tv/details/TVMovieDetailScreenV2';
import TVSeriesDetailScreen from '../screens/tv/details/TVSeriesDetailScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

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

  const initialRoute = getInitialRoute();

  return (
    <Stack.Navigator
      initialRouteName={initialRoute}
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        animationDuration: 300,
        contentStyle: { backgroundColor: colors.background },
        gestureEnabled: false,
      }}
    >
      <Stack.Screen name="Login" component={TVLoginScreen} />
      <Stack.Screen name="Loading" component={TVLoadingScreen} />
      <Stack.Screen name="TVHome" component={TVHomeScreen} />
      <Stack.Screen name="FullscreenPlayer" component={TVPlayerScreen} />
      <Stack.Screen name="TVMovieDetail" component={TVMovieDetailScreen} />
      <Stack.Screen name="TVSeriesDetail" component={TVSeriesDetailScreen} />
    </Stack.Navigator>
  );
};

export default TVNavigator;
