/**
 * TV Settings Screen
 * 
 * Split-screen settings interface optimized for TV.
 * - Left panel: Navigation categories
 * - Right panel: Setting options and details
 * 
 * @enterprise-grade
 */

import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    Pressable,
    Alert,
    ScrollView,
    ActivityIndicator,
} from 'react-native';
import Animated, {
    interpolateColor,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from 'react-native-reanimated';
import DeviceInfo from 'react-native-device-info';
import UpdateService, { UpdateInfo } from '@smartifly/shared/src/services/UpdateService';
import { CommonActions } from '@react-navigation/native';
import useStore from '@smartifly/shared/src/store';
import config, { logger } from '../config';
import { useProfileStore } from '@smartifly/shared/src/store/profileStore';
import ProfileAvatar from '../components/tv/TVProfileAvatar';
import {
    colors,
    scale,
    scaleFont,
    Icon,
    useTheme,
    textGlow,
    typographyTV,
} from '../theme';
import { TVSettingsScreenProps } from '../navigation/types';

// =============================================================================
// TYPES
// =============================================================================

type SettingsSection = 'Account' | 'Profiles' | 'Playback' | 'App' | 'About';

interface SettingsMenuItem {
    id: SettingsSection;
    label: string;
    icon: string;
}

const SPRING = {
    damping: 16,
    stiffness: 220,
    mass: 0.6,
};

// =============================================================================
// STYLES FACTORY
// =============================================================================

function createStyles(
    primaryColor: string,
    textPrimary: string,
    backgroundSecondary: string,
    backgroundTertiary: string,
    borderColor: string,
    borderFocus: string,
    borderMedium: string,
) {
    return StyleSheet.create({
        container: {
            flex: 1,
            flexDirection: 'row',
        },
        // Left Panel
        leftPanel: {
            width: scale(320),
            borderRightWidth: 1,
            paddingTop: scale(60),
            paddingHorizontal: scale(30),
        },
        titleContainer: {
            marginBottom: scale(50),
            paddingLeft: scale(10),
        },
        pageTitle: {
            fontSize: scaleFont(32),
            fontWeight: '900',
            color: '#00F3FF', // Static for HUD Feel
            letterSpacing: 4,
        },
        titleLine: {
            height: 2,
            width: scale(40),
            marginTop: scale(10),
            borderRadius: 1,
        },
        menuList: {
            paddingBottom: scale(20),
        },
        menuItem: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: scale(20),
            paddingHorizontal: scale(20),
            borderRadius: scale(12),
            marginBottom: scale(15),
            borderWidth: 1,
            borderColor: 'transparent',
        },
        menuItemActive: {
            backgroundColor: 'rgba(0, 243, 255, 0.08)',
            borderColor: 'rgba(0, 243, 255, 0.2)',
        },
        menuItemFocused: {
            transform: [{ scale: 1.05 }],
        },
        menuLabel: {
            fontSize: scaleFont(19),
            color: '#8E9AAF',
            marginLeft: scale(20),
            fontWeight: '600',
            letterSpacing: 1,
        },
        menuLabelActive: {
            color: '#FFF',
            fontWeight: '700',
        },
        menuLabelFocused: {
            color: '#000',
            fontWeight: '900',
        },
        focusIndicator: {
            position: 'absolute',
            right: scale(15),
            width: scale(6),
            height: scale(6),
            borderRadius: 3,
            backgroundColor: '#000',
        },
        rowPressable: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            flex: 1,
        },

        // Right Panel
        rightPanel: {
            flex: 1,
            paddingTop: scale(60),
            paddingHorizontal: scale(80),
        },
        detailsContent: {
            paddingBottom: scale(60),
        },
        // 7.1: section headers use typographyTV.h3 equivalent and textPrimary
        sectionHeader: {
            ...typographyTV.h3,
            color: textPrimary,
            textTransform: 'uppercase',
            letterSpacing: 3,
            marginBottom: scale(25),
            marginTop: scale(10),
        },
        sectionHeaderMargin: {
            marginTop: scale(20),
        },

        // Profile
        profileHeader: {
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: scale(60),
            paddingBottom: scale(40),
            borderBottomWidth: 1,
            borderBottomColor: 'rgba(255,255,255,0.05)',
        },
        avatarContainer: {
            position: 'relative',
            width: scale(110),
            height: scale(110),
            marginRight: scale(40),
            alignItems: 'center',
            justifyContent: 'center',
        },
        avatar: {
            width: scale(100),
            height: scale(100),
            borderRadius: scale(50),
            backgroundColor: '#00F3FF',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2,
        },
        avatarAura: {
            position: 'absolute',
            width: scale(120),
            height: scale(120),
            borderRadius: scale(60),
            borderWidth: 1,
            borderColor: 'rgba(0, 243, 255, 0.3)',
            zIndex: 1,
        },
        avatarText: {
            fontSize: scaleFont(46),
            fontWeight: '900',
            color: '#000',
        },
        profileInfo: {
            flex: 1,
            justifyContent: 'center',
        },
        profileName: {
            fontSize: scaleFont(38),
            fontWeight: '900',
            color: '#FFF',
            marginBottom: scale(10),
            letterSpacing: 1,
        },
        badgeContainer: {
            flexDirection: 'row',
            alignItems: 'center',
        },
        statusBadge: {
            paddingHorizontal: scale(12),
            paddingVertical: scale(4),
            borderRadius: scale(4),
            marginRight: scale(15),
        },
        statusBadgeText: {
            fontSize: scaleFont(12),
            fontWeight: '900',
            letterSpacing: 1,
        },
        statusBadgeTextDark: {
            color: '#000',
        },
        profileStatus: {
            fontSize: scaleFont(16),
            color: '#8E9AAF',
            fontWeight: '600',
        },
        kidsBadge: {
            backgroundColor: '#4CAF5020',
        },
        adultBadge: {
            backgroundColor: colors.primary + '20',
        },
        kidsBadgeText: {
            color: '#4CAF50',
        },
        adultBadgeText: {
            color: colors.primary,
        },

        // 7.2: HUD Detail Rows � backgroundSecondary background, border separator
        detailRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingVertical: scale(24),
            paddingHorizontal: scale(30),
            backgroundColor: backgroundSecondary,
            marginBottom: scale(16),
            borderRadius: scale(4),
            borderLeftWidth: 3,
            borderLeftColor: borderColor,
            borderWidth: 1,
            borderColor: borderColor,
        },
        detailRowUpdateBase: {
            height: scale(80),
        },
        detailRowUpdateDownloading: {
            height: 'auto',
            flexDirection: 'column',
            alignItems: 'flex-start',
            justifyContent: 'center',
        },
        // 7.2: focused row uses backgroundTertiary; borderFocus left accent bar
        detailRowFocused: {
            backgroundColor: backgroundTertiary,
            borderColor: borderFocus,
            borderLeftColor: borderFocus,
            transform: [{ scale: 1.02 }],
            zIndex: 10,
        },
        detailLabelContainer: {
            flexDirection: 'row',
            alignItems: 'center',
        },
        detailLabel: {
            fontSize: scaleFont(19),
            color: '#E1E5EE',
            fontWeight: '600',
            letterSpacing: 0.5,
        },
        detailLabelFocused: {
            color: '#FFF',
            fontWeight: '800',
        },
        hudDecoration: {
            width: scale(15),
            height: 2,
            backgroundColor: '#00F3FF',
            marginLeft: scale(15),
            opacity: 0.6,
        },
        detailValueContainer: {
            flexDirection: 'row',
            alignItems: 'center',
        },
        detailValue: {
            fontSize: scaleFont(19),
            color: '#5C677D',
            fontWeight: '500',
        },
        detailValueFocused: {
            color: '#00F3FF',
            fontWeight: '700',
        },
        chevronIcon: {
            marginLeft: scale(10),
        },

        // Danger Zone
        detailRowDanger: {
            backgroundColor: 'rgba(255, 0, 85, 0.03)',
            borderLeftColor: 'rgba(255, 0, 85, 0.2)',
            marginTop: scale(30),
        },
        detailRowDangerFocused: {
            backgroundColor: 'rgba(255, 0, 85, 0.08)',
            borderColor: 'rgba(255, 0, 85, 0.4)',
            borderLeftColor: '#FF0055',
        },

        spacer: {
            height: scale(20),
        },

        // TV Update UI
        updateItemRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: '100%',
        },
        updateItemRowDownloading: {
            marginBottom: scale(10),
        },
        tvProgressContainer: {
            width: '100%',
            marginTop: scale(20),
            paddingBottom: scale(10),
        },
        tvProgressBar: {
            height: scale(4),
            backgroundColor: 'rgba(255,255,255,0.05)',
            borderRadius: scale(2),
            overflow: 'hidden',
            marginBottom: scale(10),
        },
        tvProgressFill: {
            height: '100%',
            backgroundColor: primaryColor,
        },
        tvProgressText: {
            fontSize: scaleFont(12),
            color: '#8E9AAF',
        },

        // 7.3: Toggle states
        toggleActive: {
            backgroundColor: primaryColor,
        },
        toggleInactive: {
            backgroundColor: borderMedium,
        },

        // 7.4: Theme preview card borders
        themeCardSelected: {
            borderWidth: 2,
            borderColor: borderFocus,
        },
        themeCardUnselected: {
            borderWidth: 1,
            borderColor: borderColor,
        },
    });
}

