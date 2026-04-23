/**
 * Smartifly Mobile Navigator
 * 
 * Root navigator for mobile devices.
 * Uses the migrated mobile screens with auth-guarded routing.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import NetInfo from '@react-native-community/netinfo';
import BottomTabNavigator from './BottomTabNavigator';
import { RootStackParamList } from './types';
import { colors } from '../theme';
import useAuthStore from '../store/authStore';
import useContentStore from '../store/contentStore';
import useAppStatusStore from '../store/appStatusStore';
import useOfflineQueueStore from '../store/offlineQueueStore';
import { logger } from '../config';
import { setupMemoryManager } from '../utils/memoryManager';
import SmartiflyPreloaderScreen from '../screens/common/SmartiflyPreloaderScreen';

// Mobile Screens
import LoginScreen from '../screens/mobile/login/LoginScreen';
import LoadingScreen from '../screens/mobile/loading/LoadingScreen';
import PlayerScreen from '../screens/mobile/PlayerScreen';
// Profile Screens (Parental Controls)
import { ProfileSwitcherScreen, ProfileEditorScreen } from '../screens/mobile/profiles';
import DownloadsScreen from '../screens/mobile/DownloadsScreen';
import { useProfileStore } from '../store/profileStore';
import BlockedScreen from '../screens/mobile/BlockedScreen';


const Stack = createNativeStackNavigator<RootStackParamList>();

const MobileNavigator: React.FC = () => {
  // Get authentication and content state from store
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isCacheValid = useContentStore((state) => state.isCacheValid);
  const refreshCacheIfNeeded = useContentStore((state) => state.refreshCacheIfNeeded);
  const setNetworkState = useContentStore((state) => state.setNetworkState);
  const loadContentCache = useContentStore((state) => state.loadContentCache);
  const contentCacheLoaded = useContentStore((state) => state.contentCacheLoaded);
  const checkDeviceBan = useAppStatusStore((state) => state.checkDeviceBan);
  const fetchAnnouncements = useAppStatusStore((state) => state.fetchAnnouncements);
  const fatherControl = useAppStatusStore((state) => state.fatherControl);
  const profiles = useProfileStore((state) => state.profiles);
  const activeProfileId = useProfileStore((state) => state.activeProfileId);
  const [showPreloader, setShowPreloader] = useState(true);
  const [deviceCheckDone, setDeviceCheckDone] = useState(false);
  const [announcementsPrefetchDone, setAnnouncementsPrefetchDone] = useState(false);
  const [startupTimedOut, setStartupTimedOut] = useState(false);
  const setHasHydrated = useAuthStore((state) => state.setHasHydrated);
  const processOfflineQueue = useOfflineQueueStore((state) => state.processQueue);

  useEffect(() => {
    const timer = setTimeout(() => setShowPreloader(false), 1400);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const watchdog = setTimeout(() => {
      const authState = useAuthStore.getState();
      logger.warn('Mobile startup gate timeout, forcing gate release', {
        hasHydrated: authState.hasHydrated,
        isAuthenticated: authState.isAuthenticated,
      });
      if (!authState.hasHydrated) {
        setHasHydrated(true);
      }
      setShowPreloader(false);
      setDeviceCheckDone(true);
      setAnnouncementsPrefetchDone(true);
      setStartupTimedOut(true);
    }, 12000);

    return () => clearTimeout(watchdog);
  }, [setHasHydrated]);

  useEffect(() => {
    checkDeviceBan().finally(() => setDeviceCheckDone(true));
  }, [checkDeviceBan]);

  useEffect(() => {
    fetchAnnouncements().finally(() => setAnnouncementsPrefetchDone(true));
  }, [fetchAnnouncements]);

  useEffect(() => {
    loadContentCache();
  }, [loadContentCache]);

  useEffect(() => {
    const updateNetworkState = (isConnected: boolean, connectionType: string | null) => {
      setNetworkState(isConnected, connectionType);
      if (isConnected) {
        processOfflineQueue();
      }
    };

    const subscription = NetInfo.addEventListener((state) => {
      const isConnected = Boolean(state.isConnected && state.isInternetReachable !== false);
      updateNetworkState(isConnected, state.type ?? null);
    });

    NetInfo.fetch().then((state) => {
      const isConnected = Boolean(state.isConnected && state.isInternetReachable !== false);
      updateNetworkState(isConnected, state.type ?? null);
    });

    return () => subscription();
  }, [processOfflineQueue, setNetworkState]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        refreshCacheIfNeeded();
      }
    });
    return () => subscription.remove();
  }, [refreshCacheIfNeeded]);

  // Memory management — tier-aware cleanup on background
  useEffect(() => {
    const cleanup = setupMemoryManager();
    return cleanup;
  }, []);

  // Determine initial route with SMART CACHE VALIDATION + PROFILE CHECK
  const initialRoute = useMemo<keyof RootStackParamList>(() => {
    if (fatherControl.status === 'BANNED') {
      return 'Blocked';
    }

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
  }, [fatherControl.status, isAuthenticated, profiles.length, activeProfileId, isCacheValid]);

  const waitForContentCache = isAuthenticated && !contentCacheLoaded;
  const gateBlocked = !startupTimedOut && (
    !hasHydrated ||
    showPreloader ||
    !deviceCheckDone ||
    !announcementsPrefetchDone ||
    waitForContentCache
  );

  useEffect(() => {
    if (!gateBlocked) return;
    logger.info('Mobile startup gate waiting', {
      hasHydrated,
      showPreloader,
      deviceCheckDone,
      announcementsPrefetchDone,
      isAuthenticated,
      contentCacheLoaded,
      waitForContentCache,
      startupTimedOut,
    });
  }, [
    announcementsPrefetchDone,
    contentCacheLoaded,
    deviceCheckDone,
    gateBlocked,
    hasHydrated,
    isAuthenticated,
    showPreloader,
    startupTimedOut,
    waitForContentCache,
  ]);

  // Hydration gate prevents initial route decisions before persisted state is ready.
  if (gateBlocked) {
    return <SmartiflyPreloaderScreen />;
  }

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
        name="Blocked"
        component={BlockedScreen}
        initialParams={{
          status: fatherControl.status,
          message: fatherControl.message ?? undefined,
        }}
      />
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
          animation: 'fade',
          orientation: 'landscape',
          gestureEnabled: false,
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
