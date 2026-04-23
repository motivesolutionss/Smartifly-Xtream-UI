/**
* Smartifly Settings Screen
* 
* User settings and account management screen.
* Displays account info, playback settings, app settings, and logout option.
*/

import React from 'react';
import UpdateService, { UpdateInfo } from '../../services/UpdateService';
import DeviceInfo from 'react-native-device-info';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, CommonActions } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

// Store
import useAuthStore from '../../store/authStore';
import { useProfileStore } from '../../store/profileStore';

// Theme
import { colors, spacing, borderRadius, Icon } from '../../theme';
import type { IconName } from '../../theme';
import ProfileAvatar from '../../components/ProfileAvatar';

// =============================================================================
// SETTINGS ITEM COMPONENT
// =============================================================================

interface SettingsItemProps {
    icon: IconName;
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
                <Icon
                    name={icon}
                    size={18}
                    color={danger ? colors.error : colors.icon}
                />
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
                <Icon name="caretRight" size={17} color={colors.textMuted} />
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
    const MAIN_TAB_BOTTOM_SPACER = 112;
    const insets = useSafeAreaInsets();
    const navigation = useNavigation<NativeStackNavigationProp<any>>();

    // Update state
    const [updateInfo, setUpdateInfo] = React.useState<UpdateInfo | null>(null);
    const [isChecking, setIsChecking] = React.useState(false);
    const [isDownloading, setIsDownloading] = React.useState(false);
    const [downloadProgress, setDownloadProgress] = React.useState(0);

    // Get user info and profiles from store
    const userInfo = useAuthStore((state) => state.userInfo);
    const logout = useAuthStore((state) => state.logout);
    const selectedPortal = useAuthStore((state) => state.selectedPortal);

    // Profiles
    const activeProfile = useProfileStore((state) => state.profiles.find(p => p.id === state.activeProfileId));
    const profiles = useProfileStore((state) => state.profiles);

