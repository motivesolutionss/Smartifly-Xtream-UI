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
import React, { useMemo, useState } from "react";
import { Focusable } from "../../components/tv/Focusable";
import { useFocus } from "../../providers/useFocus";
import { imageFailureMemory } from "../../utils/imageFailureMemory";
import type { AppChannel } from "../../types/appModels";
import styles from "./LiveTvCard.module.css";

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0;
  }
  return hash;
}

export function cleanChannelTitle(title: string): string {
  if (!title) return "";
  
  // Strip common category prefixes and delimiters like "CRIC || Willow 2 HD" -> "Willow 2 HD"
  const delimiters = ["||", "|", " - ", " : "];
  for (const delimiter of delimiters) {
    if (title.includes(delimiter)) {
      const parts = title.split(delimiter);
      if (parts.length > 1 && parts[1].trim()) {
        return parts[1].trim();
      }
    }
  }

  // Prefix pattern like "UK: Willow" -> "Willow"
  const colonIndex = title.indexOf(":");
  if (colonIndex > 0 && colonIndex < 8) {
    const afterColon = title.substring(colonIndex + 1).trim();
    if (afterColon) return afterColon;
  }
  
  return title;
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
}

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
}) => {
  const focusId = `card-live-${channel.id}`;
  const { focusedId, setFocus } = useFocus();
  const isFocused = focusedId === focusId;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      const isLeftmost = index % columns === 0;
      if (isLeftmost) {
        e.preventDefault();
        if (isSearching) {
          setFocus("tvkb-key-2-9"); // Focus the middle rightmost key on virtual keyboard
        } else if (activeCategoryId) {
          setFocus(`live-cat-${activeCategoryId}`);
        }
      } else if (prevChannelId) {
        e.preventDefault();
        setFocus(`card-live-${prevChannelId}`);
      }
    } else if (e.key === "ArrowRight") {
      const isRightmost = index % columns === columns - 1 || index === totalChannels - 1;
      if (isRightmost) {
        e.preventDefault();
      }
    } else if (e.key === "ArrowDown") {
      if (nextRowChannelId) {
        e.preventDefault();
        setFocus(`card-live-${nextRowChannelId}`);
      } else {
        e.preventDefault();
        const lastRowStartIndex = Math.floor((totalChannels - 1) / columns) * columns;
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
  };

  const [failedUrls, setFailedUrls] = useState<Record<string, true>>({});

  const showLogo = useMemo(() => {
    if (!channel.logoUrl) return false;
    if (imageFailureMemory.hasFailed(channel.logoUrl)) return false;
    return !failedUrls[channel.logoUrl];
  }, [channel.logoUrl, failedUrls]);

  const displayTitle = useMemo(() => cleanChannelTitle(channel.title), [channel.title]);

  const placeholderStyle = useMemo(
    () => ({
      background: `linear-gradient(135deg,
        hsl(${Math.abs(hashString(displayTitle)) % 360}, 40%, 22%),
        hsl(${(Math.abs(hashString(displayTitle)) + 60) % 360}, 30%, 14%))`,
    }),
    [displayTitle]
  );

  const placeholderInitials = useMemo(() => {
    const cleanLetters = displayTitle.replace(/[^a-zA-Z0-9]/g, "").trim();
    return cleanLetters.substring(0, 2).toUpperCase() || "TV";
  }, [displayTitle]);

  return (
    <div className={styles.container}>
      {/* Focusable is an invisible shell — only handles focus registration,
          keyboard events, and scroll-into-view. Zero visual output. */}
      <Focusable
        id={focusId}
        variant="none"
        disableFocusEffects
        disableAutoScroll
        onEnter={() => onClick(channel)}
        onFocus={() => onFocus?.(channel.id)}
        onKeyDown={handleKeyDown}
        className={styles.focusShell}
      >
        {/* Card image box — all visuals owned here */}
        <div className={`${styles.card} ${isFocused ? styles.cardFocused : ""}`}>
          {showLogo ? (
            <img
              src={channel.logoUrl}
              alt={displayTitle}
              loading="lazy"
              decoding="async"
              className={`${styles.logo} ${isFocused ? styles.logoFocused : ""}`}
              onError={() => {
                if (!channel.logoUrl) return;
                imageFailureMemory.markFailed(channel.logoUrl);
                setFailedUrls((prev) => ({ ...prev, [channel.logoUrl!]: true }));
              }}
            />
          ) : (
            <div className={styles.placeholder} style={placeholderStyle}>
              {placeholderInitials}
            </div>
          )}

          <div className={`${styles.badge} ${isFocused ? styles.badgeFocused : ""}`}>
            <span className={styles.liveDot} />
            LIVE
          </div>
        </div>
      </Focusable>

      {/* Title is OUTSIDE Focusable so Focusable's overflow:hidden never clips it */}
      <div className={`${styles.title} ${isFocused ? styles.titleFocused : ""}`}>
        {displayTitle}
      </div>
    </div>
  );
};
