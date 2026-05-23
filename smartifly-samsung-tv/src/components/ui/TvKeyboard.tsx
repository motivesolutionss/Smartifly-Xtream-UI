import React, { useEffect, useMemo, useState, useRef } from "react";
import { Focusable } from "../tv/Focusable";
import { useFocus } from "../../providers/useFocus";
import { useTvBack } from "../../hooks/useTvBack";
import styles from "./TvKeyboard.module.css";

export type TvKeyboardMode = "default" | "url" | "search" | "password";
export type TvKeyboardVariant = "modal" | "inline" | "docked" | "side";

type TvKeyboardProps = {
  title: string;
  value: string;
  mode?: TvKeyboardMode;
  variant?: TvKeyboardVariant;
  placeholder?: string;
  maskValue?: boolean;
  maxLength?: number;
  className?: string;
  showHeader?: boolean;
  showPreview?: boolean;
  trapFocus?: boolean;
  closeOnSubmit?: boolean;
  onChange?: (value: string) => void;
  onClose?: () => void;
  onSubmit: (value: string) => void;
  onBackClick?: () => void;
  actionLabel?: string;
  onKeyDown?: (e: React.KeyboardEvent, rowIndex: number, columnIndex: number) => void;
  layout?: "qwerty" | "vertical";
};

type KeyboardAction = "char" | "backspace" | "shift" | "symbols" | "done" | "back" | "clear";

type KeyboardKey = {
  label: string;
  action: KeyboardAction;
  value?: string;
  isPrimary?: boolean;
  isSpecial?: boolean;
  flex?: number;
};

const createCharRow = (chars: string[]): KeyboardKey[] =>
  chars.map((char) => ({ label: char, value: char, action: "char" }));

const maskText = (value: string) => "*".repeat(value.length);

