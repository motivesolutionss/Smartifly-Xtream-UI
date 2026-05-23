import React, { useRef, useState } from "react";
import { Focusable } from "../tv/Focusable";
import { TvKeyboard, type TvKeyboardMode, type TvKeyboardVariant } from "./TvKeyboard";
import styles from "./Input.module.css";

interface InputProps {
  id: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
  keyboardMode?: TvKeyboardMode;
  keyboardVariant?: TvKeyboardVariant;
  useTvKeyboard?: boolean;
  maxLength?: number;
  openKeyboardOnFocus?: boolean;
  showKeyboardOnEnter?: boolean;
}

export const Input: React.FC<InputProps> = ({
  id,
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  autoFocus = false,
  className = "",
  keyboardMode = "default",
  keyboardVariant = "docked",
  useTvKeyboard = true,
  maxLength = 256,
  openKeyboardOnFocus = false,
  showKeyboardOnEnter = true,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const suppressFocusOpenRef = useRef(false);

  const handleFocus = () => {
    if (useTvKeyboard) {
      if (!openKeyboardOnFocus) return;
      if (suppressFocusOpenRef.current) {
        suppressFocusOpenRef.current = false;
        return;
      }
      setIsKeyboardOpen(true);
      return;
    }
    inputRef.current?.focus();
  };

  const handleEnter = () => {
    if (useTvKeyboard) {
      if (!showKeyboardOnEnter) return;
      setIsKeyboardOpen(true);
      return;
    }
    inputRef.current?.focus();
  };

  return (
    <div className={`${styles.inputContainer} ${className}`}>
      {label && <label className={styles.label}>{label}</label>}
      <Focusable
        id={id}
        autoFocus={autoFocus}
        onEnter={handleEnter}
        onFocus={handleFocus}
        className={styles.focusableWrapper}
      >
        <input
          ref={inputRef}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={styles.input}
          readOnly={useTvKeyboard}
        />
      </Focusable>
      {isKeyboardOpen && (
        <TvKeyboard
          title={label || "Input"}
          value={value}
          mode={keyboardMode}
          variant={keyboardVariant}
          placeholder={placeholder}
          maskValue={type === "password"}
          maxLength={maxLength}
          trapFocus
          onChange={onChange}
          onClose={() => {
            suppressFocusOpenRef.current = true;
            setIsKeyboardOpen(false);
          }}
          onSubmit={onChange}
        />
      )}
    </div>
  );
};
