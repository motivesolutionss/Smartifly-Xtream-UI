import React from "react";
import { Play, Info } from "lucide-react";
import { Focusable } from "../tv/Focusable";
import type { AppMovie, AppSeries, AppChannel } from "../../types/appModels";
import { Badge } from "../ui/Badge";
import { DotSeparator } from "../ui/DotSeparator";
import styles from "./HeroBanner.module.css";
import { detectVideoResolution } from "../../utils/resolutionDetector";
import { perfMetrics } from "../../utils/perfMetrics";
import { createPerfTrace } from "../../utils/perfTrace";
import { imageFailureMemory } from "../../utils/imageFailureMemory";
import { resolveImageCandidates } from "../../utils/imagePolicy";

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
  onVisualReady?: (item: HeroItem, status: "loaded" | "error" | "empty") => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = React.memo(function HeroBanner({ 
  items = [], 
  onPlay, 
  onInfo, 
  style, 
  className = "", 
  onFocus,
  onVisualReady,
}) {
  const currentIndex = 0;
  const heroTraceRef = React.useRef<ReturnType<typeof createPerfTrace> | null>(null);
  const imageLoadStartedAtRef = React.useRef<number | null>(null);
  const visualReadyKeyRef = React.useRef<string | null>(null);
  const [failedBackdropUrls, setFailedBackdropUrls] = React.useState<string[]>([]);

  if (!items || items.length === 0) {
    return <div className={styles.heroPlaceholder} />;
  }

  const activeItem = items[currentIndex % items.length];

  const heroImageCandidates = React.useMemo(() => {
    const data = activeItem.data;
    const extraCandidates =
      activeItem.type === "live"
        ? [("logoUrl" in data ? data.logoUrl : undefined)]
        : [
            "backdropUrl" in data ? data.backdropUrl : undefined,
            "posterUrl" in data ? data.posterUrl : undefined,
          ];

    return resolveImageCandidates([activeItem.backdropUrl, ...extraCandidates]).filter(
      (url) =>
        !failedBackdropUrls.includes(url) && !imageFailureMemory.hasFailed(url)
    );
  }, [activeItem.backdropUrl, activeItem.data, activeItem.type, failedBackdropUrls]);

  const resolvedBackdropUrl = heroImageCandidates[0];

  React.useEffect(() => {
    perfMetrics.increment("home_hero_visual_render_count");
  });

  React.useEffect(() => {
    visualReadyKeyRef.current = null;
    setFailedBackdropUrls([]);
    if (heroTraceRef.current && !heroTraceRef.current.isClosed()) {
      heroTraceRef.current.end({
        status: "replaced",
        metricName: "home_hero_banner_total_ms",
        data: { nextHeroId: activeItem.id },
      });
    }

    heroTraceRef.current = createPerfTrace("home_hero_banner", {
      heroId: activeItem.id,
      heroType: activeItem.type,
    });
    imageLoadStartedAtRef.current = resolvedBackdropUrl ? performance.now() : null;

    return () => {
      if (heroTraceRef.current && !heroTraceRef.current.isClosed()) {
        heroTraceRef.current.end({
          status: "cancelled",
          metricName: "home_hero_banner_total_ms",
        });
      }
    };
  }, [activeItem.id, activeItem.type, resolvedBackdropUrl]);

  const markVisualReady = React.useCallback(
    (status: "loaded" | "error" | "empty") => {
      const readinessKey = `${activeItem.id}:${resolvedBackdropUrl ?? "none"}:${status}`;
      if (visualReadyKeyRef.current === readinessKey) {
        return;
      }

      visualReadyKeyRef.current = readinessKey;
      onVisualReady?.(activeItem, status);
    },
    [activeItem, onVisualReady, resolvedBackdropUrl]
  );

  React.useEffect(() => {
    if (!resolvedBackdropUrl) {
      markVisualReady("empty");
    }
  }, [markVisualReady, resolvedBackdropUrl]);

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
  };

  return (
    <div className={`${styles.container} ${className}`} style={style}>
      <div className={styles.backdropContainer}>
        {resolvedBackdropUrl ? (
          <img 
            key={`${activeItem.id}-${resolvedBackdropUrl}`}
            src={resolvedBackdropUrl} 
            alt="" 
            loading="eager"
            decoding="async"
            className={styles.backdrop} 
            onLoad={() => {
              imageFailureMemory.markLoaded(resolvedBackdropUrl);
              markVisualReady("loaded");
              perfMetrics.increment("home_hero_backdrop_load_success_count");
              if (imageLoadStartedAtRef.current !== null) {
                perfMetrics.recordDuration(
                  "home_hero_backdrop_load_ms",
                  performance.now() - imageLoadStartedAtRef.current,
                  {
                    slowAboveMs: 350,
                    data: {
                      heroId: activeItem.id,
                      heroType: activeItem.type,
                    },
                    logSlowEvent: false,
                  }
                );
              }
              imageLoadStartedAtRef.current = null;
              if (heroTraceRef.current && !heroTraceRef.current.isClosed()) {
                heroTraceRef.current.end({
                  status: "image_ready",
                  metricName: "home_hero_banner_total_ms",
                  slowAboveMs: 450,
                });
              }
            }}
            onError={() => {
              imageFailureMemory.markFailed(resolvedBackdropUrl);
              markVisualReady("error");
              setFailedBackdropUrls((currentUrls) =>
                currentUrls.includes(resolvedBackdropUrl)
                  ? currentUrls
                  : [...currentUrls, resolvedBackdropUrl]
              );
              perfMetrics.increment("home_hero_backdrop_load_error_count");
              if (imageLoadStartedAtRef.current !== null) {
                perfMetrics.recordDuration(
                  "home_hero_backdrop_error_ms",
                  performance.now() - imageLoadStartedAtRef.current,
                  {
                    slowAboveMs: 350,
                    data: {
                      heroId: activeItem.id,
                      heroType: activeItem.type,
                    },
                    logSlowEvent: false,
                  }
                );
              }
              imageLoadStartedAtRef.current = null;
              if (heroTraceRef.current && !heroTraceRef.current.isClosed()) {
                heroTraceRef.current.end({
                  status: "image_error",
                  metricName: "home_hero_banner_total_ms",
                  slowAboveMs: 450,
                });
              }
            }}
          />
        ) : null}
        <div className={styles.backdropTint} />
        <div className={styles.overlayHorizontal} />
        <div className={styles.overlayVertical} />
      </div>

      <div className={styles.content}>
        <div className={styles.brandLogoContainer}>
          <img src="/smartifly_icon.webp" alt="Smartifly" className={styles.brandLogo} />
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
            disableAutoScroll
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
              disableAutoScroll
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
});
