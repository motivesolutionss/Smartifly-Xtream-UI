import React, { useEffect, useMemo, useRef, useState } from "react";
import { Play, Clock } from "lucide-react";
import { Focusable } from "../../components/tv/Focusable";
import { imageFailureMemory } from "../../utils/imageFailureMemory";
import { perfMetrics } from "../../utils/perfMetrics";
import styles from "./LibraryCard.module.css";

/** Simple deterministic hash → unique gradient per channel title for fallback background. */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0;
  }
  return hash;
}

export interface LibraryCardProps {
  id: string;
  title: string;
  imageUrl?: string;
  type: "live" | "vod" | "series";
  progress?: number;
  progressText?: string;
  aspectRatio: "poster" | "landscape";
  variant: "live" | "poster" | "continue";
  gridCell?: boolean;
  onClick?: () => void;
  onFocus?: () => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  disableAutoScroll?: boolean;
}

export const LibraryCard: React.FC<LibraryCardProps> = ({
  id,
  title,
  imageUrl,
  type,
  progress,
  progressText,
  aspectRatio,
  variant,
  gridCell = false,
  onClick,
  onFocus,
  onKeyDown,
  disableAutoScroll = false,
}) => {
  const [hasFailed, setHasFailed] = useState(false);
  const imageLoadStartedAtRef = useRef<number | null>(null);

  const shouldRenderImage = useMemo(() => {
    if (!imageUrl) return false;
    if (imageFailureMemory.hasFailed(imageUrl)) return false;
    return !hasFailed;
  }, [hasFailed, imageUrl]);

  useEffect(() => {
    perfMetrics.increment("library_card_visual_render_count");
  });

  useEffect(() => {
    if (shouldRenderImage && imageUrl) {
      imageLoadStartedAtRef.current = performance.now();
      return;
    }

    imageLoadStartedAtRef.current = null;
  }, [imageUrl, shouldRenderImage]);

  const handleImageError = () => {
    if (!imageUrl) return;
    imageFailureMemory.markFailed(imageUrl);
    perfMetrics.increment("library_card_image_load_error_count");
    if (imageLoadStartedAtRef.current !== null) {
      perfMetrics.recordDuration(
        "library_card_image_error_ms",
        performance.now() - imageLoadStartedAtRef.current,
        {
          slowAboveMs: 300,
          data: { cardId: id, type, variant, aspectRatio },
          logSlowEvent: false,
        }
      );
    }
    imageLoadStartedAtRef.current = null;
    setHasFailed(true);
  };

  // Human-readable content type tag
  const typeTag = useMemo(() => {
    if (type === "live") return "LIVE";
    if (type === "vod") return "MOVIE";
    return "SERIES";
  }, [type]);

  const isLive = type === "live";

  return (
    <div className={`${styles.cardContainer} ${styles[variant]} ${styles[aspectRatio]}${gridCell ? ` ${styles.gridCell}` : ""}`}>
      <Focusable
        id={id}
        onEnter={onClick}
        onFocus={onFocus}
        onKeyDown={onKeyDown}
        disableFocusEffects={true} // We manage our own extremely premium focus effects in LibraryCard.module.css!
        disableAutoScroll={disableAutoScroll}
        className={styles.focusableCard}
      >
        <div className={styles.cardInner}>
          {/* Card Media Section */}
          <div className={styles.mediaContainer}>
            {shouldRenderImage ? (
              <img
                src={imageUrl}
                alt={title}
                className={styles.image}
                onLoad={() => {
                  if (imageUrl) {
                    imageFailureMemory.markLoaded(imageUrl);
                  }
                  perfMetrics.increment("library_card_image_load_success_count");
                  if (imageLoadStartedAtRef.current !== null) {
                    perfMetrics.recordDuration(
                      "library_card_image_load_ms",
                      performance.now() - imageLoadStartedAtRef.current,
                      {
                        slowAboveMs: 300,
                        data: { cardId: id, type, variant, aspectRatio },
                        logSlowEvent: false,
                      }
                    );
                  }
                  imageLoadStartedAtRef.current = null;
                }}
                onError={handleImageError}
                loading="lazy"
              />
            ) : (
              <div
                className={styles.imagePlaceholder}
                style={{
                  background: `linear-gradient(135deg, hsl(${Math.abs(hashString(title)) % 360}, 45%, 20%), hsl(${(Math.abs(hashString(title)) + 60) % 360}, 35%, 12%))`,
                }}
              >
                <span className={styles.placeholderLetters}>
                  {title.substring(0, 2).toUpperCase()}
                </span>
              </div>
            )}

            {/* Premium Badges & Overlays */}
            {isLive ? (
              <div className={styles.liveBadgeContainer}>
                <span className={styles.liveDot} />
                <span className={styles.liveText}>LIVE</span>
              </div>
            ) : (
              <div className={`${styles.typeBadge} ${styles[type]}`}>
                {typeTag}
              </div>
            )}

            {/* Custom Interactive Overlays for Continue Watching & Focus state */}
            {variant === "continue" && (
              <div className={styles.continueOverlay}>
                <div className={styles.playCircle}>
                  <Play fill="currentColor" size={24} className={styles.playIcon} />
                </div>
              </div>
            )}

            {/* General Play Overlay on Hover/Focus */}
            <div className={styles.hoverOverlay}>
              <div className={styles.hoverPlayBtn}>
                <Play fill="currentColor" size={28} />
              </div>
            </div>

            {/* Progress Bars */}
            {progress !== undefined && (
              <div className={styles.progressContainer}>
                <div className={styles.progressBar}>
                  <div
                    className={styles.progressFill}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Glowing Accent Borders (Outline the entire card inner!) */}
          <div className={styles.focusBorder} />
          <div className={styles.glowOverlay} />

          {/* Typography Info Section */}
          <div className={styles.infoSection}>
            <h4 className={styles.titleText}>{title}</h4>
            <div className={styles.metaRow}>
              {progressText ? (
                <span className={styles.progressLabel}>
                  <Clock size={12} className={styles.metaIcon} />
                  {progressText}
                </span>
              ) : (
                <span className={styles.typeLabel}>
                  {isLive ? "TV Channel" : type === "vod" ? "Feature Film" : "Show / Series"}
                </span>
              )}
            </div>
          </div>
        </div>
      </Focusable>
    </div>
  );
};
