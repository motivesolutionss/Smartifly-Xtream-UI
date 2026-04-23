/**
 * Smartifly Announcements Stack
 * 
 * Navigation stack for the Announcements tab.
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AnnouncementsStackParamList } from '../../navigation/types';
import AnnouncementsScreen from '../../screens/mobile/announcements/AnnouncementsScreen';

const Stack = createNativeStackNavigator<AnnouncementsStackParamList>();

const AnnouncementsStack: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
      initialRouteName="AnnouncementsMain"
    >
      <Stack.Screen name="AnnouncementsMain" component={AnnouncementsScreen} />
    </Stack.Navigator>
  );
};

export default AnnouncementsStack;
