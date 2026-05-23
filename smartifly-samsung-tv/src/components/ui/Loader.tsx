import React from "react";
import styles from "./Loader.module.css";

interface LoaderProps {
  size?: number;
  strokeWidth?: number;
}

export const Loader: React.FC<LoaderProps> = ({ size = 60, strokeWidth = 4 }) => {
  return (
    <div 
      className={styles.loaderContainer} 
      style={{ width: size, height: size }}
    >
      <svg
        className={styles.svg}
        viewBox="0 0 100 100"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Static background ring */}
        <circle
          className={styles.backgroundRing}
          cx="50"
          cy="50"
          r="45"
          strokeWidth={strokeWidth}
        />
        
        {/* Spinning active segment */}
        <circle
          className={styles.activeRing}
          cx="50"
          cy="50"
          r="45"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray="70 200"
        />
      </svg>
      {/* Pulsing glow layer */}
      <div className={styles.glow} />
    </div>
  );
};
