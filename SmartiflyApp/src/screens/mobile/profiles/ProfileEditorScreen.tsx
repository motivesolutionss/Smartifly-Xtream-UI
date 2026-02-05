/**
 * Mobile Profile Editor Screen
 *
 * Create/edit profile with avatar selection, settings, and parental controls.
 *
 * @enterprise-grade
 */

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    TouchableOpacity,
    Switch,
    Alert,
    SafeAreaView,
    StatusBar,
} from 'react-native';
import {
    useProfileStore,
    AVATAR_IDS,
    CONTENT_RATINGS,
    ContentRating,
    AvatarId,
} from '../../../store/profileStore';
import ProfileAvatar from '../../../components/ProfileAvatar';
import { colors, scale, scaleFont, Icon } from '../../../theme';
import { logger } from '../../../config';

// =============================================================================
// TYPES
// =============================================================================

interface ProfileEditorScreenProps {
    navigation: any;
    route: {
        params?: {
            profileId?: string;
        };
    };
}

// =============================================================================
// RATING LABELS
// =============================================================================

const RATING_LABELS: Record<ContentRating, { label: string; description: string }> = {
    G: { label: 'G', description: 'General Audiences' },
    PG: { label: 'PG', description: 'Parental Guidance' },
    'PG-13': { label: 'PG-13', description: 'Parents Cautioned' },
    R: { label: 'R', description: 'Restricted' },
    'NC-17': { label: 'NC-17', description: 'Adults Only' },
    UNRATED: { label: 'All', description: 'No Restrictions' },
};

// =============================================================================
// COMPONENT
// =============================================================================

