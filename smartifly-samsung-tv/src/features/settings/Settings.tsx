import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  User,
  LogOut,
  Plus,
  Trash2,
  Database,
  ListVideo,
  Shield,
  RadioTower,
  CheckCircle2,
  Circle,
  ChevronRight,
  CheckCheck,
} from "lucide-react";
import { Focusable } from "../../components/tv/Focusable";
import { Loader } from "../../components/ui/Loader";
import { ErrorView } from "../../components/common/ErrorView";
import { TvKeyboard } from "../../components/ui/TvKeyboard";
import { useAccountInfo } from "./hooks/useAccountInfo";
import { services, initializeServices } from "../../services";
import { playlistStorage } from "../../storage/playlistStorage";
import { useAuthStore } from "../../store/authStore";
import { useSettingsStore } from "../../store/settingsStore";
import { useFocus } from "../../providers/useFocus";
import { useTvBack } from "../../hooks/useTvBack";
import { useProfileStore } from "../../store/profileStore";
import styles from "./Settings.module.css";

// ─── Types ────────────────────────────────────────────────────────────────────

type SectionId = "account" | "playback" | "security" | "playlists" | "profiles" | "data" | "session";

interface NavSection {
  id: SectionId;
  label: string;
  icon: React.FC<{ size?: number; className?: string }>;
  subtitle: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const NAV_SECTIONS: NavSection[] = [
  { id: "account",   label: "Account",    icon: User,       subtitle: "Subscription status and connection info" },
  { id: "playback",  label: "Playback",   icon: RadioTower, subtitle: "Stream format and autoplay behaviour" },
  { id: "security",  label: "Security",   icon: Shield,     subtitle: "Parental controls and PIN management" },
  { id: "playlists", label: "Playlists",  icon: ListVideo,  subtitle: "Manage and switch between IPTV sources" },
  { id: "profiles",  label: "Profiles",   icon: User,       subtitle: "Switch active profile and manage users" },
  { id: "data",      label: "Device Data",icon: Database,   subtitle: "Clear cached content and local preferences" },
  { id: "session",   label: "Session",    icon: LogOut,     subtitle: "Sign out and return to login screen" },
];

const formatDate = (value?: string) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
};

const getFirstFocusIdForSection = (
  section: SectionId,
  playlistCount: number
): string => {
  const firstFocusMap: Record<SectionId, string> = {
    account: "settings-nav-account",
    playback: "settings-live-ext-ts",
    security: "settings-parental-lock",
    playlists: playlistCount > 0 ? "settings-playlist-switch-0" : "settings-add-playlist",
    profiles: "settings-switch-profile",
    data: "settings-clear-data",
    session: "settings-logout",
  };

  return firstFocusMap[section];
};

// ─── Component ────────────────────────────────────────────────────────────────

