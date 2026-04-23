import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import TVNavigator from './navigation/TVNavigator';
import { ThemeProvider } from './theme';

export default function AppRoot() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <NavigationContainer>
          <TVNavigator />
        </NavigationContainer>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
