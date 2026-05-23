import { Badge, DotSeparator } from "../base/SharedUiComponents";
import styles from "./HeroBanner.module.css";

type HeroBannerProps = {
  title: string;
  description?: string;
  backdropUrl?: string;
  posterUrl?: string;
  year?: string;
  rating?: string;
  duration?: string;
  onPlayClick: () => void;
  onInfoClick?: () => void;
};

export const HeroBanner = ({
  title,
  description,
  backdropUrl,
  posterUrl,
  year,
  rating,
  duration,
  onPlayClick,
  onInfoClick,
}: HeroBannerProps) => {
  const imageUrl = backdropUrl || posterUrl;

  return (
    <section className={styles.hero}>
      {imageUrl && <img className={styles.image} src={imageUrl} alt="" />}
      <div className={styles.verticalGradient} />
      <div className={styles.horizontalGradient} />
      <div className={styles.content}>
        <div className={styles.meta}>
          <Badge text="TOP 10" />
          <DotSeparator />
          <span>{year || "Series"}</span>
          <DotSeparator />
          <span>{rating || "4K Ultra HD"}</span>
          {duration && (
            <>
              <DotSeparator />
              <span>{duration}</span>
            </>
          )}
        </div>
        <h2 className={styles.title}>{title}</h2>
        {description && <p className={styles.description}>{description}</p>}
        <div className={styles.actions}>
          <button className={styles.playButton} type="button" onClick={onPlayClick}>
            Play
          </button>
          <button className={styles.infoButton} type="button" onClick={onInfoClick}>
            More Info
          </button>
        </div>
      </div>
    </section>
  );
};