type SettingsMenuButtonProps = {
    item: SettingsMenuItem;
    isSelected: boolean;
    isFirst: boolean;
    onPress: () => void;
    focusEntryRef?: React.Ref<View>;
    styles: ReturnType<typeof createStyles>;
    themeColors: any;
};

const SettingsMenuButton: React.FC<SettingsMenuButtonProps> = ({
    item,
    isSelected,
    isFirst,
    onPress,
    focusEntryRef,
    styles,
    themeColors,
}) => {
    const focused = useSharedValue(0);
    const scaleValue = useSharedValue(1);
    const shellStyle = useAnimatedStyle(() => ({
        backgroundColor: interpolateColor(
            focused.value,
            [0, 1],
            [isSelected ? 'rgba(0, 243, 255, 0.08)' : 'rgba(0,0,0,0)', themeColors.primary]
        ),
        borderColor: interpolateColor(
            focused.value,
            [0, 1],
            [isSelected ? 'rgba(0, 243, 255, 0.2)' : 'transparent', themeColors.primary]
        ),
        transform: [{ scale: scaleValue.value }],
    }), [isSelected, themeColors.primary]);
    const labelStyle = useAnimatedStyle(() => ({
        color: interpolateColor(
            focused.value,
            [0, 1],
            [isSelected ? '#FFFFFF' : (themeColors.textTertiary || '#8E9AAF'), themeColors.textInverse || '#000000']
        ),
    }), [isSelected, themeColors.textInverse, themeColors.textTertiary]);
    const focusIndicatorStyle = useAnimatedStyle(() => ({
        opacity: focused.value,
    }));

    return (
        <Animated.View style={[styles.menuItem, shellStyle]}>
            <Pressable
                ref={isFirst ? focusEntryRef : undefined}
                onPress={onPress}
                onFocus={() => {
                    focused.value = withTiming(1, { duration: 90 });
                    scaleValue.value = withSpring(1.05, SPRING);
                }}
                onBlur={() => {
                    focused.value = withTiming(0, { duration: 90 });
                    scaleValue.value = withSpring(1, SPRING);
                }}
                style={styles.rowPressable}
            >
                <Icon
                    name={item.icon}
                    size={scaleFont(22)}
                    color={isSelected ? themeColors.primary : (themeColors.textTertiary || '#8E9AAF')}
                />
                <Animated.Text style={[styles.menuLabel, isSelected && styles.menuLabelActive, labelStyle]}>
                    {item.label}
                </Animated.Text>
                <Animated.View style={[styles.focusIndicator, focusIndicatorStyle]} />
            </Pressable>
        </Animated.View>
    );
};

