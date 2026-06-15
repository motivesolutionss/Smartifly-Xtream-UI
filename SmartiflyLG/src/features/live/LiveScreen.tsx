import { type CSSProperties, type KeyboardEvent, type MutableRefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BrowsePosterArt } from '../../components/BrowsePosterArt';
import { createXtreamApi, type XtreamCategory, type XtreamLiveStream, type XtreamShortEpgEntry } from '../../services/api';
import {
  browseCategories,
  browseCategory,
  browseCategoryActive,
  browseCategoryCount,
  browseCategoryCountActive,
  browseContent,
  browseContentHeader,
  browseGridHeader,
  browseGridHeaderHint,
  browseGridTitle,
  browseHint,
  browseLabel,
  browseLoading,
  browseLoadingSpinner,
  browseScreenBase,
  browseSidebar,
  browseSidebarHeader,
  cardDebugOverlay,
  contentScreen,
  getCategoryItemStyle,
  liveChannelCard,
  liveChannelCardActive,
  liveChannelCardArt,
  liveChannelCardImg,
  liveGrid,
  liveGridScroll,
  mergeStyle,
  movieCardFallback,
  movieCardFallbackSpan,
  movieCardFallbackStrong
} from '../../styles/lgTvStyles';
import { useAppStore } from '../../store/appStore';
import { buildLivePlaybackRequest } from './livePlayback';

type LiveCategory = {
  id: string;
  name: string;
  count: number;
};

type LiveCard = {
  id: string;
  name: string;
  streamId: number;
  extension: string;
  artwork?: string;
  categoryId: string;
  accent: string;
  archiveAvailable: boolean;
  archiveDuration: number;
  epgChannelId: string | null;
};

type LiveEpgCacheEntry = {
  fetchedAt: number;
  programs: XtreamShortEpgEntry[];
};

const EPG_TTL_MS = 60 * 1000;
const EPG_DEBOUNCE_MS = 300;

const cardAccents = [
  'linear-gradient(180deg, #f5d06a 0%, #b54d21 100%)',
  'linear-gradient(180deg, #dfe7f2 0%, #6e7f92 100%)',
  'linear-gradient(180deg, #ff4c46 0%, #981015 100%)',
  'linear-gradient(180deg, #b9d4ff 0%, #163561 100%)',
  'linear-gradient(180deg, #f1b15a 0%, #72290c 100%)'
];

function pickImage(...values: Array<string | string[] | undefined>) {
  for (const value of values) {
    if (Array.isArray(value)) {
      for (const entry of value) {
        if (typeof entry === 'string' && entry.trim().length > 0) {
          return entry;
        }
      }
      continue;
    }

    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }
  }

  return undefined;
}

function sortByScore<T>(items: T[], score: (item: T) => number) {
  return [...items].sort((a, b) => score(a) - score(b));
}

function getInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return '?';
  }

  return words
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');
}

