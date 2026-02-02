/**
 * Smartifly Search Stack
 *
 * Provides Search, Player, and detail navigation for search results.
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SearchStackParamList } from '../../navigation/types';
import SearchScreen from '../../screens/mobile/search/SearchScreen';
import PlayerScreen from '../../screens/mobile/PlayerScreen';
import MovieDetailScreen from '../../screens/mobile/MovieDetailScreen';
import SeriesDetailScreen from '../../screens/mobile/SeriesDetailScreen';

const Stack = createNativeStackNavigator<SearchStackParamList>();

const SearchStack: React.FC = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
      animation: 'slide_from_right',
    }}
    initialRouteName="SearchMain"
  >
    <Stack.Screen name="SearchMain" component={SearchScreen} />
    <Stack.Screen name="Player" component={PlayerScreen} />
    <Stack.Screen name="MovieDetail" component={MovieDetailScreen} />
    <Stack.Screen name="SeriesDetail" component={SeriesDetailScreen} />
  </Stack.Navigator>
);

export default SearchStack;
