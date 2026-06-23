import type { AppMovie, AppSeries, AppChannel, AppCategory } from "../../types/appModels";
import { stableHash } from "../../utils/imagePolicy";
import { imageFailureMemory } from "../../utils/imageFailureMemory";
import type { HeroItem } from "../../components/common/HeroBanner";
import type { SmartRow } from "../../services/interfaces/analyticsService";
import type { RecentlyWatchedItem } from "../../storage/recentlyWatchedStorage";
import type { HomeRailPolicy as AdaptiveHomeRailPolicy } from "./homeAdaptivePolicy";
import { rankHomeRails } from "./homeRailRanker";
import type {
  HomeRail,
  HomeRailItem,
  HomeContinueRailItem,
  HomeLiveRailItem,
  HomeMovieRailItem,
  HomeSeriesRailItem,
} from "./homeTypes";

export const HOME_POLICY = {
  heroItemsCap: 6,
  liveRailCap: 15,
  continueWatchingCap: 12,
  vodRailCap: 20,
  seriesRailCap: 20,
  categoryRailMinUsableItems: 5,
};

type HomeRailBuildOptions = Pick<
  AdaptiveHomeRailPolicy,
  | "totalRailsCap"
  | "movieCategoryRails"
  | "seriesCategoryRails"
  | "smartRowsCap"
  | "itemsPerRail"
  | "trendingItems"
  | "liveItems"
  | "newReleaseItems"
> & {
  profileId?: string | null;
  trendingIds?: string[];
  smartRows?: SmartRow[];
};

const DEFAULT_HOME_RAIL_BUILD_OPTIONS: HomeRailBuildOptions = {
  totalRailsCap: Number.POSITIVE_INFINITY,
  movieCategoryRails: 2,
  seriesCategoryRails: 2,
  smartRowsCap: 2,
  itemsPerRail: 15,
  trendingItems: 15,
  liveItems: 15,
  newReleaseItems: 15,
};

type HomeScoredItem = {
  id: string;
  title: string;
  categoryId?: string;
  posterUrl?: string;
  backdropUrl?: string;
};

type PreparedHomeItem<T extends HomeScoredItem> = {
  item: T;
  artworkUrl?: string;
  hasArtwork: boolean;
  score: number;
  year: number;
};

type HomeCategoryGroup<T extends HomeScoredItem> = {
  category: AppCategory;
  items: PreparedHomeItem<T>[];
  totalCount: number;
  usableCount: number;
};

const isMovie = (item: AppMovie | AppSeries): item is AppMovie => {
  return "extension" in item;
};

const getPreparedItemKey = (
  entry: PreparedHomeItem<AppMovie> | PreparedHomeItem<AppSeries>
) => {
  const type = isMovie(entry.item) ? "vod" : "series";
  return `${type}:${entry.item.id}`;
};

const scoreMovie = (item: AppMovie) => {
  const hasBackdrop = item.backdropUrl ? 1000 : 0;
  const hasPoster = item.posterUrl ? 200 : 0;
  return hasBackdrop + hasPoster + (stableHash(item.id) % 100);
};

const parseMovieYear = (item: AppMovie) => {
  const parsedYear = Number.parseInt(item.year ?? "", 10);
  if (Number.isFinite(parsedYear)) {
    return parsedYear;
  }

  const titleYearMatch = item.title.match(/\b(19|20)\d{2}\b/);
  if (!titleYearMatch) {
    return 0;
  }

  const parsedTitleYear = Number.parseInt(titleYearMatch[0], 10);
  return Number.isFinite(parsedTitleYear) ? parsedTitleYear : 0;
};

const scoreSeries = (item: AppSeries) => {
  const hasBackdrop = item.backdropUrl ? 900 : 0;
  const hasPoster = item.posterUrl ? 300 : 0;
  const hasMetadata =
    (item.description ? 40 : 0) +
    (item.rating ? 20 : 0) +
    (item.genre ? 10 : 0);
  return hasBackdrop + hasPoster + hasMetadata + (stableHash(item.id) % 100);
};

