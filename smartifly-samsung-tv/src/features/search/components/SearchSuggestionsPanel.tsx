import React from "react";
import { ArrowRight } from "lucide-react";
import { Focusable } from "../../../components/tv/Focusable";
import { SUGGESTION_ITEMS } from "../searchConfig";
import styles from "../Search.module.css";

type SearchSuggestionsPanelProps = {
  onRememberFocus: (id: string) => void;
  onSelectSuggestion: (text: string) => void;
  onSuggestionKeyDown: (e: React.KeyboardEvent, index: number) => void;
};

export const SearchSuggestionsPanel: React.FC<SearchSuggestionsPanelProps> = ({
  onRememberFocus,
  onSelectSuggestion,
  onSuggestionKeyDown,
}) => {
  return (
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
              onFocus={() => onRememberFocus(id)}
              onEnter={() => onSelectSuggestion(item.text)}
              onKeyDown={(e) => onSuggestionKeyDown(e, index)}
            >
              <Icon className={styles.suggestionIcon} />
              <span className={styles.suggestionText}>{item.text}</span>
              <ArrowRight className={styles.suggestionArrow} />
            </Focusable>
          );
        })}
      </div>
    </div>
  );
};
