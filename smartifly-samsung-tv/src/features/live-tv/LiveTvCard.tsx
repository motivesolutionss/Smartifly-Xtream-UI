/**
 * LiveTvCard — card used exclusively on the Live TV channel grid page.
 *
 * Structure:
 *   <div container>          ← plain div, fills the VirtualGrid cell
 *     <Focusable shell>      ← invisible focus shell (no visuals)
 *       <div card>           ← white box with logo + LIVE badge
 *     </Focusable>
 *     <div title>            ← OUTSIDE Focusable so it's never clipped
 *   </div>
 */
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Focusable } from "../../components/tv/Focusable";
import { useFocus } from "../../providers/useFocus";
import { imageFailureMemory } from "../../utils/imageFailureMemory";
import { perfMetrics } from "../../utils/perfMetrics";
import type { AppChannel } from "../../types/appModels";
import { cleanChannelTitle } from "./channelTitle";
import styles from "./LiveTvCard.module.css";

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0;
  }
  return hash;
}

interface LiveTvCardProps {
  channel: AppChannel;
  index: number;
  activeCategoryId: string | null;
  onClick: (channel: AppChannel) => void;
  onFocus?: (channelId: string) => void;
  columns: number;
  isSearching: boolean;
  prevChannelId?: string;
  nextRowChannelId?: string;
  prevRowChannelId?: string;
  totalChannels: number;
  lastChannelId?: string;
  shouldLoadLogo: boolean;
}

type LiveTvCardVisualProps = {
  isFocused: boolean;
  logoUrl?: string;
  placeholderBackground: string;
  placeholderInitials: string;
  showLogo: boolean;
  onLogoError: () => void;
  onLogoLoad: () => void;
};

const LiveTvCardVisual = memo(
  function LiveTvCardVisual({
    isFocused,
    logoUrl,
    placeholderBackground,
    placeholderInitials,
    showLogo,
    onLogoError,
    onLogoLoad,
  }: LiveTvCardVisualProps) {
    useEffect(() => {
      perfMetrics.increment("live_card_visual_render_count");
    });

    return (
      <div className={`${styles.card} ${isFocused ? styles.cardFocused : ""}`}>
        {showLogo ? (
          <img
            src={logoUrl}
            alt=""
            loading="lazy"
            decoding="async"
            className={`${styles.logo} ${isFocused ? styles.logoFocused : ""}`}
            onLoad={onLogoLoad}
            onError={onLogoError}
          />
        ) : (
          <div
            className={styles.placeholder}
            style={{ background: placeholderBackground }}
          >
            {placeholderInitials}
          </div>
        )}

        <div className={`${styles.badge} ${isFocused ? styles.badgeFocused : ""}`}>
          <span className={styles.liveDot} />
          LIVE
        </div>
      </div>
    );
  },
  (previousProps, nextProps) =>
    previousProps.isFocused === nextProps.isFocused &&
    previousProps.logoUrl === nextProps.logoUrl &&
    previousProps.placeholderBackground === nextProps.placeholderBackground &&
    previousProps.placeholderInitials === nextProps.placeholderInitials &&
    previousProps.showLogo === nextProps.showLogo
);

LiveTvCardVisual.displayName = "LiveTvCardVisual";

