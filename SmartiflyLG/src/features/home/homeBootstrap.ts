import {
  createXtreamApi,
  type XtreamCategory,
  type XtreamLiveStream,
  type XtreamMovie,
  type XtreamSeries
} from '../../services/api';
import type { Session } from '../../store/appStore';

export type HeroKind = 'series' | 'movie' | 'live';

export type HeroItem = {
  id: string;
  contentId?: number;
  kind: HeroKind;
  badge: string;
  section: string;
  title: string;
  description: string;
  artwork?: string;
  meta: string[];
  categoryId?: string;
  containerExtension?: string;
};

export type ChannelItem = {
  id: string;
  kind: HeroKind;
  contentId: number;
  name: string;
  artwork?: string;
  fallbackLabel: string;
  subtitle?: string;
  accent: string;
  categoryId?: string;
  containerExtension?: string;
};

export type RailSection = {
  id: string;
  title: string;
  kind: 'live' | 'movie' | 'series';
  items: ChannelItem[];
};

export type HomeNotice = {
  title: string;
  body: string;
};

export type HomeBootstrapData = {
  hero: HeroItem;
  heroCandidates?: HeroItem[];
  rails: RailSection[];
  notice: HomeNotice | null;
};

const channelAccents = [
  'linear-gradient(180deg, #f4c14d 0%, #8f1b19 100%)',
  'linear-gradient(180deg, #ffffff 0%, #d6d6d6 34%, #8f0f13 35%, #f1f1f1 100%)',
  'linear-gradient(180deg, #d61010 0%, #c41616 100%)',
  'linear-gradient(180deg, #d80000 0%, #0f3ba8 100%)',
  'linear-gradient(180deg, #f50014 0%, #db0012 100%)'
];

export const fallbackHero: HeroItem = {
  id: 'fallback-hero',
  kind: 'series',
  badge: 'TOP 10',
  section: 'Series',
  title: 'Featured content',
  description: 'Connect a portal to load live stream artwork, channel logos, and the featured hero from stream data.',
  meta: ['Live', 'Stream']
};

const HOME_BOOTSTRAP_TIMEOUT_MS = 12000;
const HOME_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif'];
const TRUSTED_HOME_IMAGE_HOSTS = [
  'image.tmdb.org',
  'i.ibb.co',
  'i.ytimg.com',
  'img.youtube.com',
  'upload.wikimedia.org',
  'image.airtel.tv',
  'i0.wp.com',
  'i1.wp.com',
  'i2.wp.com',
  'i3.wp.com'
];

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

function isAllowedHomeImageUrl(value: string | undefined) {
  if (typeof value !== 'string') {
    return false;
  }

  const trimmed = value.trim();
  const lower = trimmed.toLowerCase();
  if (!lower.startsWith('https://') && !lower.startsWith('http://')) {
    return false;
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return false;
  }

  const hostname = url.hostname.toLowerCase();
  if (hostname === 'imdb.com' || hostname.endsWith('.imdb.com')) {
    return false;
  }

  const pathname = url.pathname.toLowerCase();
  if (HOME_IMAGE_EXTENSIONS.some((extension) => pathname.endsWith(extension))) {
    return true;
  }

  if (TRUSTED_HOME_IMAGE_HOSTS.some((host) => hostname === host || hostname.endsWith(`.${host}`))) {
    return true;
  }

  return false;
}

function sanitizeTMDBUrl(url: string): string {
  return url.replace(/^https:\/\/image\.tmdb\.org/i, 'http://image.tmdb.org');
}

function pickHomeImage(...values: Array<string | string[] | undefined>) {
  for (const value of values) {
    if (Array.isArray(value)) {
      for (const entry of value) {
        if (isAllowedHomeImageUrl(entry)) {
          return sanitizeTMDBUrl(entry.trim());
        }
      }
      continue;
    }

    if (isAllowedHomeImageUrl(value)) {
      return sanitizeTMDBUrl(value.trim());
    }
  }

  return undefined;
}

