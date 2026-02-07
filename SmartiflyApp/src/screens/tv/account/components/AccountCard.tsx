import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    Animated,
} from 'react-native';
import {
    colors,
    scale,
    scaleFont,
    fontFamily,
    Icon,
    glowEffectsTV,
} from '../../../../theme';
import { SavedAccount } from '../../../../store';

interface AccountCardProps {
    account?: SavedAccount; // If null, it's the "Add Account" card
    onPress: () => void;
    onDelete?: () => void;
    isFocused?: boolean;
}

const AccountCard: React.FC<AccountCardProps> = ({
    account,
    onPress,
    onDelete,
}) => {
    const [isFocused, setIsFocused] = useState(false);
    const scaleAnim = React.useRef(new Animated.Value(1)).current;

    const handleFocus = () => {
        setIsFocused(true);
        Animated.timing(scaleAnim, {
            toValue: 1.08,
            duration: 100,
            useNativeDriver: true,
        }).start();
    };

    const handleBlur = () => {
        setIsFocused(false);
        Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 100,
            useNativeDriver: true,
        }).start();
    };

    const isAddCard = !account;
    const displayName = isAddCard ? 'Add Account' : account.userInfo.username;
    const portalName = isAddCard ? 'Connect to a new server' : account.portal.name;

    // Connection Info
    const activeCons = account?.userInfo?.activeCons || 0;
    const maxCons = account?.userInfo?.maxConnections || 1;
    const conPercent = (activeCons / maxCons) * 100;
    const isOverLimit = conPercent >= 100;

    return (
        <View style={styles.wrapper}>
            <Animated.View
                style={[
                    styles.container,
                    { transform: [{ scale: scaleAnim }] },
                    isFocused && styles.containerFocused,
                    isFocused && { shadowColor: isAddCard ? colors.accent : colors.primary, ...glowEffectsTV.focus }
                ]}
            >
                <Pressable
                    onPress={onPress}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    style={styles.pressable}
                >
                    {/* AVATAR / ICON AREA */}
                    <View style={[
                        styles.avatarContainer,
                        isAddCard ? styles.avatarAdd : styles.avatarUser
                    ]}>
                        <Icon
                            name={isAddCard ? "plus" : "user"}
                            size={scale(60)}
                            color={isFocused ? "#FFF" : isAddCard ? "rgba(255,255,255,0.4)" : colors.primary}
                        />
                    </View>

                    {/* NAME & PORTAL */}
                    <View style={styles.infoArea}>
                        <Text style={[styles.name, isFocused && styles.textFocused]}>
                            {displayName}
                        </Text>
                        <Text style={styles.portal} numberOfLines={1}>
                            {portalName}
                        </Text>
                    </View>

                    {/* CONNECTION LIMIT (Only for existing accounts) */}
                    {!isAddCard && (
                        <View style={styles.conArea}>
                            <View style={styles.progressBar}>
                                <View
                                    style={[
                                        styles.progressFill,
                                        { width: `${Math.min(conPercent, 100)}%` },
                                        isOverLimit ? styles.progressError : styles.progressNormal
                                    ]}
                                />
                            </View>
                            <Text style={styles.conText}>
                                Connections: {activeCons}/{maxCons}
                            </Text>
                        </View>
                    )}
                </Pressable>

                {/* DELETE BUTTON (Floating action on focus) */}
                {isFocused && !isAddCard && onDelete && (
                    <Pressable
                        onPress={(e) => {
                            e.stopPropagation();
                            onDelete();
                        }}
                        style={styles.deleteButton}
                    >
                        <Icon name="trash" size={scale(20)} color="#FFF" />
                    </Pressable>
                )}
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    wrapper: {
        width: scale(260),
        marginHorizontal: scale(15),
        paddingVertical: scale(20),
    },
    container: {
        width: '100%',
        aspectRatio: 0.8,
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: scale(24),
        borderWidth: scale(2),
        borderColor: 'rgba(255,255,255,0.08)',
        overflow: 'hidden',
    },
    containerFocused: {
        borderColor: '#FFF',
        backgroundColor: 'rgba(255,255,255,0.1)',
        elevation: 10,
    },
    pressable: {
        flex: 1,
        padding: scale(20),
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarContainer: {
        width: scale(120),
        height: scale(120),
        borderRadius: scale(60),
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: scale(20),
    },
    avatarAdd: {
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    avatarUser: {
        backgroundColor: colors.primary + '20',
    },
    infoArea: {
        alignItems: 'center',
        marginBottom: scale(15),
    },
    name: {
        fontSize: scaleFont(24),
        fontFamily: fontFamily.bold,
        color: '#FFF',
        marginBottom: scale(4),
        textAlign: 'center',
    },
    portal: {
        fontSize: scaleFont(14),
        color: 'rgba(255,255,255,0.4)',
        textAlign: 'center',
    },
    textFocused: {
        color: '#FFF',
    },
    conArea: {
        width: '100%',
        alignItems: 'center',
        marginTop: scale(10),
    },
    progressBar: {
        width: '80%',
        height: scale(6),
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: scale(3),
        marginBottom: scale(8),
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: scale(3),
    },
    progressNormal: {
        backgroundColor: colors.primary,
    },
    progressError: {
        backgroundColor: '#EF4444',
    },
    conText: {
        fontSize: scaleFont(12),
        color: 'rgba(255,255,255,0.6)',
        fontFamily: fontFamily.medium,
    },
    deleteButton: {
        position: 'absolute',
        top: scale(15),
        right: scale(15),
        width: scale(40),
        height: scale(40),
        borderRadius: scale(20),
        backgroundColor: 'rgba(239, 68, 68, 0.8)',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
    },
});

export default React.memo(AccountCard);
