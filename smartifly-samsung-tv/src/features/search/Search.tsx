import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Flame,
  Globe,
  Laugh,
  Mic,
  Search as SearchIcon,
  Sparkles,
  Trophy,
} from "lucide-react";
import { useSearch } from "./hooks/useSearch";
import { usePlayerStore } from "../../store/playerStore";
import { ErrorView } from "../../components/common/ErrorView";
import { EmptyState } from "../../components/common/EmptyState";
import { LibraryCard } from "../library/LibraryCard";
import { getUserFriendlyErrorMessage } from "../../utils/errorMapper";
import { Focusable } from "../../components/tv/Focusable";
import { useFocus } from "../../providers/useFocus";
import { useTvBack } from "../../hooks/useTvBack";
import styles from "./Search.module.css";
import VodDetails from "../vod/VodDetails";
import { SeriesDetails } from "../series/SeriesDetails";

type RowType = "live" | "movies" | "series";

type SuggestionConfig = {
  text: string;
  icon: React.ComponentType<{ className?: string }>;
};

const SUGGESTION_ITEMS: SuggestionConfig[] = [
  { text: "Action Movies", icon: Flame },
  { text: "Live Sports", icon: Trophy },
  { text: "News Channels", icon: Globe },
  { text: "Kids Shows", icon: Sparkles },
  { text: "Comedy", icon: Laugh },
];

const KEYBOARD_ROWS: string[][] = [
  ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["Z", "X", "C", "V", "B", "N", "M"],
];

const ACTION_KEYS = ["DELETE", "SPACE", "CLEAR"] as const;

const getActionFocusId = (index: number) => `search-key-action-${index}`;
const getLetterFocusId = (row: number, col: number) => `search-key-${row}-${col}`;

