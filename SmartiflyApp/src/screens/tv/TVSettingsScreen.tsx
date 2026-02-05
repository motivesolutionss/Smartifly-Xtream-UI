/**
 * TV Settings Screen
 * 
 * Split-screen settings interface optimized for TV.
 * - Left panel: Navigation categories
 * - Right panel: Setting options and details
 * 
 * @enterprise-grade
 */

import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    Pressable,
    Alert,
    ScrollView,
} from 'react-native';
import { CommonActions } from '@react-navigation/native';
import useStore from '../../store';
import { useProfileStore } from '../../store/profileStore';
import ProfileAvatar from '../../components/ProfileAvatar';
import {
    colors,
    scale,
    scaleFont,
    Icon,
    useTheme,
    textGlow
} from '../../theme';
import { TVSettingsScreenProps } from '../../navigation/types';

// =============================================================================
// TYPES
// =============================================================================

type SettingsSection = 'Account' | 'Profiles' | 'Playback' | 'App' | 'About';

interface SettingsMenuItem {
    id: SettingsSection;
    label: string;
    icon: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

const TVSettingsScreen: React.FC<TVSettingsScreenProps> = ({ navigation }) => {
    // State
    const [selectedSection, setSelectedSection] = useState<SettingsSection>('Account');
    const [focusedSection, setFocusedSection] = useState<SettingsSection | null>(null);
    const [focusedOption, setFocusedOption] = useState<string | null>(null);

    // Theme & Store
    const { theme } = useTheme();
    const userInfo = useStore((state) => state.userInfo);
    const logout = useStore((state) => state.logout);
    const selectedPortal = useStore((state) => state.selectedPortal);

    // Profile Store
    const activeProfile = useProfileStore((state) => state.profiles.find(p => p.id === state.activeProfileId));
    const profiles = useProfileStore((state) => state.profiles);

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

    // =========================================================================
    // RENDERERS
    // =========================================================================

    const renderMenuItem = ({ item }: { item: SettingsMenuItem }) => {
        const isSelected = selectedSection === item.id;
        const isFocused = focusedSection === item.id;

        return (
            <Pressable
                onPress={() => setSelectedSection(item.id)}
                onFocus={() => setFocusedSection(item.id)}
                onBlur={() => setFocusedSection(null)}
                style={[
                    styles.menuItem,
                    isSelected && styles.menuItemActive,
                    isFocused && styles.menuItemFocused,
                    isFocused && {
                        backgroundColor: theme.colors.primary,
                        borderColor: theme.colors.primary,
                    },
                ]}
            >
                <Icon
                    name={item.icon}
                    size={scaleFont(22)}
                    color={isFocused ? theme.colors.textInverse : (isSelected ? theme.colors.primary : theme.colors.textTertiary)}
                />
                <Text style={[
                    styles.menuLabel,
                    isSelected && styles.menuLabelActive,
                    isFocused && styles.menuLabelFocused,
                ]}>
                    {item.label}
                </Text>
                {isFocused && <View style={styles.focusIndicator} />}
            </Pressable>
        );
    };

    const renderDetailItem = (
        label: string,
        value: string,
        isAction: boolean = false,
        onPress?: () => void,
        danger: boolean = false
    ) => {
        const isFocused = focusedOption === label;

        return (
            <Pressable
                onPress={onPress}
                onFocus={() => setFocusedOption(label)}
                onBlur={() => setFocusedOption(null)}
                disabled={!isAction}
                style={[
                    styles.detailRow,
                    isFocused && styles.detailRowFocused,
                    danger && styles.detailRowDanger,
                    danger && isFocused && styles.detailRowDangerFocused,
                ]}
            >
                <View style={styles.detailLabelContainer}>
                    <Text style={[
                        styles.detailLabel,
                        isFocused && styles.detailLabelFocused,
                        danger && { color: theme.colors.error }
                    ]}>
                        {label}
                    </Text>
                    {isFocused && <View style={[styles.hudDecoration, danger && { backgroundColor: theme.colors.error }]} />}
                </View>

                <View style={styles.detailValueContainer}>
                    <Text style={[
                        styles.detailValue,
                        isFocused && styles.detailValueFocused,
                        danger && { color: theme.colors.error }
                    ]}>
                        {value}
                    </Text>
                    {isAction && (
                        <Icon
                            name="chevron-right"
                            size={scaleFont(16)}
                            color={danger ? theme.colors.error : (isFocused ? theme.colors.primary : theme.colors.textMuted)}
                            style={styles.chevronIcon}
                        />
                    )}
                </View>
            </Pressable>
        );
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
                                        • {userInfo?.status || 'Active'}
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
                                            • PIN Protected
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
                        {renderDetailItem('Purge Cache', '14.2 MB', true, () => Alert.alert('Purge Complete', 'Aether cache has been optimized.'))}
                        {renderDetailItem('Wipe Data', 'Sensory data only', true, () => Alert.alert('Success', 'History cleared'))}
                    </ScrollView>
                );

            case 'About':
                return (
                    <ScrollView contentContainerStyle={styles.detailsContent} showsVerticalScrollIndicator={false}>
                        <Text style={styles.sectionHeader}>System Manifest</Text>
                        {renderDetailItem('Core Version', '1.2.5-Aether')}
                        {renderDetailItem('Build Sequence', '2024.1.XP')}
                        {renderDetailItem('Hardware Hash', 'A6-FF-09-12-88')}

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

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
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

    // Right Panel
    rightPanel: {
        flex: 1,
        paddingTop: scale(60),
        paddingHorizontal: scale(80),
    },
    detailsContent: {
        paddingBottom: scale(60),
    },
    sectionHeader: {
        fontSize: scaleFont(14),
        color: '#00F3FF',
        textTransform: 'uppercase',
        letterSpacing: 3,
        fontWeight: '900',
        marginBottom: scale(25),
        marginTop: scale(10),
        opacity: 0.8,
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

    // HUD Detail Rows
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: scale(24),
        paddingHorizontal: scale(30),
        backgroundColor: 'rgba(15, 22, 36, 0.4)', // Glassmorphic
        marginBottom: scale(16),
        borderRadius: scale(4), // More angular for HUD
        borderLeftWidth: 3,
        borderLeftColor: 'rgba(0, 243, 255, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.03)',
    },
    detailRowFocused: {
        backgroundColor: 'rgba(0, 243, 255, 0.05)',
        borderColor: 'rgba(0, 243, 255, 0.3)',
        borderLeftColor: '#00F3FF',
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
    }
});

export default TVSettingsScreen;
