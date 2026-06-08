import type { RefObject, ReactEventHandler } from "react";
import styles from "../Player.module.css";

type PlayerSurfaceProps = {
  isBrowserMode: boolean;
  videoRef: RefObject<HTMLVideoElement | null>;
  avPlayerSurfaceRef: RefObject<HTMLDivElement | null>;
  onLoadedMetadata: ReactEventHandler<HTMLVideoElement>;
  onPlay: ReactEventHandler<HTMLVideoElement>;
  onPlaying: ReactEventHandler<HTMLVideoElement>;
  onCanPlay: ReactEventHandler<HTMLVideoElement>;
  onWaiting: ReactEventHandler<HTMLVideoElement>;
  onPause: ReactEventHandler<HTMLVideoElement>;
  onTimeUpdate: ReactEventHandler<HTMLVideoElement>;
  onError: ReactEventHandler<HTMLVideoElement>;
};

export const PlayerSurface = ({
  isBrowserMode,
  videoRef,
  avPlayerSurfaceRef,
  onLoadedMetadata,
  onPlay,
  onPlaying,
  onCanPlay,
  onWaiting,
  onPause,
  onTimeUpdate,
  onError,
}: PlayerSurfaceProps) => {
  if (isBrowserMode) {
    return (
      <video
        ref={videoRef}
        className={styles.videoSurface}
        autoPlay
        controls={false}
        playsInline
        onLoadedMetadata={onLoadedMetadata}
        onPlay={onPlay}
        onPlaying={onPlaying}
        onCanPlay={onCanPlay}
        onWaiting={onWaiting}
        onPause={onPause}
        onTimeUpdate={onTimeUpdate}
        onError={onError}
      />
    );
  }

  return (
    <div
      id="av-player"
      ref={avPlayerSurfaceRef}
      className={`${styles.videoSurface} ${styles.avplaySurface}`.trim()}
    />
  );
};
