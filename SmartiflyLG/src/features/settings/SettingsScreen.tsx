import { type KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  contentScreen,
  eyebrow,
  mergeStyle,
  panelAction,
  panelActionActive,
  panelActionGhost,
  panelActions,
  panelCardGrid,
  panelCopy,
  panelHeader,
  panelInfoCard,
  panelInfoLabel,
  panelInfoValue,
  panelScreenBase,
  panelSidebar,
  panelTitle,
  settingsMenuItem,
  settingsMenuItemActive,
  settingsMenuItemCopy,
  settingsMenuItemTitle,
  settingsMenuItemTitleActive,
  settingsMenuList,
  settingsPanel,
  settingsProfileAvatar,
  settingsProfileAvatarKids,
  settingsProfileCard,
  settingsProfileCardActive,
  settingsProfileGrid,
  settingsProfileName,
  settingsSection,
  settingsToggle,
  settingsToggleActive,
  settingsToggleHint,
  settingsToggleTitle,
  settingsToggleValue
} from '../../styles/lgTvStyles';
import { useAppStore } from '../../store/appStore';
import useSettingsStore from '../../store/settingsStore';
import useWatchlistStore, { buildWatchlistScope } from '../../store/watchlistStore';

type SettingsSection = 'account' | 'profiles' | 'playback' | 'app' | 'about';

type SettingsMenuItem = {
  id: SettingsSection;
  label: string;
  hint: string;
};

type SettingsScreenProps = {
  onRequestSidebarFocus: () => void;
};