function hasUsableImage(value: string | undefined) {
  return isAllowedHomeImageUrl(value);
}

function normalizeImageKey(value: string | undefined) {
  return (value || '').trim().toLowerCase();
}

function hasBackdropStyleImage(...values: Array<string | string[] | undefined>) {
  return Boolean(pickHomeImage(...values));
}

function sortByNumberDesc<T>(items: T[], score: (item: T) => number) {
  return [...items].sort((a, b) => score(b) - score(a));
}

function sortByNumberAsc<T>(items: T[], score: (item: T) => number) {
  return [...items].sort((a, b) => score(a) - score(b));
}

function normalizeCategoryName(name: string) {
  return name.trim().toLowerCase();
}

function categoryMatchesAll(categoryName: string, keywords: string[]) {
  const normalized = normalizeCategoryName(categoryName);
  return keywords.every((keyword) => normalized.includes(keyword));
}

function findMatchingCategoryIds(categories: XtreamCategory[], keywordGroups: string[][]) {
  const ids: string[] = [];

  for (const keywords of keywordGroups) {
    const match = categories.find((category) => categoryMatchesAll(category.category_name, keywords));
    if (match && !ids.includes(match.category_id)) {
      ids.push(match.category_id);
    }
  }

  return ids;
}

function findCategoryIdsMatchingAnyKeyword(categories: XtreamCategory[], keywords: string[]) {
  const ids: string[] = [];

  for (const category of categories) {
    const normalized = normalizeCategoryName(category.category_name);
    if (keywords.some((keyword) => normalized.includes(keyword))) {
      ids.push(category.category_id);
    }
  }

  return ids;
}

function normalizeContentKey(value: string | undefined) {
  return (value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function takeUniqueContentItems<T extends { id: string; name?: string }>(
  items: T[],
  limit: number,
  excludedIds = new Set<string>(),
  excludedKeys = new Set<string>()
) {
  const nextItems: T[] = [];

  for (const item of items) {
    const contentKey = normalizeContentKey(item.name);
    if (excludedIds.has(item.id) || (contentKey && excludedKeys.has(contentKey))) {
      continue;
    }

    nextItems.push(item);
    excludedIds.add(item.id);
    if (contentKey) {
      excludedKeys.add(contentKey);
    }

    if (nextItems.length >= limit) {
      break;
    }
  }

  return nextItems;
}

function takeUniqueHomeItems<T extends { id: string; name?: string; artwork?: string }>(
  items: T[],
  limit: number,
  options?: {
    excludedIds?: Set<string>;
    excludedKeys?: Set<string>;
    excludedImages?: Set<string>;
    maxPerImage?: number;
  }
) {
  const nextItems: T[] = [];
  const excludedIds = options?.excludedIds ?? new Set<string>();
  const excludedKeys = options?.excludedKeys ?? new Set<string>();
  const excludedImages = options?.excludedImages ?? new Set<string>();
  const maxPerImage = options?.maxPerImage ?? 1;
  const imageCounts = new Map<string, number>();

  for (const item of items) {
    const contentKey = normalizeContentKey(item.name);
    const imageKey = normalizeImageKey(item.artwork);

    if (excludedIds.has(item.id) || (contentKey && excludedKeys.has(contentKey))) {
      continue;
    }

    if (imageKey) {
      if (excludedImages.has(imageKey)) {
        continue;
      }

      const currentCount = imageCounts.get(imageKey) ?? 0;
      if (currentCount >= maxPerImage) {
        continue;
      }
      imageCounts.set(imageKey, currentCount + 1);
    }

    nextItems.push(item);
    excludedIds.add(item.id);
    if (contentKey) {
      excludedKeys.add(contentKey);
    }
    if (imageKey) {
      excludedImages.add(imageKey);
    }

    if (nextItems.length >= limit) {
      break;
    }
  }

  return nextItems;
}

function filterByCategoryId<T extends { category_id?: string; categoryId?: string }>(items: T[], categoryId: string) {
  if (!categoryId) {
    return [];
  }

  return items.filter((item) => (item.category_id ?? item.categoryId) === categoryId);
}

async function withTimeout<T>(promise: Promise<T>, label: string, timeoutMs = HOME_BOOTSTRAP_TIMEOUT_MS) {
  return await Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      window.setTimeout(() => {
        reject(new Error(`${label} timed out`));
      }, timeoutMs);
    })
  ]);
}

