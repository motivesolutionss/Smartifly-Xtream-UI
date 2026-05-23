import React, { useEffect, useState } from "react";
import { Focusable } from "../../../components/tv/Focusable";
import { useFocus } from "../../../providers/useFocus";
import styles from "./UpNextOverlay.module.css";

const hashString = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0;
  }
  return hash;
};

type UpNextEpisode = {
  title: string;
  seasonNumber?: number;
  episodeNumber?: number;
  thumbnailUrl?: string;
};

type UpNextOverlayProps = {
  isVisible: boolean;
  nextEpisode: UpNextEpisode | null;
  countdownSeconds: number;
  onPlayNow: () => void;
  onCancel: () => void;
};

export const UpNextOverlay: React.FC<UpNextOverlayProps> = ({
  isVisible,
  nextEpisode,
  countdownSeconds,
  onPlayNow,
  onCancel,
}) => {
  const { setFocus } = useFocus();
  const [imageFailed, setImageFailed] = useState(false);

  // Focus Play Now when the overlay appears
  useEffect(() => {
    if (!isVisible || !nextEpisode) return;
    const frame = window.requestAnimationFrame(() => {
      setFocus("player-upnext-play");
    });
    return () => window.cancelAnimationFrame(frame);
  }, [isVisible, nextEpisode, setFocus]);

  // Reset imageFailed state when active episode changes
  useEffect(() => {
    setImageFailed(false);
  }, [nextEpisode?.thumbnailUrl]);

  if (!isVisible || !nextEpisode) return null;

  const seasonPart =
    nextEpisode.seasonNumber !== undefined ? `S${nextEpisode.seasonNumber}` : "";
  const episodePart =
    nextEpisode.episodeNumber !== undefined ? `E${nextEpisode.episodeNumber}` : "";
  const prefix = [seasonPart, episodePart].filter(Boolean).join(" ");

  const handlePlayKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      setFocus("player-upnext-cancel");
    }
  };

  const handleCancelKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      setFocus("player-upnext-play");
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.card}>
        <p className={styles.countdown}>Up Next in {countdownSeconds}s</p>

        <div className={styles.metaRow}>
          {nextEpisode.thumbnailUrl && !imageFailed ? (
            <img
              src={nextEpisode.thumbnailUrl}
              alt=""
              className={styles.thumb}
              onError={() => setImageFailed(true)}
            />
          ) : (
            <div
              className={styles.thumbPlaceholder}
              style={{
                background: `linear-gradient(135deg,
                  hsl(${Math.abs(hashString(nextEpisode.title || "")) % 360}, 50%, 25%),
                  hsl(${(Math.abs(hashString(nextEpisode.title || "")) + 60) % 360}, 35%, 15%))`
              }}
            >
              {nextEpisode.title ? (
                nextEpisode.title.replace(/[^a-zA-Z0-9]/g, "").substring(0, 2).toUpperCase() || "EP"
              ) : "EP"}
            </div>
          )}
          <div className={styles.metaText}>
            {prefix && <p className={styles.subline}>{prefix}</p>}
            <h3 className={styles.title}>{nextEpisode.title}</h3>
          </div>
        </div>

        <div className={styles.actions}>
          <Focusable
            id="player-upnext-play"
            onEnter={onPlayNow}
            onKeyDown={handlePlayKeyDown}
            disableFocusEffects
            className={styles.playButton}
          >
            <span>Play Now</span>
          </Focusable>
          <Focusable
            id="player-upnext-cancel"
            onEnter={onCancel}
            onKeyDown={handleCancelKeyDown}
            disableFocusEffects
            className={styles.cancelButton}
          >
            <span>Cancel</span>
          </Focusable>
        </div>
      </div>
    </div>
  );
};

export type { UpNextEpisode };
