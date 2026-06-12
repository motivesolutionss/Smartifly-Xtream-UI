import { type CSSProperties, type KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';
import { contentScreen, mergeStyle } from '../../styles/lgTvStyles';
import { useAppStore, type SelectedContent } from '../../store/appStore';
import useWatchlistStore, {
  buildWatchlistScope,
  type WatchlistEntry
} from '../../store/watchlistStore';
import { useWatchHistoryStore, type WatchProgress } from '../../store/watchHistoryStore';
import { BrowsePosterArt } from '../../components/BrowsePosterArt';
import { buildResumePlaybackRequest } from '../player/buildResumePlayback';
import { legacyChromiumBrowser } from '../../utils/legacyBrowser';

type WatchlistScreenProps = {
  isActive?: boolean;
  onRequestSidebarFocus: () => void;
};

function toSelectedContent(entry: WatchlistEntry): SelectedContent | null {
  if (entry.kind === 'movie' || entry.kind === 'series') {
    return {
      id: entry.key,
      contentId: Number(entry.entityId) || 0,
      kind: entry.kind,
      title: entry.title,
      posterUrl: entry.image,
      backdropUrl: entry.backdrop || entry.image,
      description: entry.subtitle,
      year: entry.year,
      rating: entry.rating?.toString()
    };
  }

  return null;
}

function formatRating(value?: string | number | null) {
  if (!value) {
    return '';
  }
  const parsed = parseFloat(String(value));
  if (isNaN(parsed)) {
    return String(value);
  }
  const standard = parsed > 10 ? parsed / 10 : parsed;
  return standard.toFixed(1);
}

// ----------------------------------------------------
// Custom Premium Netflix-Style Watchlist CSS Styles
// ----------------------------------------------------
const containerStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  width: '100%',
  background: '#090a0f',
  overflowX: 'hidden',
  overflowY: 'hidden',
  boxSizing: 'border-box',
  position: 'relative'
};

const heroSectionStyle: CSSProperties = {
  position: 'relative',
  height: '440px',
  width: '100%',
  overflow: 'hidden',
  display: 'flex',
  alignItems: 'center',
  padding: '0 60px',
  boxSizing: 'border-box',
  background: '#090a0f',
  flexShrink: 0
};

const heroBackdropStyle: CSSProperties = {
  position: 'absolute',
  top: 0,
  right: 0,
  width: '70%',
  height: '100%',
  objectFit: 'cover',
  opacity: 0.38,
  zIndex: 1
};

const heroGradientStyle: CSSProperties = {
  position: 'absolute',
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
  zIndex: 2,
  background: 'linear-gradient(to right, #090a0f 35%, rgba(9, 10, 15, 0.6) 65%, transparent 100%), linear-gradient(to bottom, transparent 60%, #090a0f 100%)'
};

const heroContentStyle: CSSProperties = {
  position: 'relative',
  zIndex: 3,
  maxWidth: '650px',
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
  marginTop: '20px'
};

const heroEyebrowStyle: CSSProperties = {
  margin: 0,
  color: '#E50914',
  fontSize: '13px',
  fontWeight: 900,
  letterSpacing: '2.5px',
  textTransform: 'uppercase'
};

const heroTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: '48px',
  fontWeight: 900,
  color: '#ffffff',
  lineHeight: 1.1,
  letterSpacing: '-0.5px',
  ...(legacyChromiumBrowser ? {
    marginTop: '12px',
    marginBottom: '12px'
  } : {})
};

const heroMetaStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  fontSize: '14px',
  fontWeight: 700,
  color: 'rgba(255, 255, 255, 0.6)',
  ...(legacyChromiumBrowser ? {
    marginBottom: '16px'
  } : {})
};

const heroMetaItemStyle: CSSProperties = {
  background: 'rgba(255, 255, 255, 0.08)',
  padding: '4px 10px',
  borderRadius: '6px',
  color: '#ffffff'
};

const heroDescriptionStyle: CSSProperties = {
  margin: '6px 0 16px 0',
  fontSize: '16px',
  lineHeight: 1.55,
  color: 'rgba(230, 235, 245, 0.76)',
  display: '-webkit-box',
  WebkitLineClamp: 3,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
  textOverflow: 'ellipsis'
};

const heroActionsStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '14px'
};

const primaryButtonStyle: CSSProperties = {
  minHeight: '48px',
  padding: '0 28px',
  background: '#E50914',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: 800,
  borderRadius: '10px',
  border: 'none',
  outline: 'none',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  transition: 'transform 0.18s, background-color 0.18s, box-shadow 0.18s'
};

const secondaryButtonStyle: CSSProperties = {
  minHeight: '48px',
  padding: '0 28px',
  background: 'rgba(255, 255, 255, 0.08)',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: 800,
  borderRadius: '10px',
  border: '1px solid rgba(255, 255, 255, 0.15)',
  outline: 'none',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  transition: 'transform 0.18s, background-color 0.18s, box-shadow 0.18s'
};