function buildMixedCategorySource<T extends { category_id?: string; categoryId?: string }>(items: T[], categoryIds: string[]) {
  if (categoryIds.length === 0) {
    return [];
  }

  const buckets = categoryIds
    .map((categoryId) => filterByCategoryId(items, categoryId))
    .filter((bucket) => bucket.length > 0);

  const mixed: T[] = [];
  let index = 0;

  while (buckets.some((bucket) => index < bucket.length)) {
    for (const bucket of buckets) {
      if (index < bucket.length) {
        mixed.push(bucket[index]);
      }
    }
    index += 1;
  }

  return mixed;
}

function buildBalancedCategorySource<T extends { category_id?: string; categoryId?: string }>(
  items: T[],
  primaryCategoryIds: string[],
  secondaryCategoryIds: string[],
  totalItems: number
) {
  const primary = buildMixedCategorySource(items, primaryCategoryIds);
  const secondary = buildMixedCategorySource(items, secondaryCategoryIds);
  const primaryTarget = Math.ceil(totalItems / 2);
  const secondaryTarget = Math.floor(totalItems / 2);
  const result: T[] = [];
  const seen = new Set<string>();

  const getKey = (item: T) => {
    const candidate = item as T & {
      stream_id?: number | string;
      series_id?: number | string;
      streamId?: number | string;
      seriesId?: number | string;
      name?: string;
    };

    return String(
      candidate.stream_id ??
        candidate.series_id ??
        candidate.streamId ??
        candidate.seriesId ??
        candidate.name ??
        item.category_id ??
        item.categoryId ??
        ''
    );
  };
  const pushFromBucket = (bucket: T[], limit: number) => {
    let added = 0;

    for (const item of bucket) {
      const key = getKey(item);
      if (!key || seen.has(key)) {
        continue;
      }

      result.push(item);
      seen.add(key);
      added += 1;

      if (added >= limit || result.length >= totalItems) {
        break;
      }
    }
  };

  pushFromBucket(primary, primaryTarget);
  pushFromBucket(secondary, secondaryTarget);

  if (result.length < totalItems) {
    for (const item of [...primary, ...secondary]) {
      const key = getKey(item);
      if (!key || seen.has(key)) {
        continue;
      }

      result.push(item);
      seen.add(key);

      if (result.length >= totalItems) {
        break;
      }
    }
  }

  return result;
}

function mergePreferredItems<T extends { category_id?: string; categoryId?: string }>(
  primary: T[],
  fallback: T[],
  getKey: (item: T) => string
) {
  const seen = new Set<string>();
  const merged: T[] = [];

  for (const item of [...primary, ...fallback]) {
    const key = getKey(item);
    if (!key || seen.has(key)) {
      continue;
    }

    seen.add(key);
    merged.push(item);
  }

  return merged;
}

function mapLiveItem(item: XtreamLiveStream, index: number): ChannelItem {
  const artwork = pickHomeImage(item.stream_icon, item.direct_source);
  return {
    id: `live-${item.stream_id}`,
    kind: 'live',
    contentId: item.stream_id,
    name: item.name,
    artwork,
    fallbackLabel: getInitials(item.name),
    subtitle: 'Live TV',
    accent: channelAccents[index % channelAccents.length],
    categoryId: item.category_id
  };
}

