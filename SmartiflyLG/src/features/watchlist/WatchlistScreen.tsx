import { type KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  contentScreen,
  eyebrow,
  heroCopy,
  mergeStyle,
  panelAction,
  panelActionActive,
  panelActionGhost,
  panelActions,
  panelCopy,
  panelHeader,
  panelInfoCard,
  panelInfoLabel,
  panelInfoValue,
  panelMeta,
  panelScreenBase,
  panelSidebar,
  panelTitle,
  watchlistCard,
  watchlistCardActive,
  watchlistCardArt,
  watchlistCardCopy,
  watchlistCardFallback,
  watchlistCardImg,
  watchlistCardMeta,
  watchlistCardTitle,
  watchlistChips,
  watchlistDetails,
  watchlistEmpty,
  watchlistHero,
  watchlistList,
  watchlistPoster,
  watchlistPreview
} from '../../styles/lgTvStyles';
import { useAppStore, type SelectedContent } from '../../store/appStore';
import useWatchlistStore, {
  buildWatchlistScope,
  type WatchlistEntry
} from '../../store/watchlistStore';

type WatchlistScreenProps = {
  onRequestSidebarFocus: () => void;
};

function toSelectedContent(entry: WatchlistEntry): SelectedContent | null {
  if (entry.data && typeof entry.data === 'object' && 'contentId' in entry.data && 'kind' in entry.data && 'title' in entry.data) {
    const candidate = entry.data as SelectedContent;
    return {
      id: candidate.id || entry.key,
      contentId: candidate.contentId,
      kind: candidate.kind,
      title: candidate.title,
      categoryId: candidate.categoryId,
      posterUrl: candidate.posterUrl || entry.image,
      backdropUrl: candidate.backdropUrl || entry.image,
      description: candidate.description,
      year: candidate.year || entry.year,
      rating: candidate.rating || entry.rating?.toString()
    };
  }

  if (entry.kind === 'movie' || entry.kind === 'series') {
    return {
      id: entry.key,
      contentId: Number(entry.entityId) || 0,
      kind: entry.kind,
      title: entry.title,
      posterUrl: entry.image,
      backdropUrl: entry.image,
      description: entry.subtitle,
      year: entry.year,
      rating: entry.rating?.toString()
    };
  }

  return null;
}

