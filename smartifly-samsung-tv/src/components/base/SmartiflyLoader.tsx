import type { CSSProperties } from "react";
import styles from "./SmartiflyLoader.module.css";

type SmartiflyLoaderProps = {
  size?: number;
  strokeWidth?: number;
  label?: string;
};

export const SmartiflyLoader = ({
  size = 60,
  strokeWidth = 4,
  label = "Loading",
}: SmartiflyLoaderProps) => {
  return (
    <div
      className={styles.loader}
      role="status"
      aria-label={label}
      style={
        {
          "--loader-size": `${size}px`,
          "--loader-stroke": `${strokeWidth}px`,
        } as CSSProperties
      }
    />
  );
};
