import React from "react";
import { Mic, Search as SearchIcon } from "lucide-react";
import { Focusable } from "../../../components/tv/Focusable";
import styles from "../Search.module.css";

type SearchHeaderProps = {
  searchTerm: string;
  onRememberFocus: (id: string) => void;
  onTriggerVoiceSearch: () => void;
  onInputKeyDown: (e: React.KeyboardEvent) => void;
  onMicKeyDown: (e: React.KeyboardEvent) => void;
};

export const SearchHeader: React.FC<SearchHeaderProps> = ({
  searchTerm,
  onRememberFocus,
  onTriggerVoiceSearch,
  onInputKeyDown,
  onMicKeyDown,
}) => {
  return (
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
          onFocus={() => onRememberFocus("search-input")}
          onKeyDown={onInputKeyDown}
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
          onFocus={() => onRememberFocus("search-mic")}
          onEnter={onTriggerVoiceSearch}
          onKeyDown={onMicKeyDown}
        >
          <Mic size={22} />
        </Focusable>
      </div>
    </header>
  );
};
