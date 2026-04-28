/**
 * Smartifly TV Navigator
 *
 * Root stack navigator for Android TV / Fire TV.
 * Uses the migrated TV screens to drive the platform experience.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Animated, Easing, Image, StatusBar, StyleSheet, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
// Theme
import { colors, scale } from '../theme';
import useStore from '../store';
import { logger } from '../config';
import BlockedScreen from '../screens/tv/TVBlockedScreen';

// TV Screens
import TVLoginScreen from '../screens/tv/login/TVLoginScreen';
import TVLoadingScreen from '../screens/tv/loading/TVLoadingScreen';
import TVHomeScreen from '../screens/tv/home/TVHomeScreen';
import TVPlayerScreen from '../screens/tv/player/TVPlayerScreen';
// Re-importing to fix Metro resolution
import TVMovieDetailScreen from '../screens/tv/details/TVMovieDetailScreen';
import TVSeriesDetailScreen from '../screens/tv/details/TVSeriesDetailScreen';
import TVAccountSwitcherScreen from '../screens/tv/account/TVAccountSwitcherScreen';
// Profile Screens (Parental Controls)
import { TVProfileSwitcher, TVProfileEditor, TVPinEntry } from '../screens/tv/profiles';
import { useProfileStore } from '../store/profileStore';
const Stack = createNativeStackNavigator<RootStackParamList>();

const StartupGateScreen: React.FC = () => {
  const logoPulse = React.useRef(new Animated.Value(0)).current;
  const loaderSweep = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(logoPulse, {
          toValue: 1,
          duration: 1100,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(logoPulse, {
          toValue: 0,
          duration: 1100,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    const sweepLoop = Animated.loop(
      Animated.timing(loaderSweep, {
        toValue: 1,
        duration: 1300,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      })
    );

    pulseLoop.start();
    sweepLoop.start();

    return () => {
      pulseLoop.stop();
      sweepLoop.stop();
      loaderSweep.setValue(0);
    };
  }, [loaderSweep, logoPulse]);

  const logoAnimatedStyle = {
    opacity: logoPulse.interpolate({
      inputRange: [0, 1],
      outputRange: [0.9, 1],
    }),
    transform: [
      {
        scale: logoPulse.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.04],
        }),
      },
    ],
  };

  const loaderAnimatedStyle = {
    transform: [
      {
        translateX: loaderSweep.interpolate({
          inputRange: [0, 1],
          outputRange: [scale(-88), scale(176)],
        }),
      },
    ],
  };

  return (
    <View style={styles.preloaderContainer}>
      <StatusBar hidden />

      <View style={styles.preloaderContent}>
        <Animated.View style={[styles.logoWrap, logoAnimatedStyle]}>
          <Image
            source={require('../assets/smartifly_icon.png')}
            style={styles.preloaderLogo}
            resizeMode="contain"
          />
        </Animated.View>

        <View style={styles.loaderTrack}>
          <Animated.View style={[styles.loaderSweep, loaderAnimatedStyle]} />
        </View>
      </View>
    </View>
  );
};

const TVNavigator: React.FC = () => {
  // Get authentication and content state from store
  const hasHydrated = useStore((state) => state.hasHydrated);
  const isAuthenticated = useStore((state) => state.isAuthenticated);
  const isCacheValid = useStore((state) => state.isCacheValid);
  const checkDeviceBan = useStore((state) => state.checkDeviceBan);
  const fetchAnnouncements = useStore((state) => state.fetchAnnouncements);
  const fatherControl = useStore((state) => state.fatherControl);
  const savedAccountsCount = useStore((state) => state.savedAccounts.length);
  const profiles = useProfileStore((state) => state.profiles);
  const activeProfileId = useProfileStore((state) => state.activeProfileId);
  const [showPreloader, setShowPreloader] = useState(true);
  const [deviceCheckDone, setDeviceCheckDone] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowPreloader(false), 1400);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    checkDeviceBan().finally(() => setDeviceCheckDone(true));
  }, [checkDeviceBan]);

  useEffect(() => {
    fetchAnnouncements().catch(() => undefined);
  }, [fetchAnnouncements]);

  // Determine initial route with SMART CACHE VALIDATION + PROFILE CHECK
  const initialRoute = useMemo<keyof RootStackParamList>(() => {
    if (fatherControl.status === 'BANNED') {
      return 'Blocked';
    }

    if (!isAuthenticated) {
      if (savedAccountsCount > 1) {
        return 'TVAccountSwitcher';
      }
      return 'Login';
    }

    // Check if profile needs to be selected (multiple profiles or no active profile)
    if (profiles.length > 1 && !activeProfileId) {
      logger.info('TV: Multiple profiles, showing profile switcher');
      return 'ProfileSwitcher';
    }

    // Check if cache is valid (exists, not stale, has data)
    if (!isCacheValid()) {
      logger.info('TV: Cache invalid or stale, forcing prefetch...');
      return 'Loading';
    }

    logger.debug('TV: Cache valid, proceeding to Home');
    return 'TVHome';
  }, [fatherControl.status, isAuthenticated, savedAccountsCount, profiles.length, activeProfileId, isCacheValid]);

  // Hydration gate prevents initial route decisions before persisted state is ready.
  if (!hasHydrated || showPreloader || !deviceCheckDone) {
    return <StartupGateScreen />;
  }

  return (
    <Stack.Navigator
      initialRouteName={initialRoute}
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        animationDuration: 300,
        freezeOnBlur: true,
        contentStyle: { backgroundColor: colors.background },
        gestureEnabled: false,
      }}
    >
      <Stack.Screen name="Blocked" component={BlockedScreen} initialParams={{
        status: fatherControl.status,
        message: fatherControl.message ?? undefined,
      }} />
      <Stack.Screen name="Login" component={TVLoginScreen} />
      <Stack.Screen name="TVAccountSwitcher" component={TVAccountSwitcherScreen} />
      <Stack.Screen name="Loading" component={TVLoadingScreen} />
      <Stack.Screen name="TVHome" component={TVHomeScreen} />
      <Stack.Screen name="FullscreenPlayer" component={TVPlayerScreen} />
      <Stack.Screen name="TVMovieDetail" component={TVMovieDetailScreen} />
      <Stack.Screen name="TVSeriesDetail" component={TVSeriesDetailScreen} />
      {/* Profile Screens (Parental Controls) */}
      <Stack.Screen name="ProfileSwitcher" component={TVProfileSwitcher} />
      <Stack.Screen name="ProfileEditor" component={TVProfileEditor} />
      <Stack.Screen name="PinEntry" component={TVPinEntry} />
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  preloaderContainer: {
    flex: 1,
    backgroundColor: colors.background || '#111111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  preloaderContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scale(32),
  },
  logoWrap: {
    marginBottom: scale(44),
  },
  preloaderLogo: {
    width: scale(450),
    height: scale(128),
    tintColor: colors.primary || '#E50914',
  },
  loaderTrack: {
    width: scale(280),
    height: scale(5),
    borderRadius: scale(2),
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    overflow: 'hidden',
  },
  loaderSweep: {
    width: scale(88),
    height: '100%',
    borderRadius: scale(2),
    backgroundColor: colors.primary || '#E50914',
  },
});

export default TVNavigator;
