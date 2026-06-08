import {
  Flame,
  Globe,
  Laugh,
  Sparkles,
  Trophy,
} from "lucide-react";
import type React from "react";

export type RowType = "live" | "movies" | "series";

export type ResultWindowCounts = Record<RowType, number>;

export type ResultWindowState = {
  query: string;
  counts: ResultWindowCounts;
};

export type SuggestionConfig = {
  text: string;
  icon: React.ComponentType<{ className?: string }>;
};

export const SUGGESTION_ITEMS: SuggestionConfig[] = [
  { text: "Action Movies", icon: Flame },
  { text: "Live Sports", icon: Trophy },
  { text: "News Channels", icon: Globe },
  { text: "Kids Shows", icon: Sparkles },
  { text: "Comedy", icon: Laugh },
];

export const KEYBOARD_ROWS: string[][] = [
  ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["Z", "X", "C", "V", "B", "N", "M"],
];

export const ACTION_KEYS = ["DELETE", "SPACE", "CLEAR"] as const;

export const INITIAL_RESULT_WINDOW: ResultWindowCounts = {
  live: 8,
  movies: 10,
  series: 10,
};

export const RESULT_WINDOW_BATCH: ResultWindowCounts = {
  live: 6,
  movies: 8,
  series: 8,
};

export const getActionFocusId = (index: number) => `search-key-action-${index}`;
export const getLetterFocusId = (row: number, col: number) => `search-key-${row}-${col}`;
