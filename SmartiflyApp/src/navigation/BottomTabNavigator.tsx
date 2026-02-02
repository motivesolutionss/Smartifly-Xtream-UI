/**
 * Smartifly Bottom Tab Navigator
 * 
 * Main tab navigation for the app.
 * Uses custom styled tab bar with tabs defined in the shared types.
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import CustomTabBar from './components/CustomTabBar';
import { BottomTabParamList } from './types';

import HomeStack from './stacks/HomeStack';
import AnnouncementsStack from './stacks/AnnouncementsStack';
import FavoritesStack from './stacks/FavoritesStack';
import SettingsStack from './stacks/SettingsStack';

const Tab = createBottomTabNavigator<BottomTabParamList>();

const BottomTabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        lazy: true,
      }}
      initialRouteName="HomeTab"
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStack}
        options={{
          title: 'Home',
          tabBarLabel: 'Home',
        }}
      />
      <Tab.Screen
        name="AnnouncementsTab"
        component={AnnouncementsStack}
        options={{
          title: 'Announcements',
          tabBarLabel: 'Announcements',
        }}
      />
      <Tab.Screen
        name="FavoritesTab"
        component={FavoritesStack}
        options={{
          title: 'Favorites',
          tabBarLabel: 'Favorites',
        }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsStack}
        options={{
          title: 'Settings',
          tabBarLabel: 'Settings',
        }}
      />
    </Tab.Navigator>
  );
};

export default BottomTabNavigator;
