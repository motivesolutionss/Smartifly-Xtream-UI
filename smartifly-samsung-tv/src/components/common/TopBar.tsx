import React, { useState, useEffect } from "react";
import { Search, Settings, Wifi } from "lucide-react";
import { Focusable } from "../tv/Focusable";
import styles from "./TopBar.module.css";

interface TopBarProps {
  onNavigate: (id: "SEARCH" | "SETTINGS") => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onNavigate }) => {
  const [time, setTime] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className={styles.topBar}>
      <div className={styles.leftSection}>
        {/* Placeholder for any left-side info if needed */}
      </div>

      <div className={styles.rightSection}>
        <div className={styles.statusGroup}>
          <span className={styles.time}>{time}</span>
          <Wifi size={20} className={styles.icon} />
        </div>
        
        <div className={styles.actionGroup}>
          <Focusable id="top-search" onEnter={() => onNavigate("SEARCH")} className={styles.actionBtn} variant="pill">
            <Search size={22} />
          </Focusable>
          <Focusable id="top-settings" onEnter={() => onNavigate("SETTINGS")} className={styles.actionBtn} variant="pill">
            <Settings size={22} />
          </Focusable>
        </div>
      </div>
    </div>
  );
};
