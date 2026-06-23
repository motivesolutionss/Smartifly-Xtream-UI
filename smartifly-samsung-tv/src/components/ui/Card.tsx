import React, { useEffect, useMemo, useRef, useState } from "react";
import { Play } from "lucide-react";
import { Focusable } from "../tv/Focusable";
import { imageFailureMemory } from "../../utils/imageFailureMemory";
import { imageWarmMemory } from "../../utils/imageWarmMemory";
import { resolveImageCandidates } from "../../utils/imagePolicy";
import { perfMetrics } from "../../utils/perfMetrics";
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
  fallbackImageUrl?: string;
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
  containerRef?: React.Ref<HTMLDivElement>;
  shouldLoadImage?: boolean;
  scrollOptions?: ScrollIntoViewOptions;
  disableAutoScroll?: boolean;
}

export const Card: React.FC<CardProps> = ({
  id,
  title,
  subtitle,
  imageUrl,
  fallbackImageUrl,
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
  containerRef,
  shouldLoadImage = true,
  scrollOptions,
  disableAutoScroll,
}) => {
  const [failedPrimaryImage, setFailedPrimaryImage] = useState(false);
  const [failedFallbackImage, setFailedFallbackImage] = useState(false);
  const [hasLoadedImage, setHasLoadedImage] = useState(false);
  const imageLoadStartedAtRef = useRef<number | null>(null);

  useEffect(() => {
    setFailedPrimaryImage(false);
    setFailedFallbackImage(false);
  }, [fallbackImageUrl, imageUrl]);

  useEffect(() => {
    perfMetrics.increment("ui_card_visual_render_count");
  });

  const canUseImageUrl = (url?: string) => {
    if (!url) return false;
    if (!shouldLoadImage && !imageWarmMemory.hasWarm(url)) return false;
    if (imageFailureMemory.hasFailed(url)) return false;
    return true;
  };

  const resolvedImageUrl = useMemo(() => {
    const orderedCandidates = resolveImageCandidates([imageUrl, fallbackImageUrl]);

    for (const candidateUrl of orderedCandidates) {
      if (candidateUrl === imageUrl && failedPrimaryImage) continue;
      if (candidateUrl === fallbackImageUrl && failedFallbackImage) continue;
      if (canUseImageUrl(candidateUrl)) {
        return candidateUrl;
      }
    }

    return undefined;
  }, [
    failedFallbackImage,
    failedPrimaryImage,
    fallbackImageUrl,
    imageUrl,
    shouldLoadImage,
  ]);

  useEffect(() => {
    setHasLoadedImage(false);
  }, [resolvedImageUrl]);

  useEffect(() => {
    if (resolvedImageUrl) {
      imageLoadStartedAtRef.current = performance.now();
      return;
    }

    imageLoadStartedAtRef.current = null;
  }, [resolvedImageUrl]);

  return (
    <div ref={containerRef} className={`${styles.cardContainer} ${styles[variant]} ${className}`}>
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
          {!hasLoadedImage && (
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

          {resolvedImageUrl ? (
            <img
              src={resolvedImageUrl}
              alt={title}
              loading="lazy"
              decoding="async"
              className={`${styles.image} ${
                hasLoadedImage ? styles.imageLoaded : styles.imageLoading
              }`}
              onLoad={() => {
                imageFailureMemory.markLoaded(resolvedImageUrl);
                imageWarmMemory.markWarm(resolvedImageUrl);
                setHasLoadedImage(true);
                perfMetrics.increment("ui_card_image_load_success_count");
                if (imageLoadStartedAtRef.current !== null) {
                  perfMetrics.recordDuration(
                    "ui_card_image_load_ms",
                    performance.now() - imageLoadStartedAtRef.current,
                    {
                      slowAboveMs: 300,
                      data: {
                        cardId: id,
                        variant,
                        aspectRatio,
                        contentType,
                      },
                      logSlowEvent: false,
                    }
                  );
                }
                imageLoadStartedAtRef.current = null;
              }}
              onError={() => {
                imageFailureMemory.markFailed(resolvedImageUrl);
                setHasLoadedImage(false);
                perfMetrics.increment("ui_card_image_load_error_count");
                if (imageLoadStartedAtRef.current !== null) {
                  perfMetrics.recordDuration(
                    "ui_card_image_error_ms",
                    performance.now() - imageLoadStartedAtRef.current,
                    {
                      slowAboveMs: 300,
                      data: {
                        cardId: id,
                        variant,
                        aspectRatio,
                        contentType,
                      },
                      logSlowEvent: false,
                    }
                  );
                }
                imageLoadStartedAtRef.current = null;

                if (resolvedImageUrl === imageUrl) {
                  setFailedPrimaryImage(true);
                  return;
                }

                if (resolvedImageUrl === fallbackImageUrl) {
                  setFailedFallbackImage(true);
                }
              }}
            />
          ) : null}
          
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
