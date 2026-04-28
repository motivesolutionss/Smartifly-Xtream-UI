import React, { memo } from 'react';
import { findNodeHandle, Pressable, StyleSheet, Text, View } from 'react-native';
import { scale, scaleFont, Icon } from '../../../../theme';
import { useTheme } from '../../../../theme/ThemeProvider';
import { typographyTV } from '../../../../theme/typography';

interface TVPlayerTopBarProps {
    navigation: any;
    item: any;
    type: string;
    focusedElement: string | null;
    setFocusedElement: (element: string | null) => void;
    setControlsLocked: (locked: boolean) => void;
    setShowStats: (show: (prev: boolean) => boolean) => void;
    setShowSettings: (show: boolean) => void;
    showHUD: () => void;
    isHudVisible: boolean;
    backButtonRef: any;
    lockButtonRef: any;
    playPauseRef: any;
}

const TVPlayerTopBar: React.FC<TVPlayerTopBarProps> = memo(({
    navigation,
    item,
    type,
    focusedElement,
    setFocusedElement,
    setControlsLocked,
    setShowStats,
    setShowSettings,
    showHUD,
    isHudVisible,
    backButtonRef,
    lockButtonRef,
    playPauseRef,
}) => {
    const { colors } = useTheme();
    // If the HUD isn't visible, we don't want this layer capturing focus at all
    if (!isHudVisible) return null;

    return (
        <View style={styles.topBar}>
            <Pressable
                ref={backButtonRef}
                style={[
                    styles.topButton,
                    focusedElement === 'back' && [styles.topButtonFocused, { backgroundColor: colors.glass }]
                ]}
                onPress={() => navigation.goBack()}
                onFocus={() => {
                    setFocusedElement('back');
                    showHUD();
                }}
                onBlur={() => setFocusedElement(null)}
                {...({
                    nextFocusRight: findNodeHandle(lockButtonRef.current),
                    nextFocusDown: findNodeHandle(playPauseRef.current)
                } as any)}
            >
                <Icon name="back" size={scale(26)} color={focusedElement === 'back' ? colors.iconActive : '#FFFFFF'} />
            </Pressable>

            <View style={styles.titleBlock}>
                <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>{item?.name}</Text>
                {type === 'series' && (item as any)?.episodeTitle ? (
                    <Text style={styles.subtitle} numberOfLines={1}>{(item as any)?.episodeTitle}</Text>
                ) : null}
            </View>

            <View style={styles.topActions}>
                <Pressable
                    ref={lockButtonRef}
                    style={[
                        styles.topButton,
                        focusedElement === 'lock' && [styles.topButtonFocused, { backgroundColor: colors.glass }]
                    ]}
                    onPress={() => setControlsLocked(true)}
                    onFocus={() => {
                        setFocusedElement('lock');
                        showHUD();
                    }}
                    onBlur={() => setFocusedElement(null)}
                    {...({
                        nextFocusLeft: findNodeHandle(backButtonRef.current),
                        nextFocusRight: findNodeHandle(playPauseRef.current),
                        nextFocusDown: findNodeHandle(playPauseRef.current)
                    } as any)}
                >
                    <Icon name="lock" size={scale(24)} color={focusedElement === 'lock' ? colors.iconActive : '#FFFFFF'} />
                </Pressable>
                <Pressable
                    style={[
                        styles.topButton,
                        focusedElement === 'info' && [styles.topButtonFocused, { backgroundColor: colors.glass }]
                    ]}
                    onPress={() => setShowStats(prev => !prev)}
                    onFocus={() => {
                        setFocusedElement('info');
                        showHUD();
                    }}
                    onBlur={() => setFocusedElement(null)}
                    {...({
                        nextFocusDown: findNodeHandle(playPauseRef.current)
                    } as any)}
                >
                    <Icon name="info" size={scale(24)} color={focusedElement === 'info' ? colors.iconActive : '#FFFFFF'} />
                </Pressable>
                <Pressable
                    style={[
                        styles.topButton,
                        focusedElement === 'settings' && [styles.topButtonFocused, { backgroundColor: colors.glass }]
                    ]}
                    onPress={() => setShowSettings(true)}
                    onFocus={() => {
                        setFocusedElement('settings');
                        showHUD();
                    }}
                    onBlur={() => setFocusedElement(null)}
                    {...({
                        nextFocusDown: findNodeHandle(playPauseRef.current)
                    } as any)}
                >
                    <Icon name="settings" size={scale(24)} color={focusedElement === 'settings' ? colors.iconActive : '#FFFFFF'} />
                </Pressable>
            </View>
        </View>
    );
});

const styles = StyleSheet.create({
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: scale(20),
        paddingHorizontal: scale(16),
        paddingTop: scale(16),
    },
    topButton: {
        // Netflix: invisible icon buttons, no background
        padding: scale(10),
        borderRadius: scale(24),
        borderWidth: 2,
        borderColor: 'transparent',
    },
    topButtonFocused: {
        backgroundColor: 'rgba(255,255,255,0.15)', // overridden at render time with theme.colors.glass
        borderColor: 'rgba(255,255,255,0.6)',
    },
    titleBlock: {
        flex: 1,
        marginHorizontal: scale(12),
    },
    title: {
        color: '#FFFFFF', // overridden at render time with theme.colors.textPrimary
        fontSize: typographyTV.h4.fontSize,
        fontWeight: typographyTV.h4.fontWeight,
        textShadowColor: 'rgba(0,0,0,0.8)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 6,
        letterSpacing: 0.3,
    },
    subtitle: {
        color: '#999999',
        fontSize: scaleFont(16),
        marginTop: scale(4),
        textShadowColor: 'rgba(0,0,0,0.6)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
    topActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(8),
    },
});

export default TVPlayerTopBar;
