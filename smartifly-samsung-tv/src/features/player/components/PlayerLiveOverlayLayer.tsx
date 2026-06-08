import { LivePlayerOverlay } from "./LivePlayerOverlay";

type EpgProgram = {
  title: string;
  startMs: number;
  endMs: number;
  progress: number;
};

type ChannelLike = {
  id: string;
  title: string;
  logoUrl?: string;
};

type PlayerLiveOverlayLayerProps = {
  isVisible: boolean;
  controlsVisible: boolean;
  channel: ChannelLike;
  isPlaying: boolean;
  playerState: string;
  currentProgram: EpgProgram | null;
  nextProgram: EpgProgram | null;
  liveClockLabel?: string;
  liveChannelLabel?: string;
  zappingChannel: ChannelLike | null;
  onPlayPause: () => void;
  onBack: () => void;
  onSettingsClick: () => void;
};

export const PlayerLiveOverlayLayer = ({
  isVisible,
  controlsVisible,
  channel,
  isPlaying,
  playerState,
  currentProgram,
  nextProgram,
  liveClockLabel,
  liveChannelLabel,
  zappingChannel,
  onPlayPause,
  onBack,
  onSettingsClick,
}: PlayerLiveOverlayLayerProps) => {
  if (!isVisible) return null;

  return (
    <LivePlayerOverlay
      isVisible
      controlsVisible={controlsVisible}
      channel={channel}
      isPlaying={isPlaying}
      isBuffering={playerState === "LOADING" || playerState === "BUFFERING"}
      currentProgram={currentProgram}
      nextProgram={nextProgram}
      liveClockLabel={liveClockLabel}
      liveChannelLabel={liveChannelLabel}
      zappingChannel={zappingChannel}
      onPlayPause={onPlayPause}
      onBack={onBack}
      onSettingsClick={onSettingsClick}
    />
  );
};
