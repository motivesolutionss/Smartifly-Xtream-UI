/**
 * Settings Stack Navigator
 * 
 * Navigation stack for the Settings tab.
 * Contains: SettingsMain
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SettingsStackParamList } from '../types';

// Screen imports
import SettingsScreen from '../screens/SettingsScreen';

import { colors } from '../../theme';

const Stack = createNativeStackNavigator<SettingsStackParamList>();

/**
 * Settings Stack Navigator
 * Handles navigation within the Settings tab
 */
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
                options={{
                    title: 'Settings',
                }}
            />
        </Stack.Navigator>
    );
};

export default SettingsStack;
