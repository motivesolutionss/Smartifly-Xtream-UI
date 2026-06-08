import type { TrackSelectionManager } from "../../../playback/trackSelectionManager";
import { PlayerControls } from "./PlayerControls";
import { SkipIntroOverlay } from "./SkipIntroOverlay";
import { UpNextOverlay } from "./UpNextOverlay";

type UpNextEpisode = {
  title: string;
  seasonNumber?: number;
  episodeNumber?: number;
  logoUrl?: string;
};

type PlayerVodOverlayLayerProps = {
  shouldShowSkipIntro: boolean;
  shouldShowUpNext: boolean;
  controlsVisible: boolean;
  title: string;
  isPlaying: boolean;
  progress: number;
  currentTimeLabel: string;
  durationLabel: string;
  seasonNumber?: number;
  episodeNumber?: number;
  nextEpisode: UpNextEpisode | null;
  upNextCountdown: number;
  isBrowserMode: boolean;
  trackSelectionManager: TrackSelectionManager;
  onSkipIntro: () => void;
  onPlayNow: () => void;
  onCancelUpNext: () => void;
  onPlayPause: () => void;
  onBack: () => void;
  onSettingsClick: () => void;
  onSeekBackward: () => void;
  onSeekForward: () => void;
};

export const PlayerVodOverlayLayer = ({
  shouldShowSkipIntro,
  shouldShowUpNext,
  controlsVisible,
  title,
  isPlaying,
  progress,
  currentTimeLabel,
  durationLabel,
  seasonNumber,
  episodeNumber,
  nextEpisode,
  upNextCountdown,
  isBrowserMode,
  trackSelectionManager,
  onSkipIntro,
  onPlayNow,
  onCancelUpNext,
  onPlayPause,
  onBack,
  onSettingsClick,
  onSeekBackward,
  onSeekForward,
}: PlayerVodOverlayLayerProps) => (
  <>
    {shouldShowSkipIntro ? <SkipIntroOverlay isVisible onSkip={onSkipIntro} /> : null}

    {shouldShowUpNext ? (
      <UpNextOverlay
        isVisible
        nextEpisode={
          nextEpisode
            ? {
                title: nextEpisode.title,
                seasonNumber: nextEpisode.seasonNumber,
                episodeNumber: nextEpisode.episodeNumber,
                thumbnailUrl: nextEpisode.logoUrl,
              }
            : null
        }
        countdownSeconds={upNextCountdown}
        onPlayNow={onPlayNow}
        onCancel={onCancelUpNext}
      />
    ) : null}

    {controlsVisible ? (
      <PlayerControls
        isVisible
        title={title}
        isPlaying={isPlaying}
        progress={progress}
        currentTimeLabel={currentTimeLabel}
        durationLabel={durationLabel}
        onPlayPause={onPlayPause}
        onBack={onBack}
        onSettingsClick={onSettingsClick}
        seasonNumber={seasonNumber}
        episodeNumber={episodeNumber}
        onSeekBackward={onSeekBackward}
        onSeekForward={onSeekForward}
        trackSelectionManager={isBrowserMode ? null : trackSelectionManager}
      />
    ) : null}
  </>
);