const parseSeriesYear = (item: AppSeries) => {
  const parsedYear = Number.parseInt(item.year ?? "", 10);
  return Number.isFinite(parsedYear) ? parsedYear : 0;
};

const getUsableArtworkUrl = (item: {
  posterUrl?: string;
  backdropUrl?: string;
}) => {
  const posterAvailable =
    item.posterUrl && !imageFailureMemory.hasFailed(item.posterUrl)
      ? item.posterUrl
      : undefined;
  const backdropAvailable =
    item.backdropUrl && !imageFailureMemory.hasFailed(item.backdropUrl)
      ? item.backdropUrl
      : undefined;

  return posterAvailable || backdropAvailable;
};

const getUsableHeroArtworkUrl = (item: {
  posterUrl?: string;
  backdropUrl?: string;
}) => {
  const backdropAvailable =
    item.backdropUrl && !imageFailureMemory.hasFailed(item.backdropUrl)
      ? item.backdropUrl
      : undefined;
  const posterAvailable =
    item.posterUrl && !imageFailureMemory.hasFailed(item.posterUrl)
      ? item.posterUrl
      : undefined;

  return backdropAvailable || posterAvailable;
};

const prepareHomeItems = <T extends HomeScoredItem>(
  items: T[],
  getScore: (item: T) => number,
  getYear: (item: T) => number
): PreparedHomeItem<T>[] =>
  items.map((item) => {
    const artworkUrl = getUsableArtworkUrl(item);

    return {
      item,
      artworkUrl,
      hasArtwork: Boolean(artworkUrl),
      score: getScore(item),
      year: getYear(item),
    };
  });

const indexItemsByCategory = <T extends HomeScoredItem>(items: PreparedHomeItem<T>[]) => {
  const byCategoryId = new Map<string, PreparedHomeItem<T>[]>();

  for (const entry of items) {
    const categoryId = entry.item.categoryId;
    if (!categoryId) continue;

    const existing = byCategoryId.get(categoryId);
    if (existing) {
      existing.push(entry);
      continue;
    }

    byCategoryId.set(categoryId, [entry]);
  }

  return byCategoryId;
};

const selectHomeCategoryGroups = <T extends HomeScoredItem>(
  categories: AppCategory[],
  itemsByCategoryId: Map<string, PreparedHomeItem<T>[]>,
  maxCategories: number
) => {
  const candidates: HomeCategoryGroup<T>[] = categories
    .map((category) => {
      const categoryItems = itemsByCategoryId.get(category.id) ?? [];
      return {
        category,
        items: categoryItems,
        totalCount: categoryItems.length,
        usableCount: categoryItems.filter((item) => item.hasArtwork).length,
      };
    })
    .filter(
      (group) =>
        group.totalCount >= HOME_POLICY.categoryRailMinUsableItems && group.usableCount > 0
    );

  const strongCandidates = candidates
    .filter((group) => group.usableCount >= HOME_POLICY.categoryRailMinUsableItems)
    .sort((left, right) => {
      if (right.usableCount !== left.usableCount) {
        return right.usableCount - left.usableCount;
      }

      return right.totalCount - left.totalCount;
    });

  if (strongCandidates.length >= maxCategories) {
    return strongCandidates.slice(0, maxCategories);
  }

  const usedCategoryIds = new Set(strongCandidates.map((group) => group.category.id));
  const fallbackCandidates = candidates
    .filter((group) => !usedCategoryIds.has(group.category.id))
    .sort((left, right) => {
      if (right.usableCount !== left.usableCount) {
        return right.usableCount - left.usableCount;
      }

      return right.totalCount - left.totalCount;
    });

  return [...strongCandidates, ...fallbackCandidates].slice(0, maxCategories);
};

const toMovieRailItem = (entry: PreparedHomeItem<AppMovie>): HomeMovieRailItem => ({
  ...entry.item,
  id: entry.item.id,
  title: entry.item.title,
  type: "vod",
  contentType: "MOVIE",
  imageUrl: entry.artworkUrl,
  backdropUrl: entry.item.backdropUrl,
});

