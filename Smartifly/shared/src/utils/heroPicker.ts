import { useEffect, useMemo, useRef, useState } from 'react';

export type HeroPick = {
  id: string;
  type: 'movie' | 'series';
  title: string;
  description: string;
  backdrop?: string;
  poster?: string;
  rating?: number;
  year?: string;
  genre?: string;
  tags: string[];
  data: any;
};

type HeroPickOptions = {
  seedKey: string;
  maxCandidates?: number;
  pickPoolSize?: number;
  now?: number;
};

export type HeroCarousel = {
  items: HeroPick[];
  index: number;
  current: HeroPick | null;
  next: HeroPick | null;
};

const DEFAULT_MAX_CANDIDATES = 30;
const DEFAULT_PICK_POOL = 8;
const DEFAULT_ROTATION_HOURS = 12;
const DEFAULT_INTERVAL_MS = 15000;

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

const hash32 = (input: string): number => {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    // eslint-disable-next-line no-bitwise
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  // eslint-disable-next-line no-bitwise
  return h >>> 0;
};

const getRotationBucket = (rotationHours: number, now: number) => {
  const bucketMs = rotationHours * 60 * 60 * 1000;
  return Math.floor(now / bucketMs);
};

export const useHeroRotationKey = (rotationHours: number = DEFAULT_ROTATION_HOURS): string => {
  const [bucket, setBucket] = useState(() =>
    getRotationBucket(rotationHours, Date.now())
  );

  useEffect(() => {
    const now = Date.now();
    const bucketMs = rotationHours * 60 * 60 * 1000;
    const next = (bucket + 1) * bucketMs;
    const delay = Math.max(next - now, 1000);
    const timer = setTimeout(() => {
      setBucket(getRotationBucket(rotationHours, Date.now()));
    }, delay);
    return () => clearTimeout(timer);
  }, [bucket, rotationHours]);

  return String(bucket);
};

const toEpochMs = (value: any): number => {
  if (value == null) return 0;
  if (typeof value === 'number') {
    return value > 1e12 ? value : value * 1000;
  }
  const n = Number(value);
  if (Number.isFinite(n)) {
    return n > 1e12 ? n : n * 1000;
  }
  const t = Date.parse(String(value));
  return Number.isFinite(t) ? t : 0;
};

const toYear = (value?: string | number): string | undefined => {
  if (value == null) return undefined;
  const str = String(value);
  const year = str.includes('-') ? str.split('-')[0] : str;
  return year.length === 4 ? year : undefined;
};

const computeRecency = (timestampMs: number, now: number): number => {
  if (!timestampMs) return 0.35;
  const ageDays = Math.max(0, (now - timestampMs) / 86400000);
  return clamp01(1 / (1 + ageDays / 30));
};

const computeRating = (rating?: number): number => {
  if (rating == null) return 0.35;
  const n = Number(rating);
  if (!Number.isFinite(n)) return 0.35;
  return clamp01(n / 5);
};

const computeScore = (opts: {
  rating: number;
  recency: number;
  random: number;
  hasImage: boolean;
}) => {
  const base = opts.rating * 0.55 + opts.recency * 0.35 + opts.random * 0.1;
  return opts.hasImage ? base : base * 0.6;
};

const pushCandidate = (
  list: Array<{ score: number; pick: HeroPick }>,
  next: { score: number; pick: HeroPick },
  limit: number
) => {
  if (list.length === 0) {
    list.push(next);
    return;
  }

  let insertAt = -1;
  for (let i = 0; i < list.length; i += 1) {
    if (next.score > list[i].score) {
      insertAt = i;
      break;
    }
  }

  if (insertAt === -1) {
    if (list.length < limit) {
      list.push(next);
    }
    return;
  }

  list.splice(insertAt, 0, next);
  if (list.length > limit) {
    list.pop();
  }
};

const buildMoviePick = (movie: any): HeroPick | null => {
  const title = movie?.name ? String(movie.name) : '';
  if (!title) return null;

  const backdrop =
    (Array.isArray(movie?.backdrop_path) ? movie.backdrop_path[0] : movie?.backdrop_path) ||
    movie?.stream_icon ||
    movie?.cover;

  const poster = movie?.stream_icon || movie?.cover || backdrop;
  const genre = movie?.genre ? String(movie.genre) : undefined;
  const year = toYear(movie?.releasedate || movie?.releaseDate || movie?.release_date || movie?.year);

  return {
    id: `movie-${movie?.stream_id}`,
    type: 'movie',
    title,
    description: movie?.plot ? String(movie.plot) : 'No description available.',
    backdrop: backdrop ? String(backdrop) : undefined,
    poster: poster ? String(poster) : undefined,
    rating: movie?.rating_5based,
    year,
    genre,
    tags: [genre].filter(Boolean) as string[],
    data: movie,
  };
};

