import { type KeyboardEvent, type MutableRefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BrowsePosterArt } from '../../components/BrowsePosterArt';
import { createXtreamApi, type XtreamLiveStream } from '../../services/api';
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
};

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
  const [categories, setCategories] = useState<LiveCategory[]>([]);
  const [channels, setChannels] = useState<LiveCard[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState(() => useAppStore.getState().liveCategoryId || '');
  const [focusId, setFocusId] = useState(() => useAppStore.getState().liveFocusId || '');
  const [isLoading, setIsLoading] = useState(false);
  const categoryRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const cardRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const lastFocusedChannelId = useRef<string | null>(useAppStore.getState().liveLastFocusedCardId || null);

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
      setIsLoading(true);
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

        const sortedStreams = sortByScore(liveStreams, (stream) => Number(stream.num) || 0);
        const mappedChannels = sortedStreams.map<LiveCard>((stream, index) => ({
          id: `live-${stream.stream_id}`,
          name: stream.name,
          streamId: stream.stream_id,
          extension: 'm3u8',
          artwork: pickImage(stream.stream_icon, stream.direct_source),
          categoryId: stream.category_id || '0',
          accent: cardAccents[index % cardAccents.length]
        }));

        const counts = mappedChannels.reduce<Record<string, number>>((acc, channel) => {
          acc[channel.categoryId] = (acc[channel.categoryId] || 0) + 1;
          return acc;
        }, {});

        const nextCategories: LiveCategory[] = liveCategories
          .filter((category) => counts[category.category_id] > 0)
          .map((category) => ({
            id: category.category_id,
            name: category.category_name,
            count: counts[category.category_id] || 0
          }));

        const defaultCategoryId = nextCategories[0]?.id || '';

        setCategories(nextCategories);
        setChannels(mappedChannels);
        setSelectedCategoryId((current) => {
          return nextCategories.some((category) => category.id === current) ? current : defaultCategoryId;
        });
        setFocusId((current) => {
          if (current.startsWith('card:')) {
            const channelId = parseFocusId(current);
            const exists = mappedChannels.some((c) => c.id === channelId);
            if (exists) {
              return current;
            }
          }
          return current && current !== 'category:all'
            ? current
            : defaultCategoryId
              ? `category:${defaultCategoryId}`
              : '';
        });
      } catch {
        if (!cancelled) {
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
            const isActive = isSelected || isFocused;

            return (
              <button
                key={category.id}
                type="button"
                ref={(node) => {
                  categoryRefs.current[`category:${category.id}`] = node;
                }}
                style={mergeStyle(browseCategory, isActive && browseCategoryActive)}
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
                <span>{category.name}</span>
                <span style={mergeStyle(browseCategoryCount, isActive && browseCategoryCountActive)}>{category.count}</span>
              </button>
            );
          })}
        </div>
      </aside>

      <section style={browseContent} aria-label="Live channel grid">
        <div style={mergeStyle(browseGridHeader, browseContentHeader)}>
          <div>
            <p style={browseLabel}>{selectedCategory?.name ?? 'Live TV'}</p>
            <h2 style={browseGridTitle}>{featuredChannel?.name ?? 'Browse channels'}</h2>
          </div>
          <p style={mergeStyle(browseHint, browseGridHeaderHint)}>
            {isLoading ? 'Loading titles...' : visibleChannels.length > 0 ? `${visibleChannels.length} titles` : 'No titles loaded'}
          </p>
        </div>

        <div className="lg-browse-scroll" style={liveGridScroll}>
          {isLoading ? (
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
