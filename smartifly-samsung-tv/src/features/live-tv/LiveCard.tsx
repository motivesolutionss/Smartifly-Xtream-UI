import React from "react";
import { Card } from "../../components/ui/Card";
import type { AppChannel } from "../../types/appModels";

interface LiveCardProps {
  channel: AppChannel;
  onClick: (channel: AppChannel) => void;
  onFocus?: () => void;
}

export const LiveCard: React.FC<LiveCardProps> = ({ channel, onClick, onFocus }) => {
  return (
    <Card
      id={`card-live-${channel.id}`}
      title={channel.title}
      imageUrl={channel.logoUrl}
      variant="live"
      aspectRatio="square"
      onFocus={onFocus}
      onClick={() => onClick(channel)}
      scrollOptions={{ block: "nearest", inline: "nearest" }}
    />
  );
};
