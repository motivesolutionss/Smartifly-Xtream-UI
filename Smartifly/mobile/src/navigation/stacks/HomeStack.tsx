/**
 * Home Stack Navigator
 * 
 * Navigation stack for the Home tab.
 * Contains: HomeMain, Search, Browse, SeriesDetail, MovieDetail
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeStackParamList } from '../../navigation/types';
import { colors } from '../../theme';
import ErrorBoundary from '../../components/ErrorBoundary';
import HomeScreen from '../../screens/mobile/home/HomeScreen';
import BrowseScreen from '../../screens/mobile/browse/BrowseScreen';
import SearchScreen from '../../screens/mobile/search/SearchScreen';
import MovieDetailScreen from '../../screens/mobile/MovieDetailScreen';
import SeriesDetailScreen from '../../screens/mobile/SeriesDetailScreen';

const Stack = createNativeStackNavigator<HomeStackParamList>();

const withBoundary = <P extends object>(Component: React.ComponentType<P>) => {
  const Wrapped: React.FC<P> = (props) => (
    <ErrorBoundary>
      <Component {...props} />
    </ErrorBoundary>
  );
  return Wrapped;
};

const BoundedHomeScreen = withBoundary(HomeScreen);
const BoundedBrowseScreen = withBoundary(BrowseScreen);
const BoundedSearchScreen = withBoundary(SearchScreen);
const BoundedMovieDetailScreen = withBoundary(MovieDetailScreen);
const BoundedSeriesDetailScreen = withBoundary(SeriesDetailScreen);

const HomeStack: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        orientation: 'portrait',
        contentStyle: { backgroundColor: colors.background },
        animation: 'fade',
      }}
    >
      <Stack.Screen
        name="HomeMain"
        component={BoundedHomeScreen}
        options={{ title: 'Home' }}
      />
      <Stack.Screen
        name="Search"
        component={BoundedSearchScreen}
        options={{ animation: 'fade_from_bottom' }}
      />
      <Stack.Screen
        name="Browse"
        component={BoundedBrowseScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="SeriesDetail"
        component={BoundedSeriesDetailScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="MovieDetail"
        component={BoundedMovieDetailScreen}
        options={{ animation: 'slide_from_right' }}
      />
    </Stack.Navigator>
  );
};

export default HomeStack;
