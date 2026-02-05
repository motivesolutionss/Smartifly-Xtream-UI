/**
 * Offline Banner Component
 * 
 * Shows a banner when the device is offline
 * Allows users to browse cached content
 */

import React, { useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Animated,
} from 'react-native';
import { colors, spacing, shadowColors } from '../theme';

interface OfflineBannerProps {
    isOffline: boolean;
    connectionType: string | null;
}

const OfflineBanner: React.FC<OfflineBannerProps> = ({ isOffline }) => {
    // Use useState for Animated values - this is the standard React Native pattern
    const [slideAnim] = React.useState(() => new Animated.Value(isOffline ? 0 : -100));

    useEffect(() => {
        Animated.timing(slideAnim, {
            toValue: isOffline ? 0 : -100,
            duration: 300,
            useNativeDriver: true,
        }).start();
    }, [isOffline, slideAnim]);

    if (!isOffline) return null;

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    transform: [{ translateY: slideAnim }],
                },
            ]}
        >
            <View style={styles.content}>
                <Text style={styles.icon}>📵</Text>
                <View style={styles.textContainer}>
                    <Text style={styles.title}>You're Offline</Text>
                    <Text style={styles.subtitle}>
                        Browsing cached content only
                    </Text>
                </View>
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        backgroundColor: colors.error,
        zIndex: 9999,
        elevation: 10,
        shadowColor: shadowColors.default,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.base,
    },
    icon: {
        fontSize: 20,
        marginRight: spacing.md,
    },
    textContainer: {
        flex: 1,
    },
    title: {
        color: colors.textPrimary,
        fontSize: 14,
        fontWeight: '700',
    },
    subtitle: {
        color: 'rgba(255, 255, 255, 0.9)',
        fontSize: 12,
        marginTop: 2,
    },
});

export default OfflineBanner;

