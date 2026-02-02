/**
 * Home Stack Navigator
 * 
 * Navigation stack for the Home tab.
 * Contains: HomeMain, Search, Player, SeriesDetail, MovieDetail
 */

import React from 'react';
import { View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeStackParamList } from '../../navigation/types';
import { colors } from '../../theme';
import HomeScreen from '../../screens/mobile/home/HomeScreen';
import PlayerScreen from '../../screens/mobile/PlayerScreen';
import MovieDetailScreen from '../../screens/mobile/MovieDetailScreen';
import SeriesDetailScreen from '../../screens/mobile/SeriesDetailScreen';

const Stack = createNativeStackNavigator<HomeStackParamList>();

const PlaceholderScreen: React.FC = () => <View />;

const HomeStack: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'fade',
      }}
    >
      <Stack.Screen
        name="HomeMain"
        component={HomeScreen}
        options={{ title: 'Home' }}
      />
      <Stack.Screen
        name="Search"
        component={PlaceholderScreen}
        options={{ animation: 'fade_from_bottom' }}
      />
      <Stack.Screen
        name="Player"
        component={PlayerScreen}
        options={{ orientation: 'landscape', animation: 'fade' }}
      />
      <Stack.Screen
        name="SeriesDetail"
        component={SeriesDetailScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="MovieDetail"
        component={MovieDetailScreen}
        options={{ animation: 'slide_from_right' }}
      />
    </Stack.Navigator>
  );
};

export default HomeStack;