function WatchlistScreen({ onRequestSidebarFocus }: WatchlistScreenProps) {
  const session = useAppStore((state) => state.session);
  const openContentDetails = useAppStore((state) => state.openContentDetails);
  const setStatusMessage = useAppStore((state) => state.setStatusMessage);
  const scope = useMemo(() => buildWatchlistScope(session?.portalCode, session?.username), [session?.portalCode, session?.username]);
  const rawEntries = useWatchlistStore((state) => state.entries);
  const removeFavorite = useWatchlistStore((state) => state.removeFavorite);
  const clearScope = useWatchlistStore((state) => state.clearScope);
  const [selectedKey, setSelectedKey] = useState('');
  const [focusId, setFocusId] = useState('back');
  const focusRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const screenRef = useRef<HTMLElement | null>(null);

  const entries = useMemo(
    () => (Array.isArray(rawEntries) ? rawEntries : [])
      .filter((entry) => entry.scope === scope)
      .sort((a, b) => b.addedAt - a.addedAt),
    [rawEntries, scope]
  );

  const selectedEntry = useMemo(
    () => entries.find((entry) => entry.key === selectedKey) ?? entries[0] ?? null,
    [entries, selectedKey]
  );

  const registerFocusRef = (id: string) => (node: HTMLButtonElement | null) => {
    if (node) {
      focusRefs.current[id] = node;
      return;
    }

    delete focusRefs.current[id];
  };

  useEffect(() => {
    if (entries.length === 0) {
      setSelectedKey('');
      setFocusId('back');
      screenRef.current?.focus();
      return;
    }

    setSelectedKey((current) => (entries.some((entry) => entry.key === current) ? current : entries[0].key));
    setFocusId((current) => (entries.some((entry) => entry.key === current.replace('list:', '')) ? current : `list:${entries[0].key}`));
  }, [entries]);

  useEffect(() => {
    const node = focusRefs.current[focusId];
    if (node && document.activeElement !== node) {
      node.focus();
    }
  }, [focusId, selectedEntry?.key]);

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

  const removeSelected = () => {
    if (!selectedEntry) {
      return;
    }

    removeFavorite(selectedEntry.key);
    setStatusMessage(`Removed ${selectedEntry.title} from watchlist`);
  };

  const clearAll = () => {
    clearScope(scope);
    setStatusMessage('Watchlist cleared');
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (entries.length === 0) {
      if (event.key === 'Enter' || event.key === 'ArrowLeft' || event.key === 'Backspace' || event.key === 'Escape') {
        event.preventDefault();
        onRequestSidebarFocus();
      }
      return;
    }

    const itemIndex = selectedEntry ? entries.findIndex((entry) => entry.key === selectedEntry.key) : -1;

    if (focusId.startsWith('list:')) {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        onRequestSidebarFocus();
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        const nextIndex = Math.max(itemIndex - 1, 0);
        const nextEntry = entries[nextIndex];
        if (nextEntry) {
          setSelectedKey(nextEntry.key);
          setFocusId(`list:${nextEntry.key}`);
        }
        return;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        const nextIndex = Math.min(itemIndex + 1, entries.length - 1);
        const nextEntry = entries[nextIndex];
        if (nextEntry) {
          setSelectedKey(nextEntry.key);
          setFocusId(`list:${nextEntry.key}`);
        } else {
          setFocusId('clear');
        }
        return;
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        setFocusId('open');
      }

      return;
    }

    if (focusId === 'clear') {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        onRequestSidebarFocus();
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        const nextEntry = entries[Math.max(itemIndex, 0)];
        if (nextEntry) {
          setSelectedKey(nextEntry.key);
          setFocusId(`list:${nextEntry.key}`);
        }
        return;
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        setFocusId('open');
      }

      return;
    }

    if (focusId === 'open' || focusId === 'remove') {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setFocusId(focusId === 'open' ? 'remove' : 'back');
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setFocusId(focusId === 'remove' ? 'open' : `list:${selectedEntry?.key || entries[0]?.key || ''}`);
        return;
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        setFocusId(`list:${selectedEntry?.key || entries[0]?.key || ''}`);
      }

      return;
    }

    if (focusId === 'back') {
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setFocusId('remove');
        return;
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        onRequestSidebarFocus();
      }
    }
  };

  return (
    <section
      ref={screenRef}
      style={mergeStyle(contentScreen, panelScreenBase)}
      aria-label="Watchlist"
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <aside style={panelSidebar}>
        <div style={panelHeader}>
          <p style={eyebrow}>Watchlist</p>
          <h1 style={panelTitle}>Saved titles</h1>
          <p style={panelCopy}>
            Keep movies and series you want to return to. Items are stored per portal and username.
          </p>
          <p style={panelMeta}>{entries.length} saved items</p>
        </div>

        {entries.length > 0 ? (
          <div style={watchlistList} role="list" aria-label="Saved titles">
            {entries.map((entry) => {
              const itemFocusId = `list:${entry.key}`;
              const isSelected = selectedEntry?.key === entry.key;
              const isFocused = focusId === itemFocusId;
              const isActive = isSelected || isFocused;

              return (
                <button
                  key={entry.key}
                  ref={registerFocusRef(itemFocusId)}
                  type="button"
                  style={mergeStyle(watchlistCard, isActive && watchlistCardActive)}
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
                  <div style={watchlistCardArt}>
                    {entry.image ? (
                      <img src={entry.image} alt="" style={watchlistCardImg} />
                    ) : (
                      <div style={watchlistCardFallback}>{entry.title.slice(0, 2).toUpperCase()}</div>
                    )}
                  </div>
                  <div style={watchlistCardCopy}>
                    <strong style={watchlistCardTitle}>{entry.title}</strong>
                    <span style={watchlistCardMeta}>
                      {entry.kind.toUpperCase()}
                      {entry.year ? ` · ${entry.year}` : ''}
                    </span>
                  </div>
                </button>
              );
            })}

            <button
              ref={registerFocusRef('clear')}
              type="button"
              style={mergeStyle(panelAction, focusId === 'clear' && panelActionActive)}
              onFocus={() => setFocusId('clear')}
              onClick={clearAll}
            >
              Clear watchlist
            </button>
          </div>
        ) : (
          <div style={watchlistEmpty}>
            <h2 style={panelTitle}>No saved titles yet</h2>
            <p style={panelCopy}>
              Open any movie or series details and use the save button to add it here.
              Press left or back to return to the sidebar.
            </p>
          </div>
        )}
      </aside>

      <div style={watchlistPreview}>
        {selectedEntry ? (
          <>
            <div style={watchlistHero}>
              <div style={watchlistPoster}>
                {selectedEntry.image ? (
                  <img src={selectedEntry.image} alt="" style={watchlistCardImg} />
                ) : (
                  <div style={watchlistCardFallback}>{selectedEntry.title.slice(0, 2).toUpperCase()}</div>
                )}
              </div>

              <div style={watchlistDetails}>
                <p style={eyebrow}>Selected item</p>
                <h2 style={panelTitle}>{selectedEntry.title}</h2>
                <div style={watchlistChips}>
                  <span style={watchlistCardMeta}>{selectedEntry.kind.toUpperCase()}</span>
                  {selectedEntry.year ? <span style={watchlistCardMeta}>{selectedEntry.year}</span> : null}
                  {selectedEntry.rating ? <span style={watchlistCardMeta}>{selectedEntry.rating}</span> : null}
                </div>
                <p style={heroCopy}>
                  {selectedEntry.subtitle || 'Saved to your per-account watchlist.'}
                </p>

                <div style={panelActions}>
                  <button
                    ref={registerFocusRef('open')}
                    type="button"
                    style={mergeStyle(panelAction, { minWidth: '160px' }, focusId === 'open' && panelActionActive)}
                    onFocus={() => setFocusId('open')}
                    onClick={openSelected}
                  >
                    Open
                  </button>
                  <button
                    ref={registerFocusRef('remove')}
                    type="button"
                    style={mergeStyle(panelAction, panelActionGhost, { minWidth: '160px' }, focusId === 'remove' && panelActionActive)}
                    onFocus={() => setFocusId('remove')}
                    onClick={removeSelected}
                  >
                    Remove
                  </button>
                  <button
                    ref={registerFocusRef('back')}
                    type="button"
                    style={mergeStyle(panelAction, panelActionGhost, { minWidth: '160px' }, focusId === 'back' && panelActionActive)}
                    onFocus={() => setFocusId('back')}
                    onClick={onRequestSidebarFocus}
                  >
                    Sidebar
                  </button>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '16px' }}>
              <div style={panelInfoCard}>
                <span style={panelInfoLabel}>Scope</span>
                <strong style={panelInfoValue}>{scope}</strong>
              </div>
              <div style={panelInfoCard}>
                <span style={panelInfoLabel}>Saved</span>
                <strong style={panelInfoValue}>{new Date(selectedEntry.addedAt).toLocaleDateString()}</strong>
              </div>
            </div>
          </>
        ) : (
          <div style={watchlistEmpty}>
            <p style={eyebrow}>Preview</p>
            <h2 style={panelTitle}>Pick a title from the list</h2>
            <p style={heroCopy}>
              Your watchlist preview will appear here when you save something.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

export default WatchlistScreen;
