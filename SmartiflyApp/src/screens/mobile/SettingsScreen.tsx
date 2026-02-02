/**
 * Smartifly Settings Screen
 * 
 * User settings and account management screen.
 * Displays account info, playback settings, app settings, and logout option.
 */

import React from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, CommonActions } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

// Store
import useStore from '../../store';

// Theme
import { colors, spacing, borderRadius } from '../../theme';

// =============================================================================
// SETTINGS ITEM COMPONENT
// =============================================================================

interface SettingsItemProps {
    icon: string;
    title: string;
    subtitle?: string;
    value?: string;
    onPress?: () => void;
    showArrow?: boolean;
    danger?: boolean;
}

const SettingsItem: React.FC<SettingsItemProps> = ({
    icon,
    title,
    subtitle,
    value,
    onPress,
    showArrow = true,
    danger = false,
}) => (
    <TouchableOpacity
        style={styles.settingsItem}
        onPress={onPress}
        activeOpacity={0.7}
        disabled={!onPress}
    >
        <View style={styles.settingsItemLeft}>
            <View style={[
                styles.settingsItemIcon,
                danger && styles.settingsItemIconDanger
            ]}>
                <Text style={styles.settingsItemIconText}>{icon}</Text>
            </View>
            <View style={styles.settingsItemContent}>
                <Text style={[
                    styles.settingsItemTitle,
                    danger && styles.settingsItemTitleDanger
                ]}>
                    {title}
                </Text>
                {subtitle && (
                    <Text style={styles.settingsItemSubtitle}>{subtitle}</Text>
                )}
            </View>
        </View>
        <View style={styles.settingsItemRight}>
            {value && (
                <Text style={styles.settingsItemValue}>{value}</Text>
            )}
            {showArrow && onPress && (
                <Text style={styles.settingsItemArrow}>›</Text>
            )}
        </View>
    </TouchableOpacity>
);

// =============================================================================
// SETTINGS SECTION COMPONENT
// =============================================================================

interface SettingsSectionProps {
    title: string;
    children: React.ReactNode;
}

const SettingsSection: React.FC<SettingsSectionProps> = ({ title, children }) => (
    <View style={styles.section}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <View style={styles.sectionContent}>
            {children}
        </View>
    </View>
);

// =============================================================================
// SETTINGS SCREEN COMPONENT
// =============================================================================

