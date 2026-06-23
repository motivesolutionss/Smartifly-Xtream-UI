import React, { useEffect } from "react";
import {
  Home,
  Tv,
  Film,
  Clapperboard,
  Library,
  Search,
  Settings,
  Smile,
  Star,
  Heart,
} from "lucide-react";
import { Focusable } from "../tv/Focusable";
import { useProfileStore } from "../../store/profileStore";
import { useFocus } from "../../providers/useFocus";
import { logger } from "../../utils/logger";
import styles from "./Sidebar.module.css";
 
interface SidebarProps {
  activeId:
    | "HOME"
    | "LIVE"
    | "VOD"
    | "SERIES"
    | "LIBRARY"
    | "SEARCH"
    | "SETTINGS";
  onNavigate: (
    id:
      | "HOME"
      | "LIVE"
      | "VOD"
      | "SERIES"
      | "LIBRARY"
      | "SEARCH"
      | "SETTINGS"
  ) => void;
}
 
type SidebarNavId = SidebarProps["activeId"];
 
const AVATAR_ICONS: Record<
  string,
  React.ComponentType<{ className?: string; size?: number }>
> = {
  smile: Smile,
  tv: Tv,
  film: Film,
  clapperboard: Clapperboard,
  heart: Heart,
  star: Star,
};
 
export const Sidebar: React.FC<SidebarProps> = ({ activeId, onNavigate }) => {
  const activeProfile = useProfileStore((state) => state.activeProfile);
  const selectProfile = useProfileStore((state) => state.selectProfile);
  const { focusedId } = useFocus();
  const isExpanded = focusedId?.startsWith("nav-") ?? false;

  useEffect(() => {
    if (
      focusedId === "nav-profile" ||
      focusedId === "nav-HOME" ||
      focusedId === "hero-play" ||
      focusedId === "top-search" ||
      focusedId === "top-settings"
    ) {
      logger.debug("sidebar_focus_state", {
        focusedId,
        isExpanded,
        activeId,
      });
    }
  }, [activeId, focusedId, isExpanded]);
 
  const navItems: {
    id: SidebarNavId;
    icon: React.ComponentType<{ className?: string; size?: number }>;
    label: string;
  }[] = [
    { id: "HOME", icon: Home, label: "Home" },
    { id: "LIVE", icon: Tv, label: "Live TV" },
    { id: "VOD", icon: Film, label: "Movies" },
    { id: "SERIES", icon: Clapperboard, label: "Series" },
    { id: "LIBRARY", icon: Library, label: "Library" },
    { id: "SEARCH", icon: Search, label: "Search" },
    { id: "SETTINGS", icon: Settings, label: "Settings" },
  ];
 
  return (
    <aside
      className={`${styles.sidebar} ${isExpanded ? styles.expanded : ""} smartifly-sidebar ${
        isExpanded ? "expanded" : ""
      }`}
    >
      <div className={styles.logoSection}>
        {activeProfile ? (
          <Focusable
            id="nav-profile"
            className={styles.profileBtn}
            disableFocusEffects={true}
            allowGlobalAutoFocus={false}
            onEnter={() => selectProfile(null)}
          >
            <div
              className={styles.avatarContainer}
              style={{ backgroundColor: activeProfile.avatarColor }}
            >
              {React.createElement(AVATAR_ICONS[activeProfile.avatarIcon] || Smile, {
                className: styles.avatarIcon,
                size: 26,
              })}
            </div>
            <span className={styles.profileLabel}>{activeProfile.name}</span>
          </Focusable>
        ) : (
          <img src="/smartifly_icon.webp" alt="Logo" className={styles.logo} />
        )}
      </div>

      <nav className={styles.nav}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeId === item.id;
          return (
            <Focusable
              key={item.id}
              id={`nav-${item.id}`}
              className={`${styles.navItem} ${isActive ? styles.active : ""}`}
              disableFocusEffects={true}
              allowGlobalAutoFocus={false}
              onEnter={() => onNavigate(item.id)}
            >
              <Icon className={styles.icon} size={26} />
              <span className={styles.label}>{item.label}</span>
            </Focusable>
          );
        })}
      </nav>
    </aside>
  );
};