const buttonActiveStyle: CSSProperties = {
  transform: 'scale(1.05)',
  boxShadow: '0 0 0 3px rgba(255, 255, 255, 0.92), 0 8px 24px rgba(0, 0, 0, 0.45)'
};

const tabRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '32px',
  padding: '0 60px',
  margin: '10px 0 24px 0',
  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
  position: 'relative',
  zIndex: 3,
  flexShrink: 0
};

const tabButtonStyle: CSSProperties = {
  background: 'transparent',
  border: 'none',
  padding: '12px 4px 16px 4px',
  fontSize: '18px',
  fontWeight: 800,
  color: 'rgba(255, 255, 255, 0.54)',
  cursor: 'pointer',
  outline: 'none',
  position: 'relative',
  transition: 'color 0.18s, transform 0.18s'
};

const tabActiveStyle: CSSProperties = {
  color: '#ffffff'
};

const tabActiveIndicatorStyle: CSSProperties = {
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  height: '3px',
  background: '#E50914',
  borderRadius: '999px'
};

const tabFocusedStyle: CSSProperties = {
  color: '#ffffff',
  transform: 'scale(1.06)'
};

const gridSectionStyle: CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  padding: '16px 60px 60px 60px',
  position: 'relative',
  zIndex: 3,
  display: 'flex',
  flexDirection: 'column',
  gap: '24px',
  boxSizing: 'border-box'
};

const gridContainerStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
  gap: '20px',
  width: '100%',
  boxSizing: 'border-box',
  ...(legacyChromiumBrowser ? {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    alignContent: 'flex-start'
  } : {})
};

const cardButtonOuterStyle: CSSProperties = {
  width: '100%',
  background: 'transparent',
  border: 'none',
  padding: '12px 0',
  margin: 0,
  cursor: 'pointer',
  outline: 'none',
  boxSizing: 'border-box'
};

const cardInnerStyle: CSSProperties = {
  width: '100%',
  borderRadius: '16px',
  overflow: 'hidden',
  transition: 'transform 0.18s cubic-bezier(0.25, 0.8, 0.25, 1)',
  position: 'relative'
};

const cardActiveStyle: CSSProperties = {
  transform: 'scale(1.05) translateY(-6px)',
  boxShadow: '0 0 0 3px rgba(255, 255, 255, 0.95), 0 16px 32px rgba(0, 0, 0, 0.5)'
};

// Continue Watching Landscape Cards
const landscapeGridContainerStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
  gap: '20px',
  width: '100%',
  boxSizing: 'border-box',
  ...(legacyChromiumBrowser ? {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    alignContent: 'flex-start'
  } : {})
};

const landscapeCardOuterStyle: CSSProperties = {
  width: '100%',
  background: 'transparent',
  border: 'none',
  padding: '12px 0',
  margin: 0,
  cursor: 'pointer',
  outline: 'none',
  boxSizing: 'border-box'
};

const landscapeCardInnerStyle: CSSProperties = {
  width: '100%',
  aspectRatio: '16 / 9',
  background: '#12141a',
  borderRadius: '16px',
  overflow: 'hidden',
  position: 'relative',
  boxSizing: 'border-box',
  transition: 'transform 0.18s cubic-bezier(0.25, 0.8, 0.25, 1)'
};

const landscapeCardActiveStyle: CSSProperties = {
  transform: 'scale(1.05) translateY(-6px)',
  boxShadow: '0 0 0 3px rgba(255, 255, 255, 0.95), 0 16px 32px rgba(0, 0, 0, 0.5)'
};

const landscapeThumbnailStyle: CSSProperties = {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  display: 'block'
};

const landscapeOverlayStyle: CSSProperties = {
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  height: '80px',
  background: 'linear-gradient(0deg, rgba(0, 0, 0, 0.95) 0%, rgba(0, 0, 0, 0.5) 60%, transparent 100%)',
  padding: '0 14px 10px 14px',
  zIndex: 15,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'flex-end',
  gap: '2px',
  boxSizing: 'border-box'
};

const landscapeTitleStyle: CSSProperties = {
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: 900,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  textShadow: '0 1px 2px rgba(0, 0, 0, 0.9)'
};

const landscapeSubtitleStyle: CSSProperties = {
  color: 'rgba(255, 255, 255, 0.72)',
  fontSize: '12px',
  fontWeight: 700,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  textShadow: '0 1px 2px rgba(0, 0, 0, 0.9)'
};

const landscapeBadgeStyle: CSSProperties = {
  position: 'absolute',
  top: '12px',
  right: '12px',
  backgroundColor: 'rgba(0, 0, 0, 0.75)',
  color: '#FFFFFF',
  fontSize: '10px',
  fontWeight: 800,
  letterSpacing: '0.06em',
  padding: '3px 8px',
  borderRadius: '6px',
  textTransform: 'uppercase',
  zIndex: 16,
  backdropFilter: 'blur(4px)',
  border: '1px solid rgba(255, 255, 255, 0.15)',
  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.3)'
};

