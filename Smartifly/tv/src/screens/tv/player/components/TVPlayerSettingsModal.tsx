import React, { memo } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { scale, scaleFont, Icon } from '../../../../theme';
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
    ) => (
        <Pressable
            key={option.key}
            style={[styles.settingsOption, isSelected && styles.settingsOptionSelected]}
            onPress={onPress}
        >
            <View style={styles.settingsOptionText}>
                <Text style={[styles.settingsOptionLabel, isSelected && styles.settingsOptionLabelSelected]}>
                    {option.label}
                </Text>
                {option.description ? (
                    <Text style={styles.settingsOptionDescription}>{option.description}</Text>
                ) : null}
            </View>
            {isSelected ? <Icon name="check" size={scale(22)} color="#E50914" /> : null}
        </Pressable>
    );

    const renderToggleRow = (label: string, value: boolean, onPress: () => void) => (
        <Pressable style={styles.settingsRow} onPress={onPress}>
            <Text style={styles.settingsRowLabel}>{label}</Text>
            <View style={[styles.togglePill, value && styles.togglePillActive]}>
                <Text style={[styles.toggleText, value && styles.toggleTextActive]}>
                    {value ? 'ON' : 'OFF'}
                </Text>
            </View>
        </Pressable>
    );

    return (
        <Modal
            visible={showSettings}
            transparent
            animationType="fade"
            onRequestClose={handleSettingsClose}
        >
            <Pressable style={styles.modalBackdrop} onPress={handleSettingsClose} />
            <View style={styles.settingsSheet}>
                <ScrollView showsVerticalScrollIndicator={false}>
                    {settingsView === 'root' && (
                        <View>
                            <Text style={styles.settingsTitleMain}>Settings</Text>

                            <Pressable style={styles.settingsRow} onPress={() => setSettingsView('quality')}>
                                <Text style={styles.settingsRowLabel}>Quality</Text>
                                <View style={styles.settingsRowRight}>
                                    <Text style={styles.settingsRowValue}>{selectedQualityLabel}</Text>
                                    <Icon name="chevronRight" size={scale(18)} color="#666" />
                                </View>
                            </Pressable>

                            <Pressable style={styles.settingsRow} onPress={() => setSettingsView('audio')}>
                                <Text style={styles.settingsRowLabel}>Audio</Text>
                                <View style={styles.settingsRowRight}>
                                    <Text style={styles.settingsRowValue}>{selectedAudioLabel}</Text>
                                    <Icon name="chevronRight" size={scale(18)} color="#666" />
                                </View>
                            </Pressable>

                            <Pressable style={styles.settingsRow} onPress={() => setSettingsView('subtitles')}>
                                <Text style={styles.settingsRowLabel}>Subtitles</Text>
                                <View style={styles.settingsRowRight}>
                                    <Text style={styles.settingsRowValue}>{selectedSubtitleLabel}</Text>
                                    <Icon name="chevronRight" size={scale(18)} color="#666" />
                                </View>
                            </Pressable>

                            <Pressable style={styles.settingsRow} onPress={() => setSettingsView('speed')}>
                                <Text style={styles.settingsRowLabel}>Speed</Text>
                                <View style={styles.settingsRowRight}>
                                    <Text style={styles.settingsRowValue}>{playbackRate}x</Text>
                                    <Icon name="chevronRight" size={scale(18)} color="#666" />
                                </View>
                            </Pressable>

                            <Pressable style={styles.settingsRow} onPress={() => setSettingsView('aspect')}>
                                <Text style={styles.settingsRowLabel}>Aspect Ratio</Text>
                                <View style={styles.settingsRowRight}>
                                    <Text style={styles.settingsRowValue}>{resizeMode}</Text>
                                    <Icon name="chevronRight" size={scale(18)} color="#666" />
                                </View>
                            </Pressable>

                            <View style={styles.settingsDivider} />

                            {renderToggleRow('Mute', isMuted, () => setIsMuted(prev => !prev))}
                            {renderToggleRow('Repeat', repeatEnabled, () => setRepeatEnabled(prev => !prev))}
                            {renderToggleRow('Stats Overlay', showStats, () => setShowStats(prev => !prev))}
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
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(255,255,255,0.08)',
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
    settingsOptionDescription: {
        color: '#666666',
        fontSize: scaleFont(14),
        marginTop: scale(3),
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
