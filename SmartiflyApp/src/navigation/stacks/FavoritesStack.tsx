/**
 * Smartifly Favorites Stack
 * 
 * Navigation stack for the Favorites tab.
 */

import React from 'react';
import { View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { FavoritesStackParamList } from '../../navigation/types';

const Stack = createNativeStackNavigator<FavoritesStackParamList>();

const PlaceholderScreen: React.FC = () => <View />;

const FavoritesStack: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
      initialRouteName="FavoritesMain"
    >
      <Stack.Screen name="FavoritesMain" component={PlaceholderScreen} />
      <Stack.Screen name="Player" component={PlaceholderScreen} />
      <Stack.Screen name="MovieDetail" component={PlaceholderScreen} />
      <Stack.Screen name="SeriesDetail" component={PlaceholderScreen} />
    </Stack.Navigator>
  );
};

export default FavoritesStack;