function truncateDebugValue(value: string | undefined, maxLength = 42) {
  if (!value) {
    return 'n/a';
  }

  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}...` : value;
}

function formatTime(timestamp: number) {
  if (!timestamp) {
    return '--:--';
  }

  return new Intl.DateTimeFormat([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(new Date(timestamp));
}

function truncateLine(value: string | undefined, maxLength = 42) {
  const trimmed = value?.trim() || '';
  if (!trimmed) {
    return '';
  }

  return trimmed.length > maxLength ? `${trimmed.slice(0, maxLength - 1)}...` : trimmed;
}

function parseFocusId(focusId: string) {
  if (!focusId.startsWith('card:')) {
    return null;
  }

  return focusId.slice('card:'.length);
}

function focusChannel(
  channel: LiveCard | undefined,
  setFocusId: (value: string) => void,
  cardRefs: MutableRefObject<Record<string, HTMLButtonElement | null>>
) {
  if (!channel) {
    return;
  }

  setFocusId(`card:${channel.id}`);
  cardRefs.current[`card:${channel.id}`]?.focus();
}

function focusCategory(
  categoryId: string,
  setFocusId: (value: string) => void,
  categoryRefs: MutableRefObject<Record<string, HTMLButtonElement | null>>
) {
  setFocusId(`category:${categoryId}`);
  categoryRefs.current[`category:${categoryId}`]?.focus();
}

function buildLiveCatalog(
  liveCategories: XtreamCategory[],
  liveStreams: XtreamLiveStream[],
  storedCategoryId: string,
  storedFocusId: string
) {
  const sortedStreams = sortByScore(liveStreams, (stream) => Number(stream.num) || 0);
  const channels = sortedStreams.map<LiveCard>((stream, index) => ({
    id: `live-${stream.stream_id}`,
    name: stream.name,
    streamId: stream.stream_id,
    extension: 'm3u8',
    artwork: pickImage(stream.stream_icon, stream.direct_source),
    categoryId: stream.category_id || '0',
    accent: cardAccents[index % cardAccents.length],
    archiveAvailable: Number(stream.tv_archive) === 1,
    archiveDuration: Number(stream.tv_archive_duration) || 0,
    epgChannelId: stream.epg_channel_id ?? null
  }));

  const counts = channels.reduce<Record<string, number>>((acc, channel) => {
    acc[channel.categoryId] = (acc[channel.categoryId] || 0) + 1;
    return acc;
  }, {});

  const categories: LiveCategory[] = liveCategories
    .filter((category) => counts[category.category_id] > 0)
    .map((category) => ({
      id: category.category_id,
      name: category.category_name,
      count: counts[category.category_id] || 0
    }));

  const defaultCategoryId = categories[0]?.id || '';
  const selectedCategoryId = categories.some((category) => category.id === storedCategoryId)
    ? storedCategoryId
    : defaultCategoryId;
  const focusId = (() => {
    if (storedFocusId.startsWith('card:')) {
      const channelId = parseFocusId(storedFocusId);
      const storedChannel = channels.find((channel) => channel.id === channelId);
      if (storedChannel && storedChannel.categoryId === selectedCategoryId) {
        return storedFocusId;
      }
    }

    if (storedFocusId.startsWith('category:')) {
      const categoryId = storedFocusId.slice('category:'.length);
      if (categories.some((category) => category.id === categoryId)) {
        return storedFocusId;
      }
    }

    return selectedCategoryId ? `category:${selectedCategoryId}` : '';
  })();

  return {
    categories,
    channels,
    selectedCategoryId,
    focusId
  };
}

type LiveScreenProps = {
  onRequestSidebarFocus: () => void;
  contentFocusToken: number;
  onContentRegionChange: (region: 'categories' | 'cards') => void;
};

function LiveScreen({ onRequestSidebarFocus, contentFocusToken, onContentRegionChange }: LiveScreenProps) {
  const session = useAppStore((state) => state.session);
  const openPlayback = useAppStore((state) => state.openPlayback);
  const setStatusMessage = useAppStore((state) => state.setStatusMessage);
  const setLiveBrowseState = useAppStore((state) => state.setLiveBrowseState);
  const storedCategoryId = useAppStore((state) => state.liveCategoryId);
  const storedFocusId = useAppStore((state) => state.liveFocusId);
  const liveCatalog = useAppStore((state) => state.liveCatalog);
  const setLiveCatalog = useAppStore((state) => state.setLiveCatalog);

  const [categories, setCategories] = useState<LiveCategory[]>(() => liveCatalog?.categories ?? []);
  const [channels, setChannels] = useState<LiveCard[]>(() => liveCatalog?.channels ?? []);
  const [selectedCategoryId, setSelectedCategoryId] = useState(() => liveCatalog?.selectedCategoryId ?? storedCategoryId);
  const [focusId, setFocusId] = useState(() => liveCatalog?.focusId ?? storedFocusId);
  const [isLoading, setIsLoading] = useState(() => !liveCatalog);
  const [clockMs, setClockMs] = useState(() => Date.now());
  const [epgByChannel, setEpgByChannel] = useState<Record<string, LiveEpgCacheEntry>>({});
  const [epgLoadingChannelId, setEpgLoadingChannelId] = useState('');
  const categoryRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const cardRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const lastFocusedChannelId = useRef<string | null>(useAppStore.getState().liveLastFocusedCardId || null);
  const epgRequestIdRef = useRef(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setClockMs(Date.now());
    }, 30 * 1000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const username = session?.username?.trim();
    const password = session?.userInfo?.password?.trim();
    const portalBaseUrl = session?.portalBaseUrl?.trim();

    if (!username || !password || !portalBaseUrl) {
      setCategories([]);
      setChannels([]);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    const api = createXtreamApi(portalBaseUrl);

    async function loadLive() {
      if (!liveCatalog) {
        setIsLoading(true);
      }
      try {
        const [categoriesResult, streamsResult] = await Promise.allSettled([
          api.getLiveCategories(username, password),
          api.getLiveStreams(username, password)
        ]);

        if (cancelled) {
          return;
        }

        const liveCategories = categoriesResult.status === 'fulfilled' ? categoriesResult.value : [];
        const liveStreams = streamsResult.status === 'fulfilled' ? streamsResult.value : [];
        const nextCatalog = buildLiveCatalog(liveCategories, liveStreams, storedCategoryId, storedFocusId);

        setCategories(nextCatalog.categories);
        setChannels(nextCatalog.channels);
        setSelectedCategoryId(nextCatalog.selectedCategoryId);
        setFocusId(nextCatalog.focusId);
      } catch {
        if (!cancelled && !liveCatalog) {
          setCategories([]);
          setChannels([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadLive();

    return () => {
      cancelled = true;
    };
  }, [session?.portalBaseUrl, session?.userInfo?.password, session?.username]);

  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === selectedCategoryId) ?? categories[0] ?? null,
    [categories, selectedCategoryId]
  );

  const visibleChannels = useMemo(() => {
    const selected = selectedCategoryId
      ? channels.filter((channel) => channel.categoryId === selectedCategoryId)
      : channels;

    return selected;
  }, [channels, selectedCategoryId]);
  const hasCatalogContent = categories.length > 0 && channels.length > 0;

  const featuredChannel = useMemo(() => {
    const focusedChannelId = parseFocusId(focusId);
    if (focusedChannelId) {
      const focusedChannel = visibleChannels.find((channel) => channel.id === focusedChannelId);
      if (focusedChannel) {
        return focusedChannel;
      }
    }

    return visibleChannels[0] ?? channels[0] ?? null;
  }, [channels, focusId, visibleChannels]);

  useEffect(() => {
    const username = session?.username?.trim();
    const password = session?.userInfo?.password?.trim();
    const portalBaseUrl = session?.portalBaseUrl?.trim();

    if (!featuredChannel || !username || !password || !portalBaseUrl) {
      return;
    }

    const cached = epgByChannel[featuredChannel.id];
    if (cached && Date.now() - cached.fetchedAt <= EPG_TTL_MS) {
      return;
    }

    const requestId = ++epgRequestIdRef.current;
    const api = createXtreamApi(portalBaseUrl);
    const timer = window.setTimeout(async () => {
      setEpgLoadingChannelId(featuredChannel.id);
      try {
        const programs = await api.getShortEpg(username, password, featuredChannel.streamId, 10);
        if (epgRequestIdRef.current !== requestId) {
          return;
        }

        setEpgByChannel((current) => ({
          ...current,
          [featuredChannel.id]: {
            fetchedAt: Date.now(),
            programs
          }
        }));
      } catch {
        if (epgRequestIdRef.current !== requestId) {
          return;
        }

        setEpgByChannel((current) => ({
          ...current,
          [featuredChannel.id]: {
            fetchedAt: Date.now(),
            programs: []
          }
        }));
      } finally {
        if (epgRequestIdRef.current === requestId) {
          setEpgLoadingChannelId('');
        }
      }
    }, EPG_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [epgByChannel, featuredChannel, session?.portalBaseUrl, session?.userInfo?.password, session?.username]);

  const featuredPrograms = featuredChannel ? epgByChannel[featuredChannel.id]?.programs ?? [] : [];
  const currentProgram = useMemo(
    () => featuredPrograms.find((program) => clockMs >= program.startTime && clockMs <= program.endTime) ?? null,
    [clockMs, featuredPrograms]
  );
  const nextProgram = useMemo(
    () => featuredPrograms.find((program) => program.startTime > clockMs) ?? null,
    [clockMs, featuredPrograms]
  );
  const currentProgramProgress = currentProgram
    ? Math.min(1, Math.max(0, (clockMs - currentProgram.startTime) / Math.max(1, currentProgram.endTime - currentProgram.startTime)))
    : 0;

  useEffect(() => {
    const focusedChannelId = parseFocusId(focusId);
    if (focusedChannelId) {
      lastFocusedChannelId.current = focusedChannelId;
      setLiveBrowseState({
        focusId,
        lastFocusedCardId: focusedChannelId
      });
    } else if (focusId) {
      setLiveBrowseState({ focusId });
    }
  }, [focusId, setLiveBrowseState]);

  useEffect(() => {
    if (selectedCategoryId) {
      setLiveBrowseState({ categoryId: selectedCategoryId });
    }
  }, [selectedCategoryId, setLiveBrowseState]);

  useEffect(() => {
    if (categories.length > 0 && channels.length > 0) {
      setLiveCatalog({
        categories,
        channels,
        selectedCategoryId,
        focusId
      });
    }
  }, [categories, channels, selectedCategoryId, focusId, setLiveCatalog]);

  const handlePlayChannel = useCallback((channel: LiveCard) => {
    const username = session?.username?.trim();
    const password = session?.userInfo?.password?.trim();
    const portalBaseUrl = session?.portalBaseUrl?.trim();

    if (!username || !password || !portalBaseUrl) {
      setStatusMessage('Missing live playback session');
      return;
    }

    const playback = buildLivePlaybackRequest({
      username,
      password,
      portalBaseUrl,
      channels: visibleChannels.map((entry) => ({
        id: entry.id,
        title: entry.name,
        streamId: entry.streamId,
        artwork: entry.artwork
      })),
      selectedChannelId: channel.id
    });

    if (!playback) {
      setStatusMessage('Missing live stream URL');
      return;
    }

    console.debug('LG live playback URL', {
      channel: channel.name,
      liveIndex: playback.liveIndex,
      url: playback.streamUrl
    });
    setStatusMessage(`Playing ${channel.name}`);
    openPlayback(playback);
  }, [openPlayback, session?.portalBaseUrl, session?.userInfo?.password, session?.username, setStatusMessage, visibleChannels]);

  useEffect(() => {
    if (focusId.startsWith('card:')) {
      return;
    }
    const categoryNode = categoryRefs.current[`category:${selectedCategoryId}`];
    if (categoryNode && document.activeElement !== categoryNode) {
      onContentRegionChange('categories');
      categoryNode.focus();
    }
  }, [onContentRegionChange, selectedCategoryId, categories, focusId]);

  useEffect(() => {
    if (!focusId) return;

    if (focusId.startsWith('card:')) {
      const node = cardRefs.current[focusId];
      if (node) {
        if (document.activeElement !== node) {
          onContentRegionChange('cards');
          node.focus();
        }
        return;
      }
    }

    if (focusId.startsWith('category:')) {
      const node = categoryRefs.current[focusId];
      if (node) {
        if (document.activeElement !== node) {
          onContentRegionChange('categories');
          node.focus();
        }
        return;
      }
    }
  }, [focusId, categories, visibleChannels, isLoading, onContentRegionChange]);

  useEffect(() => {
    const categoryNode = categoryRefs.current[`category:${selectedCategoryId}`];
    if (categoryNode) {
      onContentRegionChange('categories');
      setFocusId(`category:${selectedCategoryId}`);
      categoryNode.focus();
    }
  }, [contentFocusToken, onContentRegionChange, selectedCategoryId]);

  const handleCategoryKeyDown = (event: KeyboardEvent<HTMLButtonElement>, categoryIndex: number) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const nextCategory = categories[Math.min(categoryIndex + 1, categories.length - 1)];
      if (nextCategory) {
        setFocusId(`category:${nextCategory.id}`);
        categoryRefs.current[`category:${nextCategory.id}`]?.focus();
      }
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      const nextCategory = categories[Math.max(categoryIndex - 1, 0)];
      if (nextCategory) {
        setFocusId(`category:${nextCategory.id}`);
        categoryRefs.current[`category:${nextCategory.id}`]?.focus();
      }
      return;
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      onRequestSidebarFocus();
      return;
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      const rememberedChannelId = lastFocusedChannelId.current;
      const rememberedChannel =
        visibleChannels.find((channel) => channel.id === rememberedChannelId) ?? visibleChannels[0];
      focusChannel(rememberedChannel, setFocusId, cardRefs);
    }
  };

  const handleCardKeyDown = (event: KeyboardEvent<HTMLButtonElement>, channelIndex: number) => {
    const columns = 4;
    const rowCount = Math.max(1, Math.ceil(visibleChannels.length / columns));

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      if (channelIndex === 0 && selectedCategoryId) {
        focusCategory(selectedCategoryId, setFocusId, categoryRefs);
        return;
      }

      const previousChannel = visibleChannels[channelIndex - 1] ?? visibleChannels[visibleChannels.length - 1];
      focusChannel(previousChannel, setFocusId, cardRefs);
      return;
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      const nextChannel = visibleChannels[channelIndex + 1] ?? visibleChannels[0];
      focusChannel(nextChannel, setFocusId, cardRefs);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      const col = channelIndex % columns;
      const targetRow = channelIndex - columns >= 0 ? Math.floor(channelIndex / columns) - 1 : rowCount - 1;
      let nextIndex = targetRow * columns + col;
      while (nextIndex >= visibleChannels.length) {
        nextIndex -= columns;
      }
      if (nextIndex < 0) {
        nextIndex = visibleChannels.length - 1;
      }
      focusChannel(visibleChannels[nextIndex], setFocusId, cardRefs);
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const col = channelIndex % columns;
      const targetRow = channelIndex + columns < visibleChannels.length ? Math.floor(channelIndex / columns) + 1 : 0;
      let nextIndex = targetRow * columns + col;
      while (nextIndex >= visibleChannels.length) {
        nextIndex -= columns;
      }
      focusChannel(visibleChannels[nextIndex], setFocusId, cardRefs);
    }
  };

  return (
    <section
      className="lg-browse-scroll"
      style={mergeStyle(contentScreen, browseScreenBase)}
      aria-label="Smartifly live tv"
    >
      <aside style={browseSidebar} aria-label="Live categories">
        <div style={browseSidebarHeader}>
          <p style={browseLabel}>Live TV</p>
        </div>

        <div className="lg-browse-scroll" style={browseCategories}>
          {categories.map((category, index) => {
            const isSelected = selectedCategoryId === category.id;
            const isFocused = focusId === `category:${category.id}`;

            return (
              <button
                key={category.id}
                type="button"
                ref={(node) => {
                  categoryRefs.current[`category:${category.id}`] = node;
                }}
                style={getCategoryItemStyle(isFocused, isSelected)}
                onClick={() => {
                  setSelectedCategoryId(category.id);
                  setFocusId(`category:${category.id}`);
                  onContentRegionChange('categories');
                }}
                onMouseEnter={() => {
                  setFocusId(`category:${category.id}`);
                  onContentRegionChange('categories');
                }}
                onFocus={() => {
                  setFocusId(`category:${category.id}`);
                  onContentRegionChange('categories');
                }}
                onKeyDown={(event) => handleCategoryKeyDown(event, index)}
              >
                {(isSelected || isFocused) && (
                  <span
                    aria-hidden="true"
                    style={{
                      position: 'absolute',
                      left: '0',
                      top: '14px',
                      bottom: '14px',
                      width: '4px',
                      borderRadius: '999px',
                      background: '#ff2438'
                    }}
                  />
                )}
                <span style={{ 
                  color: isFocused ? '#07090e' : '#ffffff', 
                  fontSize: '18px', 
                  fontWeight: 800,
                  paddingLeft: '6px'
                }}>
                  {category.name}
                </span>
                <span style={{ 
                  color: isFocused ? 'rgba(7, 9, 14, 0.65)' : 'rgba(255, 255, 255, 0.45)', 
                  fontSize: '13px', 
                  fontWeight: 700,
                  paddingRight: '6px'
                }}>
                  {category.count}
                </span>
              </button>
            );
          })}
        </div>
      </aside>

      <section style={browseContent} aria-label="Live channel grid">
        <div style={mergeStyle(browseGridHeader, browseContentHeader)}>
          <div style={liveHeaderContentStyle}>
            <p style={browseLabel}>{selectedCategory?.name ?? 'Live TV'}</p>
            <h2 style={browseGridTitle}>{featuredChannel?.name ?? 'Browse channels'}</h2>
            <div style={liveProgramHeadlineWrapStyle}>
              <p style={liveProgramTitleStyle}>
                {epgLoadingChannelId === featuredChannel?.id
                  ? 'Loading guide...'
                  : currentProgram?.title || 'Guide unavailable for this channel'}
              </p>
              {featuredChannel?.archiveAvailable ? (
                <span style={liveCatchupBadgeStyle}>
                  Replay {featuredChannel.archiveDuration > 0 ? `${featuredChannel.archiveDuration}h` : 'On'}
                </span>
              ) : null}
            </div>
            {currentProgram ? (
              <>
                <div style={liveProgramMetaStyle}>
                  <span>{formatTime(currentProgram.startTime)} - {formatTime(currentProgram.endTime)}</span>
                  {currentProgram.description ? <span>{truncateLine(currentProgram.description, 88)}</span> : null}
                </div>
                <div style={liveProgressTrackStyle}>
                  <div
                    style={{
                      ...liveProgressFillStyle,
                      width: `${Math.round(currentProgramProgress * 100)}%`
                    }}
                  />
                </div>
              </>
            ) : (
              <p style={liveProgramFallbackStyle}>
                {featuredChannel?.epgChannelId ? 'No listings are available right now.' : 'This channel has no linked EPG guide.'}
              </p>
            )}
            <p style={liveNextStyle}>
              {nextProgram ? `Next: ${nextProgram.title} (${formatTime(nextProgram.startTime)})` : 'Next: Schedule unavailable'}
            </p>
          </div>
          <p style={mergeStyle(browseHint, browseGridHeaderHint)}>
            {isLoading && !hasCatalogContent
              ? 'Loading titles...'
              : isLoading
                ? 'Refreshing titles...'
                : visibleChannels.length > 0
                  ? `${visibleChannels.length} titles`
                  : 'No titles loaded'}
          </p>
        </div>

        <div className="lg-browse-scroll" style={liveGridScroll}>
          {isLoading && !hasCatalogContent ? (
            <div style={browseLoading} role="status" aria-live="polite">
              <div style={browseLoadingSpinner} aria-hidden="true" />
              <p>Loading channels...</p>
            </div>
          ) : (
          <div style={liveGrid}>
            {visibleChannels.map((channel, index) => {
              const isFocused = focusId === `card:${channel.id}`;

              return (
                <button
                  key={channel.id}
                  type="button"
                  ref={(node) => {
                    cardRefs.current[`card:${channel.id}`] = node;
                  }}
                  style={mergeStyle(liveChannelCard, isFocused && liveChannelCardActive)}
                  onFocus={() => {
                    setFocusId(`card:${channel.id}`);
                    onContentRegionChange('cards');
                  }}
                  onMouseEnter={() => {
                    setFocusId(`card:${channel.id}`);
                    onContentRegionChange('cards');
                  }}
                  onClick={() => handlePlayChannel(channel)}
                  onKeyDown={(event) => handleCardKeyDown(event, index)}
                >
                  <BrowsePosterArt
                    artwork={channel.artwork}
                    name={channel.name}
                    accent={channel.accent}
                    badge="LIVE"
                    artStyle={liveChannelCardArt}
                    imgStyle={liveChannelCardImg}
                  />
                  {import.meta.env.DEV ? (
                    <div style={cardDebugOverlay}>
                      <span>ID: {channel.streamId}</span>
                      <span>EXT: {channel.extension}</span>
                      <span>IMG: {truncateDebugValue(channel.artwork)}</span>
                    </div>
                  ) : null}
                </button>
              );
            })}
          </div>
          )}
        </div>
      </section>
    </section>
  );
}

export default LiveScreen;

const liveHeaderContentStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
  maxWidth: '820px'
};

const liveProgramHeadlineWrapStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  flexWrap: 'wrap'
};

const liveProgramTitleStyle: CSSProperties = {
  margin: 0,
  color: '#ffffff',
  fontSize: '20px',
  lineHeight: 1.3,
  fontWeight: 700
};

const liveProgramMetaStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '14px',
  color: 'rgba(255, 255, 255, 0.68)',
  fontSize: '13px',
  fontWeight: 700
};

const liveProgressTrackStyle: CSSProperties = {
  width: '320px',
  maxWidth: '100%',
  height: '5px',
  borderRadius: '999px',
  background: 'rgba(255, 255, 255, 0.12)',
  overflow: 'hidden'
};

const liveProgressFillStyle: CSSProperties = {
  height: '100%',
  borderRadius: '999px',
  background: 'linear-gradient(90deg, #ff3047 0%, #c80d24 100%)'
};

const liveNextStyle: CSSProperties = {
  margin: 0,
  color: 'rgba(255, 255, 255, 0.74)',
  fontSize: '13px',
  fontWeight: 700
};

const liveProgramFallbackStyle: CSSProperties = {
  margin: 0,
  color: 'rgba(255, 255, 255, 0.52)',
  fontSize: '13px',
  fontWeight: 600
};

const liveCatchupBadgeStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '28px',
  padding: '0 10px',
  borderRadius: '999px',
  background: 'rgba(229, 9, 20, 0.18)',
  border: '1px solid rgba(229, 9, 20, 0.35)',
  color: '#ffb6bd',
  fontSize: '12px',
  fontWeight: 800,
  letterSpacing: '0.4px',
  textTransform: 'uppercase'
};