const toSeriesRailItem = (entry: PreparedHomeItem<AppSeries>): HomeSeriesRailItem => ({
  ...entry.item,
  id: entry.item.id,
  title: entry.item.title,
  type: "series",
  contentType: "SERIES",
  imageUrl: entry.artworkUrl,
  backdropUrl: entry.item.backdropUrl,
});

export const buildHomeRails = (
  movies: AppMovie[] = [],
  series: AppSeries[] = [],
  liveStreams: AppChannel[] = [],
  continueWatching: RecentlyWatchedItem[] = [],
  vodCategories: AppCategory[] = [],
  seriesCategories: AppCategory[] = [],
  options: Partial<HomeRailBuildOptions> = {}
): HomeRail[] => {
  const resolvedOptions: HomeRailBuildOptions = {
    ...DEFAULT_HOME_RAIL_BUILD_OPTIONS,
    ...options,
  };
  const rails: HomeRail[] = [];
  const usedKeys = new Set<string>();
  const movieEntries = prepareHomeItems(movies, scoreMovie, parseMovieYear);
  const seriesEntries = prepareHomeItems(series, scoreSeries, parseSeriesYear);
  const moviesByCategoryId = indexItemsByCategory(movieEntries);
  const seriesByCategoryId = indexItemsByCategory(seriesEntries);

  const formatTimeLabel = (seconds?: number) => {
    if (!seconds) return "00:00 watched";
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    const time = [hrs, mins, secs]
      .map((value) => value.toString().padStart(2, "0"))
      .filter((value, index) => value !== "00" || index > 0)
      .join(":");
    return `${time} watched`;
  };

  const toContinueRailItem = (item: RecentlyWatchedItem): HomeContinueRailItem => {
    const progress =
      item.positionSeconds && item.durationSeconds && item.durationSeconds > 0
        ? Math.min(100, Math.round((item.positionSeconds / item.durationSeconds) * 100))
        : 0;

    const progressText = progress
      ? `${formatTimeLabel(item.positionSeconds)} - ${progress}% completed`
      : `${formatTimeLabel(item.positionSeconds)}`;

    return {
      id: item.id,
      title: item.title,
      type: item.type === "series" ? "series" : "vod",
      imageUrl: item.backdropUrl || item.imageUrl,
      backdropUrl: item.backdropUrl,
      contentType: item.type === "series" ? "SERIES" : "MOVIE",
      progress,
      progressText,
    };
  };

  if (continueWatching.length > 0) {
    const continueItems = continueWatching
      .filter((item) => item.type === "vod" || item.type === "series")
      .slice(0, HOME_POLICY.continueWatchingCap)
      .map(toContinueRailItem);

    rails.push({
      id: "continue-watching",
      title: "Continue Watching",
      items: continueItems,
      variant: "continue",
    });
  }

  const getDedupped = (
    items: Array<PreparedHomeItem<AppMovie> | PreparedHomeItem<AppSeries>>,
    max: number
  ) => {
    const result: Array<PreparedHomeItem<AppMovie> | PreparedHomeItem<AppSeries>> = [];
    for (const item of items) {
      if (result.length >= max) break;
      const itemKey = getPreparedItemKey(item);
      if (!usedKeys.has(itemKey)) {
        usedKeys.add(itemKey);
        result.push(item);
      }
    }
    return result;
  };

  const appendRail = (
    id: string,
    title: string,
    items: HomeRailItem[],
    variant?: HomeRail["variant"]
  ) => {
    if (items.length === 0) return;

    rails.push({
      id,
      title,
      items,
      variant,
    });
  };

  const appendPreparedRail = (
    id: string,
    title: string,
    entries: Array<PreparedHomeItem<AppMovie> | PreparedHomeItem<AppSeries>>,
    maxItems: number
  ) => {
    const deduped = getDedupped(entries, maxItems);
    const selectedEntries = deduped.length > 0 ? deduped : entries.slice(0, maxItems);
    const items = selectedEntries.map((entry) =>
      isMovie(entry.item) ? toMovieRailItem(entry as PreparedHomeItem<AppMovie>) : toSeriesRailItem(entry as PreparedHomeItem<AppSeries>)
    );
    appendRail(id, title, items);
  };

  const appendCategoryRail = (
    id: string,
    title: string,
    entries: Array<PreparedHomeItem<AppMovie> | PreparedHomeItem<AppSeries>>,
    maxItems: number
  ) => {
    const categoryEntries = entries
      .filter((item) => item.hasArtwork)
      .sort((left, right) => right.score - left.score)
      .slice(0, maxItems * 2);

    if (categoryEntries.length === 0) {
      return;
    }

    appendPreparedRail(id, title, categoryEntries, maxItems);
  };

  const appendLiveRail = (
    id: string,
    title: string,
    streams: AppChannel[],
    maxItems: number,
    dedupe: boolean
  ) => {
    const items: HomeLiveRailItem[] = [];

    for (const stream of streams) {
      if (!stream.logoUrl) continue;
      const itemKey = `live:${stream.id}`;
      if (dedupe && usedKeys.has(itemKey)) continue;
      if (dedupe) usedKeys.add(itemKey);

      items.push({
        ...stream,
        id: stream.id,
        title: stream.title,
        type: "live",
        contentType: "LIVE",
        imageUrl: stream.logoUrl,
      });

      if (items.length >= maxItems) break;
    }

    appendRail(id, title, items, "live");
  };

  const clearSupplementalDedupe = () => {
    usedKeys.clear();
  };

  appendLiveRail(
    "live-channels",
    "Live Channels",
    liveStreams,
    resolvedOptions.itemsPerRail,
    true
  );
  appendPreparedRail(
    "movies",
    "Movies",
    movieEntries.filter((entry) => entry.hasArtwork).sort((left, right) => right.score - left.score),
    resolvedOptions.itemsPerRail
  );
  appendPreparedRail(
    "series",
    "Series",
    seriesEntries.filter((entry) => entry.hasArtwork).sort((left, right) => right.score - left.score),
    resolvedOptions.itemsPerRail
  );

  clearSupplementalDedupe();

  const trending = [...movieEntries, ...seriesEntries]
    .filter((item) => item.hasArtwork)
    .sort((left, right) => {
      const leftIsTrending = resolvedOptions.trendingIds?.includes(left.item.id) ? 1 : 0;
      const rightIsTrending = resolvedOptions.trendingIds?.includes(right.item.id) ? 1 : 0;

      if (rightIsTrending !== leftIsTrending) {
        return rightIsTrending - leftIsTrending;
      }

      return right.score - left.score;
    });

  if (trending.length > 0) {
    appendPreparedRail("trending", "Trending for You", trending, resolvedOptions.trendingItems);
  }

  const smartRowEntries = resolvedOptions.smartRows?.slice(0, resolvedOptions.smartRowsCap ?? 0) ?? [];
  smartRowEntries.forEach((smartRow, index) => {
    const smartItems = prepareHomeItems(smartRow.items, scoreMovie, parseMovieYear)
      .filter((item) => item.hasArtwork)
      .sort((left, right) => right.score - left.score);
    appendPreparedRail(
      `smart-row-${index + 1}`,
      smartRow.title,
      smartItems,
      resolvedOptions.itemsPerRail
    );
  });

  if (movies.length > 0) {
    const yearRankedMovies = movieEntries
      .filter((movie) => movie.hasArtwork && movie.year > 0)
      .sort((left, right) => {
        const yearDelta = right.year - left.year;
        if (yearDelta !== 0) {
          return yearDelta;
        }

        return right.score - left.score;
      });

    const fallbackMovies = movieEntries
      .filter((movie) => movie.hasArtwork)
      .sort((left, right) => right.score - left.score);

    const sortedMovies = yearRankedMovies.length > 0 ? yearRankedMovies : fallbackMovies;

    if (sortedMovies.length > 0) {
      appendPreparedRail("new-movies", "New Movies", sortedMovies, resolvedOptions.newReleaseItems);
    }
  }

  appendLiveRail("live-highlights", "Live TV Highlights", liveStreams, resolvedOptions.liveItems, true);

  const topVodCategories = selectHomeCategoryGroups(
    vodCategories,
    moviesByCategoryId,
    resolvedOptions.movieCategoryRails
  );
  topVodCategories.forEach((group) => {
    appendCategoryRail(
      `category-vod-${group.category.id}`,
      group.category.name,
      [...group.items],
      resolvedOptions.itemsPerRail
    );
  });

  const topSeriesCategories = selectHomeCategoryGroups(
    seriesCategories,
    seriesByCategoryId,
    resolvedOptions.seriesCategoryRails
  );
  topSeriesCategories.forEach((group) => {
    appendCategoryRail(
      `category-series-${group.category.id}`,
      group.category.name,
      [...group.items],
      resolvedOptions.itemsPerRail
    );
  });

  if (series.length > 0) {
    const yearRankedSeries = seriesEntries
      .filter((seriesItem) => seriesItem.hasArtwork && seriesItem.year > 0)
      .sort((left, right) => {
        const yearDelta = right.year - left.year;
        if (yearDelta !== 0) {
          return yearDelta;
        }

        return right.score - left.score;
      });

    const fallbackSeries = seriesEntries
      .filter((seriesItem) => seriesItem.hasArtwork)
      .sort((left, right) => right.score - left.score);

    const sortedSeries = yearRankedSeries.length > 0 ? yearRankedSeries : fallbackSeries;

    if (sortedSeries.length > 0) {
      appendPreparedRail(
        "series-spotlight",
        "Series Spotlight",
        sortedSeries,
        resolvedOptions.itemsPerRail
      );
    }
  }

  const ranked = rankHomeRails({
    rails,
    profileId: resolvedOptions.profileId || "default-profile",
    policy: {
      itemsPerRail: resolvedOptions.itemsPerRail,
      totalRailsCap: resolvedOptions.totalRailsCap,
    },
  });

  return ranked.rails;
};

