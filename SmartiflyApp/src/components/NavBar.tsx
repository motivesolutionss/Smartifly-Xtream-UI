/**
 * Smartifly NavBar Component
 * 
 * Universal navigation bar used across all screens, Netflix-style.
 * Supports multiple variants:
 * - home: Full header with greeting, search, notifications
 * - content: Compact header with title, back button (optional), search
 * - minimal: Just logo
 * 
 * Consistent presence across all screens like Netflix Top Bar
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, borderRadius, Icon } from '../theme';
import CategoryFilter from './CategoryFilter';
import CategoryModal from './CategoryModal';
import type { ContentType } from '../store/filterStore';



// =============================================================================
// NAVBAR COMPONENT
// =============================================================================

export type NavBarVariant = 'home' | 'content' | 'minimal';

export interface NavBarProps {
    /** Display variant */
    variant?: NavBarVariant;
    /** Screen title (for content variant) */
    title?: string;
    /** User's name for greeting */
    username?: string;
    /** Show back button */
    showBack?: boolean;
    /** Show search button */
    showSearch?: boolean;
    /** Show notifications button */
    showNotifications?: boolean;
    /** Search press handler */
    onSearchPress?: () => void;
    /** Notification press handler */
    onNotificationPress?: () => void;
    /** Logo press handler (scroll to top) */
    onLogoPress?: () => void;
    /** Back button press handler (defaults to navigation.goBack) */
    onBackPress?: () => void;
    /** Profile press handler - kept for compatibility but not shown */
    onProfilePress?: () => void;
    /** Make header transparent (for overlay on hero content) */
    transparent?: boolean;
    /** Additional container styles */
    style?: ViewStyle;
    /** Handle category type press (Live/Movies/Series) */
    onCategoryTypePress?: (type: ContentType) => void;
}

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

const IconButton: React.FC<{
    icon: React.ReactNode;
    onPress?: () => void;
    style?: ViewStyle;
}> = ({ icon, onPress, style }) => (
    <TouchableOpacity
        style={[styles.iconButton, style]}
        onPress={onPress}
        activeOpacity={0.7}
    >
        {icon}
    </TouchableOpacity>
);

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const NavBar: React.FC<NavBarProps> = ({
    variant = 'home',
    title,
    username = 'Guest',
    showBack = false,
    showSearch = true,
    showNotifications = true,
    onSearchPress,
    onNotificationPress,
    onLogoPress,
    onBackPress,
    transparent = false,
    style,
    onCategoryTypePress,
}) => {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation();

    // Get greeting based on time of day
    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 17) return 'Good Afternoon';
        return 'Good Evening';
    };

    // Handle back navigation
    const handleBack = () => {
        if (onBackPress) {
            onBackPress();
        } else {
            navigation.goBack();
        }
    };

    // ==========================================================================
    // RENDER VARIANTS
    // ==========================================================================

    // HOME VARIANT - Full header with greeting and category tabs
    if (variant === 'home') {
        return (
            <View
                style={[
                    styles.homeContainer,
                    transparent && styles.containerTransparent,
                    { paddingTop: insets.top + spacing.sm },
                    style
                ]}
            >
                {/* Top Row: Logo, Greeting, Actions */}
                <View style={styles.topRow}>
                    {/* Left: Logo & Greeting */}
                    <View style={styles.leftSection}>
                        <TouchableOpacity
                            style={styles.logoContainer}
                            onPress={onLogoPress}
                            activeOpacity={0.8}
                        >
                            <Image
                                source={require('../assets/smartifly_icon.png')}
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
                        {showSearch && (
                            <IconButton
                                icon={<Icon name="magnifyingGlass" size={22} color={colors.textPrimary} weight="bold" />}
                                onPress={onSearchPress}
                            />
                        )}
                        {showNotifications && (
                            <IconButton
                                icon={<Icon name="downloadSimple" size={22} color={colors.textPrimary} weight="bold" />}
                                onPress={onNotificationPress}
                            />
                        )}
                    </View>
                </View>

                {/* Category Filter Row - Netflix Style (Interactive) */}
                <CategoryFilter onTypePress={onCategoryTypePress} />

                {/* Category Selection Modal */}
                <CategoryModal />
            </View>
        );
    }

    // CONTENT VARIANT - Compact with title
    if (variant === 'content') {
        return (
            <View
                style={[
                    styles.container,
                    transparent && styles.containerTransparent,
                    { paddingTop: insets.top + spacing.sm },
                    style
                ]}
            >
                {/* Left: Back + Title or Logo */}
                <View style={styles.leftSection}>
                    {showBack && (
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={handleBack}
                            activeOpacity={0.7}
                        >
                            <Icon name="caretLeft" size={24} color={colors.textPrimary} weight="bold" />
                        </TouchableOpacity>
                    )}

                    {!showBack && (
                        <TouchableOpacity
                            style={styles.logoContainer}
                            onPress={onLogoPress}
                            activeOpacity={0.8}
                        >
                            <Image
                                source={require('../assets/smartifly_icon.png')}
                                style={styles.logoImageSmall}
                                resizeMode="contain"
                            />
                        </TouchableOpacity>
                    )}

                    {title && (
                        <Text style={styles.titleText} numberOfLines={1}>
                            {title}
                        </Text>
                    )}
                </View>

                {/* Right: Actions - No profile avatar */}
                <View style={styles.rightSection}>
                    {showSearch && (
                        <IconButton
                            icon={<Icon name="magnifyingGlass" size={22} color={colors.textPrimary} weight="bold" />}
                            onPress={onSearchPress}
                        />
                    )}
                </View>
            </View>
        );
    }

    // MINIMAL VARIANT - Just logo
    return (
        <View
            style={[
                styles.container,
                transparent && styles.containerTransparent,
                { paddingTop: insets.top + spacing.sm },
                style
            ]}
        >
            <TouchableOpacity
                style={styles.logoContainer}
                onPress={onLogoPress}
                activeOpacity={0.8}
            >
                <Image
                    source={require('../assets/smartifly_icon.png')}
                    style={styles.logoImage}
                    resizeMode="contain"
                />
            </TouchableOpacity>

            <View style={styles.rightSection} />
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
    homeContainer: {
        paddingHorizontal: spacing.base,
        paddingBottom: spacing.sm,
        backgroundColor: colors.background,
    },
    containerTransparent: {
        backgroundColor: 'transparent',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
    },
    topRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.md,
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
        width: 48,
        height: 48,
        marginRight: spacing.md,
    },
    logoImageSmall: {
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
    titleText: {
        fontSize: 18,
        fontWeight: '800',
        color: colors.textPrimary,
        letterSpacing: -0.5,
    },
    rightSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    iconButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.backgroundTertiary,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.backgroundTertiary,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.sm,
        borderWidth: 1,
        borderColor: colors.border,
    },
    // Netflix-style category tabs
    categoryTabsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    categoryTab: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.round,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: 'transparent',
    },
    categoryTabWithArrow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.round,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: 'transparent',
        gap: spacing.xxs,
    },
    categoryTabText: {
        fontSize: 14,
        fontWeight: '500',
        color: colors.textSecondary,
    },
});

export default NavBar;