export const LiveTvCard: React.FC<LiveTvCardProps> = ({
  channel,
  index,
  activeCategoryId,
  onClick,
  onFocus,
  columns,
  isSearching,
  prevChannelId,
  nextRowChannelId,
  prevRowChannelId,
  totalChannels,
  lastChannelId,
  shouldLoadLogo,
}) => {
  const focusId = `card-live-${channel.id}`;
  const { focusedId, setFocus } = useFocus();
  const isFocused = focusedId === focusId;

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        const isLeftmost = index % columns === 0;
        if (isLeftmost) {
          e.preventDefault();
          if (isSearching) {
            setFocus("tvkb-key-2-9");
          } else if (activeCategoryId) {
            setFocus(`live-cat-${activeCategoryId}`);
          }
        } else if (prevChannelId) {
          e.preventDefault();
          setFocus(`card-live-${prevChannelId}`);
        }
      } else if (e.key === "ArrowRight") {
        const isRightmost =
          index % columns === columns - 1 || index === totalChannels - 1;
        if (isRightmost) {
          e.preventDefault();
        }
      } else if (e.key === "ArrowDown") {
        if (nextRowChannelId) {
          e.preventDefault();
          setFocus(`card-live-${nextRowChannelId}`);
        } else {
          e.preventDefault();
          const lastRowStartIndex =
            Math.floor((totalChannels - 1) / columns) * columns;
          if (index < lastRowStartIndex && lastChannelId) {
            setFocus(`card-live-${lastChannelId}`);
          }
        }
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (prevRowChannelId) {
          setFocus(`card-live-${prevRowChannelId}`);
        } else {
          setFocus("live-search-input-wrapper");
        }
      }
    },
    [
      activeCategoryId,
      columns,
      index,
      isSearching,
      lastChannelId,
      nextRowChannelId,
      prevChannelId,
      prevRowChannelId,
      setFocus,
      totalChannels,
    ]
  );

  const [failedLogoUrl, setFailedLogoUrl] = useState<string | null>(null);
  const imageLoadStartedAtRef = useRef<number | null>(null);

  const showLogo = useMemo(() => {
    if (!channel.logoUrl) return false;
    if (!shouldLoadLogo) return false;
    if (imageFailureMemory.hasFailed(channel.logoUrl)) return false;
    return failedLogoUrl !== channel.logoUrl;
  }, [channel.logoUrl, failedLogoUrl, shouldLoadLogo]);

  const displayTitle = useMemo(() => cleanChannelTitle(channel.title), [channel.title]);

  const placeholderBackground = useMemo(
    () =>
      `linear-gradient(135deg,
        hsl(${Math.abs(hashString(displayTitle)) % 360}, 40%, 22%),
        hsl(${(Math.abs(hashString(displayTitle)) + 60) % 360}, 30%, 14%))`,
    [displayTitle]
  );

  const placeholderInitials = useMemo(() => {
    const cleanLetters = displayTitle.replace(/[^a-zA-Z0-9]/g, "").trim();
    return cleanLetters.substring(0, 2).toUpperCase() || "TV";
  }, [displayTitle]);

  const handleEnter = useCallback(() => onClick(channel), [channel, onClick]);
  const handleFocus = useCallback(() => onFocus?.(channel.id), [channel.id, onFocus]);
  useEffect(() => {
    if (showLogo && channel.logoUrl) {
      imageLoadStartedAtRef.current = performance.now();
      return;
    }

    imageLoadStartedAtRef.current = null;
  }, [channel.logoUrl, showLogo]);

  const handleLogoLoad = useCallback(() => {
    if (channel.logoUrl) {
      imageFailureMemory.markLoaded(channel.logoUrl);
    }
    perfMetrics.increment("live_card_logo_load_success_count");
    if (imageLoadStartedAtRef.current !== null) {
      perfMetrics.recordDuration(
        "live_card_logo_load_ms",
        performance.now() - imageLoadStartedAtRef.current,
        { slowAboveMs: 300, data: { channelId: channel.id }, logSlowEvent: false }
      );
    }
    imageLoadStartedAtRef.current = null;
  }, [channel.id, channel.logoUrl]);
  const handleLogoError = useCallback(() => {
    if (!channel.logoUrl) return;
    perfMetrics.increment("live_card_logo_load_error_count");
    if (imageLoadStartedAtRef.current !== null) {
      perfMetrics.recordDuration(
        "live_card_logo_error_ms",
        performance.now() - imageLoadStartedAtRef.current,
        { slowAboveMs: 300, data: { channelId: channel.id }, logSlowEvent: false }
      );
    }
    imageLoadStartedAtRef.current = null;
    imageFailureMemory.markFailed(channel.logoUrl);
    setFailedLogoUrl(channel.logoUrl);
  }, [channel.id, channel.logoUrl]);

  return (
    <div className={styles.container}>
      {/* Focusable is an invisible shell — only handles focus registration,
          keyboard events, and scroll-into-view. Zero visual output. */}
      <Focusable
        id={focusId}
        variant="none"
        disableFocusEffects
        disableAutoScroll
        onEnter={handleEnter}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        className={styles.focusShell}
      >
        <LiveTvCardVisual
          isFocused={isFocused}
          logoUrl={channel.logoUrl}
          placeholderBackground={placeholderBackground}
          placeholderInitials={placeholderInitials}
          showLogo={showLogo}
          onLogoLoad={handleLogoLoad}
          onLogoError={handleLogoError}
        />
      </Focusable>

      <div className={`${styles.title} ${isFocused ? styles.titleFocused : ""}`}>
        {displayTitle}
      </div>
    </div>
  );
};
