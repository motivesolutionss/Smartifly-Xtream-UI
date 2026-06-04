import React from "react";
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
  const { activeProfile, selectProfile } = useProfileStore();
 
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
    <aside className={`${styles.sidebar} smartifly-sidebar`}>
      <div className={styles.logoSection}>
        {activeProfile ? (
          <Focusable
            id="nav-profile"
            className={styles.profileBtn}
            disableFocusEffects={true}
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
          <img src="/smartifly_logo.png" alt="Logo" className={styles.logo} />
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
