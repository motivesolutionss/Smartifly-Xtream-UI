import React, { useEffect, useState } from "react";
import { Search, Settings, Wifi } from "lucide-react";
import { Focusable } from "../tv/Focusable";
import styles from "./TopBar.module.css";

interface TopBarProps {
  onNavigate: (id: "SEARCH" | "SETTINGS") => void;
}

const formatClockTime = () =>
  new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const ClockDisplay = React.memo(function ClockDisplay() {
  const [time, setTime] = useState(formatClockTime);

  useEffect(() => {
    let timerId = 0;

    const scheduleNextTick = () => {
      setTime(formatClockTime());

      const now = new Date();
      const nextMinuteDelay =
        ((59 - now.getSeconds()) * 1000) + (1000 - now.getMilliseconds());

      timerId = window.setTimeout(scheduleNextTick, Math.max(250, nextMinuteDelay));
    };

    scheduleNextTick();

    return () => {
      window.clearTimeout(timerId);
    };
  }, []);

  return <span className={styles.time}>{time}</span>;
});

export const TopBar: React.FC<TopBarProps> = React.memo(function TopBar({ onNavigate }) {
  return (
    <div className={styles.topBar}>
      <div className={styles.leftSection}>
        {/* Placeholder for any left-side info if needed */}
      </div>

      <div className={styles.rightSection}>
        <div className={styles.statusGroup}>
          <ClockDisplay />
          <Wifi size={20} className={styles.icon} />
        </div>
        
        <div className={styles.actionGroup}>
          <Focusable
            id="top-search"
            onEnter={() => onNavigate("SEARCH")}
            className={styles.actionBtn}
            variant="pill"
            allowGlobalAutoFocus={false}
          >
            <Search size={22} />
          </Focusable>
          <Focusable
            id="top-settings"
            onEnter={() => onNavigate("SETTINGS")}
            className={styles.actionBtn}
            variant="pill"
            allowGlobalAutoFocus={false}
          >
            <Settings size={22} />
          </Focusable>
        </div>
      </div>
    </div>
  );
});