export const Search: React.FC = () => {
  const pageRef = useRef<HTMLDivElement | null>(null);
  const resultsSectionRef = useRef<HTMLElement | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedMovieId, setSelectedMovieId] = useState<string | null>(null);
  const [selectedSeriesId, setSelectedSeriesId] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [voiceTelemetry, setVoiceTelemetry] = useState("");
  const listeningTimeoutRef = useRef<number | null>(null);
  const telemetryIntervalRef = useRef<number | null>(null);
  const lastFocusedIdRef = useRef<string>("search-input");
  const wasInDetailsRef = useRef(false);

  const { data: results, isLoading, isError, error, refetch } = useSearch(debouncedQuery);
  const { setActivePlaybackItem } = usePlayerStore();
  const { setFocus, focusedId } = useFocus();

  useTvBack(
    () => {
      setFocus("nav-SEARCH");
    },
    !selectedMovieId && !selectedSeriesId && !isListening
  );

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(searchTerm.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    if (!pageRef.current) return;
    if (!debouncedQuery) {
      pageRef.current.scrollTo({ top: 0, behavior: "auto" });
    }
  }, [debouncedQuery]);

  useEffect(() => {
    if (!focusedId) return;
    const focusedEl = document.getElementById(focusedId);
    if (!focusedEl) return;

    if (focusedId.startsWith("search-result-")) {
      // 1. Decoupled Horizontal Scroll: Align card exactly 64px from the left edge of the rail
      const cardContainer = focusedEl.parentElement;
      const railEl = focusedEl.closest(`.${styles.resultRail}`) as HTMLDivElement;
      if (cardContainer && railEl) {
        const cardLeft = cardContainer.offsetLeft;
        const leftOffset = 64; // Perfectly aligns with the margin of headers
        const scrollTarget = Math.max(0, cardLeft - leftOffset);
        railEl.scrollTo({
          left: scrollTarget,
          behavior: "auto",
        });
      }

      // 2. Decoupled Vertical Scroll: Instantly center the active row vertically in the TV viewport
      const rowEl = focusedEl.closest(`.${styles.resultRow}`) as HTMLDivElement;
      if (rowEl && pageRef.current) {
        const rowRect = rowEl.getBoundingClientRect();
        const containerRect = pageRef.current.getBoundingClientRect();
        const absoluteRowTop = rowRect.top - containerRect.top + pageRef.current.scrollTop;
        const rowHeight = rowRect.height;
        const containerHeight = pageRef.current.clientHeight;
        const verticalTarget = Math.max(0, absoluteRowTop - (containerHeight / 2) + (rowHeight / 2));
        pageRef.current.scrollTo({
          top: verticalTarget,
          behavior: "auto",
        });
      }
    } else if (
      focusedId === "search-input" ||
      focusedId === "search-mic" ||
      focusedId.startsWith("search-suggest-") ||
      focusedId.startsWith("search-key-")
    ) {
      pageRef.current?.scrollTo({ top: 0, behavior: "auto" });
    }
  }, [focusedId]);

  useEffect(() => {
    return () => {
      if (listeningTimeoutRef.current) window.clearTimeout(listeningTimeoutRef.current);
      if (telemetryIntervalRef.current) window.clearInterval(telemetryIntervalRef.current);
    };
  }, []);

  useEffect(() => {
    const inDetails = Boolean(selectedMovieId || selectedSeriesId);
    if (inDetails) {
      wasInDetailsRef.current = true;
      return;
    }

    if (wasInDetailsRef.current) {
      wasInDetailsRef.current = false;
      const target = lastFocusedIdRef.current || "search-input";
      let raf2 = 0;
      const raf1 = window.requestAnimationFrame(() => {
        raf2 = window.requestAnimationFrame(() => setFocus(target));
      });
      return () => {
        window.cancelAnimationFrame(raf1);
        if (raf2) window.cancelAnimationFrame(raf2);
      };
    }
  }, [selectedMovieId, selectedSeriesId, setFocus]);

  const hasResults = Boolean(
    results && (results.live.length > 0 || results.vod.length > 0 || results.series.length > 0)
  );

  const totalResults = useMemo(() => {
    if (!results) return 0;
    return results.live.length + results.vod.length + results.series.length;
  }, [results]);

  const firstResultId = useMemo(() => {
    if (!results) return null;
    if (results.live.length > 0) return "search-result-live-0";
    if (results.vod.length > 0) return "search-result-movies-0";
    if (results.series.length > 0) return "search-result-series-0";
    return null;
  }, [results]);


  const rememberFocus = (id: string) => {
    lastFocusedIdRef.current = id;
  };

  const triggerVoiceSearch = () => {
    setIsListening(true);
    setVoiceTelemetry("INITIALIZING MICROPHONE...");

    if (listeningTimeoutRef.current) window.clearTimeout(listeningTimeoutRef.current);
    if (telemetryIntervalRef.current) window.clearInterval(telemetryIntervalRef.current);

    const start = Date.now();
    const randomQuery = SUGGESTION_ITEMS[Math.floor(Math.random() * SUGGESTION_ITEMS.length)].text;

    telemetryIntervalRef.current = window.setInterval(() => {
      const elapsed = Date.now() - start;
      if (elapsed < 700) setVoiceTelemetry("INITIALIZING MICROPHONE...");
      else if (elapsed < 1400) setVoiceTelemetry("ANALYZING AUDIO...");
      else if (elapsed < 2100) setVoiceTelemetry("RECOGNIZING COMMAND...");
      else setVoiceTelemetry(`SEARCHING: "${randomQuery.toUpperCase()}"`);
    }, 320);

    listeningTimeoutRef.current = window.setTimeout(() => {
      setIsListening(false);
      if (telemetryIntervalRef.current) window.clearInterval(telemetryIntervalRef.current);
      setSearchTerm(randomQuery);
      setFocus("search-input");
    }, 2600);
  };

  const handleKeyClick = (value: string) => {
    if (value === "SPACE") {
      setSearchTerm((prev) => `${prev} `);
      return;
    }
    if (value === "DELETE") {
      setSearchTerm((prev) => prev.slice(0, -1));
      return;
    }
    if (value === "CLEAR") {
      setSearchTerm("");
      return;
    }
    setSearchTerm((prev) => prev + value);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      setFocus("search-mic");
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocus("search-suggest-0");
    }
  };

  const handleMicKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      setFocus("search-input");
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocus(getLetterFocusId(0, KEYBOARD_ROWS[0].length - 1));
    }
  };

  const handleSuggestionKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === "ArrowUp") {
      if (index === 0) {
        e.preventDefault();
        setFocus("search-input");
      } else {
        e.preventDefault();
        setFocus(`search-suggest-${index - 1}`);
      }
    } else if (e.key === "ArrowDown") {
      if (index < SUGGESTION_ITEMS.length - 1) {
        e.preventDefault();
        setFocus(`search-suggest-${index + 1}`);
      } else if (firstResultId) {
        e.preventDefault();
        setFocus(firstResultId);
      }
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      const mappedRow = Math.min(index, KEYBOARD_ROWS.length - 1);
      setFocus(getLetterFocusId(mappedRow, 0));
    }
  };

  const handleKeyboardKeyDown = (e: React.KeyboardEvent, row: number, col: number) => {
    const rowValues = KEYBOARD_ROWS[row] ?? [];
    const lastCol = Math.max(0, rowValues.length - 1);

    if (e.key === "ArrowLeft" && col === 0) {
      e.preventDefault();
      const suggestionIndex = Math.min(row, SUGGESTION_ITEMS.length - 1);
      setFocus(`search-suggest-${suggestionIndex}`);
      return;
    }

    if (e.key === "ArrowRight" && col === lastCol && firstResultId) {
      e.preventDefault();
      setFocus(firstResultId);
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (row === 0) {
        setFocus("search-input");
        return;
      }
      const prevRowLength = KEYBOARD_ROWS[row - 1]?.length ?? 0;
      const targetCol = Math.min(col, Math.max(0, prevRowLength - 1));
      setFocus(getLetterFocusId(row - 1, targetCol));
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (row < KEYBOARD_ROWS.length - 1) {
        const nextRowLength = KEYBOARD_ROWS[row + 1]?.length ?? 0;
        const targetCol = Math.min(col, Math.max(0, nextRowLength - 1));
        setFocus(getLetterFocusId(row + 1, targetCol));
      } else {
        const actionIndex = col < 2 ? 0 : col < 5 ? 1 : 2;
        setFocus(getActionFocusId(actionIndex));
      }
    }
  };

  const handleActionKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      const lastRow = KEYBOARD_ROWS.length - 1;
      const lastRowLength = KEYBOARD_ROWS[lastRow].length;
      const anchor = index === 0 ? 0 : index === 1 ? 3 : 6;
      setFocus(getLetterFocusId(lastRow, Math.min(anchor, lastRowLength - 1)));
      return;
    }

    if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      setFocus(getActionFocusId(index - 1));
      return;
    }

    if (e.key === "ArrowRight" && index < ACTION_KEYS.length - 1) {
      e.preventDefault();
      setFocus(getActionFocusId(index + 1));
      return;
    }

    if (e.key === "ArrowRight" && index === ACTION_KEYS.length - 1 && firstResultId) {
      e.preventDefault();
      setFocus(firstResultId);
      return;
    }

    if (e.key === "ArrowDown" && firstResultId) {
      e.preventDefault();
      setFocus(firstResultId);
    }
  };

  const moveVerticalResultFocus = (
    rowType: RowType,
    _index: number,
    direction: "up" | "down"
  ) => {
    if (!results) return;

    const liveCount = results.live.length;
    const movieCount = results.vod.length;
    const seriesCount = results.series.length;

    const jumpTo = (targetRow: RowType, targetIndex: number) => {
      if (targetRow === "live") setFocus(`search-result-live-${targetIndex}`);
      if (targetRow === "movies") setFocus(`search-result-movies-${targetIndex}`);
      if (targetRow === "series") setFocus(`search-result-series-${targetIndex}`);
    };

    if (direction === "up") {
      if (rowType === "live") {
        setFocus(getActionFocusId(2));
        return;
      }
      if (rowType === "movies") {
        if (liveCount > 0) jumpTo("live", 0);
        else setFocus(getActionFocusId(2));
        return;
      }
      if (rowType === "series") {
        if (movieCount > 0) jumpTo("movies", 0);
        else if (liveCount > 0) jumpTo("live", 0);
        else setFocus(getActionFocusId(2));
        return;
      }
    }

    if (direction === "down") {
      if (rowType === "live") {
        if (movieCount > 0) jumpTo("movies", 0);
        else if (seriesCount > 0) jumpTo("series", 0);
        return;
      }
      if (rowType === "movies") {
        if (seriesCount > 0) jumpTo("series", 0);
        return;
      }
    }
  };

  const handleCardKeyDown = (e: React.KeyboardEvent, rowType: RowType, index: number, rowLength: number) => {
    if (e.key === "ArrowLeft") {
      if (index === 0) {
        e.preventDefault(); // Stop at the first card of the rail
      } else {
        e.preventDefault();
        setFocus(`search-result-${rowType}-${index - 1}`);
      }
      return;
    }

    if (e.key === "ArrowRight") {
      if (index === rowLength - 1) {
        e.preventDefault(); // Stop at the end of the rail
      } else {
        e.preventDefault();
        setFocus(`search-result-${rowType}-${index + 1}`);
      }
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      moveVerticalResultFocus(rowType, index, "up");
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      moveVerticalResultFocus(rowType, index, "down");
    }
  };

  if (selectedMovieId) {
    return <VodDetails movieId={selectedMovieId} categoryName="Search" onBack={() => setSelectedMovieId(null)} />;
  }

  if (selectedSeriesId) {
    return <SeriesDetails seriesId={selectedSeriesId} categoryName="Search" onBack={() => setSelectedSeriesId(null)} />;
  }

  return (
    <div ref={pageRef} className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <div>
            <span className={styles.pageEyebrow}>Smart search</span>
            <h1 className={styles.pageTitle}>Search</h1>
          </div>
          <div className={styles.scopeChips}>
            <span>Live TV</span>
            <span>Movies</span>
            <span>Series</span>
          </div>
        </div>
        <div className={styles.searchRow}>
          <Focusable
            id="search-input"
            autoFocus
            disableFocusEffects
            className={styles.searchField}
            onFocus={() => rememberFocus("search-input")}
            onKeyDown={handleInputKeyDown}
          >
            <SearchIcon className={styles.searchIcon} />
            <input
              type="text"
              value={searchTerm}
              placeholder="Search movies, series, or channels..."
              className={styles.searchInput}
              readOnly
            />
          </Focusable>

          <Focusable
            id="search-mic"
            disableFocusEffects
            className={styles.micButton}
            onFocus={() => rememberFocus("search-mic")}
            onEnter={triggerVoiceSearch}
            onKeyDown={handleMicKeyDown}
          >
            <Mic size={22} />
          </Focusable>
        </div>
      </header>

      <section className={styles.controlsGrid}>
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2 className={styles.panelTitle}>Quick Picks</h2>
            <span className={styles.panelMeta}>{SUGGESTION_ITEMS.length} items</span>
          </div>
          <div className={styles.suggestionList}>
            {SUGGESTION_ITEMS.map((item, index) => {
              const Icon = item.icon;
              const id = `search-suggest-${index}`;
              return (
                <Focusable
                  key={id}
                  id={id}
                  disableFocusEffects
                  className={styles.suggestionItem}
                  onFocus={() => rememberFocus(id)}
                  onEnter={() => setSearchTerm(item.text)}
                  onKeyDown={(e) => handleSuggestionKeyDown(e, index)}
                >
                  <Icon className={styles.suggestionIcon} />
                  <span className={styles.suggestionText}>{item.text}</span>
                  <ArrowRight className={styles.suggestionArrow} />
                </Focusable>
              );
            })}
          </div>
        </div>

        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2 className={styles.panelTitle}>Keyboard</h2>
            <span className={styles.panelMeta}>Remote input</span>
          </div>
          <div className={styles.keyboardGrid}>
            {KEYBOARD_ROWS.map((row, rowIndex) => (
              <div
                key={`search-kb-row-${rowIndex}`}
                className={`${styles.keyRow} ${
                  rowIndex === 2 ? styles.middleKeyRow : rowIndex === 3 ? styles.bottomKeyRow : ""
                }`}
              >
                {row.map((char, colIndex) => {
                  const id = getLetterFocusId(rowIndex, colIndex);
                  return (
                    <Focusable
                      key={id}
                      id={id}
                      disableFocusEffects
                      className={styles.keyButton}
                      onFocus={() => rememberFocus(id)}
                      onEnter={() => handleKeyClick(char)}
                      onKeyDown={(e) => handleKeyboardKeyDown(e, rowIndex, colIndex)}
                    >
                      <span>{char}</span>
                    </Focusable>
                  );
                })}
              </div>
            ))}

            <div className={`${styles.keyRow} ${styles.keyActionsRow}`}>
              {ACTION_KEYS.map((action, index) => {
                const id = getActionFocusId(index);
                return (
                  <Focusable
                    key={id}
                    id={id}
                    disableFocusEffects
                    className={`${styles.keyButton} ${styles.actionKey} ${
                      action === "DELETE"
                        ? styles.deleteKey
                        : action === "SPACE"
                        ? styles.spaceKey
                        : styles.clearKey
                    }`}
                    onFocus={() => rememberFocus(id)}
                    onEnter={() => handleKeyClick(action)}
                    onKeyDown={(e) => handleActionKeyDown(e, index)}
                  >
                    <span>{action === "DELETE" ? "Delete" : action === "SPACE" ? "Space" : "Clear"}</span>
                  </Focusable>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section ref={resultsSectionRef} className={styles.resultsSection}>
        <header className={styles.resultsTop}>
          <div>
            <span className={styles.resultsEyebrow}>Results</span>
            <h2 className={styles.resultsTitle}>
              {debouncedQuery.length >= 3 ? `"${debouncedQuery}"` : "Ready to search"}
            </h2>
          </div>
          <span className={styles.resultsCount}>
            {isLoading ? "Searching" : `${totalResults} matches`}
          </span>
        </header>

        {isLoading && (
          <div className={styles.loadingState}>
            <div className={styles.inlineLoader} />
            <p>Searching content...</p>
          </div>
        )}

        {!isLoading && !isError && debouncedQuery.length < 3 && (
          <div className={styles.statusPanel}>
            <span className={styles.statusTitle}>Start typing to search</span>
            <p className={styles.statusText}>
              Use quick picks or keyboard to find Live TV, movies, and series.
            </p>
          </div>
        )}

        {!isLoading && !isError && debouncedQuery.length >= 3 && !hasResults && (
          <div className={styles.statusPanel}>
            <EmptyState
              title="No results found"
              message={`No movies, series, or channels found for "${debouncedQuery}".`}
            />
          </div>
        )}

        {!isLoading && isError && (
          <ErrorView
            message={getUserFriendlyErrorMessage(error)}
            onRetry={() => {
              void refetch();
            }}
            showBackToLogin
          />
        )}

        {hasResults && results && (
          <div className={styles.resultRows}>
            {/* Live TV Shelf */}
            {results.live.length > 0 && (
              <div className={`${styles.resultRow} ${styles.liveRow}`}>
                <div className={styles.resultHeader}>
                  <h3>Live Channels</h3>
                  <span>{results.live.length} Channels</span>
                </div>
                <div className={styles.resultRail}>
                  {results.live.map((item, index) => (
                    <LibraryCard
                      key={`live-${item.id}`}
                      id={`search-result-live-${index}`}
                      title={item.title}
                      imageUrl={item.logoUrl}
                      type="live"
                      aspectRatio="landscape"
                      variant="live"
                      disableAutoScroll={true}
                      onClick={() =>
                        setActivePlaybackItem({
                          id: item.id,
                          title: item.title,
                          logoUrl: item.logoUrl,
                          contentType: "live",
                        })
                      }
                      onFocus={() => rememberFocus(`search-result-live-${index}`)}
                      onKeyDown={(e) =>
                        handleCardKeyDown(e, "live", index, results.live.length)
                      }
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Movies Shelf */}
            {results.vod.length > 0 && (
              <div className={`${styles.resultRow} ${styles.moviesRow}`}>
                <div className={styles.resultHeader}>
                  <h3>Movies</h3>
                  <span>{results.vod.length} Movies</span>
                </div>
                <div className={styles.resultRail}>
                  {results.vod.map((item, index) => (
                    <LibraryCard
                      key={`movie-${item.id}`}
                      id={`search-result-movies-${index}`}
                      title={item.title}
                      imageUrl={item.posterUrl}
                      type="vod"
                      aspectRatio="poster"
                      variant="poster"
                      disableAutoScroll={true}
                      onClick={() => setSelectedMovieId(item.id)}
                      onFocus={() => rememberFocus(`search-result-movies-${index}`)}
                      onKeyDown={(e) =>
                        handleCardKeyDown(e, "movies", index, results.vod.length)
                      }
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Series Shelf */}
            {results.series.length > 0 && (
              <div className={`${styles.resultRow} ${styles.seriesRow}`}>
                <div className={styles.resultHeader}>
                  <h3>TV Series</h3>
                  <span>{results.series.length} Series</span>
                </div>
                <div className={styles.resultRail}>
                  {results.series.map((item, index) => (
                    <LibraryCard
                      key={`series-${item.id}`}
                      id={`search-result-series-${index}`}
                      title={item.title}
                      imageUrl={item.posterUrl}
                      type="series"
                      aspectRatio="poster"
                      variant="poster"
                      disableAutoScroll={true}
                      onClick={() => setSelectedSeriesId(item.id)}
                      onFocus={() => rememberFocus(`search-result-series-${index}`)}
                      onKeyDown={(e) =>
                        handleCardKeyDown(e, "series", index, results.series.length)
                      }
                    />
                  ))}
                </div>
              </div>
            )}
            {/* Solid scroll spacer block to solve the Webkit collapsed padding bug on Tizen Smart TVs */}
            <div className={styles.scrollSpacer} />
          </div>
        )}
      </section>

      {isListening && (
        <div className={styles.voiceOverlay}>
          <div className={styles.voicePulse}>
            <Mic size={44} />
          </div>
          <h3>Listening...</h3>
          <p>{voiceTelemetry}</p>
        </div>
      )}
    </div>
  );
};
