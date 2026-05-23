import React, { useEffect } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  FastForward,
  Pause,
  Play,
  Rewind,
  Settings,
} from "lucide-react";
import { Focusable } from "../../../components/tv/Focusable";
import { useFocus } from "../../../providers/useFocus";
import styles from "./PlayerControls.module.css";

type PlayerControlsProps = {
  isVisible: boolean;
  title: string;
  isPlaying: boolean;
  isLive: boolean;
  progress: number;
  currentTimeLabel: string;
  durationLabel: string;
  onPlayPause: () => void;
  onSeekForward?: () => void;
  onSeekBackward?: () => void;
  onPreviousChannel?: () => void;
  onNextChannel?: () => void;
  onBack: () => void;
  onSettingsClick: () => void;
  liveChannelLabel?: string;
  liveProgramLabel?: string;
  liveProgramTimeLabel?: string;
  nextProgramLabel?: string;
  nextProgramTimeLabel?: string;
  previousChannelTitle?: string;
  nextChannelTitle?: string;
  liveClockLabel?: string;
};

export const PlayerControls: React.FC<PlayerControlsProps> = ({
  isVisible,
  title,
  isPlaying,
  isLive,
  progress,
  currentTimeLabel,
  durationLabel,
  onPlayPause,
  onSeekForward,
  onSeekBackward,
  onPreviousChannel,
  onNextChannel,
  onBack,
  onSettingsClick,
  liveChannelLabel,
  liveProgramLabel,
  liveProgramTimeLabel,
  nextProgramLabel,
  nextProgramTimeLabel,
  previousChannelTitle,
  nextChannelTitle,
  liveClockLabel,
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

  const handleBackKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      if (onSeekBackward) {
        setFocus("player-rewind");
      } else if (onPreviousChannel) {
        setFocus("player-prev-channel");
      } else {
        setFocus("player-playpause");
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (onSeekBackward) {
        setFocus("player-rewind");
      } else if (onPreviousChannel) {
        setFocus("player-prev-channel");
      } else {
        setFocus("player-playpause");
      }
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

  const handlePlayPauseKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      if (onSeekBackward) {
        setFocus("player-rewind");
      } else if (onPreviousChannel) {
        setFocus("player-prev-channel");
      } else {
        setFocus("player-back");
      }
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      if (onSeekForward) {
        setFocus("player-forward");
      } else if (onNextChannel) {
        setFocus("player-next-channel");
      } else {
        setFocus("player-settings");
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocus("player-back");
    }
  };

  const handleForwardKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      setFocus("player-playpause");
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      setFocus("player-settings");
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocus("player-settings");
    }
  };

  const handleSettingsKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      if (onSeekForward) {
        setFocus("player-forward");
      } else if (onNextChannel) {
        setFocus("player-next-channel");
      } else {
        setFocus("player-playpause");
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (onSeekForward) {
        setFocus("player-forward");
      } else if (onNextChannel) {
        setFocus("player-next-channel");
      } else {
        setFocus("player-playpause");
      }
    }
  };

  const handlePreviousChannelKeyDown = (e: React.KeyboardEvent) => {
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

  const handleNextChannelKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      setFocus("player-playpause");
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      setFocus("player-settings");
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocus("player-settings");
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

        <div className={styles.controlRow}>
          {onSeekBackward ? (
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
          ) : onPreviousChannel ? (
            <div className={styles.buttonGroup}>
              <Focusable
                id="player-prev-channel"
                onEnter={onPreviousChannel}
                onKeyDown={handlePreviousChannelKeyDown}
                disableFocusEffects
                className={styles.iconButton}
              >
                <ArrowUp size={28} />
              </Focusable>
              <span className={styles.seekLabel}>Prev ch</span>
              {previousChannelTitle ? (
                <span className={styles.channelLabel}>{previousChannelTitle}</span>
              ) : null}
            </div>
          ) : (
            <div style={{ width: "4.4rem" }} />
          )}

          <Focusable
            id="player-playpause"
            onEnter={onPlayPause}
            onKeyDown={handlePlayPauseKeyDown}
            disableFocusEffects
            className={styles.playPauseButton}
          >
            {isPlaying
              ? <Pause size={36} fill="currentColor" />
              : <Play size={36} fill="currentColor" style={{ marginLeft: "3px" }} />
            }
          </Focusable>

          {onSeekForward ? (
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
          ) : onNextChannel ? (
            <div className={styles.buttonGroup}>
              <Focusable
                id="player-next-channel"
                onEnter={onNextChannel}
                onKeyDown={handleNextChannelKeyDown}
                disableFocusEffects
                className={styles.iconButton}
              >
                <ArrowDown size={28} />
              </Focusable>
              <span className={styles.seekLabel}>Next ch</span>
              {nextChannelTitle ? (
                <span className={styles.channelLabel}>{nextChannelTitle}</span>
              ) : null}
            </div>
          ) : (
            <div style={{ width: "4.4rem" }} />
          )}
        </div>

        {isLive ? (
          <div className={styles.remoteHintRow} aria-hidden="true">
            <span className={styles.remoteHint}>Up Previous channel</span>
            <span className={styles.remoteHint}>Down Next channel</span>
            <span className={styles.remoteHint}>Enter Show controls</span>
            <span className={styles.remoteHint}>Back Exit player</span>
          </div>
        ) : null}
      </div>
    </div>
  );
};
