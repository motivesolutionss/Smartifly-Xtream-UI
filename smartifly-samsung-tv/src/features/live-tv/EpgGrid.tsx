import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
  useSyncExternalStore,
} from "react";
import { Focusable } from "../../components/tv/Focusable";
import { useEpg } from "./hooks/useEpg";
import type { AppChannel } from "../../types/appModels";
import styles from "./EpgGrid.module.css";
import { X } from "lucide-react";
import { useFocus } from "../../providers/useFocus";
import { useTvBack } from "../../hooks/useTvBack";
import { formatEpgTime } from "./epgTime";
import { useQueries } from "@tanstack/react-query";
import {
  getShortEpgQueryOptionsWithOverrides,
  sliceShortEpgToWindow,
  type ParsedShortEpgItem,
} from "./epgQuery";
import {
  buildEpgTimeSlots,
  EPG_SLOT_DURATION_MS,
  getCurrentEpgWindowAnchorMs,
  getMsUntilNextEpgWindow,
} from "./epgWindow";

// ─── Layout constants ────────────────────────────────────────────────────────
/** Must match .channelItem height in CSS */
const CHANNEL_ROW_HEIGHT = 88;
/** Rows rendered outside the visible window */
const SIDEBAR_OVERSCAN = 5;
/** Width of each 30-min time slot column in px */
const TIME_SLOT_WIDTH = 220;
/** Number of 30-min slots shown (6 hours) */
const NUM_SLOTS = 12;
/** Must match .header height in CSS */
const HEADER_HEIGHT = 90;
/** Must match .timeHeader / .channelSidebarSpacer height in CSS */
const TIME_HEADER_HEIGHT = 54;
/** Must match .detailsPanel min-height in CSS */
const DETAILS_PANEL_HEIGHT = 160;
const EPG_SCROLL_DEBOUNCE_MS = 120;
const EPG_FETCH_OVERSCAN = 8;
const EPG_FETCH_EDGE_BUFFER = 3;

// Shared clock source for "now playing" highlighting without calling Date.now()
// during render.
type NowListener = () => void;
const nowListeners = new Set<NowListener>();
let nowMsSnapshot = Date.now();
const NOW_TICKER_KEY = "__smartifly_epg_now_ticker_started__";
const globalScope = globalThis as typeof globalThis & {
  [NOW_TICKER_KEY]?: boolean;
};

if (typeof window !== "undefined" && !globalScope[NOW_TICKER_KEY]) {
  globalScope[NOW_TICKER_KEY] = true;
  window.setInterval(() => {
    nowMsSnapshot = Date.now();
    nowListeners.forEach((listener) => listener());
  }, 30_000);
}

const subscribeNow = (listener: NowListener) => {
  nowListeners.add(listener);
  return () => {
    nowListeners.delete(listener);
  };
};

const getNowSnapshot = () => nowMsSnapshot;

const expandEpgFetchRange = (
  start: number,
  end: number,
  totalCount: number
) => ({
  start: Math.max(0, start - EPG_FETCH_OVERSCAN),
  end: Math.min(totalCount, end + EPG_FETCH_OVERSCAN),
});

interface EpgGridProps {
  channels: AppChannel[];
  onClose: () => void;
  onSelectChannel: (channel: AppChannel) => void;
}

