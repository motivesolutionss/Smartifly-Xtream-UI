/**
 * Mobile Profile Switcher Screen
 *
 * Profile selection screen for mobile devices.
 * Grid layout with bottom sheet PIN entry.
 *
 * @enterprise-grade
 */

import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    Animated,
    TouchableOpacity,
    Modal,
    SafeAreaView,
    StatusBar,
} from 'react-native';
import { useProfileStore, UserProfile } from '../../../store/profileStore';
import ProfileAvatar from '../../../components/ProfileAvatar';
import PinInput from '../../../components/PinInput';
import { colors, scale, scaleFont } from '../../../theme';
import { logger } from '../../../config';

// =============================================================================
// TYPES
// =============================================================================

interface ProfileItem {
    type: 'profile' | 'add';
    profile?: UserProfile;
}

interface ProfileSwitcherScreenProps {
    navigation: any;
}

// =============================================================================
// COMPONENT
// =============================================================================

const ProfileSwitcherScreen: React.FC<ProfileSwitcherScreenProps> = ({ navigation }) => {
    const { profiles, switchProfile, canCreateProfile } = useProfileStore();
    const [isEditMode, setIsEditMode] = useState(false);
    const [pinModalVisible, setPinModalVisible] = useState(false);
    const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
    const [pinError, setPinError] = useState(false);

    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
        }).start();
    }, [fadeAnim]);

    // Prepare profile list data
    const data: ProfileItem[] = [
        ...profiles.map((profile) => ({ type: 'profile' as const, profile })),
        ...(canCreateProfile() ? [{ type: 'add' as const }] : []),
    ];

    const handleProfileSelect = (profile: UserProfile) => {
        if (isEditMode) {
            navigation.navigate('ProfileEditor', { profileId: profile.id });
            return;
        }

        if (profile.pinRequired) {
            setSelectedProfileId(profile.id);
            setPinModalVisible(true);
            return;
        }

        const success = switchProfile(profile.id);
        if (success) {
            logger.info('Profile switched', { profileId: profile.id });
            navigation.replace('Main');
        }
    };

    const handlePinComplete = (pin: string) => {
        if (!selectedProfileId) return;

        const success = switchProfile(selectedProfileId, pin);
        if (success) {
            setPinModalVisible(false);
            setPinError(false);
            logger.info('PIN verified, switching profile', { profileId: selectedProfileId });
            navigation.replace('Main');
        } else {
            setPinError(true);
            setTimeout(() => setPinError(false), 500);
        }
    };

    const handleAddProfile = () => {
        navigation.navigate('ProfileEditor', { profileId: undefined });
    };

    const renderItem = ({ item }: { item: ProfileItem }) => {
        if (item.type === 'add') {
            return (
                <TouchableOpacity style={styles.profileItem} onPress={handleAddProfile}>
                    <ProfileAvatar
                        avatar="avatar_01"
                        isAddNew
                        size="large"
                    />
                    <Text style={styles.profileName}>Add Profile</Text>
                </TouchableOpacity>
            );
        }

        const profile = item.profile!;

        return (
            <TouchableOpacity
                style={styles.profileItem}
                onPress={() => handleProfileSelect(profile)}
                onLongPress={() => {
                    navigation.navigate('ProfileEditor', { profileId: profile.id });
                }}
            >
                <ProfileAvatar
                    avatar={profile.avatar}
                    name={profile.name}
                    isKids={profile.isKidsProfile}
                    showEdit={isEditMode}
                    size="large"
                />
                <Text style={styles.profileName}>{profile.name}</Text>
                {profile.pinRequired && !isEditMode && (
                    <View style={styles.lockBadge}>
                        <Text style={styles.lockIcon}>🔒</Text>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    const selectedProfile = selectedProfileId
        ? profiles.find((p) => p.id === selectedProfileId)
        : null;

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#000" />

            <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
                {/* Header */}
                <Text style={styles.title}>Who's Watching?</Text>

                {/* Profile Grid */}
                <FlatList
                    data={data}
                    renderItem={renderItem}
                    keyExtractor={(item) =>
                        item.type === 'add' ? 'add_profile' : item.profile!.id
                    }
                    numColumns={2}
                    contentContainerStyle={styles.profileList}
                    columnWrapperStyle={styles.profileRow}
                />

                {/* Edit Mode Toggle */}
                <TouchableOpacity
                    style={[styles.editButton, isEditMode && styles.editButtonActive]}
                    onPress={() => setIsEditMode((prev) => !prev)}
                >
                    <Text style={[styles.editButtonText, isEditMode && styles.editButtonTextActive]}>
                        {isEditMode ? 'Done' : 'Manage Profiles'}
                    </Text>
                </TouchableOpacity>
            </Animated.View>

            {/* PIN Modal */}
            <Modal
                visible={pinModalVisible}
                animationType="slide"
                transparent
                onRequestClose={() => setPinModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        {selectedProfile && (
                            <View style={styles.modalHeader}>
                                <ProfileAvatar
                                    avatar={selectedProfile.avatar}
                                    name={selectedProfile.name}
                                    size="medium"
                                />
                                <Text style={styles.modalProfileName}>{selectedProfile.name}</Text>
                            </View>
                        )}

                        <PinInput
                            onComplete={handlePinComplete}
                            error={pinError}
                            errorMessage="Incorrect PIN"
                            title="Enter PIN"
                            showNumpad={false}
                            onCancel={() => {
                                setPinModalVisible(false);
                                setPinError(false);
                            }}
                        />
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0A0A0F',
    },
    content: {
        flex: 1,
        paddingHorizontal: scale(20),
        paddingTop: scale(40),
    },
    title: {
        fontSize: scaleFont(28),
        color: '#FFF',
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: scale(40),
    },
    profileList: {
        paddingHorizontal: scale(10),
    },
    profileRow: {
        justifyContent: 'space-evenly',
        marginBottom: scale(30),
    },
    profileItem: {
        alignItems: 'center',
        width: scale(140),
    },
    profileName: {
        marginTop: scale(12),
        fontSize: scaleFont(16),
        color: 'rgba(255, 255, 255, 0.8)',
        fontWeight: '600',
        textAlign: 'center',
    },
    lockBadge: {
        position: 'absolute',
        top: 0,
        right: scale(10),
    },
    lockIcon: {
        fontSize: scaleFont(14),
    },
    editButton: {
        alignSelf: 'center',
        paddingVertical: scale(14),
        paddingHorizontal: scale(30),
        borderRadius: scale(8),
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        marginBottom: scale(30),
    },
    editButtonActive: {
        backgroundColor: colors.accent || '#00E5FF',
        borderColor: colors.accent || '#00E5FF',
    },
    editButtonText: {
        fontSize: scaleFont(16),
        color: 'rgba(255, 255, 255, 0.7)',
        fontWeight: '600',
    },
    editButtonTextActive: {
        color: '#000',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#1A1A2E',
        borderRadius: scale(20),
        padding: scale(30),
        width: '85%',
        maxWidth: 400,
    },
    modalHeader: {
        alignItems: 'center',
        marginBottom: scale(20),
    },
    modalProfileName: {
        fontSize: scaleFont(18),
        color: '#FFF',
        fontWeight: '600',
        marginTop: scale(12),
    },
});

export default ProfileSwitcherScreen;
