/**
 * Smartifly Home Header Component
 * 
 * Top navigation bar with:
 * - App logo/branding
 * - Search button
 * - Profile avatar
 */

import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ViewStyle,
    Image,
} from 'react-native';


import { colors, spacing } from '../../../../theme';

// =============================================================================
// TYPES
// =============================================================================

// =============================================================================
// TYPES
// =============================================================================

export interface HomeHeaderProps {
    username?: string;
    onSearchPress?: () => void;
    onProfilePress?: () => void;
    onNotificationPress?: () => void;
    onLogoPress?: () => void;
    style?: ViewStyle;
}

// =============================================================================
// COMPONENT
// =============================================================================

const HomeHeader: React.FC<HomeHeaderProps> = ({
    username = 'Guest',
    onSearchPress,
    onProfilePress,
    onNotificationPress,
    onLogoPress,
    style,
}) => {
    // Get greeting based on time
    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 17) return 'Good Afternoon';
        return 'Good Evening';
    };

    return (
        <View style={[styles.container, style]}>
            {/* Left: Logo & Greeting */}
            <View style={styles.leftSection}>
                <TouchableOpacity
                    style={styles.logoContainer}
                    onPress={onLogoPress}
                    activeOpacity={0.8}
                >
                    <Image
                        source={require('../../../../assets/smartifly_icon.png')}
                        style={styles.logoImage}
                        resizeMode="contain"
                    />
                </TouchableOpacity>

                <View style={styles.greetingContainer}>
                    <Text style={styles.greetingText}>{getGreeting()},</Text>
                    <Text style={styles.usernameText} numberOfLines={1}>
                        {username}
                    </Text>
                </View>
            </View>

            {/* Right: Actions */}
            <View style={styles.rightSection}>
                {onSearchPress && (
                    <TouchableOpacity style={styles.iconButton} onPress={onSearchPress}>
                        <Text style={styles.iconText}>🔍</Text>
                    </TouchableOpacity>
                )}

                {onNotificationPress && (
                    <TouchableOpacity style={styles.iconButton} onPress={onNotificationPress}>
                        <Text style={styles.iconText}>🔔</Text>
                    </TouchableOpacity>
                )}

                <TouchableOpacity
                    style={styles.profileButton}
                    onPress={onProfilePress}
                >
                    <View style={styles.avatarContainer}>
                        <Text style={styles.avatarText}>
                            {username.charAt(0).toUpperCase()}
                        </Text>
                    </View>
                </TouchableOpacity>
            </View>
        </View>
    );
};

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.base,
        paddingBottom: spacing.md,
        backgroundColor: colors.background,
    },
    leftSection: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    logoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    logoImage: {
        width: 36,
        height: 36,
        marginRight: spacing.sm,
    },
    greetingContainer: {
        justifyContent: 'center',
    },
    greetingText: {
        fontSize: 12,
        color: colors.textSecondary,
        marginBottom: 2,
    },
    usernameText: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    rightSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    iconButton: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: colors.backgroundTertiary,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    iconText: {
        fontSize: 18,
    },
    profileButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    avatarContainer: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.accent,
    },
    avatarText: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.background,
    },
});

export default HomeHeader;
