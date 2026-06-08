import { useMemo, useState } from "react";
import type { SearchResults } from "./useSearch";
import {
  ACTION_KEYS,
  getActionFocusId,
  getLetterFocusId,
  INITIAL_RESULT_WINDOW,
  KEYBOARD_ROWS,
  RESULT_WINDOW_BATCH,
  type ResultWindowCounts,
  type ResultWindowState,
  type RowType,
  SUGGESTION_ITEMS,
} from "../searchConfig";

type UseSearchNavigationParams = {
  debouncedQuery: string;
  results: SearchResults | undefined;
  firstResultId: string | null;
  setFocus: (id: string | null) => void;
};

export const useSearchNavigation = ({
  debouncedQuery,
  results,
  firstResultId,
  setFocus,
}: UseSearchNavigationParams) => {
  const [resultWindowState, setResultWindowState] = useState<ResultWindowState>({
    query: "",
    counts: INITIAL_RESULT_WINDOW,
  });

  const resultWindowCounts = useMemo<ResultWindowCounts>(
    () =>
      resultWindowState.query === debouncedQuery
        ? resultWindowState.counts
        : INITIAL_RESULT_WINDOW,
    [debouncedQuery, resultWindowState]
  );

  const expandResultWindow = (rowType: RowType) => {
    if (!results) return false;

    const totalByRow = {
      live: results.live.length,
      movies: results.vod.length,
      series: results.series.length,
    };

    const nextCount = Math.min(
      totalByRow[rowType],
      resultWindowCounts[rowType] + RESULT_WINDOW_BATCH[rowType]
    );

    if (nextCount <= resultWindowCounts[rowType]) {
      return false;
    }

    setResultWindowState({
      query: debouncedQuery,
      counts: {
        ...resultWindowCounts,
        [rowType]: nextCount,
      },
    });

    return true;
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
      }
    }
  };

  const handleCardKeyDown = (
    e: React.KeyboardEvent,
    rowType: RowType,
    index: number,
    rowLength: number
  ) => {
    if (e.key === "ArrowLeft") {
      if (index === 0) {
        e.preventDefault();
      } else {
        e.preventDefault();
        setFocus(`search-result-${rowType}-${index - 1}`);
      }
      return;
    }

    if (e.key === "ArrowRight") {
      if (index === rowLength - 1) {
        e.preventDefault();
        if (expandResultWindow(rowType)) {
          const nextId = `search-result-${rowType}-${index + 1}`;
          window.requestAnimationFrame(() => setFocus(nextId));
        }
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

  return {
    resultWindowCounts,
    handleInputKeyDown,
    handleMicKeyDown,
    handleSuggestionKeyDown,
    handleKeyboardKeyDown,
    handleActionKeyDown,
    handleCardKeyDown,
  };
};
