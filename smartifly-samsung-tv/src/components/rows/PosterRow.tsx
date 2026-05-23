import type { ReactNode } from "react";
import styles from "./PosterRow.module.css";

type PosterRowProps = {
  title: string;
  children: ReactNode;
};

export const PosterRow = ({ title, children }: PosterRowProps) => {
  return (
    <section className={styles.row}>
      <h2 className={styles.title}>{title}</h2>
      <div className={styles.items}>{children}</div>
    </section>
  );
};
