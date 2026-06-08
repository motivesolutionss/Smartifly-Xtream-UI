import React, { useEffect, useMemo } from "react";
import { ArrowLeft, Pause, Play, Settings, Rewind, FastForward } from "lucide-react";
import { Focusable } from "../../../components/tv/Focusable";
import { useFocus } from "../../../providers/useFocus";
import type { TrackSelectionManager } from "../../../playback/trackSelectionManager";
import styles from "./PlayerControls.module.css";
import { detectVideoResolution } from "../../../utils/resolutionDetector";

// PlayerControls is the VOD/Series player controls overlay.
// Live TV uses LivePlayerOverlay instead — there are no live-specific
// props here by design.

type PlayerControlsProps = {
  isVisible: boolean;
  title: string;
  isPlaying: boolean;
  progress: number;
  currentTimeLabel: string;
  durationLabel: string;
  onPlayPause: () => void;
  onBack: () => void;
  onSettingsClick: () => void;
  seasonNumber?: number;
  episodeNumber?: number;
  onSeekBackward?: () => void;
  onSeekForward?: () => void;
  /** Pass the track manager so audio/quality badges reflect actual stream tracks. */
  trackSelectionManager?: TrackSelectionManager | null;
};

const PlayerControlsComponent: React.FC<PlayerControlsProps> = ({
  isVisible,
  title,
  isPlaying,
  progress,
  currentTimeLabel,
  durationLabel,
  onPlayPause,
  onBack,
  onSettingsClick,
  seasonNumber,
  episodeNumber,
  onSeekBackward,
  onSeekForward,
  trackSelectionManager,
}) => {
  const { setFocus } = useFocus();

  // ── Derive real track metadata from AVPlay ───────────────────────────────
  const streamMetaBadges = useMemo(() => {
    if (!trackSelectionManager) return null;

    const caps = trackSelectionManager.getCapabilities();

    // Quality badge — prefer the selected video track label (e.g. "1080P", "720P"),
    // fall back to title-string heuristic.
    let qualityLabel: string | null = null;
    if (caps.canSelectTracks && caps.qualityTrackCount > 0) {
      const videoTracks = trackSelectionManager.getVideoTracks();
      const selected = videoTracks.find((t) => t.isSelected && t.trackIndex >= 0);
      if (selected) qualityLabel = selected.label;
    }
    if (!qualityLabel) qualityLabel = detectVideoResolution(title);

    // Audio badge — only shown when the stream has multiple audio tracks.
    let audioLabel: string | null = null;
    if (caps.canSelectTracks && caps.audioTrackCount > 1) {
      const audioTracks = trackSelectionManager.getAudioTracks();
      const selected = audioTracks.find((t) => t.isSelected);
      if (selected) audioLabel = selected.label;
    }

    return { qualityLabel, audioLabel };
  }, [trackSelectionManager, title]);

  useEffect(() => {
    if (!isVisible) return;
    const frame = window.requestAnimationFrame(() => {
      setFocus("player-playpause");
    });
    return () => window.cancelAnimationFrame(frame);
  }, [isVisible, setFocus]);

  if (!isVisible) return null;

  // ── D-pad key handlers ───────────────────────────────────────────────────

  const handleBackKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      setFocus("player-settings");
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocus("player-playpause");
    }
  };

  const handleSettingsKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      setFocus("player-back");
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocus("player-playpause");
    }
  };

  const handleRewindKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      setFocus("player-back");
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      setFocus("player-playpause");
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocus("player-back");
    }
  };

  const handleForwardKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      setFocus("player-playpause");
    } else if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      setFocus("player-settings");
    }
  };

  const handlePlayPauseKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft" && onSeekBackward) {
      e.preventDefault();
      setFocus("player-rewind");
    } else if (e.key === "ArrowRight" && onSeekForward) {
      e.preventDefault();
      setFocus("player-forward");
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocus("player-back");
    }
  };

  return (
    <div className={styles.overlay}>
      {/* ── Top bar: back button / title / settings ── */}
      <div className={styles.topBar}>
        <Focusable
          id="player-back"
          onEnter={onBack}
          onKeyDown={handleBackKeyDown}
          disableFocusEffects
          className={styles.backButton}
        >
          <ArrowLeft size={26} />
        </Focusable>

        <div className={styles.topMeta}>
          <h2 className={styles.title}>{title}</h2>
        </div>

        <Focusable
          id="player-settings"
          onEnter={onSettingsClick}
          onKeyDown={handleSettingsKeyDown}
          disableFocusEffects
          className={styles.settingsButton}
        >
          <Settings size={22} />
        </Focusable>
      </div>

      {/* ── Bottom area: metadata, seek bar, buttons ── */}
      <div className={styles.bottomArea}>
        {/* Episode + stream quality/audio badges */}
        <div className={styles.vodMetaRow}>
          {seasonNumber !== undefined && (
            <span className={styles.episodeBadge}>
              Season {seasonNumber} • Episode {episodeNumber}
            </span>
          )}
          {streamMetaBadges?.qualityLabel && (
            <span className={styles.qualityBadge}>{streamMetaBadges.qualityLabel}</span>
          )}
          {streamMetaBadges?.audioLabel && (
            <span className={styles.audioBadge}>{streamMetaBadges.audioLabel}</span>
          )}
        </div>

        {/* Seek bar */}
        <div className={styles.seekRow}>
          <span className={styles.timeLabel}>{currentTimeLabel}</span>
          <div className={styles.seekTrack}>
            <div
              className={styles.seekProgress}
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
          <span className={`${styles.timeLabel} ${styles.timeLabelRight}`}>
            {durationLabel}
          </span>
        </div>

        {/* Rewind / Play-Pause / Forward */}
        <div className={styles.controlRow}>
          {onSeekBackward && (
            <div className={styles.buttonGroup}>
              <Focusable
                id="player-rewind"
                onEnter={onSeekBackward}
                onKeyDown={handleRewindKeyDown}
                disableFocusEffects
                className={styles.iconButton}
              >
                <Rewind size={28} />
              </Focusable>
              <span className={styles.seekLabel}>-10s</span>
            </div>
          )}

          <Focusable
            id="player-playpause"
            onEnter={onPlayPause}
            onKeyDown={handlePlayPauseKeyDown}
            disableFocusEffects
            className={styles.playPauseButton}
          >
            {isPlaying ? (
              <Pause size={36} fill="currentColor" />
            ) : (
              <Play size={36} fill="currentColor" style={{ marginLeft: "3px" }} />
            )}
          </Focusable>

          {onSeekForward && (
            <div className={styles.buttonGroup}>
              <Focusable
                id="player-forward"
                onEnter={onSeekForward}
                onKeyDown={handleForwardKeyDown}
                disableFocusEffects
                className={styles.iconButton}
              >
                <FastForward size={28} />
              </Focusable>
              <span className={styles.seekLabel}>+10s</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const PlayerControls = React.memo(PlayerControlsComponent);
