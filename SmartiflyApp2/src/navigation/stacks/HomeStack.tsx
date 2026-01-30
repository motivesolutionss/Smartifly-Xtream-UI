/**
 * Home Stack Navigator
 * 
 * Navigation stack for the Home tab.
 * Contains: HomeMain, Player
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeStackParamList } from '../types';

// Screen imports
import {
    HomeScreen,
    PlayerScreen,
    SearchScreen,
    SeriesDetailScreen,
} from '../../screens/mobile';
import MovieDetailScreen from '../../screens/mobile/MovieDetailScreen';

import { colors } from '../../theme';

const Stack = createNativeStackNavigator<HomeStackParamList>();

/**
 * Home Stack Navigator
 * Handles navigation within the Home tab
 */
const HomeStack: React.FC = () => {
    return (
        <Stack.Navigator
            screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.background },
                animation: 'fade',
            }}
        >
            <Stack.Screen
                name="HomeMain"
                component={HomeScreen}
                options={{
                    title: 'Home',
                }}
            />
            <Stack.Screen
                name="Search"
                component={SearchScreen}
                options={{
                    animation: 'fade_from_bottom',
                }}
            />
            <Stack.Screen
                name="Player"
                component={PlayerScreen}
                options={{
                    orientation: 'landscape',
                    animation: 'fade',
                }}
            />
            <Stack.Screen
                name="SeriesDetail"
                component={SeriesDetailScreen}
                options={{
                    animation: 'slide_from_right',
                }}
            />
            <Stack.Screen
                name="MovieDetail"
                component={MovieDetailScreen}
                options={{
                    animation: 'slide_from_right',
                }}
            />
        </Stack.Navigator>
    );
};

export default HomeStack;