    // Format expiry date
    const formatExpiry = (expDate: string | null | undefined) => {
        if (!expDate) return 'Unknown';
        try {
            const date = new Date(parseInt(expDate, 10) * 1000);
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
            const expiry = new Date(parseInt(expDate, 10) * 1000);
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

    // Handle updates
    const handleCheckUpdate = React.useCallback(async () => {
        setIsChecking(true);
        try {
            const info = await UpdateService.checkForUpdates();
            setUpdateInfo(info);
            if (info && !info.updateAvailable) {
                // Alert.alert('Up to Date', 'You are running the latest version.');
            }
        } catch (error) {
            console.error('Update check failed:', error);
        } finally {
            setIsChecking(false);
        }
    }, []);

    React.useEffect(() => {
        handleCheckUpdate();
    }, [handleCheckUpdate]);

    const handleDownloadUpdate = async () => {
        if (!updateInfo?.downloadUrl) return;

        try {
            setIsDownloading(true);
            setDownloadProgress(0);
            await UpdateService.downloadAndInstall(updateInfo.downloadUrl, (received, total) => {
                setDownloadProgress(received / total);
            });
            setIsDownloading(false);
        } catch {
            setIsDownloading(false);
            Alert.alert('Update Failed', 'Failed to download update. Please try again later.');
        }
    };

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
                contentContainerStyle={[
                    styles.scrollContent,
                    { paddingBottom: insets.bottom + MAIN_TAB_BOTTOM_SPACER },
                ]}
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
                        icon="clock"
                        title="Expires"
                        value={formatExpiry(userInfo?.expDate)}
                        showArrow={false}
                    />
                    <SettingsItem
                        icon="users"
                        title="Connections"
                        value={`${userInfo?.activeCons || 0} / ${userInfo?.maxConnections || 1}`}
                        showArrow={false}
                    />
                </SettingsSection>

                {/* Profiles Section */}
                <SettingsSection title="PROFILES">
                    <TouchableOpacity
                        style={styles.activeProfileItem}
                        onPress={() => navigation.navigate('ProfileSwitcher')}
                    >
                        <ProfileAvatar
                            avatar={activeProfile?.avatar || 'avatar_01'}
                            name={activeProfile?.name || ''}
                            size="small"
                        />
                        <View style={styles.activeProfileInfo}>
                            <Text style={styles.activeProfileName}>{activeProfile?.name || 'Main'}</Text>
                            <Text style={styles.activeProfileType}>
                                {activeProfile?.isKidsProfile ? 'Kids Profile' : 'Adult Profile'}
                            </Text>
                        </View>
                        <Icon name="caretRight" size={17} color={colors.textMuted} />
                    </TouchableOpacity>

                    <SettingsItem
                        icon="users"
                        title="Switch Profile"
                        onPress={() => navigation.navigate('ProfileSwitcher')}
                    />
                    <SettingsItem
                        icon="pencil"
                        title="Edit Current Profile"
                        onPress={() => navigation.navigate('ProfileEditor', { profileId: activeProfile?.id })}
                    />
                    {profiles.length < 5 && (
                        <SettingsItem
                            icon="plus"
                            title="Add New Profile"
                            onPress={() => navigation.navigate('ProfileEditor', {})}
                        />
                    )}
                </SettingsSection>

                {/* Playback Settings */}
                <SettingsSection title="PLAYBACK">
                    <SettingsItem
                        icon="filmStrip"
                        title="Default Quality"
                        value="Auto"
                        onPress={() => Alert.alert('Quality', 'Quality selector coming soon')}
                    />
                    <SettingsItem
                        icon="playCircle"
                        title="Autoplay Next"
                        value="On"
                        onPress={() => Alert.alert('Autoplay', 'Autoplay toggle coming soon')}
                    />
                    <SettingsItem
                        icon="monitorPlay"
                        title="Subtitles"
                        value="Off"
                        onPress={() => Alert.alert('Subtitles', 'Subtitle settings coming soon')}
                    />
                </SettingsSection>

                {/* App Settings */}
                <SettingsSection title="APP SETTINGS">
                    <SettingsItem
                        icon="layers"
                        title="Language"
                        value="English"
                        onPress={() => Alert.alert('Language', 'Language selector coming soon')}
                    />
                    <SettingsItem
                        icon="bell"
                        title="Notifications"
                        value="On"
                        onPress={() => Alert.alert('Notifications', 'Notification settings coming soon')}
                    />
                    <SettingsItem
                        icon="eye"
                        title="Dark Mode"
                        value="Always"
                        showArrow={false}
                    />
                </SettingsSection>

                {/* Storage */}
                <SettingsSection title="STORAGE">
                    <SettingsItem
                        icon="downloadSimple"
                        title="Manage Downloads"
                        subtitle="Offline movies and shows"
                        onPress={() => navigation.navigate('Downloads')}
                    />
                    <SettingsItem
                        icon="trash"
                        title="Clear Cache"
                        subtitle="Free up space"
                        onPress={() => Alert.alert('Cache Cleared', 'Cache has been cleared.')}
                    />
                    <SettingsItem
                        icon="arrowCounterClockwise"
                        title="Clear Watch History"
                        onPress={() => Alert.alert('History Cleared', 'Watch history has been cleared.')}
                    />
                </SettingsSection>

                {/* System Update */}
                <SettingsSection title="SYSTEM UPDATE">
                    {isChecking ? (
                        <View style={styles.loadingItem}>
                            <ActivityIndicator size="small" color={colors.primary} />
                            <Text style={styles.loadingText}>Checking for updates...</Text>
                        </View>
                    ) : updateInfo?.updateAvailable ? (
                        <View style={styles.updateCard}>
                            <View style={styles.updateHeader}>
                                <View style={styles.updateBadge}>
                                    <Text style={styles.updateBadgeText}>NEW UPDATE</Text>
                                </View>
                                <Text style={styles.updateVersion}>v{updateInfo.latestVersion}</Text>
                            </View>
                            <Text style={styles.updateNotes} numberOfLines={3}>
                                {updateInfo.releaseNotes}
                            </Text>

                            {isDownloading ? (
                                <View style={styles.progressContainer}>
                                    <View style={styles.progressBar}>
                                        <View style={[styles.progressFill, { width: `${downloadProgress * 100}%` }]} />
                                    </View>
                                    <Text style={styles.progressText}>
                                        {Math.round(downloadProgress * 100)}% downloaded
                                    </Text>
                                </View>
                            ) : (
                                <TouchableOpacity
                                    style={styles.downloadButton}
                                    onPress={handleDownloadUpdate}
                                    activeOpacity={0.8}
                                >
                                    <Text style={styles.downloadButtonText}>Download & Install</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    ) : (
                        <SettingsItem
                            icon="checkCircle"
                            title="System is up to date"
                            subtitle={`Last checked: ${new Date().toLocaleDateString()}`}
                            onPress={handleCheckUpdate}
                            showArrow={false}
                        />
                    )}
                </SettingsSection>

                {/* About */}
                <SettingsSection title="ABOUT">
                    <SettingsItem
                        icon="infoCircle"
                        title="App Version"
                        value={DeviceInfo.getVersion()}
                        showArrow={false}
                    />
                    <SettingsItem
                        icon="info"
                        title="Help & Support"
                        onPress={() => Alert.alert('Support', 'Contact support@smartifly.com')}
                    />
                    <SettingsItem
                        icon="lock"
                        title="Privacy Policy"
                        onPress={() => Alert.alert('Privacy', 'Privacy policy link')}
                    />
                    <SettingsItem
                        icon="menu"
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
        paddingVertical: spacing.lg,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.divider,
        backgroundColor: colors.background,
    },
    headerTitle: {
        fontSize: 29,
        fontWeight: '800',
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
        borderColor: colors.borderMedium,
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
        color: colors.textSecondary,
        fontWeight: '600',
    },
    accountBadge: {
        backgroundColor: colors.primary,
        borderWidth: 1,
        borderColor: colors.primaryLight,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xxs,
        borderRadius: borderRadius.md,
    },
    accountBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.textPrimary,
        letterSpacing: 1,
    },
    portalName: {
        fontSize: 12,
        color: colors.textMuted,
        marginTop: spacing.xxs,
    },
    activeProfileItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.base,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        backgroundColor: colors.backgroundSecondary,
        minHeight: 68,
    },
    activeProfileInfo: {
        flex: 1,
        marginLeft: spacing.md,
    },
    activeProfileName: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    activeProfileType: {
        fontSize: 12,
        color: colors.textMuted,
        marginTop: 2,
    },

    // Section
    section: {
        marginTop: spacing.lg,
        paddingHorizontal: spacing.base,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.textMuted,
        letterSpacing: 1.1,
        marginBottom: spacing.sm,
        marginLeft: spacing.xs,
    },
    sectionContent: {
        backgroundColor: colors.backgroundSecondary,
        borderRadius: borderRadius.lg,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.borderMedium,
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
        minHeight: 64,
    },
    settingsItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    settingsItemIcon: {
        width: 34,
        height: 34,
        borderRadius: 10,
        backgroundColor: colors.backgroundElevated,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
    },
    settingsItemIconDanger: {
        backgroundColor: colors.error + '20',
    },
    settingsItemContent: {
        flex: 1,
    },
    settingsItemTitle: {
        fontSize: 15,
        fontWeight: '700',
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
        fontSize: 13,
        color: colors.textSecondary,
        fontWeight: '600',
        marginRight: spacing.xs,
    },

    // Logout
    logoutSection: {
        paddingHorizontal: spacing.base,
        marginTop: spacing.xxl,
    },
    logoutButton: {
        backgroundColor: 'rgba(229, 9, 20, 0.08)',
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

    // Update Section
    loadingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.base,
        gap: spacing.md,
    },
    loadingText: {
        color: colors.textMuted,
        fontSize: 14,
    },
    updateCard: {
        padding: spacing.base,
        backgroundColor: colors.backgroundElevated,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.md,
        margin: spacing.sm,
    },
    updateHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.xs,
    },
    updateBadge: {
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: borderRadius.sm,
    },
    updateBadgeText: {
        color: colors.textPrimary,
        fontSize: 10,
        fontWeight: '700',
    },
    updateVersion: {
        color: colors.textPrimary,
        fontSize: 14,
        fontWeight: '600',
    },
    updateNotes: {
        color: colors.textSecondary,
        fontSize: 13,
        lineHeight: 18,
        marginBottom: spacing.md,
    },
    downloadButton: {
        backgroundColor: colors.primary,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.md,
        alignItems: 'center',
    },
    downloadButtonText: {
        color: colors.textPrimary,
        fontSize: 14,
        fontWeight: '600',
    },
    progressContainer: {
        marginTop: spacing.xs,
    },
    progressBar: {
        height: 6,
        backgroundColor: colors.backgroundInput,
        borderRadius: 3,
        overflow: 'hidden',
        marginBottom: 6,
    },
    progressFill: {
        height: '100%',
        backgroundColor: colors.primary,
    },
    progressText: {
        color: colors.textMuted,
        fontSize: 12,
        textAlign: 'center',
    },
});

export default SettingsScreen;
