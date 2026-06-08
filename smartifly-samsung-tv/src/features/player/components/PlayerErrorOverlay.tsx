import { Focusable } from "../../../components/tv/Focusable";
import styles from "../Player.module.css";

type PlayerErrorOverlayProps = {
  message: string;
  onRetry: () => void;
  onBack: () => void;
};

export const PlayerErrorOverlay = ({
  message,
  onRetry,
  onBack,
}: PlayerErrorOverlayProps) => (
  <div className={styles.errorOverlay}>
    <h2 className={styles.errorTitle}>Playback Error</h2>
    <p className={styles.errorMessage}>{message}</p>
    <div className={styles.errorActions}>
      <Focusable
        id="player-retry"
        onEnter={onRetry}
        disableFocusEffects
        className={styles.retryBtn}
      >
        <span>Retry Stream</span>
      </Focusable>
      <Focusable
        id="player-error-back"
        onEnter={onBack}
        disableFocusEffects
        className={styles.backBtn}
      >
        <span>Back to List</span>
      </Focusable>
    </div>
  </div>
);
