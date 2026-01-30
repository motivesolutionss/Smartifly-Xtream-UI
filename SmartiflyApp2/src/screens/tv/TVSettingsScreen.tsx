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
} from 'react-native';
import { CommonActions } from '@react-navigation/native';
import useStore from '../../store';
import { colors, scale, scaleFont, Icon, borderRadius } from '../../theme';

// =============================================================================
// TYPES
// =============================================================================

type SettingsSection = 'Account' | 'Playback' | 'App' | 'About';

interface SettingsMenuItem {
    id: SettingsSection;
    label: string;
    icon: string;
}

interface TVSettingsScreenProps {
    navigation: any;
}

// =============================================================================
// COMPONENT
// =============================================================================

const TVSettingsScreen: React.FC<TVSettingsScreenProps> = ({ navigation }) => {
    // State
    const [selectedSection, setSelectedSection] = useState<SettingsSection>('Account');
    const [focusedSection, setFocusedSection] = useState<SettingsSection | null>(null);
    const [focusedOption, setFocusedOption] = useState<string | null>(null);

    // Store
    const userInfo = useStore((state) => state.userInfo);
    const logout = useStore((state) => state.logout);
    const selectedPortal = useStore((state) => state.selectedPortal);

    // =========================================================================
    // MENU CONFIG
    // =========================================================================

    const sections: SettingsMenuItem[] = [
        { id: 'Account', label: 'Account', icon: 'user' },
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

    const getDaysRemaining = (expDate: string | null | undefined) => {
        if (!expDate) return 999;
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
                    isSelected && styles.menuItemSelected,
                    isFocused && styles.menuItemFocused,
                ]}
            >
                <Icon
                    name={item.icon}
                    size={scaleFont(20)}
                    color={isFocused ? '#000' : (isSelected ? '#FFF' : '#AAA')}
                />
                <Text style={[
                    styles.menuLabel,
                    isSelected && styles.menuLabelSelected,
                    isFocused && styles.menuLabelFocused,
                ]}>
                    {item.label}
                </Text>
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
                    isAction && styles.detailAction,
                    isFocused && styles.detailRowFocused,
                    danger && styles.detailRowDanger,
                    danger && isFocused && styles.detailRowDangerFocused,
                ]}
            >
                <Text style={[
                    styles.detailLabel,
                    isFocused && styles.detailLabelFocused,
                    danger && styles.textDanger
                ]}>
                    {label}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={[
                        styles.detailValue,
                        isFocused && styles.detailValueFocused,
                        danger && styles.textDanger
                    ]}>
                        {value}
                    </Text>
                    {isAction && (
                        <Text style={[
                            styles.detailArrow,
                            isFocused && styles.detailArrowFocused,
                            danger && styles.textDanger
                        ]}> ›</Text>
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
                            <View style={styles.avatar}>
                                <Text style={styles.avatarText}>
                                    {userInfo?.username?.charAt(0).toUpperCase() || 'U'}
                                </Text>
                            </View>
                            <View style={styles.profileInfo}>
                                <Text style={styles.profileName}>{userInfo?.username || 'Guest'}</Text>
                                <Text style={styles.profileStatus}>
                                    {userInfo?.isTrial ? 'Trial Account' : 'Premium Account'} • {userInfo?.status || 'Active'}
                                </Text>
                            </View>
                        </View>

                        <Text style={styles.sectionHeader}>Subscription</Text>
                        {renderDetailItem('Expiration', formatExpiry(userInfo?.expDate))}
                        {renderDetailItem('Days Remaining', `${daysLeft} days`)}
                        {renderDetailItem('Active Connections', `${userInfo?.activeCons || 0} / ${userInfo?.maxConnections || 1}`)}
                        {renderDetailItem('Current Server', selectedPortal?.name || 'Unknown')}

                        <View style={styles.spacer} />
                        {renderDetailItem('Sign Out', '', true, handleLogout, true)}
                    </ScrollView>
                );

            case 'Playback':
                return (
                    <ScrollView contentContainerStyle={styles.detailsContent} showsVerticalScrollIndicator={false}>
                        <Text style={styles.sectionHeader}>Video Player</Text>
                        {renderDetailItem('Default Quality', 'Auto', true, () => Alert.alert('Coming Soon', 'Quality selection coming soon.'))}
                        {renderDetailItem('Aspect Ratio', 'Fit', true, () => Alert.alert('Coming Soon', 'Aspect ratio settings coming soon.'))}
                        {renderDetailItem('Hardware Acceleration', 'On', true, () => Alert.alert('Coming Soon', 'HW decoder toggle coming soon.'))}

                        <Text style={[styles.sectionHeader, { marginTop: scale(20) }]}>Audio & Subs</Text>
                        {renderDetailItem('Default Audio', 'English', true, () => Alert.alert('Coming Soon'))}
                        {renderDetailItem('Subtitles', 'Off', true, () => Alert.alert('Coming Soon'))}
                    </ScrollView>
                );

            case 'App':
                return (
                    <ScrollView contentContainerStyle={styles.detailsContent} showsVerticalScrollIndicator={false}>
                        <Text style={styles.sectionHeader}>General</Text>
                        {renderDetailItem('Language', 'English', true, () => Alert.alert('Coming Soon'))}
                        {renderDetailItem('Time Format', '24h', true, () => Alert.alert('Coming Soon'))}

                        <Text style={[styles.sectionHeader, { marginTop: scale(20) }]}>Storage</Text>
                        {renderDetailItem('Clear Cache', '14 MB', true, () => Alert.alert('Success', 'Cache cleared'))}
                        {renderDetailItem('Clear History', '', true, () => Alert.alert('Success', 'History cleared'))}
                    </ScrollView>
                );

            case 'About':
                return (
                    <ScrollView contentContainerStyle={styles.detailsContent} showsVerticalScrollIndicator={false}>
                        <Text style={styles.sectionHeader}>App Info</Text>
                        {renderDetailItem('App Version', '1.0.0')}
                        {renderDetailItem('Build', '2024.1.0')}
                        {renderDetailItem('Device ID', 'Unknown')}

                        <Text style={[styles.sectionHeader, { marginTop: scale(20) }]}>Legal</Text>
                        {renderDetailItem('Privacy Policy', '', true, () => { })}
                        {renderDetailItem('Terms of Service', '', true, () => { })}
                    </ScrollView>
                );
            default:
                return null;
        }
    };

    return (
        <View style={styles.container}>
            {/* Left Panel: Menu */}
            <View style={styles.leftPanel}>
                <Text style={styles.pageTitle}>Settings</Text>
                <FlatList
                    data={sections}
                    renderItem={renderMenuItem}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.menuList}
                    showsVerticalScrollIndicator={false}
                />
            </View>

            {/* Right Panel: Content */}
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
        backgroundColor: colors.background, // Match theme
    },
    // Left Panel
    leftPanel: {
        width: scale(320),
        backgroundColor: 'transparent', // Unified background
        borderRightWidth: 1,
        borderRightColor: colors.border,
        paddingTop: scale(60),
        paddingHorizontal: scale(30),
    },
    pageTitle: {
        fontSize: scaleFont(32),
        fontWeight: 'bold',
        color: colors.textPrimary,
        marginBottom: scale(40),
        paddingLeft: scale(10),
    },
    menuList: {
        paddingBottom: scale(20),
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: scale(18),
        paddingHorizontal: scale(20),
        borderRadius: scale(8),
        marginBottom: scale(12),
    },
    menuItemSelected: {
        backgroundColor: colors.border, // Use border color or a light overlay
    },
    menuItemFocused: {
        backgroundColor: colors.accent,
        transform: [{ scale: 1.02 }],
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 5,
    },
    menuLabel: {
        fontSize: scaleFont(18),
        color: colors.textSecondary,
        marginLeft: scale(20),
        fontWeight: '500',
    },
    menuLabelSelected: {
        color: colors.textPrimary,
        fontWeight: '600',
    },
    menuLabelFocused: {
        color: colors.textInverse, // or textOnPrimary depending on accent
        fontWeight: 'bold',
    },

    // Right Panel
    rightPanel: {
        flex: 1,
        paddingTop: scale(60),
        paddingHorizontal: scale(60),
        backgroundColor: colors.background,
    },
    detailsContent: {
        paddingBottom: scale(60),
    },
    sectionHeader: {
        fontSize: scaleFont(16),
        color: colors.primary,
        textTransform: 'uppercase',
        letterSpacing: 2,
        fontWeight: '800',
        marginBottom: scale(20),
        marginTop: scale(20),
    },

    // Profile
    profileHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: scale(50),
        paddingBottom: scale(40),
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    avatar: {
        width: scale(100),
        height: scale(100),
        borderRadius: scale(50),
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: scale(30),
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
        elevation: 10,
    },
    avatarText: {
        fontSize: scaleFont(42),
        fontWeight: 'bold',
        color: colors.textOnPrimary,
    },
    profileInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    profileName: {
        fontSize: scaleFont(32),
        fontWeight: 'bold',
        color: colors.textPrimary,
        marginBottom: scale(8),
    },
    profileStatus: {
        fontSize: scaleFont(16),
        color: colors.textSecondary,
        fontWeight: '500',
    },

    // Detail Rows
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: scale(22),
        paddingHorizontal: scale(24),
        backgroundColor: colors.backgroundTertiary, // Use tertiary for cards
        marginBottom: scale(12),
        borderRadius: scale(6),
        borderWidth: 1,
        borderColor: colors.border,
    },
    detailAction: {
        // backgroundColor: colors.backgroundTertiary,
    },
    detailRowFocused: {
        backgroundColor: colors.borderMedium, // Or a slightly lighter bg
        borderColor: colors.accent,
        transform: [{ scale: 1.01 }],
        zIndex: 1,
    },
    detailLabel: {
        fontSize: scaleFont(18),
        color: colors.textSecondary, // Was textSecondary or textPrimary
        fontWeight: '500',
    },
    detailLabelFocused: {
        color: colors.textPrimary,
        fontWeight: '700',
    },
    detailValue: {
        fontSize: scaleFont(18),
        color: colors.textMuted,
        fontWeight: '400',
    },
    detailValueFocused: {
        color: colors.textPrimary,
    },
    detailArrow: {
        fontSize: scaleFont(20),
        color: colors.iconMuted,
        marginLeft: scale(12),
    },
    detailArrowFocused: {
        color: colors.accent,
    },

    // Danger
    detailRowDanger: {
        backgroundColor: colors.errorBackground,
        borderColor: 'rgba(239, 68, 68, 0.3)', // Keep translucent/custom if theme lacks specific errorBorder
        marginTop: scale(20),
    },
    detailRowDangerFocused: {
        backgroundColor: 'rgba(239, 68, 68, 0.15)', // Could be stronger error bg
        borderColor: colors.error,
    },
    textDanger: {
        color: colors.error,
    },
    spacer: {
        height: scale(20),
    }
});

export default TVSettingsScreen;
