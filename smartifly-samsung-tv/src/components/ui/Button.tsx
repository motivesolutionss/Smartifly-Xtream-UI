import React from "react";
import { Focusable } from "../tv/Focusable";
import styles from "./Button.module.css";

interface ButtonProps {
  id: string;
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary";
  className?: string;
  autoFocus?: boolean;
  disabled?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  id,
  children,
  onClick,
  variant = "primary",
  className = "",
  autoFocus = false,
  disabled = false,
}) => {
  const handleEnter = () => {
    if (disabled) return;
    onClick?.();
  };

  return (
    <Focusable
      id={id}
      autoFocus={autoFocus}
      onEnter={handleEnter}
      className={`${styles.button} ${styles[variant]} ${
        disabled ? styles.disabled : ""
      } ${className}`}
    >
      <div className={styles.content}>
        {children}
      </div>
    </Focusable>
  );
};
