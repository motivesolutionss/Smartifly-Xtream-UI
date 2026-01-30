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
import { colors } from '../theme';
import TVLoginScreen from '../screens/tv/login/TVLoginScreen';
import TVLoadingScreen from '../screens/tv/loading/TVLoadingScreen';
import TVHomeScreen from '../screens/tv/home/TVHomeScreen';
import TVPlayerScreen from '../screens/tv/player/TVPlayerScreen';
import TVMovieDetailScreen from '../screens/tv/details/TVMovieDetailScreen';
import TVSeriesDetailScreen from '../screens/tv/details/TVSeriesDetailScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

const TVNavigator: React.FC = () => (
  <Stack.Navigator
    initialRouteName="Login"
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

export default TVNavigator;