function mapMovieItem(item: XtreamMovie, index: number): ChannelItem {
  return {
    id: `movie-${item.stream_id}`,
    kind: 'movie',
    contentId: item.stream_id,
    name: item.name,
    artwork: pickHomeImage(item.backdrop_path, item.stream_icon, item.direct_source),
    fallbackLabel: getInitials(item.name),
    subtitle: item.genre ? item.genre.split(',')[0].trim() : 'Movie',
    accent: channelAccents[index % channelAccents.length],
    categoryId: item.category_id,
    containerExtension: item.container_extension?.trim() || undefined
  };
}

function mapSeriesItem(item: XtreamSeries, index: number): ChannelItem {
  return {
    id: `series-${item.series_id}`,
    kind: 'series',
    contentId: item.series_id,
    name: item.name,
    artwork: pickHomeImage(item.cover, item.backdrop_path),
    fallbackLabel: getInitials(item.name),
    subtitle: item.genre ? item.genre.split(',')[0].trim() : 'Series',
    accent: channelAccents[index % channelAccents.length],
    categoryId: item.category_id
  };
}

function toHeroItem(
  item: XtreamSeries | XtreamMovie | XtreamLiveStream,
  type: HeroKind
): HeroItem {
  const name = 'name' in item ? item.name : 'Featured content';
  const description =
    type === 'series'
      ? (item as XtreamSeries).plot || 'Stream-backed featured content.'
      : type === 'movie'
        ? (item as XtreamMovie).plot || 'Stream-backed featured content.'
        : 'Stream-backed live channel spotlight.';

  const art =
    type === 'series'
      ? pickHomeImage((item as XtreamSeries).backdrop_path)
      : type === 'movie'
        ? pickHomeImage((item as XtreamMovie).backdrop_path)
        : pickHomeImage((item as XtreamLiveStream).stream_icon, (item as XtreamLiveStream).direct_source);

  const meta: string[] = [];

  if (type === 'series') {
    const series = item as XtreamSeries;
    if (series.rating) meta.push(series.rating);
    if (series.releaseDate) meta.push(String(series.releaseDate).split('-')[0]);
    if (series.genre) meta.push(series.genre.split(',')[0].trim());
  } else if (type === 'movie') {
    const movie = item as XtreamMovie;
    if (movie.rating_5based != null) meta.push(String(movie.rating_5based));
    if (movie.added) meta.push(String(movie.added).split(' ')[0]);
    if (movie.genre) meta.push(movie.genre.split(',')[0].trim());
  } else {
    meta.push('Live');
    meta.push('Channel');
  }

  return {
    id:
      type === 'series'
        ? `series-${(item as XtreamSeries).series_id}`
        : type === 'movie'
          ? `movie-${(item as XtreamMovie).stream_id}`
          : `live-${(item as XtreamLiveStream).stream_id}`,
    contentId:
      type === 'series'
        ? (item as XtreamSeries).series_id
        : type === 'movie'
          ? (item as XtreamMovie).stream_id
          : (item as XtreamLiveStream).stream_id,
    kind: type,
    badge: type === 'live' ? 'LIVE' : 'TOP 10',
    section: type === 'live' ? 'Live TV' : type === 'movie' ? 'Movies' : 'Series',
    title: name,
    description,
    artwork: art,
    meta: meta.filter(Boolean).slice(0, 3),
    categoryId:
      type === 'series'
        ? (item as XtreamSeries).category_id
        : type === 'movie'
          ? (item as XtreamMovie).category_id
          : (item as XtreamLiveStream).category_id,
    containerExtension: type === 'movie' ? (item as XtreamMovie).container_extension?.trim() || undefined : undefined
  };
}

function selectFirst<T>(items: T[], predicate: (item: T) => boolean): T | undefined {
  return items.find(predicate);
}

function ensureRailLength(items: ChannelItem[], minLength: number) {
  if (items.length <= minLength) {
    return items;
  }

  return items.slice(0, minLength);
}

