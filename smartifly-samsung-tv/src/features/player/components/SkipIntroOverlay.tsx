import React, { useEffect } from "react";
import { SkipForward } from "lucide-react";
import { Focusable } from "../../../components/tv/Focusable";
import { useFocus } from "../../../providers/useFocus";
import styles from "./SkipIntroOverlay.module.css";

type SkipIntroOverlayProps = {
  isVisible: boolean;
  onSkip: () => void;
};

const SkipIntroOverlayComponent: React.FC<SkipIntroOverlayProps> = ({ isVisible, onSkip }) => {
  const { setFocus } = useFocus();

  // Focus the skip button whenever it appears.
  useEffect(() => {
    if (!isVisible) return;
    const frame = window.requestAnimationFrame(() => {
      setFocus("player-skip-intro");
    });
    return () => window.cancelAnimationFrame(frame);
  }, [isVisible, setFocus]);

  // When the overlay disappears (user ignored it or it expired past the 95s window),
  // restore focus to the play/pause button so it isn't left on a dead element.
  useEffect(() => {
    return () => {
      setFocus("player-playpause");
    };
  }, [setFocus]);

  if (!isVisible) return null;

  return (
    <div className={styles.container}>
      <Focusable
        id="player-skip-intro"
        onEnter={onSkip}
        disableFocusEffects
        className={styles.button}
      >
        <SkipForward size={18} />
        <span>Skip Intro</span>
      </Focusable>
    </div>
  );
};

export const SkipIntroOverlay = React.memo(SkipIntroOverlayComponent);