const SettingsScreen: React.FC = () => {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation<NativeStackNavigationProp<any>>();

    // Get user info from store
    const userInfo = useStore((state) => state.userInfo);
    const logout = useStore((state) => state.logout);
    const selectedPortal = useStore((state) => state.selectedPortal);

    // Format expiry date
    const formatExpiry = (expDate: string | null | undefined) => {
        if (!expDate) return 'Unknown';
        try {
            const date = new Date(parseInt(expDate) * 1000);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            });
        } catch {
            return 'Unknown';
        }
    };

    // Calculate days remaining
    const getDaysRemaining = (expDate: string | null | undefined) => {
        if (!expDate) return 0;
        try {
            const expiry = new Date(parseInt(expDate) * 1000);
            const now = new Date();
            const diff = expiry.getTime() - now.getTime();
            const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
            return days > 0 ? days : 0;
        } catch {
            return 0;
        }
    };

    const daysRemaining = getDaysRemaining(userInfo?.expDate);
    const isExpiringSoon = daysRemaining <= 7 && daysRemaining > 0;
    const isExpired = daysRemaining <= 0;

    // Handle logout
    const handleLogout = () => {
        Alert.alert(
            'Sign Out',
            'Are you sure you want to sign out?',
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
                {
                    text: 'Sign Out',
                    style: 'destructive',
                    onPress: async () => {
                        // Call the logout function from store
                        await logout();

                        // Reset navigation to Login screen
                        navigation.dispatch(
                            CommonActions.reset({
                                index: 0,
                                routes: [{ name: 'Login' }],
                            })
                        );
                    },
                },
            ],
            { cancelable: true }
        );
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Settings</Text>
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Account Card */}
                <View style={styles.accountCard}>
                    <View style={styles.accountAvatar}>
                        <Text style={styles.accountAvatarText}>
                            {userInfo?.username?.charAt(0).toUpperCase() || 'U'}
                        </Text>
                    </View>
                    <View style={styles.accountInfo}>
                        <Text style={styles.accountName}>{userInfo?.username || 'User'}</Text>
                        <View style={styles.accountStatus}>
                            <View style={[
                                styles.statusDot,
                                isExpired ? styles.statusDotError :
                                    isExpiringSoon ? styles.statusDotWarning :
                                        styles.statusDotSuccess
                            ]} />
                            <Text style={styles.accountStatusText}>
                                {isExpired ? 'Expired' :
                                    isExpiringSoon ? `${daysRemaining} days left` :
                                        'Active'}
                            </Text>
                        </View>
                        {selectedPortal && (
                            <Text style={styles.portalName}>{selectedPortal.name}</Text>
                        )}
                    </View>
                    <View style={styles.accountBadge}>
                        <Text style={styles.accountBadgeText}>
                            {userInfo?.isTrial ? 'TRIAL' : 'PRO'}
                        </Text>
                    </View>
                </View>

                {/* Subscription Info */}
                <SettingsSection title="SUBSCRIPTION">
                    <SettingsItem
                        icon="📅"
                        title="Expires"
                        value={formatExpiry(userInfo?.expDate)}
                        showArrow={false}
                    />
                    <SettingsItem
                        icon="🔗"
                        title="Connections"
                        value={`${userInfo?.activeCons || 0} / ${userInfo?.maxConnections || 1}`}
                        showArrow={false}
                    />
                </SettingsSection>

                {/* Playback Settings */}
                <SettingsSection title="PLAYBACK">
                    <SettingsItem
                        icon="🎬"
                        title="Default Quality"
                        value="Auto"
                        onPress={() => Alert.alert('Quality', 'Quality selector coming soon')}
                    />
                    <SettingsItem
                        icon="▶️"
                        title="Autoplay Next"
                        value="On"
                        onPress={() => Alert.alert('Autoplay', 'Autoplay toggle coming soon')}
                    />
                    <SettingsItem
                        icon="💬"
                        title="Subtitles"
                        value="Off"
                        onPress={() => Alert.alert('Subtitles', 'Subtitle settings coming soon')}
                    />
                </SettingsSection>

                {/* App Settings */}
                <SettingsSection title="APP SETTINGS">
                    <SettingsItem
                        icon="🌐"
                        title="Language"
                        value="English"
                        onPress={() => Alert.alert('Language', 'Language selector coming soon')}
                    />
                    <SettingsItem
                        icon="🔔"
                        title="Notifications"
                        value="On"
                        onPress={() => Alert.alert('Notifications', 'Notification settings coming soon')}
                    />
                    <SettingsItem
                        icon="🌙"
                        title="Dark Mode"
                        value="Always"
                        showArrow={false}
                    />
                </SettingsSection>

                {/* Storage */}
                <SettingsSection title="STORAGE">
                    <SettingsItem
                        icon="🗂️"
                        title="Clear Cache"
                        subtitle="Free up space"
                        onPress={() => Alert.alert('Cache Cleared', 'Cache has been cleared.')}
                    />
                    <SettingsItem
                        icon="🕐"
                        title="Clear Watch History"
                        onPress={() => Alert.alert('History Cleared', 'Watch history has been cleared.')}
                    />
                </SettingsSection>

                {/* About */}
                <SettingsSection title="ABOUT">
                    <SettingsItem
                        icon="ℹ️"
                        title="App Version"
                        value="1.0.0"
                        showArrow={false}
                    />
                    <SettingsItem
                        icon="❓"
                        title="Help & Support"
                        onPress={() => Alert.alert('Support', 'Contact support@smartifly.com')}
                    />
                    <SettingsItem
                        icon="📄"
                        title="Privacy Policy"
                        onPress={() => Alert.alert('Privacy', 'Privacy policy link')}
                    />
                    <SettingsItem
                        icon="📜"
                        title="Terms of Service"
                        onPress={() => Alert.alert('Terms', 'Terms of service link')}
                    />
                </SettingsSection>

                {/* Logout */}
                <View style={styles.logoutSection}>
                    <TouchableOpacity
                        style={styles.logoutButton}
                        onPress={handleLogout}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.logoutButtonText}>Sign Out</Text>
                    </TouchableOpacity>
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                    <Text style={styles.footerText}>Smartifly IPTV v1.0.0</Text>
                    <Text style={styles.footerText}>© 2024 Smartifly</Text>
                </View>
            </ScrollView>
        </View>
    );
};

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        paddingHorizontal: spacing.base,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: spacing.xxl,
    },

    // Account Card
    accountCard: {
        flexDirection: 'row',
        alignItems: 'center',
        margin: spacing.base,
        padding: spacing.base,
        backgroundColor: colors.backgroundTertiary,
        borderRadius: borderRadius.xl,
        borderWidth: 1,
        borderColor: colors.border,
    },
    accountAvatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    accountAvatarText: {
        fontSize: 24,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    accountInfo: {
        flex: 1,
        marginLeft: spacing.md,
    },
    accountName: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    accountStatus: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: spacing.xxs,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: spacing.xs,
    },
    statusDotSuccess: {
        backgroundColor: colors.success,
    },
    statusDotWarning: {
        backgroundColor: colors.warning,
    },
    statusDotError: {
        backgroundColor: colors.error,
    },
    accountStatusText: {
        fontSize: 14,
        color: colors.textMuted,
    },
    accountBadge: {
        backgroundColor: colors.accent,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xxs,
        borderRadius: borderRadius.md,
    },
    accountBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.background,
        letterSpacing: 1,
    },
    portalName: {
        fontSize: 12,
        color: colors.textMuted,
        marginTop: spacing.xxs,
    },

    // Section
    section: {
        marginTop: spacing.lg,
        paddingHorizontal: spacing.base,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.textMuted,
        letterSpacing: 1,
        marginBottom: spacing.sm,
        marginLeft: spacing.xs,
    },
    sectionContent: {
        backgroundColor: colors.backgroundTertiary,
        borderRadius: borderRadius.lg,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.border,
    },

    // Settings Item
    settingsItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.base,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    settingsItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    settingsItemIcon: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: colors.backgroundSecondary,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    settingsItemIconDanger: {
        backgroundColor: colors.error + '20',
    },
    settingsItemIconText: {
        fontSize: 16,
    },
    settingsItemContent: {
        flex: 1,
    },
    settingsItemTitle: {
        fontSize: 16,
        fontWeight: '500',
        color: colors.textPrimary,
    },
    settingsItemTitleDanger: {
        color: colors.error,
    },
    settingsItemSubtitle: {
        fontSize: 13,
        color: colors.textMuted,
        marginTop: 2,
    },
    settingsItemRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    settingsItemValue: {
        fontSize: 14,
        color: colors.textMuted,
        marginRight: spacing.xs,
    },
    settingsItemArrow: {
        fontSize: 20,
        color: colors.textMuted,
        marginLeft: spacing.xxs,
    },

    // Logout
    logoutSection: {
        paddingHorizontal: spacing.base,
        marginTop: spacing.xxl,
    },
    logoutButton: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: colors.error,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.lg,
        alignItems: 'center',
    },
    logoutButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.error,
    },

    // Footer
    footer: {
        alignItems: 'center',
        paddingVertical: spacing.xxl,
        marginTop: spacing.lg,
    },
    footerText: {
        fontSize: 12,
        color: colors.textMuted,
        marginTop: spacing.xxs,
    },
});

export default SettingsScreen;