type SettingsDetailButtonProps = {
    label: string;
    value: string;
    isAction?: boolean;
    onPress?: () => void;
    danger?: boolean;
    styles: ReturnType<typeof createStyles>;
    themeColors: any;
    childrenRight?: React.ReactNode;
    extraStyle?: any;
    children?: React.ReactNode;
};

const SettingsDetailButton: React.FC<SettingsDetailButtonProps> = ({
    label,
    value,
    isAction = false,
    onPress,
    danger = false,
    styles,
    themeColors,
    childrenRight,
    extraStyle,
    children,
}) => {
    const focused = useSharedValue(0);
    const scaleValue = useSharedValue(1);
    const shellStyle = useAnimatedStyle(() => ({
        backgroundColor: interpolateColor(
            focused.value,
            [0, 1],
            [danger ? 'rgba(255, 0, 85, 0.03)' : themeColors.backgroundSecondary, danger ? 'rgba(255, 0, 85, 0.08)' : themeColors.backgroundTertiary]
        ),
        borderColor: interpolateColor(
            focused.value,
            [0, 1],
            [danger ? 'rgba(255, 0, 85, 0.2)' : themeColors.border, danger ? 'rgba(255, 0, 85, 0.4)' : themeColors.borderFocus]
        ),
        borderLeftColor: interpolateColor(
            focused.value,
            [0, 1],
            [danger ? 'rgba(255, 0, 85, 0.2)' : themeColors.border, danger ? '#FF0055' : themeColors.borderFocus]
        ),
        transform: [{ scale: scaleValue.value }],
    }), [danger, themeColors.backgroundSecondary, themeColors.backgroundTertiary, themeColors.border, themeColors.borderFocus]);
    const labelStyle = useAnimatedStyle(() => ({
        color: interpolateColor(focused.value, [0, 1], [danger ? themeColors.error : '#E1E5EE', '#FFFFFF']),
    }), [danger, themeColors.error]);
    const valueStyle = useAnimatedStyle(() => ({
        color: interpolateColor(focused.value, [0, 1], [danger ? themeColors.error : '#5C677D', danger ? themeColors.error : '#00F3FF']),
    }), [danger, themeColors.error]);
    const decorationStyle = useAnimatedStyle(() => ({
        opacity: focused.value,
    }));

    return (
        <Animated.View style={[styles.detailRow, extraStyle, shellStyle]}>
            <Pressable
                onPress={onPress}
                onFocus={() => {
                    focused.value = withTiming(1, { duration: 90 });
                    scaleValue.value = withSpring(1.02, SPRING);
                }}
                onBlur={() => {
                    focused.value = withTiming(0, { duration: 90 });
                    scaleValue.value = withSpring(1, SPRING);
                }}
                disabled={!isAction}
                style={styles.rowPressable}
            >
                <View style={styles.detailLabelContainer}>
                    <Animated.Text style={[styles.detailLabel, labelStyle]}>
                        {label}
                    </Animated.Text>
                    <Animated.View style={[styles.hudDecoration, danger && { backgroundColor: themeColors.error }, decorationStyle]} />
                </View>
                <View style={styles.detailValueContainer}>
                    <Animated.Text style={[styles.detailValue, valueStyle]}>
                        {value}
                    </Animated.Text>
                    {childrenRight}
                </View>
            </Pressable>
            {children}
        </Animated.View>
    );
};