const ProfileEditorScreen: React.FC<ProfileEditorScreenProps> = ({ navigation, route }) => {
    const profileId = route.params?.profileId;
    const isEditing = !!profileId;

    const { profiles, createProfile, updateProfile, deleteProfile, getProfile, setPin, removePin } =
        useProfileStore();

    const existingProfile = isEditing ? getProfile(profileId) : undefined;

    // Form state
    const [name, setName] = useState(existingProfile?.name || '');
    const [avatar, setAvatar] = useState<AvatarId>(existingProfile?.avatar || 'avatar_01');
    const [isKidsProfile, setIsKidsProfile] = useState(existingProfile?.isKidsProfile || false);
    const [maxRating, setMaxRating] = useState<ContentRating>(
        existingProfile?.maxRating || 'NC-17'
    );
    const [pinEnabled, setPinEnabled] = useState(existingProfile?.pinRequired || false);
    const [pinValue, setPinValue] = useState('');

    // Enforce kids profile rating limit
    useEffect(() => {
        if (isKidsProfile) {
            const maxKidsIndex = CONTENT_RATINGS.indexOf('PG');
            const currentIndex = CONTENT_RATINGS.indexOf(maxRating);
            if (currentIndex > maxKidsIndex) {
                setMaxRating('PG');
            }
        }
    }, [isKidsProfile, maxRating]);

    const handleSave = () => {
        if (!name.trim()) {
            Alert.alert('Error', 'Please enter a profile name');
            return;
        }

        const profileData = {
            name: name.trim(),
            avatar,
            isKidsProfile,
            maxRating,
            pinRequired: pinEnabled,
        };

        if (isEditing && existingProfile) {
            updateProfile(existingProfile.id, profileData);

            if (pinEnabled && pinValue.length === 4) {
                setPin(existingProfile.id, pinValue);
            } else if (!pinEnabled && existingProfile.pinRequired) {
                removePin(existingProfile.id);
            }

            logger.info('Profile updated', { profileId: existingProfile.id });
        } else {
            const newProfile = createProfile(profileData);
            if (newProfile && pinEnabled && pinValue.length === 4) {
                setPin(newProfile.id, pinValue);
            }
            logger.info('Profile created', { profileId: newProfile?.id });
        }

        navigation.goBack();
    };

    const handleDelete = () => {
        if (!existingProfile) return;

        Alert.alert(
            'Delete Profile',
            `Are you sure you want to delete "${existingProfile.name}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => {
                        deleteProfile(existingProfile.id);
                        logger.info('Profile deleted', { profileId: existingProfile.id });
                        navigation.goBack();
                    },
                },
            ]
        );
    };

    const availableRatings = isKidsProfile
        ? CONTENT_RATINGS.slice(0, CONTENT_RATINGS.indexOf('PG') + 1)
        : CONTENT_RATINGS;

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#0A0A0F" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Icon name="chevron-left" size={24} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>
                    {isEditing ? 'Edit Profile' : 'Create Profile'}
                </Text>
                <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
                    <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                {/* Avatar Preview */}
                <View style={styles.avatarPreview}>
                    <ProfileAvatar
                        avatar={avatar}
                        name={name}
                        isKids={isKidsProfile}
                        size="xlarge"
                    />
                </View>

                {/* Name Input */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Name</Text>
                    <TextInput
                        value={name}
                        onChangeText={setName}
                        style={styles.textInput}
                        placeholder="Profile name"
                        placeholderTextColor="rgba(255,255,255,0.3)"
                        maxLength={20}
                    />
                </View>

                {/* Avatar Picker */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Avatar</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <View style={styles.avatarRow}>
                            {AVATAR_IDS.map((avatarId) => (
                                <ProfileAvatar
                                    key={avatarId}
                                    avatar={avatarId}
                                    size="medium"
                                    isSelected={avatar === avatarId}
                                    onPress={() => setAvatar(avatarId)}
                                />
                            ))}
                        </View>
                    </ScrollView>
                </View>

                {/* Kids Profile Toggle */}
                <View style={styles.toggleRow}>
                    <View style={styles.toggleInfo}>
                        <Text style={styles.toggleLabel}>Kids Profile</Text>
                        <Text style={styles.toggleDescription}>
                            Simplified UI with restricted content
                        </Text>
                    </View>
                    <Switch
                        value={isKidsProfile}
                        onValueChange={setIsKidsProfile}
                        trackColor={{ false: '#3A3A4A', true: colors.accent || '#00E5FF' }}
                        thumbColor="#FFF"
                    />
                </View>

                {/* PIN Toggle (not for kids) */}
                {!isKidsProfile && (
                    <>
                        <View style={styles.toggleRow}>
                            <View style={styles.toggleInfo}>
                                <Text style={styles.toggleLabel}>PIN Protection</Text>
                                <Text style={styles.toggleDescription}>
                                    Require PIN to access this profile
                                </Text>
                            </View>
                            <Switch
                                value={pinEnabled}
                                onValueChange={setPinEnabled}
                                trackColor={{ false: '#3A3A4A', true: colors.accent || '#00E5FF' }}
                                thumbColor="#FFF"
                            />
                        </View>

                        {pinEnabled && (
                            <View style={styles.pinInputContainer}>
                                <TextInput
                                    value={pinValue}
                                    onChangeText={(text) =>
                                        setPinValue(text.replace(/[^0-9]/g, '').slice(0, 4))
                                    }
                                    style={styles.pinInput}
                                    placeholder="4-digit PIN"
                                    placeholderTextColor="rgba(255,255,255,0.3)"
                                    keyboardType="numeric"
                                    maxLength={4}
                                    secureTextEntry
                                />
                            </View>
                        )}
                    </>
                )}

                {/* Content Rating */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Content Rating Limit</Text>
                    <View style={styles.ratingPicker}>
                        {availableRatings.map((rating) => (
                            <TouchableOpacity
                                key={rating}
                                onPress={() => setMaxRating(rating)}
                                style={[
                                    styles.ratingChip,
                                    maxRating === rating && styles.ratingChipSelected,
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.ratingChipText,
                                        maxRating === rating && styles.ratingChipTextSelected,
                                    ]}
                                >
                                    {RATING_LABELS[rating].label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    <Text style={styles.ratingDescription}>
                        {RATING_LABELS[maxRating].description}
                    </Text>
                </View>

                {/* Delete Button */}
                {isEditing && profiles.length > 1 && (
                    <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
                        <Text style={styles.deleteButtonText}>Delete Profile</Text>
                    </TouchableOpacity>
                )}
            </ScrollView>
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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: scale(16),
        paddingVertical: scale(12),
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)',
    },
    backButton: {
        padding: scale(8),
    },
    headerTitle: {
        fontSize: scaleFont(18),
        color: '#FFF',
        fontWeight: '600',
    },
    saveButton: {
        paddingVertical: scale(8),
        paddingHorizontal: scale(16),
        backgroundColor: colors.accent || '#00E5FF',
        borderRadius: scale(6),
    },
    saveButtonText: {
        fontSize: scaleFont(14),
        color: '#000',
        fontWeight: '700',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: scale(20),
    },
    avatarPreview: {
        alignItems: 'center',
        marginBottom: scale(30),
    },
    section: {
        marginBottom: scale(24),
    },
    sectionTitle: {
        fontSize: scaleFont(14),
        color: 'rgba(255,255,255,0.6)',
        fontWeight: '600',
        marginBottom: scale(10),
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    avatarRow: {
        flexDirection: 'row',
        gap: scale(12),
    },
    textInput: {
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderRadius: scale(10),
        paddingHorizontal: scale(16),
        paddingVertical: scale(14),
        fontSize: scaleFont(16),
        color: '#FFF',
    },
    toggleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: scale(10),
        padding: scale(16),
        marginBottom: scale(12),
    },
    toggleInfo: {
        flex: 1,
        marginRight: scale(12),
    },
    toggleLabel: {
        fontSize: scaleFont(16),
        color: '#FFF',
        fontWeight: '600',
    },
    toggleDescription: {
        fontSize: scaleFont(13),
        color: 'rgba(255,255,255,0.5)',
        marginTop: scale(4),
    },
    pinInputContainer: {
        marginBottom: scale(16),
        marginLeft: scale(16),
    },
    pinInput: {
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderRadius: scale(8),
        paddingHorizontal: scale(16),
        paddingVertical: scale(12),
        fontSize: scaleFont(18),
        color: '#FFF',
        width: scale(140),
        textAlign: 'center',
        letterSpacing: 6,
    },
    ratingPicker: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: scale(10),
    },
    ratingChip: {
        paddingHorizontal: scale(18),
        paddingVertical: scale(10),
        borderRadius: scale(6),
        backgroundColor: 'rgba(255,255,255,0.08)',
    },
    ratingChipSelected: {
        backgroundColor: colors.accent || '#00E5FF',
    },
    ratingChipText: {
        fontSize: scaleFont(14),
        color: 'rgba(255,255,255,0.7)',
        fontWeight: '600',
    },
    ratingChipTextSelected: {
        color: '#000',
        fontWeight: '700',
    },
    ratingDescription: {
        fontSize: scaleFont(13),
        color: 'rgba(255,255,255,0.5)',
        marginTop: scale(10),
    },
    deleteButton: {
        alignSelf: 'center',
        paddingVertical: scale(14),
        paddingHorizontal: scale(30),
        borderRadius: scale(8),
        borderWidth: 1,
        borderColor: '#EF4444',
        marginTop: scale(30),
        marginBottom: scale(20),
    },
    deleteButtonText: {
        fontSize: scaleFont(16),
        color: '#EF4444',
        fontWeight: '600',
    },
});

export default ProfileEditorScreen;
