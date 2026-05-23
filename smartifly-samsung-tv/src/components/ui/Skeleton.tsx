import React from "react";
import styles from "./Skeleton.module.css";

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width,
  height,
  borderRadius,
  className = "",
}) => {
  return (
    <div
      className={`${styles.skeleton} ${className}`}
      style={{
        width,
        height,
        borderRadius,
      }}
    />
  );
};

export const HeroSkeleton: React.FC = () => (
  <Skeleton width="100%" height="600px" borderRadius="0" className={styles.heroShimmer} />
);

export const CardSkeleton: React.FC<{ aspectRatio?: "poster" | "landscape" | "square" }> = ({ 
  aspectRatio = "poster" 
}) => {
  const dims = {
    poster: { width: "160px", height: "240px" },
    landscape: { width: "280px", height: "160px" },
    square: { width: "200px", height: "200px" },
  };

  return (
    <Skeleton 
      width={dims[aspectRatio].width} 
      height={dims[aspectRatio].height} 
      borderRadius="12px" 
    />
  );
};
