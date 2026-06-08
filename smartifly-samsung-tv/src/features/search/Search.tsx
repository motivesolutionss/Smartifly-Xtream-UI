import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSearch } from "./hooks/useSearch";
import { usePlayerStore } from "../../store/playerStore";
import { useFocus } from "../../providers/useFocus";
import { useTvBack } from "../../hooks/useTvBack";
import styles from "./Search.module.css";
import VodDetails from "../vod/VodDetails";
import { SeriesDetails } from "../series/SeriesDetails";
import { SearchHeader } from "./components/SearchHeader";
import { SearchSuggestionsPanel } from "./components/SearchSuggestionsPanel";
import { SearchKeyboardPanel } from "./components/SearchKeyboardPanel";
import { SearchResultsSection } from "./components/SearchResultsSection";
import { SearchVoiceOverlay } from "./components/SearchVoiceOverlay";
import { useSearchFocus } from "./hooks/useSearchFocus";
import { useSearchNavigation } from "./hooks/useSearchNavigation";
import { SUGGESTION_ITEMS } from "./searchConfig";

export const Search: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedMovieId, setSelectedMovieId] = useState<string | null>(null);
  const [selectedSeriesId, setSelectedSeriesId] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [voiceTelemetry, setVoiceTelemetry] = useState("");
  const listeningTimeoutRef = useRef<number | null>(null);
  const telemetryIntervalRef = useRef<number | null>(null);

  const { data: results, isLoading, isError, error, refetch } = useSearch(debouncedQuery);
  const setActivePlaybackItem = usePlayerStore((state) => state.setActivePlaybackItem);
  const { setFocus, focusedId } = useFocus();
  const { pageRef, rememberFocus } = useSearchFocus({
    focusedId,
    debouncedQuery,
    selectedMovieId,
    selectedSeriesId,
    setFocus,
    resultRailClassName: styles.resultRail,
    resultRowClassName: styles.resultRow,
  });

  useTvBack(
    () => {
      setFocus("search-input");
    },
    !selectedMovieId && !selectedSeriesId && !isListening
  );

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(searchTerm.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    return () => {
      if (listeningTimeoutRef.current) window.clearTimeout(listeningTimeoutRef.current);
      if (telemetryIntervalRef.current) window.clearInterval(telemetryIntervalRef.current);
    };
  }, []);

  const hasResults = Boolean(
    results && (results.live.length > 0 || results.vod.length > 0 || results.series.length > 0)
  );

  const firstResultId = useMemo(() => {
    if (!results || results.live.length + results.vod.length + results.series.length === 0) {
      return null;
    }
    if (results.live.length > 0) return "search-result-live-0";
    if (results.vod.length > 0) return "search-result-movies-0";
    if (results.series.length > 0) return "search-result-series-0";
    return null;
  }, [results]);

  const {
    resultWindowCounts,
    handleInputKeyDown,
    handleMicKeyDown,
    handleSuggestionKeyDown,
    handleKeyboardKeyDown,
    handleActionKeyDown,
    handleCardKeyDown,
  } = useSearchNavigation({
    debouncedQuery,
    results,
    firstResultId,
    setFocus,
  });

  const visibleResults = useMemo(() => {
    if (!results) {
      return {
        live: [],
        vod: [],
        series: [],
      };
    }

    return {
      live: results.live.slice(0, resultWindowCounts.live),
      vod: results.vod.slice(0, resultWindowCounts.movies),
      series: results.series.slice(0, resultWindowCounts.series),
    };
  }, [resultWindowCounts, results]);

  const totalResults = useMemo(() => {
    if (!results) return 0;
    return results.live.length + results.vod.length + results.series.length;
  }, [results]);

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

  if (selectedMovieId) {
    return <VodDetails movieId={selectedMovieId} categoryName="Search" onBack={() => setSelectedMovieId(null)} />;
  }

  if (selectedSeriesId) {
    return <SeriesDetails seriesId={selectedSeriesId} categoryName="Search" onBack={() => setSelectedSeriesId(null)} />;
  }

  return (
    <div ref={pageRef} className={styles.container}>
      <SearchHeader
        searchTerm={searchTerm}
        onRememberFocus={rememberFocus}
        onTriggerVoiceSearch={triggerVoiceSearch}
        onInputKeyDown={handleInputKeyDown}
        onMicKeyDown={handleMicKeyDown}
      />

      <section className={styles.controlsGrid}>
        <SearchSuggestionsPanel
          onRememberFocus={rememberFocus}
          onSelectSuggestion={setSearchTerm}
          onSuggestionKeyDown={handleSuggestionKeyDown}
        />
        <SearchKeyboardPanel
          onRememberFocus={rememberFocus}
          onKeyClick={handleKeyClick}
          onKeyboardKeyDown={handleKeyboardKeyDown}
          onActionKeyDown={handleActionKeyDown}
        />
      </section>

      <SearchResultsSection
        debouncedQuery={debouncedQuery}
        totalResults={totalResults}
        isLoading={isLoading}
        isError={isError}
        error={error}
        hasResults={hasResults}
        results={results}
        visibleResults={visibleResults}
        onRetry={() => {
          void refetch();
        }}
        onRememberFocus={rememberFocus}
        onLiveSelect={(item) =>
          setActivePlaybackItem({
            id: item.id,
            title: item.title,
            logoUrl: item.logoUrl,
            contentType: "live",
          })
        }
        onMovieSelect={(item) => setSelectedMovieId(item.id)}
        onSeriesSelect={(item) => setSelectedSeriesId(item.id)}
        onCardKeyDown={handleCardKeyDown}
      />

      {isListening && <SearchVoiceOverlay voiceTelemetry={voiceTelemetry} />}
    </div>
  );
};
