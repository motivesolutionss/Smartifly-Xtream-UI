import React from "react";
import styles from "./Badge.module.css";

interface BadgeProps {
  text: string;
  variant?: "primary" | "secondary" | "glass";
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ text, variant = "primary", className = "" }) => {
  return (
    <div className={`${styles.badge} ${styles[variant]} ${className}`}>
      {text}
    </div>
  );
};
