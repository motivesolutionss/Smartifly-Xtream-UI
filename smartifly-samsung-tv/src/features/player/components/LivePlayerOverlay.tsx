import React, { useEffect } from "react";
import { ArrowLeft, Play, Pause, Settings, Loader2 } from "lucide-react";
import { Focusable } from "../../../components/tv/Focusable";
import { useFocus } from "../../../providers/useFocus";
import { imageFailureMemory } from "../../../utils/imageFailureMemory";
import styles from "./LivePlayerOverlay.module.css";

interface EpgProgram {
  title: string;
  startMs: number;
  endMs: number;
  progress: number;
}

interface AppChannel {
  id: string;
  title: string;
  logoUrl?: string;
}

interface LivePlayerOverlayProps {
  isVisible: boolean;
  controlsVisible: boolean;
  channel: {
    id: string;
    title: string;
    logoUrl?: string;
  };
  isPlaying: boolean;
  /** True while the player is LOADING or BUFFERING the current channel. */
  isBuffering: boolean;
  currentProgram: EpgProgram | null;
  nextProgram: EpgProgram | null;
  liveClockLabel?: string;
  liveChannelLabel?: string;
  zappingChannel: AppChannel | null;
  onPlayPause: () => void;
  onBack: () => void;
  onSettingsClick: () => void;
}

const formatClockTime = (timestampMs: number) =>
  new Date(timestampMs).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

const LivePlayerOverlayComponent: React.FC<LivePlayerOverlayProps> = ({
  isVisible,
  controlsVisible,
  channel,
  isPlaying,
  isBuffering,
  currentProgram,
  nextProgram,
  liveClockLabel,
  liveChannelLabel,
  zappingChannel,
  onPlayPause,
  onBack,
  onSettingsClick,
}) => {
  const { setFocus } = useFocus();

  useEffect(() => {
    if (!controlsVisible || !isVisible) return;
    const frame = window.requestAnimationFrame(() => {
      setFocus("player-playpause");
    });
    return () => window.cancelAnimationFrame(frame);
  }, [isVisible, controlsVisible, setFocus]);

  if (!isVisible) return null;

  // D-pad Navigation key handlers
  const handleBackKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      setFocus("player-playpause");
    }
  };

  const handlePlayPauseKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      setFocus("player-back");
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      setFocus("player-settings");
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocus("player-back");
    }
  };

  const handleSettingsKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      setFocus("player-playpause");
    }
  };

  const hasLogo = channel.logoUrl && !imageFailureMemory.hasFailed(channel.logoUrl);
  const initials = channel.title.replace(/[^a-zA-Z0-9]/g, "").substring(0, 2).toUpperCase() || "TV";

  const liveProgramTimeLabel = currentProgram
    ? `${formatClockTime(currentProgram.startMs)} - ${formatClockTime(currentProgram.endMs)}`
    : undefined;

  const nextProgramTimeLabel = nextProgram
    ? `${formatClockTime(nextProgram.startMs)} - ${formatClockTime(nextProgram.endMs)}`
    : undefined;

  return (
    <div className={styles.overlayContainer}>
      {/* Top Header Row (Clock + Info) */}
      <div className={styles.topBar}>
        {liveClockLabel && (
          <div className={styles.clockPill}>
            <span>{liveClockLabel}</span>
          </div>
        )}
      </div>

      {/* Bottom Unified EPG & Control Card */}
      <div className={`${styles.bottomBanner} ${controlsVisible ? styles.bannerWithControls : ""}`}>
        <div className={styles.channelSection}>
          {hasLogo ? (
            <img
              src={channel.logoUrl}
              alt=""
              className={styles.channelLogo}
              onError={() => {
                if (channel.logoUrl) {
                  imageFailureMemory.markFailed(channel.logoUrl);
                }
              }}
            />
          ) : (
            <div className={styles.channelPlaceholder}>{initials}</div>
          )}
          <div className={styles.channelDetails}>
            <div className={styles.badgeRow}>
              <span className={styles.liveBadge}>LIVE TV</span>
              {liveChannelLabel && <span className={styles.channelNumber}>{liveChannelLabel}</span>}
            </div>
            <h2 className={styles.channelTitle}>{channel.title}</h2>
          </div>
        </div>

        {/* EPG Info Column — replaced by a buffering indicator while the stream loads */}
        <div className={styles.epgSection}>
          {isBuffering ? (
            <div className={styles.bufferingRow}>
              <Loader2 size={20} className={styles.bufferingSpinner} />
              <span className={styles.bufferingLabel}>Loading stream…</span>
            </div>
          ) : currentProgram ? (
            <div className={styles.epgDetail}>
              <div className={styles.programRow}>
                <span className={styles.nowLabel}>NOW:</span>
                <span className={styles.programTitle}>{currentProgram.title}</span>
                {liveProgramTimeLabel && <span className={styles.programTime}>{liveProgramTimeLabel}</span>}
              </div>
              <div className={styles.progressBar}>
                <div
                  className={styles.progressFill}
                  style={{ width: `${Math.min(100, Math.max(0, currentProgram.progress))}%` }}
                />
              </div>
              {nextProgram && (
                <div className={styles.nextProgramRow}>
                  <span className={styles.nextLabel}>NEXT:</span>
                  <span className={styles.nextTitle}>{nextProgram.title}</span>
                  {nextProgramTimeLabel && <span className={styles.nextTime}>{nextProgramTimeLabel}</span>}
                </div>
              )}
            </div>
          ) : (
            <div className={styles.noEpg}>EPG program information unavailable</div>
          )}
        </div>

        {/* Focusable Interactive Controls (Shown only on request) */}
        {controlsVisible && (
          <div className={styles.controlsSection}>
            <Focusable
              id="player-back"
              onEnter={onBack}
              onKeyDown={handleBackKeyDown}
              disableFocusEffects
              className={styles.iconBtn}
            >
              <ArrowLeft size={22} />
              <span className={styles.btnLabel}>Back</span>
            </Focusable>

            <Focusable
              id="player-playpause"
              onEnter={onPlayPause}
              onKeyDown={handlePlayPauseKeyDown}
              disableFocusEffects
              className={styles.playPauseBtn}
            >
              {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
            </Focusable>

            <Focusable
              id="player-settings"
              onEnter={onSettingsClick}
              onKeyDown={handleSettingsKeyDown}
              disableFocusEffects
              className={styles.iconBtn}
            >
              <Settings size={20} />
              <span className={styles.btnLabel}>Settings</span>
            </Focusable>
          </div>
        )}
      </div>

      {/* Lightweight Zapping overlay */}
      {zappingChannel && (
        <div className={styles.zappingOverlay} aria-live="polite">
          <span className={styles.zappingLabel}>Switching to</span>
          <span className={styles.zappingTitle}>{zappingChannel.title}</span>
        </div>
      )}
    </div>
  );
};

export const LivePlayerOverlay = React.memo(LivePlayerOverlayComponent);
