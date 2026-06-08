import { FastForward, Rewind } from "lucide-react";
import styles from "../Player.module.css";

type SkipIndicator = {
  direction: "left" | "right";
  amount: number;
};

type PlayerSkipIndicatorProps = {
  skipIndicator: SkipIndicator;
};

export const PlayerSkipIndicator = ({ skipIndicator }: PlayerSkipIndicatorProps) => (
  <div
    key={`${skipIndicator.direction}-${skipIndicator.amount}`}
    className={`${styles.skipIndicator} ${
      skipIndicator.direction === "left" ? styles.skipIndicatorLeft : styles.skipIndicatorRight
    }`}
  >
    {skipIndicator.direction === "left" ? (
      <Rewind size={28} fill="currentColor" />
    ) : (
      <FastForward size={28} fill="currentColor" />
    )}
    <span className={styles.skipIndicatorValue}>
      {skipIndicator.direction === "left" ? "-" : "+"}
      {skipIndicator.amount}s
    </span>
  </div>
);