function getHeroFromData(
  liveStreams: XtreamLiveStream[],
  vodStreams: XtreamMovie[],
  seriesItems: XtreamSeries[]
): { hero: HeroItem; candidates: HeroItem[] } {
  // Get all Series with valid backdrops, sorted by rating
  const validSeries = sortByNumberDesc(
    seriesItems.filter((entry) => {
      const art = pickHomeImage(entry.backdrop_path);
      return typeof art === 'string' && art.toLowerCase().startsWith('https://');
    }),
    (item) => Number(item.rating_5based || 0)
  );

  // Get all Movies with valid backdrops, sorted by rating
  const validMovies = sortByNumberDesc(
    vodStreams.filter((entry) => {
      const art = pickHomeImage(entry.backdrop_path);
      return typeof art === 'string' && art.toLowerCase().startsWith('https://');
    }),
    (item) => Number(item.rating_5based || 0)
  );

  // Pool top 10 items from each to ensure high-quality, high-rated options
  const topSeriesPool = validSeries.slice(0, 10);
  const topMoviesPool = validMovies.slice(0, 10);

  const mappedSeries = topSeriesPool.map((item) => toHeroItem(item, 'series'));
  const mappedMovies = topMoviesPool.map((item) => toHeroItem(item, 'movie'));

  const candidatesList: HeroItem[] = [...mappedSeries, ...mappedMovies];

  if (candidatesList.length > 0) {
    const randomIndex = Math.floor(Math.random() * candidatesList.length);
    const chosen = candidatesList[randomIndex];
    return { hero: chosen, candidates: candidatesList };
  }

  // Fallback to live channels if no movies or series have backdrops
  const validLives = liveStreams
    .filter((entry) => Boolean(pickHomeImage(entry.stream_icon, entry.direct_source)))
    .slice(0, 10);
  const mappedLives = validLives.map((item) => toHeroItem(item, 'live'));

  if (mappedLives.length > 0) {
    return { hero: mappedLives[0], candidates: mappedLives };
  }

  return { hero: fallbackHero, candidates: [fallbackHero] };
}

