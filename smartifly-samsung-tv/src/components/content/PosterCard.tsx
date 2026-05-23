import { useState } from "react";
import { BaseFocusableCard } from "../base/BaseFocusableCard";
import styles from "./PosterCard.module.css";

type PosterCardProps = {
  id: string;
  title: string;
  posterUrl?: string;
  backdropUrl?: string;
  onClick: () => void;
  onFocus?: () => void;
};

export const PosterCard = ({
  id,
  title,
  posterUrl,
  backdropUrl,
  onClick,
  onFocus,
}: PosterCardProps) => {
  const [imageFailed, setImageFailed] = useState(false);
  const imageUrl = posterUrl || backdropUrl;

  return (
    <BaseFocusableCard id={id} className={styles.card} onClick={onClick} onFocus={onFocus}>
      {imageUrl && !imageFailed ? (
        <img
          className={styles.poster}
          src={imageUrl}
          alt={title}
          onError={() => setImageFailed(true)}
        />
      ) : (
        <div className={styles.fallback}>{title}</div>
      )}
    </BaseFocusableCard>
  );
};
