import React, { memo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { scale, scaleFont, Icon } from '../.././../theme';
import { SelectedTrackType, SelectedVideoTrackType } from 'react-native-video';

interface TrackOption {
    key: string;
    label: string;
    description?: string;
}

interface TVPlayerSettingsModalProps {
    showSettings: boolean;
    settingsView: string;
    setSettingsView: (view: any) => void;
    handleSettingsClose: () => void;
    selectedQualityLabel: string;
    selectedAudioLabel: string;
    selectedSubtitleLabel: string;
    playbackRate: number;
    resizeMode: string;
    isMuted: boolean;
    repeatEnabled: boolean;
    showStats: boolean;
    setIsMuted: (muted: boolean | ((prev: boolean) => boolean)) => void;
    setRepeatEnabled: (enabled: boolean | ((prev: boolean) => boolean)) => void;
    setShowStats: (show: boolean | ((prev: boolean) => boolean)) => void;
    setSelectedVideoTrack: (track: any) => void;
    setSelectedAudioTrack: (track: any) => void;
    setSelectedTextTrack: (track: any) => void;
    setPlaybackRate: (rate: number) => void;
    setResizeMode: (mode: any) => void;
    qualityOptions: TrackOption[];
    audioOptions: TrackOption[];
    subtitleOptions: TrackOption[];
    selectedVideoTrack: any;
    selectedAudioTrack: any;
    selectedTextTrack: any;
}

const TVPlayerSettingsModal: React.FC<TVPlayerSettingsModalProps> = memo(({
    showSettings,
    settingsView,
    setSettingsView,
    handleSettingsClose,
    selectedQualityLabel,
    selectedAudioLabel,
    selectedSubtitleLabel,
    playbackRate,
    resizeMode,
    isMuted,
    repeatEnabled,
    showStats,
    setIsMuted,
    setRepeatEnabled,
    setShowStats,
    setSelectedVideoTrack,
    setSelectedAudioTrack,
    setSelectedTextTrack,
    setPlaybackRate,
    setResizeMode,
    qualityOptions,
    audioOptions,
    subtitleOptions,
    selectedVideoTrack,
    selectedAudioTrack,
    selectedTextTrack,
}) => {
    const [focusedKey, setFocusedKey] = useState<string | null>(null);

    const renderSettingsHeader = (title: string) => (
        <View style={styles.settingsHeader}>
            <Pressable onPress={() => setSettingsView('root')} style={styles.settingsBack}>
                <Icon name="chevronLeft" size={scale(22)} color="#FFFFFF" />
                <Text style={styles.settingsBackText}>Back</Text>
            </Pressable>
            <Text style={styles.settingsTitle}>{title}</Text>
        </View>
    );

    const renderSettingsOption = (
        option: TrackOption,
        isSelected: boolean,
        onPress: () => void
    ) => {
        const isFocused = focusedKey === option.key;
        return (
        <Pressable
            key={option.key}
            style={[
                styles.settingsOption,
                isSelected && styles.settingsOptionSelected,
                isFocused && styles.settingsOptionFocused,
            ]}
            onPress={onPress}
            onFocus={() => setFocusedKey(option.key)}
            onBlur={() => setFocusedKey((current) => current === option.key ? null : current)}
        >
            <View style={styles.settingsOptionText}>
                <Text style={[
                    styles.settingsOptionLabel,
                    isSelected && styles.settingsOptionLabelSelected,
                    isFocused && styles.settingsTextFocused,
                ]}>
                    {option.label}
                </Text>
                {option.description ? (
                    <Text style={[styles.settingsOptionDescription, isFocused && styles.settingsDescriptionFocused]}>
                        {option.description}
                    </Text>
                ) : null}
            </View>
            {isSelected ? <Icon name="check" size={scale(22)} color={isFocused ? '#111111' : '#E50914'} /> : null}
        </Pressable>
        );
    };

    const renderToggleRow = (key: string, label: string, value: boolean, onPress: () => void) => {
        const isFocused = focusedKey === key;
        return (
        <Pressable
            style={[styles.settingsRow, isFocused && styles.settingsRowFocused]}
            onPress={onPress}
            onFocus={() => setFocusedKey(key)}
            onBlur={() => setFocusedKey((current) => current === key ? null : current)}
        >
            <Text style={[styles.settingsRowLabel, isFocused && styles.settingsTextFocused]}>{label}</Text>
            <View style={[styles.togglePill, value && styles.togglePillActive]}>
                <Text style={[styles.toggleText, value && styles.toggleTextActive]}>
                    {value ? 'ON' : 'OFF'}
                </Text>
            </View>
        </Pressable>
        );
    };

    return (
        <Modal
            visible={showSettings}
            transparent
            animationType="fade"
            onRequestClose={handleSettingsClose}
        >
            <View style={styles.modalBackdrop} pointerEvents="none" />
            <View style={styles.settingsSheet}>
                <ScrollView showsVerticalScrollIndicator={false}>
                    {settingsView === 'root' && (
                        <View>
                            <Text style={styles.settingsTitleMain}>Settings</Text>

                            <Pressable
                                style={[styles.settingsRow, focusedKey === 'root-quality' && styles.settingsRowFocused]}
                                onPress={() => setSettingsView('quality')}
                                onFocus={() => setFocusedKey('root-quality')}
                                onBlur={() => setFocusedKey((current) => current === 'root-quality' ? null : current)}
                            >
                                <Text style={[styles.settingsRowLabel, focusedKey === 'root-quality' && styles.settingsTextFocused]}>Quality</Text>
                                <View style={styles.settingsRowRight}>
                                    <Text style={styles.settingsRowValue}>{selectedQualityLabel}</Text>
                                    <Icon name="chevronRight" size={scale(18)} color="#666" />
                                </View>
                            </Pressable>

                            <Pressable
                                style={[styles.settingsRow, focusedKey === 'root-audio' && styles.settingsRowFocused]}
                                onPress={() => setSettingsView('audio')}
                                onFocus={() => setFocusedKey('root-audio')}
                                onBlur={() => setFocusedKey((current) => current === 'root-audio' ? null : current)}
                            >
                                <Text style={[styles.settingsRowLabel, focusedKey === 'root-audio' && styles.settingsTextFocused]}>Audio</Text>
                                <View style={styles.settingsRowRight}>
                                    <Text style={styles.settingsRowValue}>{selectedAudioLabel}</Text>
                                    <Icon name="chevronRight" size={scale(18)} color="#666" />
                                </View>
                            </Pressable>

                            <Pressable
                                style={[styles.settingsRow, focusedKey === 'root-subtitles' && styles.settingsRowFocused]}
                                onPress={() => setSettingsView('subtitles')}
                                onFocus={() => setFocusedKey('root-subtitles')}
                                onBlur={() => setFocusedKey((current) => current === 'root-subtitles' ? null : current)}
                            >
                                <Text style={[styles.settingsRowLabel, focusedKey === 'root-subtitles' && styles.settingsTextFocused]}>Subtitles</Text>
                                <View style={styles.settingsRowRight}>
                                    <Text style={styles.settingsRowValue}>{selectedSubtitleLabel}</Text>
                                    <Icon name="chevronRight" size={scale(18)} color="#666" />
                                </View>
                            </Pressable>

                            <Pressable
                                style={[styles.settingsRow, focusedKey === 'root-speed' && styles.settingsRowFocused]}
                                onPress={() => setSettingsView('speed')}
                                onFocus={() => setFocusedKey('root-speed')}
                                onBlur={() => setFocusedKey((current) => current === 'root-speed' ? null : current)}
                            >
                                <Text style={[styles.settingsRowLabel, focusedKey === 'root-speed' && styles.settingsTextFocused]}>Speed</Text>
                                <View style={styles.settingsRowRight}>
                                    <Text style={styles.settingsRowValue}>{playbackRate}x</Text>
                                    <Icon name="chevronRight" size={scale(18)} color="#666" />
                                </View>
                            </Pressable>

                            <Pressable
                                style={[styles.settingsRow, focusedKey === 'root-aspect' && styles.settingsRowFocused]}
                                onPress={() => setSettingsView('aspect')}
                                onFocus={() => setFocusedKey('root-aspect')}
                                onBlur={() => setFocusedKey((current) => current === 'root-aspect' ? null : current)}
                            >
                                <Text style={[styles.settingsRowLabel, focusedKey === 'root-aspect' && styles.settingsTextFocused]}>Aspect Ratio</Text>
                                <View style={styles.settingsRowRight}>
                                    <Text style={styles.settingsRowValue}>{resizeMode}</Text>
                                    <Icon name="chevronRight" size={scale(18)} color="#666" />
                                </View>
                            </Pressable>

                            <View style={styles.settingsDivider} />

                            {renderToggleRow('root-mute', 'Mute', isMuted, () => setIsMuted(prev => !prev))}
                            {renderToggleRow('root-repeat', 'Repeat', repeatEnabled, () => setRepeatEnabled(prev => !prev))}
                            {renderToggleRow('root-stats', 'Stats Overlay', showStats, () => setShowStats(prev => !prev))}
                        </View>
                    )}

                    {settingsView === 'quality' && (
                        <View>
                            {renderSettingsHeader('Quality')}
                            {renderSettingsOption(
                                { key: 'quality-auto', label: 'Auto' },
                                selectedVideoTrack.type === SelectedVideoTrackType.AUTO,
                                () => setSelectedVideoTrack({ type: SelectedVideoTrackType.AUTO })
                            )}
                            {qualityOptions.map((option) => renderSettingsOption(
                                option,
                                selectedVideoTrack.type === SelectedVideoTrackType.INDEX &&
                                option.key === `quality-${selectedVideoTrack.value}`,
                                () => setSelectedVideoTrack({ type: SelectedVideoTrackType.INDEX, value: Number(option.key.split('-')[1]) })
                            ))}
                        </View>
                    )}

                    {settingsView === 'audio' && (
                        <View>
                            {renderSettingsHeader('Audio')}
                            {renderSettingsOption(
                                { key: 'audio-system', label: 'System Default' },
                                selectedAudioTrack.type === SelectedTrackType.SYSTEM,
                                () => setSelectedAudioTrack({ type: SelectedTrackType.SYSTEM })
                            )}
                            {audioOptions.map((option) => renderSettingsOption(
                                option,
                                selectedAudioTrack.type === SelectedTrackType.INDEX &&
                                option.key === `audio-${selectedAudioTrack.value}`,
                                () => setSelectedAudioTrack({ type: SelectedTrackType.INDEX, value: Number(option.key.split('-')[1]) })
                            ))}
                        </View>
                    )}

                    {settingsView === 'subtitles' && (
                        <View>
                            {renderSettingsHeader('Subtitles')}
                            {renderSettingsOption(
                                { key: 'sub-off', label: 'Off' },
                                selectedTextTrack.type === SelectedTrackType.DISABLED,
                                () => setSelectedTextTrack({ type: SelectedTrackType.DISABLED })
                            )}
                            {renderSettingsOption(
                                { key: 'sub-system', label: 'System Default' },
                                selectedTextTrack.type === SelectedTrackType.SYSTEM,
                                () => setSelectedTextTrack({ type: SelectedTrackType.SYSTEM })
                            )}
                            {subtitleOptions.map((option) => renderSettingsOption(
                                option,
                                selectedTextTrack.type === SelectedTrackType.INDEX &&
                                option.key === `sub-${selectedTextTrack.value}`,
                                () => setSelectedTextTrack({ type: SelectedTrackType.INDEX, value: Number(option.key.split('-')[1]) })
                            ))}
                        </View>
                    )}

                    {settingsView === 'speed' && (
                        <View>
                            {renderSettingsHeader('Speed')}
                            {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => renderSettingsOption(
                                { key: `speed-${rate}`, label: `${rate}x` },
                                playbackRate === rate,
                                () => setPlaybackRate(rate)
                            ))}
                        </View>
                    )}

                    {settingsView === 'aspect' && (
                        <View>
                            {renderSettingsHeader('Aspect Ratio')}
                            {renderSettingsOption(
                                { key: 'aspect-contain', label: 'Fit (Contain)' },
                                resizeMode === 'contain',
                                () => setResizeMode('contain')
                            )}
                            {renderSettingsOption(
                                { key: 'aspect-cover', label: 'Fill (Cover)' },
                                resizeMode === 'cover',
                                () => setResizeMode('cover')
                            )}
                            {renderSettingsOption(
                                { key: 'aspect-stretch', label: 'Stretch' },
                                resizeMode === 'stretch',
                                () => setResizeMode('stretch')
                            )}
                        </View>
                    )}
                </ScrollView>
            </View>
        </Modal>
    );
});

