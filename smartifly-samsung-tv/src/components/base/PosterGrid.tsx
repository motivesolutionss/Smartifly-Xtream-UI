import type { ReactNode } from "react";
import styles from "./PosterGrid.module.css";

type PosterGridProps = {
  children: ReactNode;
};

export const PosterGrid = ({ children }: PosterGridProps) => {
  return <div className={styles.grid}>{children}</div>;
};
