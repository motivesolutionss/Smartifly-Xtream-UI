import React, { useEffect, useState } from "react";
import { createPerfTrace } from "../../utils/perfTrace";
import styles from "./Login.module.css";

const STATUS_MESSAGES = [
  "VALIDATING CREDENTIALS...",
  "ESTABLISHING HANDSHAKE...",
  "SYNCING CONTENT LIBRARIES...",
  "FINALIZING SECURE SESSION..."
];

export const HandshakeView: React.FC = () => {
  const [statusIndex, setStatusIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const trace = createPerfTrace("login_handshake_view");
    const frameId = window.requestAnimationFrame(() => {
      trace.end({
        status: "visible",
        metricName: "login_handshake_view_total_ms",
        slowAboveMs: 250,
      });
    });

    return () => {
      window.cancelAnimationFrame(frameId);
      if (!trace.isClosed()) {
        trace.end({
          status: "dismissed",
          metricName: "login_handshake_view_total_ms",
        });
      }
    };
  }, []);

  useEffect(() => {
    let currentProgress = 0;
    const interval = setInterval(() => {
      // Randomly increment progress to feel "real" (sometimes fast, sometimes slow)
      const increment = Math.random() * 15; 
      currentProgress = Math.min(currentProgress + increment, 98); // Stop at 98% until finished
      setProgress(currentProgress);
      
      // Update status based on progress
      if (currentProgress > 75) setStatusIndex(3);
      else if (currentProgress > 50) setStatusIndex(2);
      else if (currentProgress > 25) setStatusIndex(1);
    }, 800);

    return () => clearInterval(interval);
  }, []);

  // Calculate SVG dash offset
  // Circumference = 2 * PI * R (R=45) = ~283
  const circumference = 283;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className={styles.handshakeContainer}>
      <div className={styles.handshakeContent}>
        <div className={styles.handshakeIconAreaMinimal}>
          {/* Professional Circular Loader with Realistic Progress */}
          <svg className={styles.handshakeCircularLoader} viewBox="0 0 100 100">
            <circle 
              className={styles.loaderBg} 
              cx="50" cy="50" r="45" 
            />
            <circle 
              className={styles.loaderPathRealistic} 
              cx="50" cy="50" r="45"
              style={{ 
                strokeDasharray: circumference, 
                strokeDashoffset: offset,
                transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            />
          </svg>
          <img src="/smartifly_icon.webp" alt="Smartifly" className={styles.handshakeLogoMinimal} />
        </div>

        <div className={styles.handshakeStatusArea}>
          <h2 className={styles.loadingTextMinimal}>{STATUS_MESSAGES[statusIndex]}</h2>
          <div className={styles.progressPercent}>{Math.round(progress)}%</div>
          <p className={styles.handshakeSubText}>Secure connection in progress</p>
        </div>
      </div>
    </div>
  );
};