const buildSeriesPick = (series: any): HeroPick | null => {
  const title = series?.name ? String(series.name) : '';
  if (!title) return null;

  const backdrop =
    (Array.isArray(series?.backdrop_path) ? series.backdrop_path[0] : series?.backdrop_path) ||
    series?.cover;

  const poster = series?.cover || backdrop;
  const genre = series?.genre ? String(series.genre) : undefined;
  const year = toYear(series?.releasedate || series?.releaseDate || series?.release_date || series?.year);

  return {
    id: `series-${series?.series_id}`,
    type: 'series',
    title,
    description: series?.plot ? String(series.plot) : 'No description available.',
    backdrop: backdrop ? String(backdrop) : undefined,
    poster: poster ? String(poster) : undefined,
    rating: series?.rating_5based,
    year,
    genre,
    tags: [genre, 'Series'].filter(Boolean) as string[],
    data: series,
  };
};

export const getHeroCandidates = (
  movies: any[],
  series: any[],
  options: HeroPickOptions
): HeroPick[] => {
  const now = options.now ?? Date.now();
  const seedKey = options.seedKey;
  const maxCandidates = options.maxCandidates ?? DEFAULT_MAX_CANDIDATES;

  const ranked: Array<{ score: number; pick: HeroPick }> = [];

  const pushPick = (pick: HeroPick | null, timestampMs: number) => {
    if (!pick) return;
    const rating = computeRating(pick.rating);
    const recency = computeRecency(timestampMs, now);
    const rand = (hash32(`${seedKey}|${pick.id}`) % 10000) / 10000;
    const hasImage = Boolean(pick.backdrop || pick.poster);
    const score = computeScore({ rating, recency, random: rand, hasImage });
    pushCandidate(ranked, { score, pick }, maxCandidates);
  };

  if (Array.isArray(movies)) {
    for (const movie of movies) {
      const pick = buildMoviePick(movie);
      const timestampMs = toEpochMs(movie?.added || movie?.releaseDate || movie?.releasedate);
      pushPick(pick, timestampMs);
    }
  }

  if (Array.isArray(series)) {
    for (const item of series) {
      const pick = buildSeriesPick(item);
      const timestampMs = toEpochMs(item?.last_modified || item?.releaseDate || item?.releasedate);
      pushPick(pick, timestampMs);
    }
  }

  if (ranked.length === 0) return [];

  return ranked.map((entry) => entry.pick);
};

const buildHeroPool = (
  candidates: HeroPick[],
  seedKey: string,
  pickPoolSize: number
): HeroPick[] => {
  if (!candidates.length) return [];
  const pool = candidates.slice(0, Math.min(pickPoolSize, candidates.length));
  return pool
    .slice()
    .sort((a, b) => hash32(`${seedKey}|${a.id}`) - hash32(`${seedKey}|${b.id}`));
};

const getIntervalIndex = (intervalMs: number, now: number, length: number) => {
  if (length <= 0) return 0;
  return Math.floor(now / intervalMs) % length;
};

export const getHeroCarousel = (
  movies: any[],
  series: any[],
  options: HeroPickOptions & { intervalMs?: number }
): HeroCarousel => {
  const now = options.now ?? Date.now();
  const intervalMs = options.intervalMs ?? DEFAULT_INTERVAL_MS;
  const pickPoolSize = options.pickPoolSize ?? DEFAULT_PICK_POOL;

  const candidates = getHeroCandidates(movies, series, options);
  const pool = buildHeroPool(candidates, options.seedKey, pickPoolSize);
  const index = getIntervalIndex(intervalMs, now, pool.length);
  const current = pool[index] ?? null;
  const next = pool.length > 0 ? pool[(index + 1) % pool.length] : null;

  return { items: pool, index, current, next };
};

export const useHeroCarousel = (
  movies: any[],
  series: any[],
  seedKey: string,
  rotationHours: number = DEFAULT_ROTATION_HOURS,
  intervalMs: number = DEFAULT_INTERVAL_MS,
  pickPoolSize: number = DEFAULT_PICK_POOL
): HeroCarousel => {
  // Freeze the selection per app session. It should only change on reload.
  const rotationKeyRef = useRef<string>(
    String(getRotationBucket(rotationHours, Date.now()))
  );
  const intervalBaseRef = useRef<number>(Date.now());
  const rotationKey = rotationKeyRef.current;

  const candidates = useMemo(
    () =>
      getHeroCandidates(movies, series, {
        seedKey: `${seedKey}|${rotationKey}`,
        maxCandidates: DEFAULT_MAX_CANDIDATES,
        pickPoolSize,
      }),
    [movies, series, seedKey, rotationKey, pickPoolSize]
  );

  const pool = useMemo(
    () => buildHeroPool(candidates, `${seedKey}|${rotationKey}`, pickPoolSize),
    [candidates, seedKey, rotationKey, pickPoolSize]
  );

  const index = getIntervalIndex(intervalMs, intervalBaseRef.current, pool.length);

  const current = pool[index] ?? null;
  const next = pool.length > 0 ? pool[(index + 1) % pool.length] : null;

  return { items: pool, index, current, next };
};