function SettingsScreen({ onRequestSidebarFocus }: SettingsScreenProps) {
  const session = useAppStore((state) => state.session);
  const profiles = useAppStore((state) => state.profiles);
  const selectedProfile = useAppStore((state) => state.selectedProfile);
  const selectProfile = useAppStore((state) => state.selectProfile);
  const signOut = useAppStore((state) => state.signOut);
  const setStatusMessage = useAppStore((state) => state.setStatusMessage);
  const scope = useMemo(() => buildWatchlistScope(session?.portalCode, session?.username), [session?.portalCode, session?.username]);
  const clearWatchlist = useWatchlistStore((state) => state.clearScope);

  const autoplayPreviews = useSettingsStore((state) => state.autoplayPreviews);
  const compactLayout = useSettingsStore((state) => state.compactLayout);
  const reducedMotion = useSettingsStore((state) => state.reducedMotion);
  const dataSaver = useSettingsStore((state) => state.dataSaver);
  const playbackStartupGuard = useSettingsStore((state) => state.playbackStartupGuard);
  const webosNativeHlsMediaOption = useSettingsStore((state) => state.webosNativeHlsMediaOption);
  const hlsPlaylistRewrite = useSettingsStore((state) => state.hlsPlaylistRewrite);
  const setAutoplayPreviews = useSettingsStore((state) => state.setAutoplayPreviews);
  const setCompactLayout = useSettingsStore((state) => state.setCompactLayout);
  const setReducedMotion = useSettingsStore((state) => state.setReducedMotion);
  const setDataSaver = useSettingsStore((state) => state.setDataSaver);
  const setPlaybackStartupGuard = useSettingsStore((state) => state.setPlaybackStartupGuard);
  const setWebosNativeHlsMediaOption = useSettingsStore((state) => state.setWebosNativeHlsMediaOption);
  const setHlsPlaylistRewrite = useSettingsStore((state) => state.setHlsPlaylistRewrite);
  const resetSettings = useSettingsStore((state) => state.resetSettings);

  const sections: SettingsMenuItem[] = [
    { id: 'account', label: 'Account', hint: 'Session and sign out' },
    { id: 'profiles', label: 'Profiles', hint: 'Switch active profile' },
    { id: 'playback', label: 'Playback', hint: 'Viewing behavior' },
    { id: 'app', label: 'App', hint: 'Local app controls' },
    { id: 'about', label: 'About', hint: 'Build details' }
  ];

  const [selectedSection, setSelectedSection] = useState<SettingsSection>('account');
  const [focusId, setFocusId] = useState<string>('section:account');
  const focusRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const registerFocusRef = (id: string) => (node: HTMLButtonElement | null) => {
    if (node) {
      focusRefs.current[id] = node;
      return;
    }

    delete focusRefs.current[id];
  };

  const sectionActionIds = useMemo(() => {
    switch (selectedSection) {
      case 'account':
        return ['account:signout'];
      case 'profiles':
        return profiles.map((profile) => `profile:${profile.id}`);
      case 'playback':
        return ['playback:autoplay', 'playback:compact', 'playback:motion', 'playback:data', 'playback:startguard', 'playback:webosnativehls', 'playback:hlsrewrite'];
      case 'app':
        return ['app:reload', 'app:clearwatchlist', 'app:reset'];
      case 'about':
        return ['about:info'];
      default:
        return [];
    }
  }, [profiles, selectedSection]);

  useEffect(() => {
    const node = focusRefs.current[focusId];
    if (node && document.activeElement !== node) {
      node.focus();
    }
  }, [focusId]);

  useEffect(() => {
    setFocusId(`section:${selectedSection}`);
  }, [selectedSection]);

  const menuIndex = sections.findIndex((section) => section.id === selectedSection);

  const moveSection = (nextIndex: number) => {
    const nextSection = sections[Math.max(0, Math.min(nextIndex, sections.length - 1))];
    if (!nextSection) {
      return;
    }

    setSelectedSection(nextSection.id);
    setFocusId(`section:${nextSection.id}`);
  };

  const focusAction = (index: number) => {
    const nextId = sectionActionIds[index];
    if (!nextId) {
      return;
    }

    setFocusId(nextId);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (focusId.startsWith('section:')) {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        onRequestSidebarFocus();
        return;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        moveSection(menuIndex + 1);
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        moveSection(menuIndex - 1);
        return;
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        focusAction(0);
      }

      return;
    }

    const actionIndex = sectionActionIds.indexOf(focusId);

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      focusAction(Math.min(actionIndex + 1, sectionActionIds.length - 1));
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (actionIndex <= 0) {
        setFocusId(`section:${selectedSection}`);
        return;
      }

      focusAction(actionIndex - 1);
      return;
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      setFocusId(`section:${selectedSection}`);
    }
  };

  const appVersion = 'v0.1.0';
  const loginLabel = session ? `Signed in as ${session.username}` : 'Not signed in';

  return (
    <section
      style={mergeStyle(contentScreen, panelScreenBase)}
      aria-label="Settings"
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <aside style={panelSidebar}>
        <div style={panelHeader}>
          <p style={eyebrow}>Settings</p>
          <h1 style={panelTitle}>Device and account</h1>
          <p style={panelCopy}>
            Adjust playback, profile, and app preferences from one TV-friendly control panel.
          </p>
        </div>

        <div style={settingsMenuList} role="tablist" aria-label="Settings sections">
          {sections.map((section) => {
            const focus = `section:${section.id}`;
            const isActive = selectedSection === section.id;
            const isFocused = focusId === focus;
            const isHighlighted = isActive || isFocused;

            return (
              <button
                key={section.id}
                ref={registerFocusRef(focus)}
                type="button"
                role="tab"
                aria-selected={isActive}
                style={mergeStyle(settingsMenuItem, isHighlighted && settingsMenuItemActive)}
                onFocus={() => {
                  setSelectedSection(section.id);
                  setFocusId(focus);
                }}
                onClick={() => {
                  setSelectedSection(section.id);
                  setFocusId(focus);
                }}
              >
                <strong style={mergeStyle(settingsMenuItemTitle, isHighlighted && settingsMenuItemTitleActive)}>
                  {section.label}
                </strong>
                <span style={settingsMenuItemCopy}>{section.hint}</span>
              </button>
            );
          })}
        </div>
      </aside>

      <div style={settingsPanel}>
        {selectedSection === 'account' ? (
          <div style={settingsSection}>
            <p style={eyebrow}>Account</p>
            <h2 style={panelTitle}>{loginLabel}</h2>
            <div style={panelCardGrid}>
              <div style={panelInfoCard}>
                <span style={panelInfoLabel}>Server</span>
                <strong style={panelInfoValue}>{session?.serverName || 'No active server'}</strong>
              </div>
              <div style={panelInfoCard}>
                <span style={panelInfoLabel}>Portal</span>
                <strong style={panelInfoValue}>{session?.portalCode || '—'}</strong>
              </div>
              <div style={panelInfoCard}>
                <span style={panelInfoLabel}>Login time</span>
                <strong style={panelInfoValue}>
                  {session?.authenticatedAt ? new Date(session.authenticatedAt).toLocaleString() : '—'}
                </strong>
              </div>
            </div>

            <div style={panelActions}>
              <button
                ref={registerFocusRef('account:signout')}
                type="button"
                style={mergeStyle(panelAction, { minWidth: '180px' }, focusId === 'account:signout' && panelActionActive)}
                onFocus={() => setFocusId('account:signout')}
                onClick={signOut}
              >
                Sign out
              </button>
            </div>
          </div>
        ) : null}

        {selectedSection === 'profiles' ? (
          <div style={settingsSection}>
            <p style={eyebrow}>Profiles</p>
            <h2 style={panelTitle}>Choose the active profile</h2>
            <div style={settingsProfileGrid}>
              {profiles.map((profile) => {
                const focus = `profile:${profile.id}`;
                const isSelected = selectedProfile?.id === profile.id;
                const isFocused = focusId === focus;
                const isActive = isSelected || isFocused;

                return (
                  <button
                    key={profile.id}
                    ref={registerFocusRef(focus)}
                    type="button"
                    style={mergeStyle(settingsProfileCard, isActive && settingsProfileCardActive, { maxWidth: '540px' })}
                    onFocus={() => setFocusId(focus)}
                    onClick={() => {
                      selectProfile(profile.id);
                      setStatusMessage(`Profile selected: ${profile.name}`);
                    }}
                  >
                    <div style={mergeStyle(settingsProfileAvatar, profile.isKids && settingsProfileAvatarKids)}>
                      <span>{profile.avatarSeed}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <strong style={settingsProfileName}>{profile.name}</strong>
                      <span style={settingsMenuItemCopy}>{profile.isKids ? 'Kids profile' : 'Primary profile'}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {selectedSection === 'playback' ? (
          <div style={settingsSection}>
            <p style={eyebrow}>Playback</p>
            <h2 style={panelTitle}>Viewing preferences</h2>
            <div style={settingsProfileGrid}>
              {[
                {
                  id: 'playback:autoplay',
                  title: 'Autoplay previews',
                  hint: 'Start preview clips when cards are focused.',
                  value: autoplayPreviews,
                  toggle: () => setAutoplayPreviews(!autoplayPreviews)
                },
                {
                  id: 'playback:compact',
                  title: 'Compact layout',
                  hint: 'Reduce spacing across the main shell.',
                  value: compactLayout,
                  toggle: () => setCompactLayout(!compactLayout)
                },
                {
                  id: 'playback:motion',
                  title: 'Reduced motion',
                  hint: 'Tone down animated transitions.',
                  value: reducedMotion,
                  toggle: () => setReducedMotion(!reducedMotion)
                },
                {
                  id: 'playback:data',
                  title: 'Data saver',
                  hint: 'Prefer lower bandwidth artwork when possible.',
                  value: dataSaver,
                  toggle: () => setDataSaver(!dataSaver)
                },
                {
                  id: 'playback:startguard',
                  title: 'Startup guard',
                  hint: 'Wait longer and retry once before playback gives up.',
                  value: playbackStartupGuard,
                  toggle: () => setPlaybackStartupGuard(!playbackStartupGuard)
                },
                {
                  id: 'playback:webosnativehls',
                  title: 'webOS native HLS',
                  hint: 'Use the webOS media pipeline for live HLS playback.',
                  value: webosNativeHlsMediaOption,
                  toggle: () => setWebosNativeHlsMediaOption(!webosNativeHlsMediaOption)
                },
                {
                  id: 'playback:hlsrewrite',
                  title: 'HLS playlist rewrite',
                  hint: 'Fix live streams with relative segment paths. Turn off to revert to legacy behaviour.',
                  value: hlsPlaylistRewrite,
                  toggle: () => setHlsPlaylistRewrite(!hlsPlaylistRewrite)
                }
              ].map((item) => (
                <button
                  key={item.id}
                  ref={registerFocusRef(item.id)}
                  type="button"
                  style={mergeStyle(settingsToggle, focusId === item.id && settingsToggleActive, { maxWidth: '580px' })}
                  onFocus={() => setFocusId(item.id)}
                  onClick={item.toggle}
                >
                  <span style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <strong style={settingsToggleTitle}>{item.title}</strong>
                    <small style={settingsToggleHint}>{item.hint}</small>
                  </span>
                  <em style={settingsToggleValue}>{item.value ? 'On' : 'Off'}</em>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {selectedSection === 'app' ? (
          <div style={settingsSection}>
            <p style={eyebrow}>App</p>
            <h2 style={panelTitle}>Local app controls</h2>
            <div style={panelCardGrid}>
              <div style={panelInfoCard}>
                <span style={panelInfoLabel}>Version</span>
                <strong style={panelInfoValue}>{appVersion}</strong>
              </div>
              <div style={panelInfoCard}>
                <span style={panelInfoLabel}>Watchlist scope</span>
                <strong style={panelInfoValue}>{scope}</strong>
              </div>
              <div style={panelInfoCard}>
                <span style={panelInfoLabel}>Theme</span>
                <strong style={panelInfoValue}>LG webOS shell</strong>
              </div>
            </div>

            <div style={panelActions}>
              <button
                ref={registerFocusRef('app:reload')}
                type="button"
                style={mergeStyle(panelAction, { minWidth: '180px' }, focusId === 'app:reload' && panelActionActive)}
                onFocus={() => setFocusId('app:reload')}
                onClick={() => window.location.reload()}
              >
                Reload app
              </button>
              <button
                ref={registerFocusRef('app:clearwatchlist')}
                type="button"
                style={mergeStyle(panelAction, panelActionGhost, { minWidth: '180px' }, focusId === 'app:clearwatchlist' && panelActionActive)}
                onFocus={() => setFocusId('app:clearwatchlist')}
                onClick={() => {
                  clearWatchlist(scope);
                  setStatusMessage('Watchlist cleared');
                }}
              >
                Clear watchlist
              </button>
              <button
                ref={registerFocusRef('app:reset')}
                type="button"
                style={mergeStyle(panelAction, panelActionGhost, { minWidth: '180px' }, focusId === 'app:reset' && panelActionActive)}
                onFocus={() => setFocusId('app:reset')}
                onClick={resetSettings}
              >
                Reset settings
              </button>
            </div>
          </div>
        ) : null}

        {selectedSection === 'about' ? (
          <div style={settingsSection}>
            <p style={eyebrow}>About</p>
            <h2 style={panelTitle}>Build and account info</h2>
            <div style={panelCardGrid}>
              <div style={panelInfoCard}>
                <span style={panelInfoLabel}>LG build</span>
                <strong style={panelInfoValue}>Smartifly LG</strong>
              </div>
              <div style={panelInfoCard}>
                <span style={panelInfoLabel}>Status</span>
                <strong style={panelInfoValue}>{session ? 'Connected' : 'Offline'}</strong>
              </div>
              <div style={panelInfoCard}>
                <span style={panelInfoLabel}>Profile</span>
                <strong style={panelInfoValue}>{selectedProfile?.name || 'Not selected'}</strong>
              </div>
            </div>

            <div style={panelActions}>
              <button
                ref={registerFocusRef('about:info')}
                type="button"
                style={mergeStyle(panelAction, { minWidth: '180px' }, focusId === 'about:info' && panelActionActive)}
                onFocus={() => setFocusId('about:info')}
                onClick={() => setStatusMessage('Smartifly LG build info shown')}
              >
                Build info
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

export default SettingsScreen;