// =============================================================================
// COMPONENT
// =============================================================================


const TVSettingsScreen: React.FC<TVSettingsScreenProps> = ({ navigation, focusEntryRef }) => {
    // State
    const [selectedSection, setSelectedSection] = useState<SettingsSection>('Account');

    // Update State
    const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
    const [isChecking, setIsChecking] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState(0);

    // Theme & Store
    const { theme } = useTheme();
    const userInfo = useStore((state) => state.userInfo);
    const logout = useStore((state) => state.logout);
    const selectedPortal = useStore((state) => state.selectedPortal);

    // Profile Store
    const activeProfile = useProfileStore((state) => state.profiles.find(p => p.id === state.activeProfileId));
    const profiles = useProfileStore((state) => state.profiles);

    // Primitive color tokens for stable useMemo deps
    const primaryColor = theme.colors.primary;
    const textPrimary = theme.colors.textPrimary;
    const backgroundSecondary = theme.colors.backgroundSecondary;
    const backgroundTertiary = theme.colors.backgroundTertiary;
    const borderColor = theme.colors.border;
    const borderFocus = theme.colors.borderFocus;
    const borderMedium = theme.colors.borderMedium;

    const styles = useMemo(
        () => createStyles(primaryColor, textPrimary, backgroundSecondary, backgroundTertiary, borderColor, borderFocus, borderMedium),
        [primaryColor, textPrimary, backgroundSecondary, backgroundTertiary, borderColor, borderFocus, borderMedium]
    );

    // =========================================================================
    // MENU CONFIG
    // =========================================================================

    const sections: SettingsMenuItem[] = [
        { id: 'Account', label: 'Account', icon: 'user' },
        { id: 'Profiles', label: 'Profiles', icon: 'users' },
        { id: 'Playback', label: 'Playback', icon: 'play' },
        { id: 'App', label: 'App Settings', icon: 'settings' },
        { id: 'About', label: 'About', icon: 'info' },
    ];

    // =========================================================================
    // HELPERS
    // =========================================================================

    const formatExpiry = (expDate: string | null | undefined) => {
        if (!expDate) return 'Unlimited';
        try {
            const dateStr = expDate.includes('-') ? expDate : parseInt(expDate, 10) * 1000;
            const date = new Date(dateStr);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            });
        } catch {
            return 'Unknown';
        }
    };

    const getDaysRemaining = (expDate: string | null | undefined) => {
        if (!expDate) return 999;
        try {
            const dateStr = expDate.includes('-') ? expDate : parseInt(expDate, 10) * 1000;
            const expiry = new Date(dateStr);
            const now = new Date();
            const diff = expiry.getTime() - now.getTime();
            const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
            return days > 0 ? days : 0;
        } catch {
            return 0;
        }
    };

    const handleLogout = () => {
        Alert.alert(
            'Sign Out',
            'Are you sure you want to sign out?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Sign Out',
                    style: 'destructive',
                    onPress: async () => {
                        await logout();
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

    const handleCheckUpdate = React.useCallback(async () => {
        setIsChecking(true);
        try {
            const info = await UpdateService.checkForUpdates();
            setUpdateInfo(info);
        } catch (error) {
            logger.error('TVSettings: update check failed', error);
        } finally {
            setIsChecking(false);
        }
    }, []);

    const handleDownloadUpdate = async () => {
        if (!updateInfo?.downloadUrl) return;

        try {
            setIsDownloading(true);
            setDownloadProgress(0);
            await UpdateService.downloadAndInstall(updateInfo.downloadUrl, (received, total) => {
                setDownloadProgress(received / total);
            }, updateInfo.fileSize, updateInfo.sha256);
            setIsDownloading(false);
        } catch {
            setIsDownloading(false);
            Alert.alert('Update Failed', 'Failed to download update. Please try again later.');
        }
    };

    React.useEffect(() => {
        handleCheckUpdate();
    }, [handleCheckUpdate]);

    // =========================================================================
    // RENDERERS
    // =========================================================================

    const renderMenuItem = ({ item }: { item: SettingsMenuItem }) => {
        const isSelected = selectedSection === item.id;
        const isFirst = item.id === sections[0].id;
        return (
            <SettingsMenuButton
                item={item}
                isSelected={isSelected}
                isFirst={isFirst}
                onPress={() => setSelectedSection(item.id)}
                focusEntryRef={focusEntryRef}
                styles={styles}
                themeColors={theme.colors}
            />
        );
    };

    const renderDetailItem = (
        label: string,
        value: string,
        isAction: boolean = false,
        onPress?: () => void,
        danger: boolean = false
    ) => {
        return (
            <SettingsDetailButton
                label={label}
                value={value}
                isAction={isAction}
                onPress={onPress}
                danger={danger}
                styles={styles}
                themeColors={theme.colors}
                childrenRight={isAction ? (
                    <Icon
                        name="chevron-right"
                        size={scaleFont(16)}
                        color={danger ? theme.colors.error : theme.colors.textMuted}
                        style={styles.chevronIcon}
                    />
                ) : null}
            />
        );
    };

    const renderUpdateItem = () => {
        if (isChecking) {
            return (
                <View style={styles.detailRow}>
                    <View style={styles.detailLabelContainer}>
                        <ActivityIndicator size="small" color={theme.colors.primary} />
                        <Text style={[styles.detailLabel, { marginLeft: scale(15) }]}>Checking Protocols...</Text>
                    </View>
                </View>
            );
        }

        if (updateInfo?.updateAvailable) {
            const progress = isNaN(downloadProgress) ? 0 : downloadProgress;
            return (
                <SettingsDetailButton
                    label="System Patch Available"
                    value=""
                    isAction={true}
                    onPress={handleDownloadUpdate}
                    styles={styles}
                    themeColors={theme.colors}
                    extraStyle={[
                        styles.detailRowUpdateBase,
                        isDownloading && styles.detailRowUpdateDownloading,
                    ]}
                    childrenRight={!isDownloading ? (
                        <View style={styles.badgeContainer}>
                            <View style={[styles.statusBadge, { backgroundColor: theme.colors.primary }]}>
                                <Text style={[styles.statusBadgeText, styles.statusBadgeTextDark]}>DOWNLOAD v{updateInfo.latestVersion}</Text>
                            </View>
                        </View>
                    ) : null}
                >
                    {isDownloading ? (
                        <View style={styles.tvProgressContainer}>
                            <View style={styles.tvProgressBar}>
                                <View style={[styles.tvProgressFill, { width: `${Math.min(100, progress * 100)}%` }]} />
                            </View>
                            <Text style={styles.tvProgressText}>
                                {Math.round(progress * 100)}% Synchronized
                            </Text>
                        </View>
                    ) : null}
                </SettingsDetailButton>
            );
        }

        return renderDetailItem('System Integrity', 'Up to Date', true, handleCheckUpdate);
    };

    const renderContent = () => {
        switch (selectedSection) {
            case 'Account':
                const daysLeft = getDaysRemaining(userInfo?.expDate);
                return (
                    <ScrollView contentContainerStyle={styles.detailsContent} showsVerticalScrollIndicator={false}>
                        <View style={styles.profileHeader}>
                            <View style={[styles.avatarContainer, { shadowColor: theme.colors.primary }]}>
                                <View style={styles.avatar}>
                                    <Text style={styles.avatarText}>
                                        {userInfo?.username?.charAt(0).toUpperCase() || 'U'}
                                    </Text>
                                </View>
                                <View style={styles.avatarAura} />
                            </View>
                            <View style={styles.profileInfo}>
                                <Text style={[styles.profileName, textGlow.soft]}>{userInfo?.username || 'Guest'}</Text>
                                <View style={styles.badgeContainer}>
                                    <View style={[styles.statusBadge, { backgroundColor: theme.colors.primary + '20' }]}>
                                        <Text style={[styles.statusBadgeText, { color: theme.colors.primary }]}>
                                            {userInfo?.isTrial ? 'TRIAL' : 'PREMIUM'}
                                        </Text>
                                    </View>
                                    <Text style={styles.profileStatus}>
                                        � {userInfo?.status || 'Active'}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        <Text style={styles.sectionHeader}>Subscription HUD</Text>
                        {renderDetailItem('Expiration', formatExpiry(userInfo?.expDate))}
                        {renderDetailItem('Days Remaining', `${daysLeft} days`)}
                        {renderDetailItem('Active Connections', `${userInfo?.activeCons || 0} / ${userInfo?.maxConnections || 1}`)}
                        {renderDetailItem('Current Server', selectedPortal?.name || 'Unknown')}

                        <View style={styles.spacer} />
                        {renderDetailItem('Portal Switcher', 'Manage Accounts', true, () => {
                            navigation.replace('TVAccountSwitcher');
                        })}
                        {renderDetailItem('Terminate Session', 'Sign Out', true, handleLogout, true)}
                    </ScrollView>
                );

            case 'Profiles':
                return (
                    <ScrollView contentContainerStyle={styles.detailsContent} showsVerticalScrollIndicator={false}>
                        <View style={styles.profileHeader}>
                            <View style={[styles.avatarContainer, { width: scale(80), height: scale(80) }]}>
                                <ProfileAvatar
                                    avatar={activeProfile?.avatar || 'avatar_01'}
                                    name={activeProfile?.name || ''}
                                    size="medium"
                                />
                            </View>
                            <View style={styles.profileInfo}>
                                <Text style={[styles.profileName, textGlow.soft]}>{activeProfile?.name || 'Unknown'}</Text>
                                <View style={styles.badgeContainer}>
                                    <View style={[
                                        styles.statusBadge,
                                        activeProfile?.isKidsProfile ? styles.kidsBadge : styles.adultBadge
                                    ]}>
                                        <Text style={[
                                            styles.statusBadgeText,
                                            activeProfile?.isKidsProfile ? styles.kidsBadgeText : styles.adultBadgeText
                                        ]}>
                                            {activeProfile?.isKidsProfile ? 'KIDS MODE' : 'ADULT PROFILE'}
                                        </Text>
                                    </View>
                                    {activeProfile?.pinRequired && (
                                        <Text style={styles.profileStatus}>
                                            � PIN Protected
                                        </Text>
                                    )}
                                </View>
                            </View>
                        </View>

                        <Text style={styles.sectionHeader}>Parental Controls</Text>
                        {renderDetailItem('Content Rating', activeProfile?.maxRating || 'UNRATED')}
                        {renderDetailItem('Kids Mode', activeProfile?.isKidsProfile ? 'ON' : 'OFF')}
                        {renderDetailItem('PIN Protection', activeProfile?.pinRequired ? 'Enabled' : 'Disabled')}

                        <View style={styles.spacer} />
                        {renderDetailItem('Manage Profile', 'Edit Current Profile', true, () => {
                            navigation.navigate('ProfileEditor', { profileId: activeProfile?.id });
                        })}
                        {renderDetailItem('Switch Profile', 'Show All Profiles', true, () => {
                            navigation.navigate('ProfileSwitcher');
                        })}
                        {renderDetailItem('Create New Profile', `${profiles.length}/5 Used`, profiles.length < 5, () => {
                            navigation.navigate('ProfileEditor', { profileId: undefined });
                        })}
                    </ScrollView>
                );

            case 'Playback':
                return (
                    <ScrollView contentContainerStyle={styles.detailsContent} showsVerticalScrollIndicator={false}>
                        <Text style={styles.sectionHeader}>Engine Configuration</Text>
                        {renderDetailItem('Default Quality', '4K / Auto', true, () => Alert.alert('Aether Engine', 'Dynamic quality switching is active.'))}
                        {renderDetailItem('Hardware Decoding', 'Force GPU', true, () => Alert.alert('Coming Soon', 'Aspect ratio settings coming soon.'))}
                        {renderDetailItem('Buffer Level', 'Aggressive', true, () => Alert.alert('Coming Soon', 'HW decoder toggle coming soon.'))}

                        <Text style={[styles.sectionHeader, styles.sectionHeaderMargin]}>Audio Sync</Text>
                        {renderDetailItem('Default Language', 'English', true, () => Alert.alert('Coming Soon'))}
                        {renderDetailItem('Subtitle Engine', 'Substation alpha', true, () => Alert.alert('Coming Soon'))}
                    </ScrollView>
                );

            case 'App':
                return (
                    <ScrollView contentContainerStyle={styles.detailsContent} showsVerticalScrollIndicator={false}>
                        <Text style={styles.sectionHeader}>Interface</Text>
                        {renderDetailItem('System Theme', 'Aether (Futuristic)', true, () => Alert.alert('Theme Settings', 'You are currently using the Aether design system.'))}
                        {renderDetailItem('Clock Format', '24h Neon', true, () => Alert.alert('Coming Soon'))}

                        <Text style={[styles.sectionHeader, styles.sectionHeaderMargin]}>Maintenance</Text>
                        {renderUpdateItem()}
                        {renderDetailItem('Purge Cache', '14.2 MB', true, () => Alert.alert('Purge Complete', 'Aether cache has been optimized.'))}
                        {renderDetailItem('Wipe Data', 'Sensory data only', true, () => Alert.alert('Success', 'History cleared'))}
                    </ScrollView>
                );

            case 'About':
                return (
                    <ScrollView contentContainerStyle={styles.detailsContent} showsVerticalScrollIndicator={false}>
                        <Text style={styles.sectionHeader}>System Manifest</Text>
                        {renderDetailItem('Core Version', config.app.version)}
                        {renderDetailItem('Build Sequence', '2024.1.XP')}
                        {renderDetailItem('Hardware Hash', DeviceInfo.getUniqueIdSync()?.slice(0, 12).toUpperCase() || 'UNKNOWN')}

                        <Text style={[styles.sectionHeader, styles.sectionHeaderMargin]}>Protocols</Text>
                        {renderDetailItem('Encryption Layer', 'AES-256-GCM', true, () => { })}
                        {renderDetailItem('Neural Privacy', 'Active', true, () => { })}
                    </ScrollView>
                );
            default:
                return null;
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            {/* Left Panel: HUD Menu */}
            <View style={[styles.leftPanel, { borderColor: theme.colors.border }]}>
                <View style={styles.titleContainer}>
                    <Text style={[styles.pageTitle, textGlow.neon]}>SETTINGS</Text>
                    <View style={[styles.titleLine, { backgroundColor: theme.colors.primary }]} />
                </View>
                <FlatList
                    data={sections}
                    renderItem={renderMenuItem}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.menuList}
                    showsVerticalScrollIndicator={false}
                />
            </View>

            {/* Right Panel: HUD Display */}
            <View style={styles.rightPanel}>
                {renderContent()}
            </View>
        </View>
    );
};

export default TVSettingsScreen;