const styles = StyleSheet.create({
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.65)',
    },
    settingsSheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        maxHeight: '60%',
        backgroundColor: 'rgba(20,20,20,0.97)',
        paddingHorizontal: scale(36),
        paddingTop: scale(28),
        paddingBottom: scale(36),
        borderTopLeftRadius: scale(20),
        borderTopRightRadius: scale(20),
    },
    settingsTitleMain: {
        color: '#FFFFFF',
        fontSize: scaleFont(26),
        fontWeight: '700',
        marginBottom: scale(20),
        letterSpacing: 0.3,
    },
    settingsTitle: {
        color: '#FFFFFF',
        fontSize: scaleFont(22),
        fontWeight: '700',
    },
    settingsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: scale(14),
        paddingHorizontal: scale(8),
        borderRadius: scale(8),
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(255,255,255,0.08)',
    },
    settingsRowFocused: {
        backgroundColor: '#FFFFFF',
        borderBottomColor: 'transparent',
    },
    settingsRowLabel: {
        color: '#E5E5E5',
        fontSize: scaleFont(18),
        fontWeight: '500',
    },
    settingsRowRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(6),
    },
    settingsRowValue: {
        color: '#777777',
        fontSize: scaleFont(17),
    },
    settingsDivider: {
        height: scale(12),
    },
    settingsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: scale(16),
    },
    settingsBack: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(6),
    },
    settingsBackText: {
        color: '#FFFFFF',
        fontSize: scaleFont(17),
        fontWeight: '500',
    },
    settingsOption: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: scale(13),
        paddingHorizontal: scale(8),
        borderRadius: scale(8),
    },
    settingsOptionSelected: {
        backgroundColor: 'rgba(229, 9, 20, 0.08)',
    },
    settingsOptionFocused: {
        backgroundColor: '#FFFFFF',
    },
    settingsOptionText: {
        flex: 1,
    },
    settingsOptionLabel: {
        color: '#E5E5E5',
        fontSize: scaleFont(17),
        fontWeight: '500',
    },
    settingsOptionLabelSelected: {
        color: '#FFFFFF',
        fontWeight: '600',
    },
    settingsTextFocused: {
        color: '#111111',
        fontWeight: '700',
    },
    settingsOptionDescription: {
        color: '#666666',
        fontSize: scaleFont(14),
        marginTop: scale(3),
    },
    settingsDescriptionFocused: {
        color: '#333333',
    },
    togglePill: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: scale(14),
        paddingVertical: scale(5),
        borderRadius: scale(12),
    },
    togglePillActive: {
        backgroundColor: 'rgba(229, 9, 20, 0.3)',
    },
    toggleText: {
        color: '#777777',
        fontSize: scaleFont(14),
        fontWeight: '600',
    },
    toggleTextActive: {
        color: '#E50914',
    },
});

export default TVPlayerSettingsModal;
