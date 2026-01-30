/**
 * Live Stack Navigator
 * 
 * Navigation stack for the Live TV tab.
 * Contains: LiveMain, Player
 */

import React from 'react';
import { View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LiveStackParamList } from '../../navigation/types';
import { colors } from '../../theme';
import LiveScreen from '../../screens/mobile/LiveScreen';
import PlayerScreen from '../../screens/mobile/PlayerScreen';

const Stack = createNativeStackNavigator<LiveStackParamList>();

const PlaceholderScreen: React.FC = () => <View />;

const LiveStack: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'fade',
      }}
    >
      <Stack.Screen
        name="LiveMain"
        component={LiveScreen}
        options={{ title: 'Live TV' }}
      />
      <Stack.Screen
        name="Player"
        component={PlayerScreen}
        options={{ orientation: 'landscape', animation: 'fade' }}
      />
    </Stack.Navigator>
  );
};

export default LiveStack;
