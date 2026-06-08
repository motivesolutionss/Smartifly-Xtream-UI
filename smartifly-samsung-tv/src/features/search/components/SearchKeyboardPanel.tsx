import React from "react";
import { Focusable } from "../../../components/tv/Focusable";
import {
  ACTION_KEYS,
  getActionFocusId,
  getLetterFocusId,
  KEYBOARD_ROWS,
} from "../searchConfig";
import styles from "../Search.module.css";

type SearchKeyboardPanelProps = {
  onRememberFocus: (id: string) => void;
  onKeyClick: (value: string) => void;
  onKeyboardKeyDown: (e: React.KeyboardEvent, row: number, col: number) => void;
  onActionKeyDown: (e: React.KeyboardEvent, index: number) => void;
};

export const SearchKeyboardPanel: React.FC<SearchKeyboardPanelProps> = ({
  onRememberFocus,
  onKeyClick,
  onKeyboardKeyDown,
  onActionKeyDown,
}) => {
  return (
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
                  onFocus={() => onRememberFocus(id)}
                  onEnter={() => onKeyClick(char)}
                  onKeyDown={(e) => onKeyboardKeyDown(e, rowIndex, colIndex)}
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
                onFocus={() => onRememberFocus(id)}
                onEnter={() => onKeyClick(action)}
                onKeyDown={(e) => onActionKeyDown(e, index)}
              >
                <span>
                  {action === "DELETE" ? "Delete" : action === "SPACE" ? "Space" : "Clear"}
                </span>
              </Focusable>
            );
          })}
        </div>
      </div>
    </div>
  );
};
