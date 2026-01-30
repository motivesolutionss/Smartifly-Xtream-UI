/**
 * Smartifly Mobile Navigator
 * 
 * Root navigator for mobile devices.
 * Uses placeholder screens until mobile-specific implementations are migrated.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import BottomTabNavigator from './BottomTabNavigator';
import { RootStackParamList } from './types';
import { colors } from '../theme';

const Stack = createNativeStackNavigator<RootStackParamList>();

const PlaceholderScreen: React.FC<{ title: string }> = ({ title }) => (
  <View style={styles.container}>
    <Text style={styles.text}>{title}</Text>
  </View>
);

const MobileNavigator: React.FC = () => (
  <Stack.Navigator
    initialRouteName="MainTabs"
    screenOptions={{
      headerShown: false,
      animation: 'fade',
      contentStyle: { backgroundColor: colors.background },
    }}
  >
    <Stack.Screen
      name="Login"
      component={() => <PlaceholderScreen title="Mobile Login" />}
    />
    <Stack.Screen
      name="Loading"
      component={() => <PlaceholderScreen title="Mobile Loading" />}
    />
    <Stack.Screen
      name="MainTabs"
      component={BottomTabNavigator}
    />
    <Stack.Screen
      name="FullscreenPlayer"
      component={() => <PlaceholderScreen title="Mobile Fullscreen Player" />}
      options={{
        presentation: 'fullScreenModal',
      }}
    />
  </Stack.Navigator>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '600',
  },
});

export default MobileNavigator;
