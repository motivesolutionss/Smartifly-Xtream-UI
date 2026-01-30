/**
 * Settings Stack Navigator
 * 
 * Navigation stack for the Settings tab.
 * Contains: SettingsMain
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SettingsStackParamList } from '../../navigation/types';
import { colors } from '../../theme';
import SettingsScreen from '../../screens/mobile/SettingsScreen';

const Stack = createNativeStackNavigator<SettingsStackParamList>();

const SettingsStack: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'fade',
      }}
    >
      <Stack.Screen
        name="SettingsMain"
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />
    </Stack.Navigator>
  );
};

export default SettingsStack;