export const buildHomeHeroItems = (
  movies: AppMovie[] = [],
  series: AppSeries[] = [],
  liveStreams: AppChannel[] = [],
  continueWatching: RecentlyWatchedItem[] = []
): HeroItem[] => {
  const heroItems: HeroItem[] = [];
  const heroIds = new Set<string>();
  const movieEntries = prepareHomeItems(movies, scoreMovie, parseMovieYear);
  const seriesEntries = prepareHomeItems(series, scoreSeries, parseSeriesYear);

  const canPushHero = (id: string) => {
    if (heroIds.has(id)) return false;
    heroIds.add(id);
    return true;
  };

  const pushMovieHero = (movie: AppMovie, description?: string) => {
    const backdropUrl = getUsableHeroArtworkUrl(movie);
    if (!backdropUrl) return;
    if (!canPushHero(`vod:${movie.id}`)) return;
    heroItems.push({
      id: movie.id,
      title: movie.title,
      description: description || movie.description || "Now streaming in premium quality.",
      backdropUrl,
      type: "vod",
      data: movie,
      rating: movie.rating,
      year: movie.year,
      duration: movie.duration,
      genre: movie.genre,
    });
  };

  const pushSeriesHero = (seriesItem: AppSeries, description?: string) => {
    const backdropUrl = getUsableHeroArtworkUrl(seriesItem);
    if (!backdropUrl) return;
    if (!canPushHero(`series:${seriesItem.id}`)) return;
    heroItems.push({
      id: seriesItem.id,
      title: seriesItem.title,
      description:
        description || seriesItem.description || "Continue the story with this trending series.",
      backdropUrl,
      type: "series",
      data: seriesItem,
      rating: seriesItem.rating,
      year: seriesItem.year,
      duration: seriesItem.duration,
      genre: seriesItem.genre,
    });
  };

  const pushLiveHero = (live: AppChannel, description?: string) => {
    if (!live.logoUrl) return;
    if (!canPushHero(`live:${live.id}`)) return;
    heroItems.push({
      id: live.id,
      title: live.title,
      description: description || "Watch live TV events and channels now.",
      backdropUrl: live.logoUrl,
      type: "live",
      data: live,
    });
  };

  const resumeCandidates = continueWatching.filter((item) => item.backdropUrl || item.imageUrl);
  const pushPrimaryHeroFromResume = () => {
    const resume = resumeCandidates[0];
    if (!resume) return false;

    if (resume.type === "vod") {
      const movie = movies.find((item) => item.id === resume.id);
      if (movie) {
        pushMovieHero(movie, movie.description || "Resume watching where you left off");
        return true;
      }

      pushMovieHero(
        {
          id: resume.id,
          title: resume.title,
          posterUrl: resume.imageUrl,
          backdropUrl: resume.backdropUrl || resume.imageUrl,
        },
        "Resume watching where you left off"
      );
      return true;
    }

    if (resume.type === "series") {
      const seriesItem = series.find((item) => item.id === resume.id);
      if (seriesItem) {
        pushSeriesHero(
          seriesItem,
          seriesItem.description || "Resume watching where you left off"
        );
        return true;
      }

      pushSeriesHero(
        {
          id: resume.id,
          title: resume.title,
          posterUrl: resume.imageUrl,
          backdropUrl: resume.backdropUrl || resume.imageUrl,
        },
        "Resume watching where you left off"
      );
      return true;
    }

    return false;
  };

  const sortedMovies = movieEntries
    .filter((movie) => movie.hasArtwork)
    .sort((left, right) => right.score - left.score)
    .slice(0, 12);

  const sortedSeries = seriesEntries
    .filter((seriesItem) => seriesItem.hasArtwork)
    .sort((left, right) => right.score - left.score)
    .slice(0, 12);

  const selectPrimaryHeroFromRatedWindow = () => {
    const ratedWindow = [...sortedMovies, ...sortedSeries].slice(0, 12);
    if (ratedWindow.length === 0) {
      return false;
    }

    const selectedEntry =
      [...ratedWindow].sort((left, right) => {
        const leftRating =
          Number.parseFloat((left.item as AppMovie | AppSeries).rating ?? "") || 0;
        const rightRating =
          Number.parseFloat((right.item as AppMovie | AppSeries).rating ?? "") || 0;

        if (rightRating !== leftRating) {
          return rightRating - leftRating;
        }

        return right.score - left.score;
      })[0] ?? ratedWindow[0];

    if (!selectedEntry) {
      return false;
    }

    if (isMovie(selectedEntry.item)) {
      pushMovieHero(selectedEntry.item);
    } else {
      pushSeriesHero(selectedEntry.item);
    }

    return heroItems.length > 0;
  };

  if (!pushPrimaryHeroFromResume()) {
    selectPrimaryHeroFromRatedWindow();
  }

  const remainingMovies = movieEntries
    .filter((movie) => movie.hasArtwork)
    .sort((left, right) => right.score - left.score)
    .slice(0, 3);

  for (const movie of remainingMovies) {
    pushMovieHero(movie.item);
  }

  const remainingSeries = seriesEntries
    .filter((seriesItem) => seriesItem.hasArtwork)
    .sort((left, right) => right.score - left.score)
    .slice(0, 2);

  for (const seriesItem of remainingSeries) {
    pushSeriesHero(seriesItem.item);
  }

  if (heroItems.length < 3 && liveStreams.length > 0) {
    const topLive = liveStreams
      .filter((stream) => stream.logoUrl)
      .slice(0, 3 - heroItems.length);

    for (const live of topLive) {
      pushLiveHero(live);
    }
  }

  return heroItems.slice(0, HOME_POLICY.heroItemsCap);
};
