/**
 * Home Stack Navigator
 * 
 * Navigation stack for the Home tab.
 * Contains: HomeMain, Search, Player, SeriesDetail, MovieDetail
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeStackParamList } from '../../navigation/types';
import { colors } from '../../theme';
import HomeScreen from '../../screens/mobile/home/HomeScreen';
import BrowseScreen from '../../screens/mobile/browse/BrowseScreen';
import SearchScreen from '../../screens/mobile/search/SearchScreen';
import PlayerScreen from '../../screens/mobile/PlayerScreen';
import MovieDetailScreen from '../../screens/mobile/MovieDetailScreen';
import SeriesDetailScreen from '../../screens/mobile/SeriesDetailScreen';

const Stack = createNativeStackNavigator<HomeStackParamList>();

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
        component={SearchScreen}
        options={{ animation: 'fade_from_bottom' }}
      />
      <Stack.Screen
        name="Browse"
        component={BrowseScreen}
        options={{ animation: 'slide_from_right' }}
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
