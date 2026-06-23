import React, { useRef, useEffect } from "react";
import { useFocusActions, useIsFocused } from "../../providers/useFocus";
import styles from "./Focusable.module.css";

interface FocusableProps {
  id: string;
  children: React.ReactNode;
  onEnter?: () => void;
  onFocus?: () => void;
  className?: string;
  style?: React.CSSProperties;
  autoFocus?: boolean;
  disabled?: boolean;
  disableFocusEffects?: boolean;
  scrollOptions?: ScrollIntoViewOptions;
  disableAutoScroll?: boolean;
  allowGlobalAutoFocus?: boolean;
  variant?: "default" | "pill" | "none";
  enableVerticalScrollOnArrow?: boolean;
  enablePointerFocus?: boolean;
  onKeyDown?: (e: React.KeyboardEvent) => void;
}

export const Focusable: React.FC<FocusableProps> = ({
  id,
  children,
  onEnter,
  onFocus,
  onKeyDown,
  className = "",
  style,
  autoFocus = false,
  disabled = false,
  disableFocusEffects = false,
  scrollOptions,
  disableAutoScroll = false,
  allowGlobalAutoFocus = true,
  variant = "default",
  enableVerticalScrollOnArrow = false,
  enablePointerFocus = false,
}) => {
  const { setFocus, registerElement, unregisterElement } = useFocusActions();
  const isFocused = useIsFocused(id);
  const ref = useRef<HTMLDivElement>(null);
  const onFocusRef = useRef(onFocus);
  const wasFocusedRef = useRef(false);

  useEffect(() => {
    onFocusRef.current = onFocus;
  }, [onFocus]);

  useEffect(() => {
    if (ref.current && !disabled) {
      registerElement(id, ref.current, { allowGlobalAutoFocus });
    }
    return () => unregisterElement(id);
  }, [allowGlobalAutoFocus, id, registerElement, unregisterElement, disabled]);

  useEffect(() => {
    if (autoFocus && !disabled) {
      setFocus(id);
    }
  }, [autoFocus, id, setFocus, disabled]);

  useEffect(() => {
    if (!isFocused) {
      wasFocusedRef.current = false;
      return;
    }

    if (!wasFocusedRef.current) {
      wasFocusedRef.current = true;
      onFocusRef.current?.();
    }

    if (!disableAutoScroll) {
      ref.current?.scrollIntoView(scrollOptions || {
        block: "nearest",
        inline: "nearest",
      });
    }
  }, [isFocused, scrollOptions, disableAutoScroll]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (onKeyDown) {
      onKeyDown(e);
    }
    if (e.defaultPrevented) return;

    const isEnterKey =
      e.key === "Enter" || e.key === "NumpadEnter" || e.keyCode === 13;

    if (isFocused && isEnterKey && onEnter) {
      onEnter();
    }
  };

  return (
    <div
      ref={ref}
      id={id}
      tabIndex={-1}
      data-focus-scroll-y={enableVerticalScrollOnArrow ? "true" : undefined}
      className={`${styles.focusable} ${styles[variant]} ${isFocused ? `${styles.focused} focused` : ""} ${disabled ? styles.disabled : ""} ${className}`}
      style={style}
      onKeyDown={handleKeyDown}
      onClick={() => {
        if (!disabled) {
          setFocus(id);
          onEnter?.();
        }
      }}
      onMouseEnter={() => {
        if (!disabled && enablePointerFocus) {
          setFocus(id);
        }
      }}
    >
      <div className={styles.content}>
        {children}
      </div>

      {isFocused && !disableFocusEffects && variant !== "none" && (
        <div className={styles.focusBorder} />
      )}
    </div>
  );
};