export async function loadHomeBootstrapData(session: Session): Promise<HomeBootstrapData> {
  const username = session.username?.trim();
  const password = session.userInfo?.password?.trim();
  const portalBaseUrl = session.portalBaseUrl?.trim();

  if (!username || !password || !portalBaseUrl) {
    return {
      hero: fallbackHero,
      rails: [],
      notice: {
        title: 'Connect a portal',
        body: 'Sign in with a portal, username, and password to load live channels, movies, and series.'
      }
    };
  }

  const api = createXtreamApi(portalBaseUrl);

  const [liveCategoriesResult, vodCategoriesResult, seriesCategoriesResult, liveStreamsResult, vodStreamsResult, seriesResult] = await Promise.allSettled([
    withTimeout(api.getLiveCategories(username, password), 'Live categories'),
    withTimeout(api.getVodCategories(username, password), 'Movie categories'),
    withTimeout(api.getSeriesCategories(username, password), 'Series categories'),
    withTimeout(api.getLiveStreams(username, password), 'Live streams'),
    withTimeout(api.getVodStreams(username, password), 'Movies'),
    withTimeout(api.getSeries(username, password), 'Series')
  ]);

  const liveCategories = liveCategoriesResult.status === 'fulfilled' ? liveCategoriesResult.value : [];
  const vodCategories = vodCategoriesResult.status === 'fulfilled' ? vodCategoriesResult.value : [];
  const seriesCategories = seriesCategoriesResult.status === 'fulfilled' ? seriesCategoriesResult.value : [];
  const liveStreams = liveStreamsResult.status === 'fulfilled' ? liveStreamsResult.value : [];
  const vodStreams = vodStreamsResult.status === 'fulfilled' ? vodStreamsResult.value : [];
  const series = seriesResult.status === 'fulfilled' ? seriesResult.value : [];

  if (
    liveStreamsResult.status === 'rejected' &&
    vodStreamsResult.status === 'rejected' &&
    seriesResult.status === 'rejected'
  ) {
    throw new Error('The portal request failed. Check the server URL, network, and credentials, then try again.');
  }

  const validLiveStreams = liveStreams.filter((item) => Boolean(pickHomeImage(item.stream_icon, item.direct_source)));
  const validMovies = vodStreams.filter((item) => Boolean(pickHomeImage(item.backdrop_path, item.stream_icon, item.direct_source)));
  const validSeries = series.filter((item) => Boolean(pickHomeImage(item.cover, item.backdrop_path)));

  const heroData = getHeroFromData(validLiveStreams, validMovies, validSeries);
  const sortedLive = sortByNumberAsc(validLiveStreams, (item) => Number(item.num) || 0);
  const sortedMovies = sortByNumberDesc(validMovies, (item) => {
    const added = item.added ? Date.parse(String(item.added)) : 0;
    const rating = Number(item.rating_5based || 0);
    return (Number.isFinite(added) ? added : 0) + rating * 1000;
  });
  const sortedSeries = sortByNumberDesc(validSeries, (item) => {
    const modified = item.last_modified ? Date.parse(String(item.last_modified)) : 0;
    const rating = Number(item.rating_5based || 0);
    return (Number.isFinite(modified) ? modified : 0) + rating * 1000;
  });
  const uniqueSeries = sortedSeries.filter((item, index, list) =>
    list.findIndex((entry) => entry.series_id === item.series_id) === index
  );
  const movieSeriesPriorityCategoryGroups = [
    ['english'],
    ['hindi']
  ];
  const seriesEnglishPriorityCategoryGroups = [
    ['english']
  ];
  const homeLiveNewsCategoryGroups = [
    ['pakistan', 'news'],
    ['pakistani', 'news'],
    ['pak', 'news']
  ];
  const homeLiveDramaCategoryGroups = [
    ['pakistan', 'drama'],
    ['pakistani', 'drama'],
    ['drama']
  ];
  const moviePriorityCategoryIds = findMatchingCategoryIds(vodCategories, movieSeriesPriorityCategoryGroups);
  const seriesPriorityCategoryIds = findMatchingCategoryIds(seriesCategories, seriesEnglishPriorityCategoryGroups);
  const strictHomeLiveNewsCategoryIds = findMatchingCategoryIds(liveCategories, homeLiveNewsCategoryGroups);
  const strictHomeLiveDramaCategoryIds = findMatchingCategoryIds(liveCategories, homeLiveDramaCategoryGroups);
  const broadHomeLiveNewsCategoryIds = findCategoryIdsMatchingAnyKeyword(liveCategories, ['news']);
  const broadHomeLiveDramaCategoryIds = findCategoryIdsMatchingAnyKeyword(liveCategories, ['drama']);
  const prioritizedMovies = buildMixedCategorySource(sortedMovies, moviePriorityCategoryIds);
  const prioritizedSeries = buildMixedCategorySource(uniqueSeries, seriesPriorityCategoryIds);
  const prioritizedHomeLive = buildBalancedCategorySource(
    sortedLive,
    strictHomeLiveNewsCategoryIds.length > 0 ? strictHomeLiveNewsCategoryIds : broadHomeLiveNewsCategoryIds,
    strictHomeLiveDramaCategoryIds.length > 0 ? strictHomeLiveDramaCategoryIds : broadHomeLiveDramaCategoryIds,
    12
  );
  const liveCandidates = prioritizedHomeLive.length > 0 ? prioritizedHomeLive : sortedLive;
  const trendingMovieCandidates = mergePreferredItems(
    sortByNumberDesc(prioritizedMovies, (item) => {
      const added = item.added ? Date.parse(String(item.added)) : 0;
      const rating = Number(item.rating_5based || 0);
      return (Number.isFinite(added) ? added : 0) + rating * 1000;
    }),
    sortByNumberDesc(sortedMovies, (item) => {
      const added = item.added ? Date.parse(String(item.added)) : 0;
      const rating = Number(item.rating_5based || 0);
      return (Number.isFinite(added) ? added : 0) + rating * 1000;
    }),
    (item) => String(item.stream_id)
  );
  const movieCandidates = mergePreferredItems(
    sortByNumberDesc(prioritizedMovies, (item) => {
      const added = item.added ? Date.parse(String(item.added)) : 0;
      return Number.isFinite(added) ? added : 0;
    }),
    sortByNumberDesc(sortedMovies, (item) => {
      const added = item.added ? Date.parse(String(item.added)) : 0;
      return Number.isFinite(added) ? added : 0;
    }),
    (item) => String(item.stream_id)
  );
  const seriesCandidates = mergePreferredItems(
    sortByNumberDesc(prioritizedSeries, (item) => {
      const modified = item.last_modified ? Date.parse(String(item.last_modified)) : 0;
      return Number.isFinite(modified) ? modified : 0;
    }),
    sortByNumberDesc(uniqueSeries, (item) => {
      const modified = item.last_modified ? Date.parse(String(item.last_modified)) : 0;
      return Number.isFinite(modified) ? modified : 0;
    }),
    (item) => String(item.series_id)
  );

  const usedMovieIds = new Set<string>();
  const usedMovieKeys = new Set<string>();
  const usedMovieImages = new Set<string>();
  const usedSeriesIds = new Set<string>();
  const usedSeriesKeys = new Set<string>();
  const usedSeriesImages = new Set<string>();
  const usedLiveImages = new Set<string>();

  const liveRailItems = ensureRailLength(
    takeUniqueHomeItems(
      liveCandidates
        .map((stream, index) => mapLiveItem(stream, index))
        .filter((item) => hasUsableImage(item.artwork)),
      12,
      {
        excludedIds: new Set<string>(),
        excludedKeys: new Set<string>(),
        excludedImages: usedLiveImages,
        maxPerImage: 1
      }
    ),
    12
  );

  const trendingMovieItems = ensureRailLength(
    takeUniqueHomeItems(
      trendingMovieCandidates
        .map((movie, index) => mapMovieItem(movie, index))
        .filter((item) => hasUsableImage(item.artwork)),
      12,
      {
        excludedIds: usedMovieIds,
        excludedKeys: usedMovieKeys,
        excludedImages: usedMovieImages,
        maxPerImage: 1
      }
    ),
    12
  );

  const movieRailItems = ensureRailLength(
    takeUniqueHomeItems(
      movieCandidates
        .map((movie, index) => mapMovieItem(movie, index))
        .filter((item) => hasUsableImage(item.artwork)),
      12,
      {
        excludedIds: usedMovieIds,
        excludedKeys: usedMovieKeys,
        excludedImages: usedMovieImages,
        maxPerImage: 1
      }
    ),
    12
  );

  const recentlyAddedSeriesItems = ensureRailLength(
    takeUniqueHomeItems(
      seriesCandidates
        .map((item, index) => mapSeriesItem(item, index))
        .filter((item) => hasUsableImage(item.artwork)),
      12,
      {
        excludedIds: usedSeriesIds,
        excludedKeys: usedSeriesKeys,
        excludedImages: usedSeriesImages,
        maxPerImage: 1
      }
    ),
    12
  );

  const rails: RailSection[] = [
    {
      id: 'live-highlights',
      title: prioritizedHomeLive.length > 0 ? 'Pakistan News & Drama' : 'Live Channels',
      kind: 'live',
      items: liveRailItems
    },
    {
      id: 'trending-for-you',
      title: 'Trending for You',
      kind: 'movie',
      items: trendingMovieItems
    },
    {
      id: 'movies',
      title: 'Movies',
      kind: 'movie',
      items: movieRailItems
    },
    {
      id: 'series',
      title: 'Series',
      kind: 'series',
      items: recentlyAddedSeriesItems
    }
  ].filter((rail) => rail.items.length > 0);

  return {
    hero: heroData.hero,
    heroCandidates: heroData.candidates,
    rails,
    notice:
      rails.length > 0
        ? null
        : {
            title: 'No catalog data yet',
            body: 'Your portal connected, but it did not return any live channels, movies, or series for this account.'
          }
  };
}
