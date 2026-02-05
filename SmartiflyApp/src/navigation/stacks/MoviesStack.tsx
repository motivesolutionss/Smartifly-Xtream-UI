/**
 * Movies Stack Navigator
 * 
 * Navigation stack for the Movies tab.
 * Contains: MoviesMain, MovieDetail, Player
 */

import React from 'react';

import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MoviesStackParamList } from '../../navigation/types';
import { colors } from '../../theme';
import MoviesScreen from '../../screens/mobile/MoviesScreen';
import MovieDetailScreen from '../../screens/mobile/MovieDetailScreen';
import PlayerScreen from '../../screens/mobile/PlayerScreen';

const Stack = createNativeStackNavigator<MoviesStackParamList>();



const MoviesStack: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'fade',
      }}
    >
      <Stack.Screen
        name="MoviesMain"
        component={MoviesScreen}
        options={{ title: 'Movies' }}
      />
      <Stack.Screen
        name="MovieDetail"
        component={MovieDetailScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="Player"
        component={PlayerScreen}
        options={{ orientation: 'landscape', animation: 'fade' }}
      />
    </Stack.Navigator>
  );
};

export default MoviesStack;
