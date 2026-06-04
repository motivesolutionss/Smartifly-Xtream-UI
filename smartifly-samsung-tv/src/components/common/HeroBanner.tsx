import React from "react";
import { Play, Info } from "lucide-react";
import { Focusable } from "../tv/Focusable";
import type { AppMovie, AppSeries, AppChannel } from "../../types/appModels";
import { Badge } from "../ui/Badge";
import { DotSeparator } from "../ui/DotSeparator";
import styles from "./HeroBanner.module.css";
import { detectVideoResolution } from "../../utils/resolutionDetector";


export type HeroItem = {
  id: string;
  title: string;
  description: string;
  backdropUrl: string;
  type: "live" | "vod" | "series";
  data: AppChannel | AppMovie | AppSeries;
  rating?: string;
  year?: string;
  duration?: string;
  genre?: string;
};

interface HeroBannerProps {
  items: HeroItem[];
  onPlay: (item: HeroItem) => void;
  onInfo?: (item: HeroItem) => void;
  style?: React.CSSProperties;
  className?: string;
  onFocus?: () => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({ 
  items = [], 
  onPlay, 
  onInfo, 
  style, 
  className = "", 
  onFocus 
}) => {
  const currentIndex = 0;
  const containerRef = React.useRef<HTMLDivElement>(null);

  if (!items || items.length === 0) {
    return <div className={styles.heroPlaceholder} />;
  }

  const activeItem = items[currentIndex % items.length];
  const normalizeMeta = (value?: string) => {
    if (!value) return undefined;
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const lower = trimmed.toLowerCase();
    if (lower === "0" || lower === "0.0" || lower === "null" || lower === "undefined" || lower === "n/a") {
      return undefined;
    }
    return trimmed;
  };

  const titleYear = activeItem.title.match(/\b(19|20)\d{2}\b/)?.[0];
  const yearMeta = normalizeMeta(activeItem.year) || titleYear;
  const ratingMeta = normalizeMeta(activeItem.rating);
  const durationMeta = normalizeMeta(activeItem.duration);
  const genreMeta = normalizeMeta(activeItem.genre);

  const descriptionFallback =
    activeItem.type === "live"
      ? "Watch live TV events and channels now."
      : activeItem.type === "series"
        ? "Continue the story with this trending series."
        : "Now streaming in premium quality.";
  const heroDescription = activeItem.description?.trim() || descriptionFallback;

  const handleFocus = () => {
    onFocus?.();
    containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div ref={containerRef} className={`${styles.container} ${className}`} style={style}>
      <div className={styles.backdropContainer}>
        <img 
          key={activeItem.id}
          src={activeItem.backdropUrl} 
          alt="" 
          loading="eager"
          decoding="async"
          className={styles.backdrop} 
        />
        <div className={styles.backdropTint} />
        <div className={styles.overlayHorizontal} />
        <div className={styles.overlayVertical} />
      </div>

      <div className={styles.content}>
        <div className={styles.brandLogoContainer}>
          <img src="/smartifly_logo.png" alt="Smartifly" className={styles.brandLogo} />
        </div>
        {/* Reference Meta Row */}
        <div className={styles.metaRow}>
          <Badge text="TOP 10" />
          <div className={styles.typeLabel}>
            {activeItem.type === "series" ? "Series" : activeItem.type === "live" ? "Live Event" : "Movie"}
          </div>
        </div>

        <h1 className={styles.title}>{activeItem.title}</h1>

        {/* Reference Info Line */}
        <div className={styles.infoRow}>
          {yearMeta && <span>{yearMeta}</span>}
          {yearMeta && (ratingMeta || durationMeta || genreMeta) && <DotSeparator />}
          {ratingMeta && <span>{ratingMeta}</span>}
          {ratingMeta && (durationMeta || genreMeta) && <DotSeparator />}
          {durationMeta && <span>{durationMeta}</span>}
          {durationMeta && genreMeta && <DotSeparator />}
          {genreMeta && <span>{genreMeta}</span>}
          {(yearMeta || ratingMeta || durationMeta || genreMeta) && <DotSeparator />}
          <Badge text={detectVideoResolution(activeItem.title, activeItem.description)} variant="glass" />
        </div>

        <p className={styles.description}>{heroDescription}</p>

        <div className={styles.actions}>
          <Focusable 
            id={`hero-play`}
            onEnter={() => onPlay(activeItem)} 
            onFocus={handleFocus}
            className={styles.playBtn}
          >
            <Play size={24} fill="currentColor" />
            <span>Watch Now</span>
          </Focusable>
          
          {onInfo && (
            <Focusable 
              id={`hero-info`} 
              onEnter={() => onInfo(activeItem)} 
              onFocus={handleFocus}
              className={styles.infoBtn}
            >
              <Info size={24} />
              <span>More Info</span>
            </Focusable>
          )}
        </div>
      </div>
    </div>
  );
};
