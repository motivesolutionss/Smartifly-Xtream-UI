import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Image,
    Animated,
    FlatList,
} from 'react-native';
import {
    scale,
    scaleFont,
    fontFamily,
    TV_SAFE_AREA,
} from '../../theme';
import useStore from '@smartifly/shared/src/store';
import AccountCard from './components/AccountCard';
import { logger } from '../../config';

const TVAccountSwitcherScreen: React.FC = ({ navigation }: any) => {
    const savedAccounts = useStore((state) => state.savedAccounts);
    const switchAccount = useStore((state) => state.switchAccount);
    const removeAccount = useStore((state) => state.removeAccount);

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(scale(30))).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
            }),
            Animated.spring(slideAnim, {
                toValue: 0,
                tension: 40,
                friction: 8,
                useNativeDriver: true,
            }),
        ]).start();
    }, [fadeAnim, slideAnim]);

    const handleAccountSelect = async (accountId: string) => {
        logger.info('Switcher: Selecting account', accountId);
        const success = await switchAccount(accountId);
        if (success) {
            navigation.replace('Loading');
        }
    };

    const handleAddAccount = () => {
        logger.info('Switcher: Adding new account');
        navigation.navigate('Login');
    };

    const handleDeleteAccount = (accountId: string) => {
        logger.info('Switcher: Deleting account', accountId);
        removeAccount(accountId);
    };

    // Prepare data for FlatList
    const data = [
        ...savedAccounts.map(acc => ({ type: 'account' as const, ...acc })),
        { type: 'add' as const, id: 'add_new' }
    ];

    return (
        <View style={styles.container}>
            {/* CINEMATIC BACKGROUND */}
            <Image
                source={require('../../assets/overlay.png')}
                style={styles.backgroundImage}
                resizeMode="cover"
            />
            <View style={styles.darkOverlay} />

            <Animated.View style={[
                styles.content,
                { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
            ]}>
                <View style={styles.header}>
                    <Text style={styles.title}>Who's Watching?</Text>
                    <Text style={styles.subtitle}>Select an account to start your premium experience</Text>
                </View>

                <View style={styles.listWrapper}>
                    <FlatList
                        data={data}
                        horizontal
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={styles.listContent}
                        showsHorizontalScrollIndicator={false}
                        renderItem={({ item }) => (
                            <AccountCard
                                account={item.type === 'account' ? item : undefined}
                                onPress={() => item.type === 'account' ? handleAccountSelect(item.id) : handleAddAccount()}
                                onDelete={() => item.type === 'account' ? handleDeleteAccount(item.id) : undefined}
                            />
                        )}
                    />
                </View>

                <View style={styles.footer}>
                    <Image
                        source={require('../../assets/smartifly_icon.png')}
                        style={styles.logo}
                        resizeMode="contain"
                    />
                </View>
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    backgroundImage: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        opacity: 0.4,
    },
    darkOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: TV_SAFE_AREA.title.horizontal,
    },
    header: {
        alignItems: 'center',
        marginBottom: scale(40),
    },
    title: {
        fontSize: scaleFont(56),
        fontFamily: fontFamily.bold,
        color: '#FFF',
        marginBottom: scale(10),
        letterSpacing: scale(1),
    },
    subtitle: {
        fontSize: scaleFont(20),
        color: 'rgba(255,255,255,0.5)',
        fontFamily: fontFamily.medium,
    },
    listWrapper: {
        height: scale(400),
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        alignItems: 'center',
        paddingHorizontal: scale(50),
    },
    footer: {
        marginTop: scale(60),
        opacity: 0.5,
    },
    logo: {
        width: scale(200),
        height: scale(50),
    },
});

export default TVAccountSwitcherScreen;