export const EpgGrid: React.FC<EpgGridProps> = ({
  channels,
  onClose,
  onSelectChannel,
}) => {
  const [selectedChannelId, setSelectedChannelId] = useState(
    channels[0]?.id ?? ""
  );
  const { currentProgram, nextPrograms, isLoading: isDetailLoading } =
    useEpg(selectedChannelId);

  const { focusedId, setFocus, setFocusScope } = useFocus();

  // ── Hide the app nav while EPG is open ───────────────────────────────────
  useEffect(() => {
    document.documentElement.classList.add("epg-open");
    return () => document.documentElement.classList.remove("epg-open");
  }, []);

  // ── Capture pre-modal focus exactly once ─────────────────────────────────
  const preMountFocusRef = useRef<string | null>(null);
  const scopeSetRef = useRef(false);

  useEffect(() => {
    if (!scopeSetRef.current) {
      preMountFocusRef.current = focusedId;
      scopeSetRef.current = true;
    }
    setFocusScope(["epg-"], "epg-close");
    setFocus("epg-close");

    return () => {
      setFocusScope(null);
      const restoreId = preMountFocusRef.current;
      if (restoreId) {
        const frameId = window.requestAnimationFrame(() => setFocus(restoreId));
        window.setTimeout(() => window.cancelAnimationFrame(frameId), 500);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

    useTvBack(onClose);

  // ── Synchronized scrolling ────────────────────────────────────────────────
  const sidebarRef = useRef<HTMLDivElement>(null);
  const programsRef = useRef<HTMLDivElement>(null);
  const timeHeaderInnerRef = useRef<HTMLDivElement>(null);
  const isSyncingRef = useRef(false);
  const [sidebarScrollTop, setSidebarScrollTop] = useState(0);

  const handleSidebarScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      if (isSyncingRef.current) return;
      isSyncingRef.current = true;
      const top = e.currentTarget.scrollTop;
      setSidebarScrollTop(top);
      if (programsRef.current) programsRef.current.scrollTop = top;
      isSyncingRef.current = false;
    },
    []
  );

  const handleProgramsScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      if (isSyncingRef.current) return;
      isSyncingRef.current = true;
      const top = e.currentTarget.scrollTop;
      const left = e.currentTarget.scrollLeft;
      setSidebarScrollTop(top);
      if (sidebarRef.current) sidebarRef.current.scrollTop = top;
      // Sync horizontal scroll to time header via transform (no reflow)
      if (timeHeaderInnerRef.current) {
        timeHeaderInnerRef.current.style.transform = `translateX(-${left}px)`;
      }
      isSyncingRef.current = false;
    },
    []
  );

  // ── Scroll sidebar to keep selected channel visible ───────────────────────
  useEffect(() => {
    if (!selectedChannelId || !sidebarRef.current) return;
    const idx = channels.findIndex((ch) => ch.id === selectedChannelId);
    if (idx < 0) return;
    const itemTop = idx * CHANNEL_ROW_HEIGHT;
    const itemBottom = itemTop + CHANNEL_ROW_HEIGHT;
    const viewTop = sidebarRef.current.scrollTop;
    const viewBottom = viewTop + sidebarRef.current.clientHeight;
    if (itemTop < viewTop) {
      sidebarRef.current.scrollTo({ top: Math.max(0, itemTop - 16), behavior: "smooth" });
    } else if (itemBottom > viewBottom) {
      sidebarRef.current.scrollTo({
        top: itemBottom - sidebarRef.current.clientHeight + 16,
        behavior: "smooth",
      });
    }
  }, [channels, selectedChannelId]);

  // ── Virtualization ────────────────────────────────────────────────────────
  const sidebarTotalHeight = channels.length * CHANNEL_ROW_HEIGHT;
  // Available height for the scrollable channel list:
  // full screen − header − time-header row − details panel
  const viewportHeight =
    window.innerHeight - HEADER_HEIGHT - TIME_HEADER_HEIGHT - DETAILS_PANEL_HEIGHT;

  const visibleStart = Math.max(
    0,
    Math.floor(sidebarScrollTop / CHANNEL_ROW_HEIGHT) - SIDEBAR_OVERSCAN
  );
  const visibleEnd = Math.min(
    channels.length,
    Math.ceil((sidebarScrollTop + viewportHeight) / CHANNEL_ROW_HEIGHT) +
      SIDEBAR_OVERSCAN
  );
  const [epgFetchRange, setEpgFetchRange] = useState(() =>
    expandEpgFetchRange(visibleStart, visibleEnd, channels.length)
  );

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      setEpgFetchRange((previous) => {
        const visibleFitsInsidePrevious =
          visibleStart >= previous.start && visibleEnd <= previous.end;
        const isNearLeadingEdge =
          visibleStart <= previous.start + EPG_FETCH_EDGE_BUFFER;
        const isNearTrailingEdge =
          visibleEnd >= previous.end - EPG_FETCH_EDGE_BUFFER;

        if (
          visibleFitsInsidePrevious &&
          !isNearLeadingEdge &&
          !isNearTrailingEdge &&
          previous.end <= channels.length
        ) {
          return previous;
        }

        const next = expandEpgFetchRange(visibleStart, visibleEnd, channels.length);
        if (next.start === previous.start && next.end === previous.end) {
          return previous;
        }

        return next;
      });
    }, EPG_SCROLL_DEBOUNCE_MS);

    return () => window.clearTimeout(timerId);
  }, [channels.length, visibleEnd, visibleStart]);

  const visibleChannels = useMemo(
    () => channels.slice(visibleStart, visibleEnd),
    [channels, visibleEnd, visibleStart]
  );
  const epgVisibleChannels = useMemo(
    () => channels.slice(epgFetchRange.start, epgFetchRange.end),
    [channels, epgFetchRange.end, epgFetchRange.start]
  );

  // ── Time window ───────────────────────────────────────────────────────────
  const [timeWindowAnchorMs, setTimeWindowAnchorMs] = useState(() =>
    getCurrentEpgWindowAnchorMs()
  );

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      setTimeWindowAnchorMs(getCurrentEpgWindowAnchorMs());
    }, getMsUntilNextEpgWindow());

    return () => window.clearTimeout(timerId);
  }, [timeWindowAnchorMs]);

  const timeSlots = useMemo(
    () => buildEpgTimeSlots(timeWindowAnchorMs, NUM_SLOTS),
    [timeWindowAnchorMs]
  );

  const windowStartMs = timeWindowAnchorMs;
  const windowEndMs = timeWindowAnchorMs + NUM_SLOTS * EPG_SLOT_DURATION_MS;
  const totalTimelineWidth = NUM_SLOTS * TIME_SLOT_WIDTH;

  // ── Batch EPG fetch for only the visible channel window ────────────────────
  const epgQueries = useQueries({
    queries: epgVisibleChannels.map((ch) => ({
      ...getShortEpgQueryOptionsWithOverrides(ch.id, {
        refetchInterval: false,
      }),
      select: (items: ParsedShortEpgItem[]) =>
        sliceShortEpgToWindow(items, windowStartMs, windowEndMs),
    })),
  });

  const channelEpgMap = useMemo<Record<string, ParsedShortEpgItem[]>>(() => {
    const map: Record<string, ParsedShortEpgItem[]> = {};
    epgVisibleChannels.forEach((ch, i) => {
      map[ch.id] = (epgQueries[i]?.data as ParsedShortEpgItem[] | undefined) ?? [];
    });
    return map;
  }, [epgQueries, epgVisibleChannels]);

  const nowMs = useSyncExternalStore(subscribeNow, getNowSnapshot, getNowSnapshot);

  return (
    <div className={styles.overlay}>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className={styles.header}>
        <h2 className={styles.headerTitle}>TV Guide</h2>
        <Focusable
          id="epg-close"
          variant="pill"
          disableFocusEffects={true}
          onEnter={onClose}
          className={styles.closeBtn}
        >
          <X size={20} />
        </Focusable>
      </div>

      {/* ── Grid ────────────────────────────────────────────────────────── */}
      <div className={styles.gridContainer}>

        {/* ── Channel sidebar ─────────────────────────────────────────── */}
        <div className={styles.channelSidebar}>
          <div className={styles.channelSidebarSpacer}>Channels</div>

          <div
            ref={sidebarRef}
            className={styles.channelSidebarScroll}
            onScroll={handleSidebarScroll}
          >
            <div
              className={styles.channelVirtualCanvas}
              style={{ height: sidebarTotalHeight }}
            >
              {visibleChannels.map((channel, i) => {
              const absIdx = visibleStart + i;
              return (
                <div
                  key={channel.id}
                  className={styles.channelVirtualItem}
                  style={{
                    top: absIdx * CHANNEL_ROW_HEIGHT,
                    height: CHANNEL_ROW_HEIGHT,
                  }}
                >
                  <Focusable
                    id={`epg-channel-${channel.id}`}
                    onFocus={() => setSelectedChannelId(channel.id)}
                    onEnter={() => onSelectChannel(channel)}
                    className={`${styles.channelItem} ${
                      selectedChannelId === channel.id ? styles.activeChannel : ""
                    }`}
                  >
                    {channel.logoUrl ? (
                      <div className={styles.logoWrap}>
                        <img
                          src={channel.logoUrl}
                          alt=""
                          className={styles.logo}
                          onError={(e) => {
                            const img = e.currentTarget as HTMLImageElement;
                            img.style.display = "none";
                            const wrap = img.parentElement;
                            if (wrap) {
                              wrap.style.background = "rgba(255,255,255,0.08)";
                              wrap.style.color = "rgba(255,255,255,0.6)";
                              wrap.style.fontSize = "0.95rem";
                              wrap.style.fontWeight = "900";
                              wrap.textContent = channel.title.slice(0, 2).toUpperCase();
                            }
                          }}
                        />
                      </div>
                    ) : (
                      <div className={styles.logoFallback}>
                        {channel.title.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <span className={styles.channelName}>{channel.title}</span>
                  </Focusable>
                </div>
              );
            })}
            </div>
          </div>
        </div>

        {/* ── Timeline ────────────────────────────────────────────────── */}
        <div className={styles.timelineWrap}>
          {/* Sticky time header — translates horizontally with program scroll */}
          <div className={styles.timeHeader}>
            <div
              ref={timeHeaderInnerRef}
              className={styles.timeHeaderInner}
              style={{ width: totalTimelineWidth }}
            >
              {timeSlots.map((slot) => (
                <div key={slot.getTime()} className={styles.timeSlot}>
                  {slot.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Scrollable program area */}
          <div
            ref={programsRef}
            className={styles.programsScrollArea}
            onScroll={handleProgramsScroll}
          >
            <div
              className={styles.programsCanvas}
              style={{
                height: sidebarTotalHeight,
                width: totalTimelineWidth,
              }}
            >
              {visibleChannels.map((channel, i) => {
                const absIdx = visibleStart + i;
                const epgItems = channelEpgMap[channel.id] ?? [];
                const isSelected = channel.id === selectedChannelId;

                return (
                  <div
                    key={channel.id}
                    className={`${styles.programRow} ${isSelected ? styles.activeRow : ""}`}
                    style={{
                      position: "absolute",
                      top: absIdx * CHANNEL_ROW_HEIGHT,
                      left: 0,
                      width: totalTimelineWidth,
                      height: CHANNEL_ROW_HEIGHT,
                    }}
                  >
                    {epgItems.length === 0 ? (
                      <div
                        className={styles.programItem}
                        style={{ width: "100%", position: "absolute", inset: 0 }}
                      >
                        <span
                          className={styles.progTitle}
                          style={{ color: "rgba(255,255,255,0.18)" }}
                        >
                          No program data
                        </span>
                      </div>
                    ) : (
                      epgItems.map((item, idx) => {
                        const startMs = item.startMs;
                        const endMs = item.endMs;

                        // Clip to visible window
                        const clampedStart = Math.max(startMs, windowStartMs);
                        const clampedEnd = Math.min(endMs, windowEndMs);
                        if (clampedEnd <= clampedStart) return null;

                        const leftPx =
                          ((clampedStart - windowStartMs) / EPG_SLOT_DURATION_MS) *
                          TIME_SLOT_WIDTH;
                        const widthPx = Math.max(
                          80,
                          ((clampedEnd - clampedStart) / EPG_SLOT_DURATION_MS) *
                            TIME_SLOT_WIDTH
                        );
                        const isNow = nowMs >= startMs && nowMs < endMs;

                        return (
                          <div
                            key={idx}
                            className={`${styles.programItem} ${
                              isNow ? styles.nowPlaying : ""
                            }`}
                            style={{
                              position: "absolute",
                              left: leftPx,
                              width: widthPx,
                              top: 0,
                              bottom: 0,
                            }}
                          >
                            <span className={styles.progTitle}>{item.title}</span>
                            <span className={styles.progTime}>
                              {formatEpgTime(item.start)} – {formatEpgTime(item.end)}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Details panel ────────────────────────────────────────────────── */}
      <div className={styles.detailsPanel}>
        {isDetailLoading ? (
          <p className={styles.detailsEmpty}>Loading program info…</p>
        ) : currentProgram ? (
          <>
            <h3 className={styles.detailsTitle}>{currentProgram.title}</h3>
            {currentProgram.description && (
              <p className={styles.detailsDesc}>{currentProgram.description}</p>
            )}
            {nextPrograms.length > 0 && (
              <p className={styles.detailsNext}>
                Next: {nextPrograms[0].title}
              </p>
            )}
          </>
        ) : (
          <p className={styles.detailsEmpty}>
            No program info available for this channel.
          </p>
        )}
      </div>
    </div>
  );
};