const landscapePlayOverlayStyle: CSSProperties = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '44px',
  height: '44px',
  borderRadius: '999px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 0.18s ease-in-out',
  zIndex: 16,
  pointerEvents: 'none'
};

const landscapeProgressBarContainerStyle: CSSProperties = {
  width: '100%',
  height: '4px',
  backgroundColor: 'rgba(255, 255, 255, 0.3)',
  borderRadius: '2px',
  overflow: 'hidden',
  marginTop: '4px'
};

const landscapeProgressBarPlayedStyle: CSSProperties = {
  height: '100%',
  backgroundColor: '#E50914',
  borderRadius: '2px'
};

const emptyStateContainer: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  height: '50vh',
  width: '100%',
  textAlign: 'center',
  padding: '0 40px',
  boxSizing: 'border-box',
  gap: '16px'
};

const emptyTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: '32px',
  fontWeight: 800,
  color: '#ffffff'
};

const emptyCopyStyle: CSSProperties = {
  margin: 0,
  fontSize: '16px',
  lineHeight: 1.5,
  color: 'rgba(255, 255, 255, 0.54)',
  maxWidth: '550px'
};

const footerGuideStyle: CSSProperties = {
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  height: '50px',
  background: 'rgba(9, 10, 15, 0.95)',
  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '12px',
  zIndex: 100,
  opacity: 0,
  transform: 'translateY(10px)',
  transition: 'opacity 0.22s ease-in-out, transform 0.22s ease-in-out',
  pointerEvents: 'none'
};

const footerGuideActiveStyle: CSSProperties = {
  opacity: 1,
  transform: 'translateY(0)'
};

const footerIconStyle: CSSProperties = {
  width: '12px',
  height: '12px',
  borderRadius: '50%',
  backgroundColor: '#E50914',
  boxShadow: '0 0 8px #E50914'
};

const footerTextStyle: CSSProperties = {
  color: 'rgba(255, 255, 255, 0.72)',
  fontSize: '14px',
  fontWeight: 700,
  letterSpacing: '0.5px'
};


