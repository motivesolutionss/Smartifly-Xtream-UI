import React from "react";
import { Mic } from "lucide-react";
import styles from "../Search.module.css";

type SearchVoiceOverlayProps = {
  voiceTelemetry: string;
};

export const SearchVoiceOverlay: React.FC<SearchVoiceOverlayProps> = ({
  voiceTelemetry,
}) => {
  return (
    <div className={styles.voiceOverlay}>
      <div className={styles.voicePulse}>
        <Mic size={44} />
      </div>
      <h3>Listening...</h3>
      <p>{voiceTelemetry}</p>
    </div>
  );
};
