/**
 * Series Stack Navigator
 * 
 * Navigation stack for the Series tab.
 * Contains: SeriesMain, SeriesDetail, Player
 */

import React from 'react';

import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SeriesStackParamList } from '../../navigation/types';
import { colors } from '../../theme';
import SeriesScreen from '../../screens/mobile/SeriesScreen';
import SeriesDetailScreen from '../../screens/mobile/SeriesDetailScreen';
import PlayerScreen from '../../screens/mobile/PlayerScreen';

const Stack = createNativeStackNavigator<SeriesStackParamList>();



const SeriesStack: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'fade',
      }}
    >
      <Stack.Screen
        name="SeriesMain"
        component={SeriesScreen}
        options={{ title: 'Series' }}
      />
      <Stack.Screen
        name="SeriesDetail"
        component={SeriesDetailScreen}
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

export default SeriesStack;