export const Settings: React.FC = () => {
  const [activeSection, setActiveSection] = useState<SectionId>("account");
  const [isPinEditorOpen, setIsPinEditorOpen] = useState(false);
  const [pinDraft, setPinDraft] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const { setFocus } = useFocus();
  const setActivePlaylist = useAuthStore((store) => store.setActivePlaylist);
  const selectProfile = useProfileStore((store) => store.selectProfile);
  const activeProfile = useProfileStore((store) => store.activeProfile);

  const {
    liveExtension,
    autoplayLiveOnFocus,
    enableParentalLock,
    parentalPin,
    setLiveExtension,
    setAutoplayLiveOnFocus,
    setParentalLock,
    setParentalPin,
    lockParentalSession,
    resetSettings,
  } = useSettingsStore();

  const { data: account, isLoading: isAccountLoading, isError: isAccountError, refetch: refetchAccount } = useAccountInfo();

  const { data: playlists = [], isLoading: isPlaylistLoading, isError: isPlaylistError, refetch: refetchPlaylists } = useQuery({
    queryKey: ["settings-playlists"],
    queryFn: () => services.userData.getPlaylists(),
    retry: false,
    staleTime: 15 * 1000,
  });

  const activePlaylistId = playlistStorage.getActivePlaylistId();
  const activePlaylist = useMemo(
    () => playlists.find((p) => p.id === activePlaylistId) || null,
    [activePlaylistId, playlists]
  );

  // Initial focus on first nav item
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setFocus("settings-nav-account"));
    return () => window.cancelAnimationFrame(frame);
  }, [setFocus]);

  // When section changes, focus the first interactive element in that section
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setFocus(getFirstFocusIdForSection(activeSection, playlists.length));
    });
    return () => window.cancelAnimationFrame(frame);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection]);

  useTvBack(() => setFocus(getFirstFocusIdForSection(activeSection, playlists.length)));

  // ── Actions ──────────────────────────────────────────────────────────────

  const switchPlaylist = useCallback(async (playlistId: string) => {
    const next = playlists.find((p) => p.id === playlistId);
    if (!next) return;
    setBusyAction("switch-playlist");
    try {
      await services.userData.setActivePlaylistId(next.id);
      initializeServices(next.serverUrl, next.username, next.password);
      setActivePlaylist(next);
      window.location.reload();
    } finally {
      setBusyAction(null);
    }
  }, [playlists, setActivePlaylist]);

  const deletePlaylist = useCallback(async (playlistId: string) => {
    setBusyAction("delete-playlist");
    try {
      await services.userData.deletePlaylist(playlistId);
      const updated = await services.userData.getPlaylists();
      if (activePlaylistId === playlistId) {
        const fallback = updated[0] ?? null;
        await services.userData.setActivePlaylistId(fallback?.id ?? null);
        setActivePlaylist(fallback);
        if (fallback) initializeServices(fallback.serverUrl, fallback.username, fallback.password);
        window.location.reload();
        return;
      }
      await refetchPlaylists();
      setActionFeedback("Playlist removed successfully.");
    } finally {
      setBusyAction(null);
    }
  }, [activePlaylistId, refetchPlaylists, setActivePlaylist]);

  const handleAddPlaylist = useCallback(async () => {
    setBusyAction("add-playlist");
    try {
      await services.userData.setActivePlaylistId(null);
      setActivePlaylist(null);
      window.location.reload();
    } finally {
      setBusyAction(null);
    }
  }, [setActivePlaylist]);

  const handleClearUserData = useCallback(async () => {
    setBusyAction("clear-local-data");
    try {
      await Promise.all([services.userData.clearFavorites(), services.userData.clearRecentlyWatched()]);
      resetSettings();
      setActionFeedback("Favorites, watch history, and preferences cleared.");
    } finally {
      setBusyAction(null);
    }
  }, [resetSettings]);

  const handlePinSubmit = useCallback((value: string) => {
    if (!/^\d{4,6}$/.test(value)) { setPinError("PIN must be 4–6 digits."); return; }
    setParentalPin(value);
    setPinDraft("");
    setPinError(null);
    setIsPinEditorOpen(false);
    setActionFeedback("Parental PIN updated.");
  }, [setParentalPin]);

  const handleLogout = useCallback(async () => {
    setBusyAction("sign-out");
    try {
      await services.userData.setActivePlaylistId(null);
      setActivePlaylist(null);
      window.location.reload();
    } finally {
      setBusyAction(null);
    }
  }, [setActivePlaylist]);

  // ── Nav keyboard handler ──────────────────────────────────────────────────

  const handleNavKeyDown = useCallback((e: React.KeyboardEvent, index: number, sectionId: SectionId) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (index > 0) setFocus(`settings-nav-${NAV_SECTIONS[index - 1].id}`);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (index < NAV_SECTIONS.length - 1) setFocus(`settings-nav-${NAV_SECTIONS[index + 1].id}`);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      setFocus("nav-SETTINGS");
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      setActiveSection(sectionId);
    } else if (e.key === "Enter") {
      e.preventDefault();
      setActiveSection(sectionId);
    }
  }, [setFocus]);

  // ── Loading / error ───────────────────────────────────────────────────────

  if (isAccountLoading || isPlaylistLoading) {
    return <div className={styles.loading}><Loader /></div>;
  }

  if (isAccountError) {
    return (
      <ErrorView
        message="Unable to load account details."
        onRetry={() => {
          void refetchAccount();
        }}
        showBackToLogin
      />
    );
  }

  // ── Section renderers ─────────────────────────────────────────────────────

  const renderAccount = () => {
    const statusClass =
      account?.status === "Active" ? styles.statusActive :
      account?.status === "Banned" ? styles.statusBanned :
      styles.statusExpired;

    return (
      <div className={styles.section} key="account">
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>Account</h2>
          <p className={styles.sectionSubtitle}>Your subscription details and server connection status.</p>
        </div>

        <div className={styles.card}>
          <p className={styles.cardTitle}>Subscription</p>
          <div className={styles.infoGrid}>
            <div className={styles.infoCell}>
              <span className={styles.infoCellLabel}>Username</span>
              <span className={styles.infoCellValue}>{account?.username || "Guest"}</span>
            </div>
            <div className={styles.infoCell}>
              <span className={styles.infoCellLabel}>Status</span>
              <span className={`${styles.infoCellValue} ${statusClass}`}>{account?.status || "Unknown"}</span>
            </div>
            <div className={styles.infoCell}>
              <span className={styles.infoCellLabel}>Expiry Date</span>
              <span className={styles.infoCellValue}>{formatDate(account?.expiryDate)}</span>
            </div>
            <div className={styles.infoCell}>
              <span className={styles.infoCellLabel}>Connections</span>
              <span className={styles.infoCellValue}>
                {account?.activeConnections ?? 0} / {account?.maxConnections ?? 1} active
              </span>
            </div>
          </div>
        </div>

        <div className={styles.card}>
          <p className={styles.cardTitle}>Server</p>
          <div className={styles.infoGrid}>
            <div className={styles.infoCell}>
              <span className={styles.infoCellLabel}>Server URL</span>
              <span className={styles.infoCellValue} style={{ fontSize: "0.82rem", wordBreak: "break-all" }}>
                {activePlaylist?.serverUrl || "—"}
              </span>
            </div>
            <div className={styles.infoCell}>
              <span className={styles.infoCellLabel}>Active Playlist</span>
              <span className={styles.infoCellValue}>{activePlaylist?.name || "None"}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderPlayback = () => (
    <div className={styles.section} key="playback">
      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle}>Playback</h2>
        <p className={styles.sectionSubtitle}>Configure how live streams and content are delivered.</p>
      </div>

      <div className={styles.card}>
        <p className={styles.cardTitle}>Live Stream Format</p>

        <div className={styles.settingRow}>
          <div className={styles.settingInfo}>
            <span className={styles.settingLabel}>Stream extension</span>
            <span className={styles.settingDesc}>
              Use .ts for most providers. Switch to .m3u8 if streams fail to load.
            </span>
          </div>
          <div className={styles.pillGroup}>
            <Focusable
              id="settings-live-ext-ts"
              onEnter={() => setLiveExtension("ts")}
              disableFocusEffects
              className={`${styles.pill} ${liveExtension === "ts" ? styles.pillActive : ""}`}
            >
              {liveExtension === "ts" && <CheckCircle2 size={18} />}
              <span>.ts</span>
            </Focusable>
            <Focusable
              id="settings-live-ext-m3u8"
              onEnter={() => setLiveExtension("m3u8")}
              disableFocusEffects
              className={`${styles.pill} ${liveExtension === "m3u8" ? styles.pillActive : ""}`}
            >
              {liveExtension === "m3u8" && <CheckCircle2 size={18} />}
              <span>.m3u8</span>
            </Focusable>
          </div>
        </div>

        <div className={styles.settingRow}>
          <div className={styles.settingInfo}>
            <span className={styles.settingLabel}>Autoplay live preview on focus</span>
            <span className={styles.settingDesc}>
              Automatically starts a muted preview when a live channel is highlighted.
            </span>
          </div>
          <Focusable
            id="settings-autoplay-live"
            onEnter={() => setAutoplayLiveOnFocus(!autoplayLiveOnFocus)}
            disableFocusEffects
            className={`${styles.toggle} ${autoplayLiveOnFocus ? styles.toggleOn : ""}`}
          >
            {autoplayLiveOnFocus ? <CheckCircle2 size={20} /> : <Circle size={20} />}
            <span>{autoplayLiveOnFocus ? "On" : "Off"}</span>
          </Focusable>
        </div>
      </div>
    </div>
  );

  const renderSecurity = () => (
    <div className={styles.section} key="security">
      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle}>Security</h2>
        <p className={styles.sectionSubtitle}>Restrict access to content with a parental PIN.</p>
      </div>

      <div className={styles.card}>
        <p className={styles.cardTitle}>Parental Controls</p>

        <div className={styles.settingRow}>
          <div className={styles.settingInfo}>
            <span className={styles.settingLabel}>Parental lock</span>
            <span className={styles.settingDesc}>
              Requires PIN entry before playing VOD and series content.
            </span>
          </div>
          <Focusable
            id="settings-parental-lock"
            onEnter={() => {
              setParentalLock(!enableParentalLock);
              if (!enableParentalLock) lockParentalSession();
            }}
            disableFocusEffects
            className={`${styles.toggle} ${enableParentalLock ? styles.toggleOn : ""}`}
          >
            {enableParentalLock ? <CheckCircle2 size={20} /> : <Circle size={20} />}
            <span>{enableParentalLock ? "Enabled" : "Disabled"}</span>
          </Focusable>
        </div>

        <div className={styles.settingRow}>
          <div className={styles.settingInfo}>
            <span className={styles.settingLabel}>Parental PIN</span>
            <span className={styles.settingDesc}>
              Current PIN: {"•".repeat(parentalPin.length)} — Change to a 4–6 digit code.
            </span>
          </div>
          <Focusable
            id="settings-parental-pin"
            onEnter={() => { setPinError(null); setPinDraft(""); setIsPinEditorOpen(true); }}
            disableFocusEffects
            className={styles.pill}
          >
            <span>Change PIN</span>
            <ChevronRight size={18} />
          </Focusable>
        </div>
      </div>
    </div>
  );

  const renderPlaylists = () => (
    <div className={styles.section} key="playlists">
      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle}>Playlists</h2>
        <p className={styles.sectionSubtitle}>Switch between IPTV sources or add a new one.</p>
      </div>

      <div className={styles.card}>
        <p className={styles.cardTitle}>Saved Sources ({playlists.length})</p>

        {isPlaylistError ? (
          <p className={styles.inlineError}>Playlist list unavailable. Check your connection and retry.</p>
        ) : (
          <>
            {playlists.map((playlist, index) => {
              const isActive = playlist.id === activePlaylist?.id;
              return (
                <div
                  key={playlist.id}
                  className={`${styles.playlistItem} ${isActive ? styles.playlistItemActive : ""}`}
                >
                  <div className={`${styles.playlistDot} ${isActive ? styles.playlistDotActive : ""}`} />
                  <div className={styles.playlistBody}>
                    <span className={styles.playlistName}>{playlist.name}</span>
                    <span className={styles.playlistServer}>{playlist.serverUrl}</span>
                  </div>
                  <div className={styles.playlistActions}>
                    <Focusable
                      id={`settings-playlist-switch-${index}`}
                      onEnter={() => {
                        if (busyAction || isActive) return;
                        void switchPlaylist(playlist.id);
                      }}
                      disableFocusEffects
                      className={`${styles.playlistBtn} ${isActive ? styles.playlistBtnActive : ""}`}
                    >
                      {isActive ? <CheckCheck size={17} /> : null}
                      <span>
                        {isActive ? "Active" : busyAction === "switch-playlist" ? "Switching…" : "Switch"}
                      </span>
                    </Focusable>
                    <Focusable
                      id={`settings-playlist-delete-${index}`}
                      onEnter={() => {
                        if (busyAction || playlists.length <= 1) return;
                        void deletePlaylist(playlist.id);
                      }}
                      disableFocusEffects
                      className={`${styles.playlistBtn} ${styles.playlistBtnDanger}`}
                    >
                      <Trash2 size={17} />
                    </Focusable>
                  </div>
                </div>
              );
            })}

            <Focusable
              id="settings-add-playlist"
              onEnter={() => { if (busyAction) return; void handleAddPlaylist(); }}
              disableFocusEffects
              className={styles.addPlaylistBtn}
            >
              <Plus size={22} />
              <span>{busyAction === "add-playlist" ? "Opening…" : "Add New Playlist"}</span>
            </Focusable>
          </>
        )}
      </div>
    </div>
  );

  const renderData = () => (
    <div className={styles.section} key="data">
      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle}>Device Data</h2>
        <p className={styles.sectionSubtitle}>Manage locally stored content and app preferences.</p>
      </div>

      <div className={styles.card}>
        <p className={styles.cardTitle}>Storage Actions</p>

        <Focusable
          id="settings-clear-data"
          onEnter={() => { if (busyAction) return; void handleClearUserData(); }}
          disableFocusEffects
          className={styles.actionRow}
        >
          <Trash2 size={24} className={styles.actionRowIcon} />
          <div className={styles.actionRowBody}>
            <span className={styles.actionRowTitle}>Clear local data</span>
            <span className={styles.actionRowSub}>Removes favorites, watch history, and app preferences</span>
          </div>
          <span className={styles.actionRowBadge}>
            {busyAction === "clear-local-data" ? "Working…" : "Run"}
          </span>
        </Focusable>
      </div>

      <div className={styles.versionFooter}>
        <span className={styles.versionText}>Smartifly for Samsung TV · v1.0.0</span>
        <span className={styles.versionText}>Tizen Web Application</span>
      </div>
    </div>
  );

  const renderSession = () => (
    <div className={styles.section} key="session">
      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle}>Session</h2>
        <p className={styles.sectionSubtitle}>Sign out and return to the playlist login screen.</p>
      </div>

      <div className={styles.card}>
        <p className={styles.cardTitle}>Current Session</p>

        <div className={styles.infoGrid} style={{ marginBottom: "1.2rem" }}>
          <div className={styles.infoCell}>
            <span className={styles.infoCellLabel}>Signed in as</span>
            <span className={styles.infoCellValue}>{account?.username || "Guest"}</span>
          </div>
          <div className={styles.infoCell}>
            <span className={styles.infoCellLabel}>Active source</span>
            <span className={styles.infoCellValue}>{activePlaylist?.name || "None"}</span>
          </div>
        </div>

        <Focusable
          id="settings-logout"
          onEnter={() => { if (busyAction) return; void handleLogout(); }}
          disableFocusEffects
          className={`${styles.actionRow} ${styles.actionRowDanger}`}
        >
          <LogOut size={24} className={styles.actionRowIcon} />
          <div className={styles.actionRowBody}>
            <span className={styles.actionRowTitle}>Sign out from this TV</span>
            <span className={styles.actionRowSub}>Returns to login — your playlists will be remembered</span>
          </div>
          <span className={styles.actionRowBadge}>
            {busyAction === "sign-out" ? "Working…" : "Sign Out"}
          </span>
        </Focusable>
      </div>
    </div>
  );

  const renderProfiles = () => (
    <div className={styles.section} key="profiles">
      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle}>Profiles</h2>
        <p className={styles.sectionSubtitle}>Switch active profile or edit user settings.</p>
      </div>

      <div className={styles.card}>
        <p className={styles.cardTitle}>Current Profile</p>

        <div className={styles.infoGrid} style={{ marginBottom: "1.2rem" }}>
          <div className={styles.infoCell}>
            <span className={styles.infoCellLabel}>Active Profile</span>
            <span className={styles.infoCellValue}>{activeProfile?.name || "Viewer"}</span>
          </div>
          <div className={styles.infoCell}>
            <span className={styles.infoCellLabel}>Theme Color</span>
            <span className={styles.infoCellValue} style={{ color: activeProfile?.avatarColor || "#fff" }}>
              {activeProfile?.avatarColor || "Default"}
            </span>
          </div>
        </div>

        <Focusable
          id="settings-switch-profile"
          onEnter={() => selectProfile(null)}
          disableFocusEffects
          className={styles.actionRow}
        >
          <User size={24} className={styles.actionRowIcon} />
          <div className={styles.actionRowBody}>
            <span className={styles.actionRowTitle}>Switch Active Profile</span>
            <span className={styles.actionRowSub}>Goes to the profile selection screen to swap users</span>
          </div>
          <span className={styles.actionRowBadge}>Switch</span>
        </Focusable>
      </div>
    </div>
  );

  const sectionContent: Record<SectionId, React.ReactNode> = {
    account:   renderAccount(),
    playback:  renderPlayback(),
    security:  renderSecurity(),
    playlists: renderPlaylists(),
    profiles:  renderProfiles(),
    data:      renderData(),
    session:   renderSession(),
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className={styles.container}>
      {/* Left navigation rail */}
      <nav className={styles.nav}>
        <div className={styles.navHeader}>
          <span className={styles.navEyebrow}>Smartifly</span>
          <h1 className={styles.navTitle}>Settings</h1>
        </div>

        {NAV_SECTIONS.map((section, index) => {
          const Icon = section.icon;
          const isActive = activeSection === section.id;
          return (
            <Focusable
              key={section.id}
              id={`settings-nav-${section.id}`}
              onEnter={() => setActiveSection(section.id)}
              onKeyDown={(e) => handleNavKeyDown(e, index, section.id)}
              disableFocusEffects
              className={`${styles.navItem} ${isActive ? styles.navItemActive : ""}`}
            >
              <Icon size={22} className={styles.navIcon} />
              <span>{section.label}</span>
            </Focusable>
          );
        })}
      </nav>

      {/* Right content panel */}
      <div className={styles.content}>
        {actionFeedback && (
          <div className={styles.feedback}>
            <CheckCircle2 size={20} />
            {actionFeedback}
          </div>
        )}
        {sectionContent[activeSection]}
      </div>

      {/* PIN editor overlay */}
      {isPinEditorOpen && (
        <div className={styles.pinOverlay}>
          <TvKeyboard
            title="Set Parental PIN"
            value={pinDraft}
            mode="password"
            variant="modal"
            placeholder="Enter 4 to 6 digits"
            maskValue
            maxLength={6}
            onChange={setPinDraft}
            onSubmit={handlePinSubmit}
            onClose={() => setIsPinEditorOpen(false)}
          />
          {pinError && <p className={styles.pinError}>{pinError}</p>}
        </div>
      )}
    </div>
  );
};
