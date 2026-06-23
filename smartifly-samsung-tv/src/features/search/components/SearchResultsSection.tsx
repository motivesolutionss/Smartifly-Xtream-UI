import React, { useEffect } from "react";
import { ErrorView } from "../../../components/common/ErrorView";
import { EmptyState } from "../../../components/common/EmptyState";
import { getUserFriendlyErrorMessage } from "../../../utils/errorMapper";
import { perfMetrics } from "../../../utils/perfMetrics";
import { LibraryCard } from "../../library/LibraryCard";
import type { AppChannel, AppMovie, AppSeries } from "../../../types/appModels";
import type { SearchResults } from "../hooks/useSearch";
import type { RowType } from "../searchConfig";
import styles from "../Search.module.css";

type VisibleSearchResults = {
  live: AppChannel[];
  vod: AppMovie[];
  series: AppSeries[];
};

type SearchResultsSectionProps = {
  debouncedQuery: string;
  totalResults: number;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  hasResults: boolean;
  results: SearchResults | undefined;
  visibleResults: VisibleSearchResults;
  onRetry: () => void;
  onRememberFocus: (id: string) => void;
  onLiveSelect: (item: AppChannel) => void;
  onMovieSelect: (item: AppMovie) => void;
  onSeriesSelect: (item: AppSeries) => void;
  onCardKeyDown: (e: React.KeyboardEvent, rowType: RowType, index: number, rowLength: number) => void;
};

export const SearchResultsSection: React.FC<SearchResultsSectionProps> = ({
  debouncedQuery,
  totalResults,
  isLoading,
  isError,
  error,
  hasResults,
  results,
  visibleResults,
  onRetry,
  onRememberFocus,
  onLiveSelect,
  onMovieSelect,
  onSeriesSelect,
  onCardKeyDown,
}) => {
  useEffect(() => {
    perfMetrics.increment("search_results_section_render_count");
  });

  return (
    <section className={styles.resultsSection}>
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
          onRetry={onRetry}
          showBackToLogin
        />
      )}

      {hasResults && results && (
        <div className={styles.resultRows}>
          {visibleResults.live.length > 0 && (
            <div className={`${styles.resultRow} ${styles.liveRow}`}>
              <div className={styles.resultHeader}>
                <h3>Live Channels</h3>
                <span>{results.live.length} Channels</span>
              </div>
              <div className={styles.resultRail}>
                {visibleResults.live.map((item, index) => (
                  <LibraryCard
                    key={`live-${item.id}`}
                    id={`search-result-live-${index}`}
                    title={item.title}
                    imageUrl={item.logoUrl}
                    type="live"
                    aspectRatio="landscape"
                    variant="live"
                    disableAutoScroll
                    onClick={() => onLiveSelect(item)}
                    onFocus={() => onRememberFocus(`search-result-live-${index}`)}
                    onKeyDown={(e) =>
                      onCardKeyDown(e, "live", index, visibleResults.live.length)
                    }
                  />
                ))}
              </div>
            </div>
          )}

          {visibleResults.vod.length > 0 && (
            <div className={`${styles.resultRow} ${styles.moviesRow}`}>
              <div className={styles.resultHeader}>
                <h3>Movies</h3>
                <span>{results.vod.length} Movies</span>
              </div>
              <div className={styles.resultRail}>
                {visibleResults.vod.map((item, index) => (
                  <LibraryCard
                    key={`movie-${item.id}`}
                    id={`search-result-movies-${index}`}
                    title={item.title}
                    imageUrl={item.posterUrl}
                    type="vod"
                    aspectRatio="poster"
                    variant="poster"
                    disableAutoScroll
                    onClick={() => onMovieSelect(item)}
                    onFocus={() => onRememberFocus(`search-result-movies-${index}`)}
                    onKeyDown={(e) =>
                      onCardKeyDown(e, "movies", index, visibleResults.vod.length)
                    }
                  />
                ))}
              </div>
            </div>
          )}

          {visibleResults.series.length > 0 && (
            <div className={`${styles.resultRow} ${styles.seriesRow}`}>
              <div className={styles.resultHeader}>
                <h3>TV Series</h3>
                <span>{results.series.length} Series</span>
              </div>
              <div className={styles.resultRail}>
                {visibleResults.series.map((item, index) => (
                  <LibraryCard
                    key={`series-${item.id}`}
                    id={`search-result-series-${index}`}
                    title={item.title}
                    imageUrl={item.posterUrl}
                    type="series"
                    aspectRatio="poster"
                    variant="poster"
                    disableAutoScroll
                    onClick={() => onSeriesSelect(item)}
                    onFocus={() => onRememberFocus(`search-result-series-${index}`)}
                    onKeyDown={(e) =>
                      onCardKeyDown(e, "series", index, visibleResults.series.length)
                    }
                  />
                ))}
              </div>
            </div>
          )}

          <div className={styles.scrollSpacer} />
        </div>
      )}
    </section>
  );
};
