import React, { useMemo, useState } from "react";
import { Play } from "lucide-react";
import { Focusable } from "../tv/Focusable";
import { imageFailureMemory } from "../../utils/imageFailureMemory";
import styles from "./Card.module.css";

/** Simple deterministic hash → unique gradient per channel title. */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0;
  }
  return hash;
}

interface CardProps {
  id: string;
  title: string;
  imageUrl?: string;
  subtitle?: string;
  progress?: number;
  badge?: string;
  aspectRatio?: "poster" | "landscape" | "square";
  variant?: "poster" | "live" | "continue" | "landscape";
  contentType?: string;
  progressText?: string;
  onClick?: () => void;
  onFocus?: () => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  className?: string;
  scrollOptions?: ScrollIntoViewOptions;
  disableAutoScroll?: boolean;
}

export const Card: React.FC<CardProps> = ({
  id,
  title,
  subtitle,
  imageUrl,
  progress,
  badge,
  contentType,
  progressText,
  aspectRatio = "poster",
  variant = "poster",
  onClick,
  onFocus,
  onKeyDown,
  className = "",
  scrollOptions,
  disableAutoScroll,
}) => {
  const [failedImageUrls, setFailedImageUrls] = useState<Record<string, true>>({});
  const shouldRenderImage = useMemo(() => {
    if (!imageUrl) return false;
    if (imageFailureMemory.hasFailed(imageUrl)) return false;
    return !failedImageUrls[imageUrl];
  }, [failedImageUrls, imageUrl]);

  return (
    <div className={`${styles.cardContainer} ${styles[variant]} ${className}`}>
      <Focusable
        id={id}
        onEnter={onClick}
        onFocus={onFocus}
        onKeyDown={onKeyDown}
        disableFocusEffects={variant === "live"}
        scrollOptions={scrollOptions}
        disableAutoScroll={disableAutoScroll}
        className={`${styles.card} ${styles[variant]} ${styles[aspectRatio]}`}
      >
        <div className={styles.imageContainer}>
          {shouldRenderImage ? (
            <img
              src={imageUrl}
              alt={title}
              className={styles.image}
              onError={() => {
                if (!imageUrl) return;
                imageFailureMemory.markFailed(imageUrl);
                setFailedImageUrls((previous) => ({ ...previous, [imageUrl]: true }));
              }}
            />
          ) : (
            <div
              className={styles.imagePlaceholder}
              style={
                variant === "live"
                  ? {
                      background: `linear-gradient(135deg, hsl(${Math.abs(hashString(title)) % 360}, 40%, 22%), hsl(${(Math.abs(hashString(title)) + 60) % 360}, 30%, 14%))`,
                    }
                  : undefined
              }
            >
              {title.substring(0, 2).toUpperCase()}
            </div>
          )}
          
          {(badge || variant === "live") && (
            <div className={`${styles.badge} ${variant === "live" ? styles.liveBadge : ""}`}>
              {variant === "live" && <span className={styles.liveDot} />}
              {badge || "LIVE"}
            </div>
          )}

          {variant === "continue" && (
            <>
              <div className={styles.contentTypeBadge}>{contentType || "MOVIE"}</div>
              <div className={styles.centralPlay}>
                <div className={styles.playCircle}>
                  <Play fill="black" size={24} color="black" />
                </div>
              </div>
              <div className={styles.continueOverlay}>
                <div className={styles.overlayTitle}>{title}</div>
                {progressText && <div className={styles.progressText}>{progressText}</div>}
              </div>
            </>
          )}

          {progress !== undefined && (
            <div className={styles.progressBar}>
              <div 
                className={styles.progressFill} 
                style={{ width: `${progress}%` }} 
              />
            </div>
          )}
        </div>
      </Focusable>
      
      {(variant === "poster" || variant === "live") && (
        <div className={styles.info}>
          <div className={styles.title}>{title}</div>
          {subtitle && <div className={styles.subtitle}>{subtitle}</div>}
        </div>
      )}
    </div>
  );
};
