import type { CSSProperties } from "react";
import styles from "./ShimmerComponents.module.css";

const className = (name: string) => `${styles.shimmer} ${name}`;

export const ShimmerPosterCard = () => {
  return <div className={className(styles.poster)} aria-hidden="true" />;
};

export const ShimmerLandscapeCard = () => {
  return <div className={className(styles.landscape)} aria-hidden="true" />;
};

export const ShimmerHeroBanner = () => {
  return <div className={className(styles.hero)} aria-hidden="true" />;
};

export const ShimmerText = ({
  width = 180,
  height = 20,
}: {
  width?: number;
  height?: number;
}) => {
  return (
    <div
      className={className(styles.text)}
      style={
        {
          "--shimmer-width": `${width}px`,
          "--shimmer-height": `${height}px`,
        } as CSSProperties
      }
      aria-hidden="true"
    />
  );
};

export const ShimmerBadge = () => {
  return <div className={className(styles.badge)} aria-hidden="true" />;
};
