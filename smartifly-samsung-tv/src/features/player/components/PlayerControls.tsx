import React, { useEffect } from "react";
import { ArrowLeft, Pause, Play, Settings, Rewind, FastForward } from "lucide-react";
import { Focusable } from "../../../components/tv/Focusable";
import { useFocus } from "../../../providers/useFocus";
import styles from "./PlayerControls.module.css";
import { detectVideoResolution } from "../../../utils/resolutionDetector";


type PlayerControlsProps = {
  isVisible: boolean;
  title: string;
  isPlaying: boolean;
  isLive: boolean;
  progress: number;
  currentTimeLabel: string;
  durationLabel: string;
  onPlayPause: () => void;
  onBack: () => void;
  onSettingsClick: () => void;
  liveChannelLabel?: string;
  liveProgramLabel?: string;
  liveProgramTimeLabel?: string;
  nextProgramLabel?: string;
  nextProgramTimeLabel?: string;
  liveClockLabel?: string;
  seasonNumber?: number;
  episodeNumber?: number;
  onSeekBackward?: () => void;
  onSeekForward?: () => void;
};

const PlayerControlsComponent: React.FC<PlayerControlsProps> = ({
  isVisible,
  title,
  isPlaying,
  isLive,
  progress,
  currentTimeLabel,
  durationLabel,
  onPlayPause,
  onBack,
  onSettingsClick,
  liveChannelLabel,
  liveProgramLabel,
  liveProgramTimeLabel,
  nextProgramLabel,
  nextProgramTimeLabel,
  liveClockLabel,
  seasonNumber,
  episodeNumber,
  onSeekBackward,
  onSeekForward,
}) => {
  const { setFocus } = useFocus();

  useEffect(() => {
    if (!isVisible) return;
    const frame = window.requestAnimationFrame(() => {
      setFocus("player-playpause");
    });
    return () => window.cancelAnimationFrame(frame);
  }, [isVisible, setFocus]);

  if (!isVisible) return null;

  // D-pad Navigation key handlers
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
          {isLive ? (
            <div className={styles.liveMetaRow}>
              <div className={styles.liveBadge}>
                <span className={styles.liveDot} />
                <span>LIVE</span>
              </div>
              {liveChannelLabel ? <span className={styles.liveMetaChip}>{liveChannelLabel}</span> : null}
              {liveProgramTimeLabel ? <span className={styles.liveMetaText}>{liveProgramTimeLabel}</span> : null}
            </div>
          ) : null}
        </div>

        <div className={styles.topRightGroup}>
          {isLive && liveClockLabel ? (
            <div className={styles.clockPill}>
              <span>{liveClockLabel}</span>
            </div>
          ) : null}
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
      </div>

      <div className={styles.bottomArea}>
        {/* Now / Next Live TV EPG Card (only shown for Live playback) */}
        {isLive && (liveProgramLabel || nextProgramLabel) ? (
          <div className={styles.liveProgramCard}>
            <div className={styles.liveProgramColumn}>
              <span className={styles.liveProgramEyebrow}>Now</span>
              <span className={styles.liveProgramTitle}>{liveProgramLabel || title}</span>
              {liveProgramTimeLabel ? (
                <span className={styles.liveProgramMeta}>{liveProgramTimeLabel}</span>
              ) : null}
            </div>
            <div className={styles.liveProgramDivider} />
            <div className={styles.liveProgramColumn}>
              <span className={styles.liveProgramEyebrow}>Next</span>
              <span className={styles.liveProgramTitle}>{nextProgramLabel || "Program info unavailable"}</span>
              {nextProgramTimeLabel ? (
                <span className={styles.liveProgramMeta}>{nextProgramTimeLabel}</span>
              ) : null}
            </div>
          </div>
        ) : null}

        {/* VOD / Series metadata directly above the seek bar */}
        {!isLive && (
          <div className={styles.vodMetaRow}>
            {seasonNumber !== undefined && (
              <span className={styles.episodeBadge}>
                Season {seasonNumber} • Episode {episodeNumber}
              </span>
            )}
            <span className={styles.qualityBadge}>{detectVideoResolution(title)}</span>
            <span className={styles.qualityBadge}>HDR10+</span>
            <span className={styles.audioBadge}>Dolby Atmos</span>
          </div>
        )}

        {/* Seek track timeline (only shown for VOD/Series playback) */}
        {!isLive && (
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
        )}

        {/* Control Button Row (Rewind, Play/Pause, FastForward) */}
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
