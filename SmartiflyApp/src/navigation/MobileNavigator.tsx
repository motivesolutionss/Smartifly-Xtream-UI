/**
 * Smartifly Mobile Navigator
 * 
 * Root navigator for mobile devices.
 * Uses the migrated mobile screens with auth-guarded routing.
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import BottomTabNavigator from './BottomTabNavigator';
import { RootStackParamList } from './types';
import { colors } from '../theme';
import useStore from '../store';
import { logger } from '../config';

// Mobile Screens
import LoginScreen from '../screens/mobile/login/LoginScreen';
import LoadingScreen from '../screens/mobile/loading/LoadingScreen';
import PlayerScreen from '../screens/mobile/PlayerScreen';
// Profile Screens (Parental Controls)
import { ProfileSwitcherScreen, ProfileEditorScreen } from '../screens/mobile/profiles';
import DownloadsScreen from '../screens/mobile/DownloadsScreen';
import { useProfileStore } from '../store/profileStore';

const Stack = createNativeStackNavigator<RootStackParamList>();

const MobileNavigator: React.FC = () => {
  // Get authentication and content state from store
  const isAuthenticated = useStore((state) => state.isAuthenticated);
  const isCacheValid = useStore((state) => state.isCacheValid);

  // Determine initial route with SMART CACHE VALIDATION + PROFILE CHECK
  const getInitialRoute = (): keyof RootStackParamList => {
    const { profiles, activeProfileId } = useProfileStore.getState();

    if (!isAuthenticated) {
      return 'Login';
    }

    // Check if profile needs to be selected (multiple profiles or no active profile)
    if (profiles.length > 1 && !activeProfileId) {
      logger.info('Mobile: Multiple profiles, showing profile switcher');
      return 'ProfileSwitcher';
    }

    // Check if cache is valid (exists, not stale, has data)
    if (!isCacheValid()) {
      logger.info('Mobile: Cache invalid or stale, forcing prefetch...');
      return 'Loading';
    }

    logger.debug('Mobile: Cache valid, proceeding to Home');
    return 'MainTabs';
  };

  const initialRoute = getInitialRoute();

  return (
    <Stack.Navigator
      initialRouteName={initialRoute}
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        freezeOnBlur: true,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen
        name="Login"
        component={LoginScreen}
      />
      <Stack.Screen
        name="Loading"
        component={LoadingScreen}
      />
      <Stack.Screen
        name="MainTabs"
        component={BottomTabNavigator}
      />
      <Stack.Screen
        name="FullscreenPlayer"
        component={PlayerScreen}
        options={{
          presentation: 'fullScreenModal',
          animation: 'slide_from_bottom',
        }}
      />
      {/* Profile Screens (Parental Controls) */}
      <Stack.Screen
        name="ProfileSwitcher"
        component={ProfileSwitcherScreen}
      />
      <Stack.Screen
        name="ProfileEditor"
        component={ProfileEditorScreen}
      />
      <Stack.Screen
        name="Downloads"
        component={DownloadsScreen}
      />
    </Stack.Navigator>
  );
};

export default MobileNavigator;
