import { TvKeyboard } from "../../../components/ui/TvKeyboard";
import type { ActivePlaybackItem } from "../../../store/playerStore";
import styles from "../Player.module.css";

type PlayerParentalOverlayProps = {
  activePlaybackItem: ActivePlaybackItem;
  parentalError: string | null;
  onChange: () => void;
  onSubmit: (value: string) => void;
  onClose: () => void;
};

export const PlayerParentalOverlay = ({
  activePlaybackItem,
  parentalError,
  onChange,
  onSubmit,
  onClose,
}: PlayerParentalOverlayProps) => (
  <div className={styles.parentalOverlay}>
    <TvKeyboard
      key={`parental-${activePlaybackItem.id}-${activePlaybackItem.contentType}`}
      title="Parental Lock"
      value=""
      mode="password"
      variant="modal"
      placeholder="Enter your parental PIN"
      maskValue
      maxLength={6}
      onChange={onChange}
      onSubmit={onSubmit}
      onClose={onClose}
    />
    {parentalError && <p className={styles.parentalError}>{parentalError}</p>}
  </div>
);
