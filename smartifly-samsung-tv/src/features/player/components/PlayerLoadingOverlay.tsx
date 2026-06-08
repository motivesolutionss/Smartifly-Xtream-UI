import { Loader } from "../../../components/ui/Loader";
import styles from "../Player.module.css";

type PlayerLoadingOverlayProps = {
  playerState: "LOADING" | "BUFFERING";
};

export const PlayerLoadingOverlay = ({ playerState }: PlayerLoadingOverlayProps) => (
  <div className={styles.loadingOverlay}>
    <Loader size={80} />
    <p className={styles.loadingLabel}>
      {playerState === "LOADING" ? "Loading stream…" : "Buffering…"}
    </p>
  </div>
);
