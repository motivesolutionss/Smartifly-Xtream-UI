import { useState } from "react";
import { BaseFocusableCard } from "../base/BaseFocusableCard";
import styles from "./LiveChannelCard.module.css";

type LiveChannelCardProps = {
  id: string;
  channelName: string;
  logoUrl?: string;
  onClick: () => void;
  onFocus?: () => void;
};

export const LiveChannelCard = ({
  id,
  channelName,
  logoUrl,
  onClick,
  onFocus,
}: LiveChannelCardProps) => {
  const [imageFailed, setImageFailed] = useState(false);
  const shouldShowLogo = Boolean(logoUrl && !imageFailed);

  return (
    <BaseFocusableCard id={id} className={styles.card} onClick={onClick} onFocus={onFocus}>
      <div className={styles.inner}>
        {shouldShowLogo ? (
          <img
            className={styles.logo}
            src={logoUrl}
            alt=""
            onError={() => setImageFailed(true)}
          />
        ) : (
          <span className={styles.fallback}>{channelName}</span>
        )}
        <span className={styles.liveBadge}>LIVE</span>
      </div>
    </BaseFocusableCard>
  );
};
