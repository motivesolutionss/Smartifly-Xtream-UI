import React, { memo } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, scale, scaleFont, Icon } from '../../../../theme';
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
                <Icon name="chevronLeft" size={scale(24)} color={colors.textPrimary} />
                <Text style={styles.settingsHeaderText}>Back</Text>
            </Pressable>
            <Text style={styles.settingsTitle}>{title}</Text>
        </View>
    );

    const renderSettingsOption = (
        option: TrackOption,
        isSelected: boolean,
        onPress: () => void
    ) => (
        <Pressable key={option.key} style={styles.settingsOption} onPress={onPress}>
            <View style={styles.settingsOptionText}>
                <Text style={styles.settingsOptionLabel}>{option.label}</Text>
                {option.description ? (
                    <Text style={styles.settingsOptionDescription}>{option.description}</Text>
                ) : null}
            </View>
            {isSelected ? <Icon name="check" size={scale(24)} color={colors.primary} /> : null}
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
                {settingsView === 'root' && (
                    <View>
                        <Text style={styles.settingsTitle}>Player Settings</Text>

                        <Pressable style={styles.settingsRow} onPress={() => setSettingsView('quality')}>
                            <Text style={styles.settingsRowLabel}>Quality</Text>
                            <Text style={styles.settingsRowValue}>{selectedQualityLabel}</Text>
                        </Pressable>

                        <Pressable style={styles.settingsRow} onPress={() => setSettingsView('audio')}>
                            <Text style={styles.settingsRowLabel}>Audio</Text>
                            <Text style={styles.settingsRowValue}>{selectedAudioLabel}</Text>
                        </Pressable>

                        <Pressable style={styles.settingsRow} onPress={() => setSettingsView('subtitles')}>
                            <Text style={styles.settingsRowLabel}>Subtitles</Text>
                            <Text style={styles.settingsRowValue}>{selectedSubtitleLabel}</Text>
                        </Pressable>

                        <Pressable style={styles.settingsRow} onPress={() => setSettingsView('speed')}>
                            <Text style={styles.settingsRowLabel}>Speed</Text>
                            <Text style={styles.settingsRowValue}>{playbackRate}x</Text>
                        </Pressable>

                        <Pressable style={styles.settingsRow} onPress={() => setSettingsView('aspect')}>
                            <Text style={styles.settingsRowLabel}>Aspect</Text>
                            <Text style={styles.settingsRowValue}>{resizeMode}</Text>
                        </Pressable>

                        <Pressable style={styles.settingsRow} onPress={() => setIsMuted(prev => !prev)}>
                            <Text style={styles.settingsRowLabel}>Mute</Text>
                            <Text style={styles.settingsRowValue}>{isMuted ? 'On' : 'Off'}</Text>
                        </Pressable>

                        <Pressable style={styles.settingsRow} onPress={() => setRepeatEnabled(prev => !prev)}>
                            <Text style={styles.settingsRowLabel}>Repeat</Text>
                            <Text style={styles.settingsRowValue}>{repeatEnabled ? 'On' : 'Off'}</Text>
                        </Pressable>

                        <Pressable style={styles.settingsRow} onPress={() => setShowStats(prev => !prev)}>
                            <Text style={styles.settingsRowLabel}>Stats Overlay</Text>
                            <Text style={styles.settingsRowValue}>{showStats ? 'On' : 'Off'}</Text>
                        </Pressable>
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
                        {renderSettingsHeader('Aspect')}
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
            </View>
        </Modal>
    );
});

const styles = StyleSheet.create({
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    settingsSheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: colors.background,
        padding: scale(32),
        borderTopLeftRadius: scale(24),
        borderTopRightRadius: scale(24),
        gap: scale(12),
    },
    settingsTitle: {
        color: colors.textPrimary,
        fontSize: scaleFont(24),
        fontWeight: '700',
        marginBottom: scale(12),
    },
    settingsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: scale(12),
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(255,255,255,0.15)',
    },
    settingsRowLabel: {
        color: colors.textPrimary,
        fontSize: scaleFont(18),
        fontWeight: '600',
    },
    settingsRowValue: {
        color: colors.textSecondary,
        fontSize: scaleFont(18),
    },
    settingsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: scale(12),
    },
    settingsBack: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(8),
    },
    settingsHeaderText: {
        color: colors.textPrimary,
        fontSize: scaleFont(18),
    },
    settingsOption: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: scale(12),
    },
    settingsOptionText: {
        flex: 1,
    },
    settingsOptionLabel: {
        color: colors.textPrimary,
        fontSize: scaleFont(18),
        fontWeight: '600',
    },
    settingsOptionDescription: {
        color: colors.textSecondary,
        fontSize: scaleFont(14),
        marginTop: scale(4),
    },
});

export default TVPlayerSettingsModal;
