import React, { useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronRight,
  Settings2,
  Subtitles,
  Volume2,
  Clapperboard,
  ArrowLeft,
} from "lucide-react";
import { Focusable } from "../../../components/tv/Focusable";
import { useFocus } from "../../../providers/useFocus";
import type {
  TrackCapabilities,
  TrackInfo,
  TrackSelectionManager,
  TrackType,
} from "../../../playback/trackSelectionManager";
import styles from "./PlayerSettingsOverlay.module.css";

type PlayerSettingsOverlayProps = {
  isVisible: boolean;
  onClose: () => void;
  trackSelectionManager: TrackSelectionManager | null;
};

type ActiveView = "main" | "subtitles" | "audio" | "quality";

type MainMenuEntry = {
  id: string;
  view: Exclude<ActiveView, "main">;
  label: string;
  icon: React.ReactNode;
  status: string;
  available: boolean;
};

const selectorToTrackType: Record<Exclude<ActiveView, "main">, TrackType> = {
  subtitles: "text",
  audio: "audio",
  quality: "video",
};

// Main menu item IDs in order
const MAIN_MENU_IDS = [
  "player-settings-subtitles",
  "player-settings-audio",
  "player-settings-quality",
  "player-settings-close",
];

export const PlayerSettingsOverlay: React.FC<PlayerSettingsOverlayProps> = ({
  isVisible,
  onClose,
  trackSelectionManager,
}) => {
  const [activeView, setActiveView] = useState<ActiveView>("main");
  const { setFocus } = useFocus();

  const capabilities: TrackCapabilities = useMemo(() => {
    if (!trackSelectionManager) {
      return {
        canSelectTracks: false,
        audioTrackCount: 0,
        subtitleTrackCount: 0,
        qualityTrackCount: 0,
      };
    }
    return trackSelectionManager.getCapabilities();
  }, [trackSelectionManager]);

  const menuEntries: MainMenuEntry[] = useMemo(() => {
    const trackSelectionReady = capabilities.canSelectTracks;
    const subtitlesAvailable = trackSelectionReady && capabilities.subtitleTrackCount > 0;
    const audioAvailable = trackSelectionReady && capabilities.audioTrackCount > 0;
    const qualityAvailable = trackSelectionReady && capabilities.qualityTrackCount > 0;

    return [
      {
        id: "player-settings-subtitles",
        view: "subtitles",
        label: "Subtitles",
        icon: <Subtitles size={22} className={styles.menuIcon} />,
        status: subtitlesAvailable
          ? `${capabilities.subtitleTrackCount} track${capabilities.subtitleTrackCount > 1 ? "s" : ""}`
          : "Not available",
        available: subtitlesAvailable,
      },
      {
        id: "player-settings-audio",
        view: "audio",
        label: "Audio Tracks",
        icon: <Volume2 size={22} className={styles.menuIcon} />,
        status: audioAvailable
          ? `${capabilities.audioTrackCount} track${capabilities.audioTrackCount > 1 ? "s" : ""}`
          : "Not available",
        available: audioAvailable,
      },
      {
        id: "player-settings-quality",
        view: "quality",
        label: "Quality",
        icon: <Clapperboard size={22} className={styles.menuIcon} />,
        status: qualityAvailable
          ? `${capabilities.qualityTrackCount} option${capabilities.qualityTrackCount > 1 ? "s" : ""}`
          : "Source only",
        available: qualityAvailable,
      },
    ];
  }, [capabilities]);

  // Focus first item whenever the overlay becomes visible or view changes
  useEffect(() => {
    if (!isVisible) return;
    const frame = window.requestAnimationFrame(() => {
      if (activeView === "main") {
        setFocus(menuEntries[0]?.id || "player-settings-close");
      } else {
        setFocus("player-settings-back");
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [isVisible, activeView, setFocus, menuEntries]);

  const options = useMemo(() => {
    if (!trackSelectionManager || activeView === "main") return [];
    if (activeView === "subtitles") return trackSelectionManager.getSubtitleTracks();
    if (activeView === "audio") return trackSelectionManager.getAudioTracks();
    return trackSelectionManager.getVideoTracks();
  }, [activeView, trackSelectionManager]);

  if (!isVisible) return null;

  const isSelector = activeView !== "main";
  const title =
    activeView === "main"
      ? "Settings"
      : activeView === "subtitles"
      ? "Subtitles"
      : activeView === "audio"
      ? "Audio Tracks"
      : "Quality";

  const handleSelect = (track: TrackInfo) => {
    if (!trackSelectionManager || !isSelector) return;
    trackSelectionManager.selectTrack(track, selectorToTrackType[activeView]);
    setActiveView("main");
  };

  const openView = (view: Exclude<ActiveView, "main">, available: boolean) => {
    if (!available) return;
    setActiveView(view);
  };

  // D-pad nav for main menu
  const makeMainMenuKeyDown = (index: number) => (e: React.KeyboardEvent) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (index > 0) setFocus(MAIN_MENU_IDS[index - 1]);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (index < MAIN_MENU_IDS.length - 1) setFocus(MAIN_MENU_IDS[index + 1]);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      onClose();
    }
  };

  // D-pad nav for track selector list
  const makeOptionKeyDown = (index: number, total: number) => (e: React.KeyboardEvent) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (index > 0) setFocus(`player-settings-option-${index - 1}`);
      else setFocus("player-settings-back");
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (index < total - 1) setFocus(`player-settings-option-${index + 1}`);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      setFocus("player-settings-back");
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.panel}>
        {/* Header */}
        <div className={styles.header}>
          {activeView !== "main" && (
            <Focusable
              id="player-settings-back"
              onEnter={() => setActiveView("main")}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  if (options.length > 0) setFocus("player-settings-option-0");
                } else if (e.key === "ArrowLeft") {
                  e.preventDefault();
                  onClose();
                }
              }}
              disableFocusEffects
              className={styles.backIconButton}
            >
              <ArrowLeft size={20} />
            </Focusable>
          )}
          <h3 className={styles.title}>{title}</h3>
        </div>

        {/* Main menu */}
        {activeView === "main" && (
          <div className={styles.mainMenu}>
            <Focusable
              id="player-settings-subtitles"
              onEnter={() => openView("subtitles", menuEntries[0]?.available ?? false)}
              onKeyDown={makeMainMenuKeyDown(0)}
              disableFocusEffects
              className={`${styles.menuItem} ${
                menuEntries[0]?.available ? "" : styles.menuItemDisabled
              }`}
            >
              <div className={styles.menuLeft}>
                {menuEntries[0]?.icon}
                <span>{menuEntries[0]?.label || "Subtitles"}</span>
              </div>
              <div className={styles.menuRight}>
                <span
                  className={`${styles.menuStatus} ${
                    menuEntries[0]?.available ? "" : styles.menuStatusMuted
                  }`}
                >
                  {menuEntries[0]?.status || "Not available"}
                </span>
                <ChevronRight size={20} />
              </div>
            </Focusable>

            <Focusable
              id="player-settings-audio"
              onEnter={() => openView("audio", menuEntries[1]?.available ?? false)}
              onKeyDown={makeMainMenuKeyDown(1)}
              disableFocusEffects
              className={`${styles.menuItem} ${
                menuEntries[1]?.available ? "" : styles.menuItemDisabled
              }`}
            >
              <div className={styles.menuLeft}>
                {menuEntries[1]?.icon}
                <span>{menuEntries[1]?.label || "Audio Tracks"}</span>
              </div>
              <div className={styles.menuRight}>
                <span
                  className={`${styles.menuStatus} ${
                    menuEntries[1]?.available ? "" : styles.menuStatusMuted
                  }`}
                >
                  {menuEntries[1]?.status || "Not available"}
                </span>
                <ChevronRight size={20} />
              </div>
            </Focusable>

            <Focusable
              id="player-settings-quality"
              onEnter={() => openView("quality", menuEntries[2]?.available ?? false)}
              onKeyDown={makeMainMenuKeyDown(2)}
              disableFocusEffects
              className={`${styles.menuItem} ${
                menuEntries[2]?.available ? "" : styles.menuItemDisabled
              }`}
            >
              <div className={styles.menuLeft}>
                {menuEntries[2]?.icon}
                <span>{menuEntries[2]?.label || "Quality"}</span>
              </div>
              <div className={styles.menuRight}>
                <span
                  className={`${styles.menuStatus} ${
                    menuEntries[2]?.available ? "" : styles.menuStatusMuted
                  }`}
                >
                  {menuEntries[2]?.status || "Source only"}
                </span>
                <ChevronRight size={20} />
              </div>
            </Focusable>
          </div>
        )}

        {/* Track selector */}
        {isSelector && (
          <div className={styles.selectorList}>
            {options.length === 0 ? (
              <div className={styles.emptyRow}>No options available</div>
            ) : (
              options.map((track, index) => (
                <Focusable
                  key={track.id}
                  id={`player-settings-option-${index}`}
                  onEnter={() => handleSelect(track)}
                  onKeyDown={makeOptionKeyDown(index, options.length)}
                  disableFocusEffects
                  className={`${styles.optionRow} ${track.isSelected ? styles.optionSelected : ""}`}
                >
                  <span>{track.label}</span>
                  {track.isSelected && <Check size={20} />}
                </Focusable>
              ))
            )}
          </div>
        )}

        {/* Close row — always at bottom of main menu */}
        {activeView === "main" && (
          <Focusable
            id="player-settings-close"
            onEnter={onClose}
            onKeyDown={makeMainMenuKeyDown(3)}
            disableFocusEffects
            className={styles.closeRow}
          >
            <Settings2 size={20} />
            <span>Close Settings</span>
          </Focusable>
        )}
      </div>
    </div>
  );
};