function WatchlistScreen({ isActive, onRequestSidebarFocus }: WatchlistScreenProps) {
  const session = useAppStore((state) => state.session);
  const selectedProfile = useAppStore((state) => state.selectedProfile);
  const openContentDetails = useAppStore((state) => state.openContentDetails);
  const openPlayback = useAppStore((state) => state.openPlayback);
  const setStatusMessage = useAppStore((state) => state.setStatusMessage);

  const scope = useMemo(
    () => buildWatchlistScope(session?.portalCode, session?.username, selectedProfile?.id),
    [selectedProfile?.id, session?.portalCode, session?.username]
  );
  const watchlistEntries = useWatchlistStore((state) => state.entries);
  const removeFavorite = useWatchlistStore((state) => state.removeFavorite);
  const clearScope = useWatchlistStore((state) => state.clearScope);

  const watchHistoryStore = useWatchHistoryStore();
  const continueWatchingItems = useMemo(() => {
    return watchHistoryStore.getContinueWatching(100);
  }, [watchHistoryStore.history, session]);

  // Tab State
  const [activeTab, setActiveTab] = useState<'watchlist' | 'continue'>('watchlist');

  const [selectedKey, setSelectedKey] = useState('');
  const [selectedContinueId, setSelectedContinueId] = useState('');

  const [focusId, setFocusId] = useState('tab:watchlist');
  const focusRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const screenRef = useRef<HTMLElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const entries = useMemo(() => (
    watchlistEntries
      .filter((entry) => entry.scope === scope)
      .sort((a, b) => b.addedAt - a.addedAt)
  ), [scope, watchlistEntries]);

  const selectedEntry = useMemo(
    () => entries.find((entry) => entry.key === selectedKey) ?? entries[0] ?? null,
    [entries, selectedKey]
  );

  const selectedContinueItem = useMemo(
    () => continueWatchingItems.find((item) => item.id === selectedContinueId) ?? continueWatchingItems[0] ?? null,
    [continueWatchingItems, selectedContinueId]
  );

  const registerFocusRef = (id: string) => (node: HTMLButtonElement | null) => {
    if (node) {
      focusRefs.current[id] = node;
      return;
    }
    delete focusRefs.current[id];
  };

  // Reset focus/selection on tab change or mount
  useEffect(() => {
    if (activeTab === 'watchlist') {
      if (entries.length === 0) {
        setSelectedKey('');
        setFocusId('back');
      } else {
        setSelectedKey((current) => (entries.some((entry) => entry.key === current) ? current : entries[0].key));
        setFocusId((current) => (entries.some((entry) => entry.key === current.replace('list:', '')) ? current : `list:${entries[0].key}`));
      }
    } else {
      if (continueWatchingItems.length === 0) {
        setSelectedContinueId('');
        setFocusId('back');
      } else {
        setSelectedContinueId((current) => (continueWatchingItems.some((item) => item.id === current) ? current : continueWatchingItems[0].id));
        setFocusId((current) => (continueWatchingItems.some((item) => item.id === current.replace('continue:', '')) ? current : `continue:${continueWatchingItems[0].id}`));
      }
    }
  }, [activeTab, entries, continueWatchingItems]);

  useEffect(() => {
    if (!isActive) {
      return;
    }
    const node = focusRefs.current[focusId];
    if (node && document.activeElement !== node) {
      node.focus();
    }
  }, [focusId, selectedEntry?.key, selectedContinueItem?.id, isActive]);

  // Force scroll position to top when focusing elements in the first row, tabs, or hero.
  // This overrides the browser's lazy scroll-into-view behavior to prevent clipping of the top row.
  useEffect(() => {
    if (focusId.startsWith('list:') || focusId.startsWith('continue:')) {
      const index = focusId.startsWith('list:')
        ? entries.findIndex((entry) => entry.key === focusId.replace('list:', ''))
        : continueWatchingItems.findIndex((item) => item.id === focusId.replace('continue:', ''));
      
      const cols = activeTab === 'watchlist' ? 7 : 5;
      if (index >= 0 && index < cols && scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = 0;
      }
    } else if (focusId.startsWith('tab:') || focusId.startsWith('hero:')) {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = 0;
      }
    }
  }, [focusId, activeTab, entries, continueWatchingItems]);

  const openSelected = (entry: WatchlistEntry | null = selectedEntry) => {
    if (!entry) {
      return;
    }

    const content = toSelectedContent(entry);
    if (!content) {
      setStatusMessage('This item cannot be opened yet');
      return;
    }

    openContentDetails(content, 'watchlist');
  };

  const playProgress = async (progress: WatchProgress | null = selectedContinueItem) => {
    if (!progress) {
      return;
    }

    if (!session) {
      setStatusMessage('Playback is not ready yet');
      return;
    }

    const playback = await buildResumePlaybackRequest({
      progress,
      session,
      returnDestination: 'watchlist'
    });

    if (!playback) {
      setStatusMessage('Resume playback is not ready yet');
      return;
    }

    openPlayback(playback);
  };

  const removeSpecificEntry = (itemIndex: number) => {
    if (activeTab === 'watchlist') {
      const entryToRemove = entries[itemIndex];
      if (!entryToRemove) return;

      let nextKey = '';
      if (entries.length > 1) {
        const targetIndex = itemIndex === entries.length - 1 ? itemIndex - 1 : itemIndex + 1;
        const targetEntry = entries[targetIndex];
        if (targetEntry) {
          nextKey = targetEntry.key;
        }
      }

      removeFavorite(entryToRemove.key);
      setStatusMessage(`Removed ${entryToRemove.title} from watchlist`);

      if (nextKey) {
        setSelectedKey(nextKey);
        setFocusId(`list:${nextKey}`);
      } else {
        setSelectedKey('');
        setFocusId('tab:watchlist');
      }
    } else {
      const itemToRemove = continueWatchingItems[itemIndex];
      if (!itemToRemove) return;

      let nextId = '';
      if (continueWatchingItems.length > 1) {
        const targetIndex = itemIndex === continueWatchingItems.length - 1 ? itemIndex - 1 : itemIndex + 1;
        const targetItem = continueWatchingItems[targetIndex];
        if (targetItem) {
          nextId = targetItem.id;
        }
      }

      watchHistoryStore.removeFromHistory(itemToRemove.id);
      setStatusMessage(`Removed ${itemToRemove.title} from continue watching`);

      if (nextId) {
        setSelectedContinueId(nextId);
        setFocusId(`continue:${nextId}`);
      } else {
        setSelectedContinueId('');
        setFocusId('tab:continue');
      }
    }
  };


  const clearAll = () => {
    if (activeTab === 'watchlist') {
      clearScope(scope);
      setStatusMessage('Watchlist cleared');
    } else {
      watchHistoryStore.clearHistory();
      setStatusMessage('Continue watching cleared');
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    const listLength = activeTab === 'watchlist' ? entries.length : continueWatchingItems.length;

    if (listLength === 0 && !focusId.startsWith('tab:')) {
      if (event.key === 'ArrowLeft' || event.key === 'Backspace' || event.key === 'Escape') {
        event.preventDefault();
        onRequestSidebarFocus();
      }
      return;
    }

    const itemIndex = activeTab === 'watchlist'
      ? (selectedEntry ? entries.findIndex((entry) => entry.key === selectedEntry.key) : -1)
      : (selectedContinueItem ? continueWatchingItems.findIndex((item) => item.id === selectedContinueItem.id) : -1);

    const columns = activeTab === 'watchlist' ? 7 : 5;

    // Tabs Navigation
    if (focusId.startsWith('tab:')) {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        if (focusId === 'tab:watchlist') {
          onRequestSidebarFocus();
        } else {
          setActiveTab('watchlist');
          setFocusId('tab:watchlist');
        }
        return;
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        if (focusId === 'tab:watchlist') {
          setActiveTab('continue');
          setFocusId('tab:continue');
        }
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setFocusId('hero:open');
        return;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        if (activeTab === 'watchlist' && entries.length > 0) {
          const target = selectedEntry ?? entries[0];
          setFocusId(`list:${target.key}`);
        } else if (activeTab === 'continue' && continueWatchingItems.length > 0) {
          const target = selectedContinueItem ?? continueWatchingItems[0];
          setFocusId(`continue:${target.id}`);
        }
        return;
      }

      if (event.key === 'Backspace' || event.key === 'Escape') {
        event.preventDefault();
        onRequestSidebarFocus();
        return;
      }
    }

    // Grid Navigation (Watchlist - 7 columns)
    if (focusId.startsWith('list:')) {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        const col = itemIndex % columns;
        if (col === 0) {
          onRequestSidebarFocus();
        } else {
          const prevEntry = entries[itemIndex - 1];
          if (prevEntry) {
            setSelectedKey(prevEntry.key);
            setFocusId(`list:${prevEntry.key}`);
          }
        }
        return;
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        const nextEntry = entries[itemIndex + 1];
        if (nextEntry) {
          setSelectedKey(nextEntry.key);
          setFocusId(`list:${nextEntry.key}`);
        }
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        if (itemIndex < columns) {
          setFocusId('tab:watchlist');
        } else {
          const nextIndex = itemIndex - columns;
          const nextEntry = entries[nextIndex];
          if (nextEntry) {
            setSelectedKey(nextEntry.key);
            setFocusId(`list:${nextEntry.key}`);
          }
        }
        return;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        const nextIndex = itemIndex + columns;
        if (nextIndex < entries.length) {
          const nextEntry = entries[nextIndex];
          if (nextEntry) {
            setSelectedKey(nextEntry.key);
            setFocusId(`list:${nextEntry.key}`);
          }
        }
        return;
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        openSelected();
        return;
      }

      if (event.key === 'Delete' || event.key === 'r' || event.key === 'R' || event.key === 'Red' || event.keyCode === 403) {
        event.preventDefault();
        removeSpecificEntry(itemIndex);
        return;
      }

      if (event.key === 'Backspace' || event.key === 'Escape') {
        event.preventDefault();
        onRequestSidebarFocus();
        return;
      }

      return;
    }

    // Grid Navigation (Continue Watching - 5 columns)
    if (focusId.startsWith('continue:')) {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        const col = itemIndex % columns;
        if (col === 0) {
          onRequestSidebarFocus();
        } else {
          const prevItem = continueWatchingItems[itemIndex - 1];
          if (prevItem) {
            setSelectedContinueId(prevItem.id);
            setFocusId(`continue:${prevItem.id}`);
          }
        }
        return;
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        const nextItem = continueWatchingItems[itemIndex + 1];
        if (nextItem) {
          setSelectedContinueId(nextItem.id);
          setFocusId(`continue:${nextItem.id}`);
        }
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        if (itemIndex < columns) {
          setFocusId('tab:continue');
        } else {
          const nextIndex = itemIndex - columns;
          const nextItem = continueWatchingItems[nextIndex];
          if (nextItem) {
            setSelectedContinueId(nextItem.id);
            setFocusId(`continue:${nextItem.id}`);
          }
        }
        return;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        const nextIndex = itemIndex + columns;
        if (nextIndex < continueWatchingItems.length) {
          const nextItem = continueWatchingItems[nextIndex];
          if (nextItem) {
            setSelectedContinueId(nextItem.id);
            setFocusId(`continue:${nextItem.id}`);
          }
        }
        return;
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        playProgress();
        return;
      }

      if (event.key === 'Delete' || event.key === 'r' || event.key === 'R' || event.key === 'Red' || event.keyCode === 403) {
        event.preventDefault();
        removeSpecificEntry(itemIndex);
        return;
      }

      if (event.key === 'Backspace' || event.key === 'Escape') {
        event.preventDefault();
        onRequestSidebarFocus();
        return;
      }

      return;
    }

    // Hero buttons navigation
    if (focusId.startsWith('hero:')) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setFocusId(activeTab === 'watchlist' ? 'tab:watchlist' : 'tab:continue');
        return;
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        if (focusId === 'hero:open') {
          onRequestSidebarFocus();
        } else if (focusId === 'hero:clear') {
          setFocusId('hero:open');
        }
        return;
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        if (focusId === 'hero:open') {
          setFocusId('hero:clear');
        }
        return;
      }

      if (event.key === 'Backspace' || event.key === 'Escape') {
        event.preventDefault();
        onRequestSidebarFocus();
        return;
      }
    }
  };

  // Determine current metadata for Hero Display
  const heroDisplay = useMemo(() => {
    if (activeTab === 'watchlist') {
      if (!selectedEntry) return null;
      return {
        backdrop: selectedEntry.backdrop || selectedEntry.image,
        title: selectedEntry.title,
        kind: selectedEntry.kind.toUpperCase(),
        year: selectedEntry.year,
        rating: selectedEntry.rating ? formatRating(selectedEntry.rating) : null,
        description: selectedEntry.subtitle || 'Saved to your per-account watchlist.',
        primaryLabel: 'Play Now'
      };
    } else {
      if (!selectedContinueItem) return null;
      const subtitleText = selectedContinueItem.type === 'series' && selectedContinueItem.seasonNumber && selectedContinueItem.episodeNumber
        ? `Season ${selectedContinueItem.seasonNumber}, Episode ${selectedContinueItem.episodeNumber} - ${selectedContinueItem.episodeTitle || ''}`
        : selectedContinueItem.episodeTitle || 'Saved watch progress.';
      return {
        backdrop: selectedContinueItem.thumbnail,
        title: selectedContinueItem.title,
        kind: selectedContinueItem.type.toUpperCase(),
        year: null,
        rating: null,
        description: subtitleText,
        primaryLabel: `Resume at ${Math.floor(selectedContinueItem.position / 60)}m`
      };
    }
  }, [activeTab, selectedEntry, selectedContinueItem]);

  const showFooter = focusId.startsWith('list:') || focusId.startsWith('continue:');

  return (
    <section
      ref={screenRef}
      style={mergeStyle(contentScreen, containerStyle)}
      aria-label="Library"
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <style>{`
        .library-grid-scroll::-webkit-scrollbar {
          width: 8px;
        }
        .library-grid-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .library-grid-scroll::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.15);
          border-radius: 999px;
        }
        .library-grid-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.3);
        }
      `}</style>
      {heroDisplay ? (
        <div style={heroSectionStyle}>
          {heroDisplay.backdrop ? (
            <img src={heroDisplay.backdrop} alt="" style={heroBackdropStyle} />
          ) : null}
          <div style={heroGradientStyle} />

          <div style={heroContentStyle}>
            <p style={heroEyebrowStyle}>{activeTab === 'watchlist' ? 'My List' : 'Continue Watching'}</p>
            <h1 style={heroTitleStyle}>{heroDisplay.title}</h1>
            <div style={heroMetaStyle}>
              <span style={
                legacyChromiumBrowser 
                  ? { ...heroMetaItemStyle, marginRight: '12px' } 
                  : heroMetaItemStyle
              }>
                {heroDisplay.kind}
              </span>
              {heroDisplay.year ? (
                <span style={
                  legacyChromiumBrowser 
                    ? { ...heroMetaItemStyle, marginRight: '12px' } 
                    : heroMetaItemStyle
                }>
                  {heroDisplay.year}
                </span>
              ) : null}
              {heroDisplay.rating ? (
                <span style={
                  legacyChromiumBrowser
                    ? { ...heroMetaItemStyle, display: 'flex', alignItems: 'center', marginRight: '12px' }
                    : { ...heroMetaItemStyle, display: 'flex', alignItems: 'center', gap: '4px' }
                }>
                  <span style={{ color: '#E50914', marginRight: legacyChromiumBrowser ? '4px' : '0' }}>★</span> {heroDisplay.rating}
                </span>
              ) : null}
            </div>
            <p style={heroDescriptionStyle}>{heroDisplay.description}</p>

            <div style={heroActionsStyle}>
              <button
                ref={registerFocusRef('hero:open')}
                type="button"
                style={
                  legacyChromiumBrowser
                    ? {
                        ...mergeStyle(primaryButtonStyle, focusId === 'hero:open' && buttonActiveStyle),
                        transform: 'none',
                        transition: 'none',
                        boxShadow: focusId === 'hero:open' ? '0 0 0 2.5px rgba(255, 255, 255, 0.95)' : 'none',
                        marginRight: '14px'
                      }
                    : mergeStyle(primaryButtonStyle, focusId === 'hero:open' && buttonActiveStyle)
                }
                onFocus={() => setFocusId('hero:open')}
                onClick={() => {
                  if (activeTab === 'watchlist') {
                    openSelected(selectedEntry);
                  } else {
                    playProgress(selectedContinueItem);
                  }
                }}
              >
                {heroDisplay.primaryLabel}
              </button>
              <button
                ref={registerFocusRef('hero:clear')}
                type="button"
                style={
                  legacyChromiumBrowser
                    ? {
                        ...mergeStyle(secondaryButtonStyle, focusId === 'hero:clear' && buttonActiveStyle),
                        transform: 'none',
                        transition: 'none',
                        boxShadow: focusId === 'hero:clear' ? '0 0 0 2.5px rgba(255, 255, 255, 0.95)' : 'none'
                      }
                    : mergeStyle(secondaryButtonStyle, focusId === 'hero:clear' && buttonActiveStyle)
                }
                onFocus={() => setFocusId('hero:clear')}
                onClick={clearAll}
              >
                Clear List
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div style={heroSectionStyle}>
          <div style={heroGradientStyle} />
          <div style={heroContentStyle}>
            <p style={heroEyebrowStyle}>Library</p>
            <h1 style={heroTitleStyle}>My Space</h1>
            <p style={heroDescriptionStyle}>Browse your watchlist and active playback sessions.</p>
          </div>
        </div>
      )}

      {/* Tab bar selector */}
      <div style={tabRowStyle}>
        <button
          ref={registerFocusRef('tab:watchlist')}
          type="button"
          style={
            legacyChromiumBrowser
              ? {
                  ...mergeStyle(
                    tabButtonStyle,
                    activeTab === 'watchlist' && tabActiveStyle,
                    focusId === 'tab:watchlist' && tabFocusedStyle
                  ),
                  transform: 'none',
                  transition: 'none',
                  marginRight: '32px'
                }
              : mergeStyle(
                  tabButtonStyle,
                  activeTab === 'watchlist' && tabActiveStyle,
                  focusId === 'tab:watchlist' && tabFocusedStyle
                )
          }
          onFocus={() => {
            setFocusId('tab:watchlist');
            setActiveTab('watchlist');
          }}
          onClick={() => setActiveTab('watchlist')}
        >
          Watchlist ({entries.length})
          {activeTab === 'watchlist' ? <div style={tabActiveIndicatorStyle} /> : null}
        </button>
        <button
          ref={registerFocusRef('tab:continue')}
          type="button"
          style={
            legacyChromiumBrowser
              ? {
                  ...mergeStyle(
                    tabButtonStyle,
                    activeTab === 'continue' && tabActiveStyle,
                    focusId === 'tab:continue' && tabFocusedStyle
                  ),
                  transform: 'none',
                  transition: 'none'
                }
              : mergeStyle(
                  tabButtonStyle,
                  activeTab === 'continue' && tabActiveStyle,
                  focusId === 'tab:continue' && tabFocusedStyle
                )
          }
          onFocus={() => {
            setFocusId('tab:continue');
            setActiveTab('continue');
          }}
          onClick={() => setActiveTab('continue')}
        >
          Continue Watching ({continueWatchingItems.length})
          {activeTab === 'continue' ? <div style={tabActiveIndicatorStyle} /> : null}
        </button>
      </div>

      {/* Grid Content rendering */}
      {activeTab === 'watchlist' ? (
        entries.length > 0 ? (
          <div ref={scrollContainerRef} className="library-grid-scroll" style={gridSectionStyle}>
            <div style={gridContainerStyle}>
              {entries.map((entry, index) => {
                const itemFocusId = `list:${entry.key}`;
                const isFocused = focusId === itemFocusId;

                return (
                  <button
                    key={entry.key}
                    ref={registerFocusRef(itemFocusId)}
                    type="button"
                    style={
                      legacyChromiumBrowser
                        ? {
                            ...cardButtonOuterStyle,
                            display: 'block',
                            width: 'calc((100% - 120px) / 7)',
                            height: '372px',
                            marginRight: (index + 1) % 7 === 0 ? '0px' : '20px',
                            marginBottom: '20px',
                            padding: 0
                          }
                        : cardButtonOuterStyle
                    }
                    onFocus={() => {
                      setFocusId(itemFocusId);
                      setSelectedKey(entry.key);
                    }}
                    onClick={() => {
                      setSelectedKey(entry.key);
                      setFocusId(itemFocusId);
                      openSelected(entry);
                    }}
                  >
                    <div style={
                      legacyChromiumBrowser
                        ? {
                            ...cardInnerStyle,
                            height: '372px',
                            transition: 'none',
                            transform: 'none',
                            boxShadow: isFocused ? '0 0 0 2px rgba(255, 255, 255, 0.95)' : 'none'
                          }
                        : mergeStyle(cardInnerStyle, isFocused && cardActiveStyle)
                    }>
                      <BrowsePosterArt
                        artwork={entry.image}
                        name={entry.title}
                        accent="#12141a"
                        badge={entry.rating ? `★ ${formatRating(entry.rating)}` : undefined}
                        hideFallbackText={false}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div style={emptyStateContainer}>
            <h2 style={emptyTitleStyle}>Your List is Empty</h2>
            <p style={emptyCopyStyle}>
              Browse movies and series from the catalog and save them to return to them later.
            </p>
            <button
              ref={registerFocusRef('back')}
              type="button"
              style={mergeStyle(primaryButtonStyle, focusId === 'back' && buttonActiveStyle)}
              onFocus={() => setFocusId('back')}
              onClick={onRequestSidebarFocus}
            >
              Explore Catalog
            </button>
          </div>
        )
      ) : continueWatchingItems.length > 0 ? (
        <div ref={scrollContainerRef} className="library-grid-scroll" style={gridSectionStyle}>
          <div style={landscapeGridContainerStyle}>
            {continueWatchingItems.map((item, index) => {
              const itemFocusId = `continue:${item.id}`;
              const isFocused = focusId === itemFocusId;

              return (
                <button
                  key={item.id}
                  ref={registerFocusRef(itemFocusId)}
                  type="button"
                  style={
                    legacyChromiumBrowser
                      ? {
                          ...landscapeCardOuterStyle,
                          display: 'block',
                          width: 'calc((100% - 80px) / 5)',
                          height: '194px',
                          marginRight: (index + 1) % 5 === 0 ? '0px' : '20px',
                          marginBottom: '20px',
                          padding: 0
                        }
                      : landscapeCardOuterStyle
                  }
                  onFocus={() => {
                    setFocusId(itemFocusId);
                    setSelectedContinueId(item.id);
                  }}
                  onClick={() => {
                    setSelectedContinueId(item.id);
                    setFocusId(itemFocusId);
                    playProgress(item);
                  }}
                >
                  <div style={
                    legacyChromiumBrowser
                      ? {
                          ...landscapeCardInnerStyle,
                          width: '100%',
                          height: '194px',
                          transition: 'none',
                          transform: 'none',
                          boxShadow: isFocused ? '0 0 0 2px rgba(255, 255, 255, 0.95)' : 'none'
                        }
                      : mergeStyle(landscapeCardInnerStyle, isFocused && landscapeCardActiveStyle)
                  }>
                    {item.thumbnail ? (
                      <img
                        src={item.thumbnail}
                        alt=""
                        style={landscapeThumbnailStyle}
                      />
                    ) : (
                      <div style={{
                        width: '100%',
                        height: '100%',
                        display: 'grid',
                        placeItems: 'center',
                        background: 'linear-gradient(180deg, #1e2129 0%, #0d0f14 100%)',
                        color: 'rgba(255, 255, 255, 0.4)',
                        fontSize: '24px',
                        fontWeight: 800
                      }}>
                        {item.title.substring(0, 2).toUpperCase()}
                      </div>
                    )}

                    {/* Play Button Overlay */}
                    <div style={{
                      ...landscapePlayOverlayStyle,
                      backgroundColor: isFocused ? '#E50914' : 'rgba(0, 0, 0, 0.55)',
                      border: isFocused ? 'none' : '2.2px solid rgba(255, 255, 255, 0.85)',
                      boxShadow: isFocused ? '0 0 16px rgba(229, 9, 20, 0.6)' : 'none'
                    }}>
                      <svg viewBox="0 0 24 24" width="20" height="20" fill="#ffffff" style={{ marginLeft: '2px' }}>
                        <polygon points="8 5 19 12 8 19" />
                      </svg>
                    </div>

                    <span style={landscapeBadgeStyle}>
                      {item.type === 'series' ? 'Series' : 'Movie'}
                    </span>

                    <div style={landscapeOverlayStyle}>
                      <span style={landscapeTitleStyle}>{item.title}</span>
                      {item.type === 'series' && (
                        <span style={landscapeSubtitleStyle}>
                          {item.seasonNumber && item.episodeNumber
                            ? `S${item.seasonNumber}:E${item.episodeNumber} - ${item.episodeTitle || ''}`
                            : item.episodeTitle || ''}
                        </span>
                      )}
                      <div style={landscapeProgressBarContainerStyle}>
                        <div style={{
                          ...landscapeProgressBarPlayedStyle,
                          width: `${item.progress}%`
                        }} />
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div style={emptyStateContainer}>
          <h2 style={emptyTitleStyle}>No Watch History</h2>
          <p style={emptyCopyStyle}>
            Play movies or series from the catalog to see your watch progress here.
          </p>
          <button
            ref={registerFocusRef('back')}
            type="button"
            style={mergeStyle(primaryButtonStyle, focusId === 'back' && buttonActiveStyle)}
            onFocus={() => setFocusId('back')}
            onClick={onRequestSidebarFocus}
          >
            Explore Catalog
          </button>
        </div>
      )}

      {/* Footer Hotkey Guide */}
      <div style={mergeStyle(footerGuideStyle, showFooter && footerGuideActiveStyle)}>
        <span style={footerIconStyle} />
        <span style={footerTextStyle}>
          Press <strong style={{ color: '#ffffff' }}>Red Button</strong> / <strong style={{ color: '#ffffff' }}>Delete</strong> key on remote to remove selected item
        </span>
      </div>
    </section>
  );
}

export default WatchlistScreen;