export const TvKeyboard: React.FC<TvKeyboardProps> = ({
  title,
  value,
  mode = "default",
  variant = "modal",
  placeholder,
  maskValue = false,
  maxLength = 256,
  className = "",
  showHeader = true,
  showPreview = true,
  trapFocus,
  closeOnSubmit = true,
  onChange,
  onClose,
  onSubmit,
  onBackClick,
  actionLabel = "DONE",
  onKeyDown,
  layout = "qwerty",
}) => {
  const { focusedId, setFocus, setFocusScope } = useFocus();
  const [internalValue, setInternalValue] = useState(() => value);
  const [isShiftEnabled, setIsShiftEnabled] = useState(false);
  const [isSymbolsEnabled, setIsSymbolsEnabled] = useState(false);

  const currentValue = onChange ? value : internalValue;
  const shouldTrapFocus = trapFocus ?? variant === "modal";

  const keyboardRows = useMemo(() => {
    const rows: KeyboardKey[][] = [];
    
    if (layout === "vertical") {
      const chars = isSymbolsEnabled
        ? [
            "!", "@", "#", "$", "%", "^",
            "&", "*", "(", ")", "-", "_",
            "+", "=", "{", "}", "[", "]",
            "|", "\\", ":", ";", "\"", "'",
            "<", ">", ",", ".", "?", "/",
            "~", "`", "@", ".com", ".net", ".org"
          ]
        : [
            "A", "B", "C", "D", "E", "F",
            "G", "H", "I", "J", "K", "L",
            "M", "N", "O", "P", "Q", "R",
            "S", "T", "U", "V", "W", "X",
            "Y", "Z", "1", "2", "3", "4",
            "5", "6", "7", "8", "9", "0"
          ];

      // Re-map alphabetical characters to lowercase if shift is enabled
      const mappedChars = chars.map(char => {
        if (!isSymbolsEnabled && char.length === 1 && char >= "A" && char <= "Z") {
          return isShiftEnabled ? char.toLowerCase() : char.toUpperCase();
        }
        return char;
      });

      // Split 36 items into 6 rows of 6 keys
      for (let i = 0; i < 6; i++) {
        const slice = mappedChars.slice(i * 6, (i + 1) * 6);
        rows.push(slice.map(char => ({ label: char, value: char, action: "char" })));
      }

      // Row 7: Shift + Space + Delete
      rows.push([
        { label: isShiftEnabled ? "ABC" : "abc", action: "shift", isSpecial: true, flex: 1.5 },
        { label: "SPACE", action: "char", value: " ", isSpecial: true, flex: 3 },
        { label: "DELETE", action: "backspace", isSpecial: true, flex: 1.5 },
      ]);

      // Row 8: Symbols Toggle + Clear + Back + Done
      rows.push([
        { label: isSymbolsEnabled ? "ABC" : "!#$", action: "symbols", isSpecial: true, flex: 1.5 },
        { label: "CLEAR", action: "clear", isSpecial: true, flex: 1.2 },
        { label: "BACK", action: "back", isSpecial: true, flex: 1.2 },
        { label: actionLabel, action: "done", isPrimary: true, flex: 2 },
      ]);
    } else {
      // Row 1: Numbers
      rows.push(createCharRow(["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"]));

      // Row 2 & 3: QWERTY
      if (isSymbolsEnabled) {
        rows.push(createCharRow(["[", "]", "{", "}", "#", "%", "^", "*", "+", "="]));
        rows.push(createCharRow(["_", "\\", "|", "~", "<", ">", "/", "?", "!", "@"]));
      } else {
        rows.push(createCharRow(["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"]));
        rows.push(createCharRow(["a", "s", "d", "f", "g", "h", "j", "k", "l", "-"]));
      }

      // Row 4: Shift + Bottom row letters + Backspace
      rows.push([
        { label: isShiftEnabled ? "ABC" : "abc", action: "shift", isSpecial: true, flex: 1.5 },
        ...(isSymbolsEnabled
          ? createCharRow([".", ",", ":", ";", "\"", "'"])
          : createCharRow(["z", "x", "c", "v", "b", "n", "m"])),
        { label: "DELETE", action: "backspace", isSpecial: true, flex: 1.5 },
      ]);

      // Row 5: URL shortcuts if in URL mode
      if (mode === "url") {
        rows.push(
          createCharRow(["http://", "https://", ".com", ".net", ".org"]).map((key) => ({
            ...key,
            isSpecial: true,
          }))
        );
      }

      // Row 6: Symbols Toggle + Space + Clear + Back + Done
      rows.push([
        { label: isSymbolsEnabled ? "ABC" : "!#$", action: "symbols", isSpecial: true, flex: 1.5 },
        { label: "SPACE", action: "char", value: " ", isSpecial: true, flex: 2.5 },
        { label: "CLEAR", action: "clear", isSpecial: true, flex: 1.2 },
        { label: "BACK", action: "back", isSpecial: true, flex: 1.2 },
        { label: actionLabel, action: "done", isPrimary: true, flex: 1.8 },
      ]);
    }

    return rows.map((row) =>
      row.map((key) => {
        if (
          key.action === "char" &&
          key.value?.length === 1 &&
          key.value !== " " &&
          !isSymbolsEnabled
        ) {
          // Defaults are uppercase. If Shift/abc toggle is active, convert to lowercase.
          const nextValue = isShiftEnabled ? key.value.toLowerCase() : key.value.toUpperCase();
          return { ...key, label: nextValue, value: nextValue };
        }
        return key;
      })
    );
  }, [actionLabel, isShiftEnabled, isSymbolsEnabled, mode, layout]);

  const focusedIdRef = useRef(focusedId);
  useEffect(() => {
    focusedIdRef.current = focusedId;
  }, [focusedId]);

  useEffect(() => {
    if (!shouldTrapFocus) return;

    const previousFocusId = focusedIdRef.current;
    setFocusScope(["tvkb-"], "tvkb-key-0-0");
    setFocus("tvkb-key-0-0");

    return () => {
      setFocusScope(null);
      if (previousFocusId) {
        setFocus(previousFocusId);
      }
    };
  }, [shouldTrapFocus, setFocus, setFocusScope]);

  useTvBack(() => onClose?.(), shouldTrapFocus && Boolean(onClose));

  const commitValue = (nextValue: string) => {
    const clamped = nextValue.slice(0, maxLength);
    if (onChange) onChange(clamped);
    else setInternalValue(clamped);
  };

  const handleAction = (key: KeyboardKey) => {
    switch (key.action) {
      case "char":
        if (key.value) commitValue(currentValue + key.value);
        break;
      case "backspace":
        commitValue(currentValue.slice(0, -1));
        break;
      case "shift":
        setIsShiftEnabled((v) => !v);
        break;
      case "symbols":
        setIsSymbolsEnabled((v) => !v);
        break;
      case "back":
        onBackClick?.();
        break;
      case "clear":
        commitValue("");
        break;
      case "done":
        onSubmit(currentValue);
        if (closeOnSubmit) onClose?.();
        break;
    }
  };

  const displayedValue = maskValue ? maskText(currentValue) : currentValue;
  
  const containerClass =
    variant === "modal"
      ? styles.overlay
      : variant === "docked"
        ? styles.dockedContainer
        : variant === "side"
          ? styles.sideContainer
          : styles.inlineContainer;

  const panelClass =
    variant === "modal"
      ? styles.modal
      : variant === "docked"
        ? styles.dockedPanel
        : variant === "side"
          ? styles.sidePanel
          : styles.inlinePanel;

  return (
    <div className={`${containerClass} ${styles[mode] || ""} ${className}`.trim()}>
      <div className={panelClass}>
        {showHeader && (
          <header className={styles.header}>
            <h2 className="title-large">{title}</h2>
            <p className="body-large text-tertiary">{placeholder || "Use your remote to type"}</p>
          </header>
        )}

        {showPreview && (
          <div className={styles.preview} aria-live="polite">
            <span className={styles.previewValue}>{displayedValue || placeholder || "Type here"}</span>
          </div>
        )}

        <div className={styles.keyboard}>
          {keyboardRows.map((row, rowIndex) => (
            <div key={`tvkb-row-${rowIndex}`} className={styles.row}>
              {row.map((key, columnIndex) => (
                <Focusable
                  key={`tvkb-key-${rowIndex}-${columnIndex}`}
                  id={`tvkb-key-${rowIndex}-${columnIndex}`}
                  variant="none"
                  className={`${styles.key} ${key.isPrimary ? styles.primaryKey : ""} ${key.isSpecial ? styles.specialKey : ""}`.trim()}
                  style={{ flex: key.flex ?? 1 }}
                  onEnter={() => handleAction(key)}
                  onKeyDown={(e) => onKeyDown?.(e, rowIndex, columnIndex)}
                >
                  <span>{key.label}</span>
                </Focusable>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
