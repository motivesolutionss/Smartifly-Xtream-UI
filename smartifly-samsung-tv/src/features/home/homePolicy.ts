import type { AppMovie, AppSeries, AppChannel, AppCategory } from "../../types/appModels";
import { stableHash } from "../../utils/imagePolicy";
import { imageFailureMemory } from "../../utils/imageFailureMemory";
import type { HeroItem } from "../../components/common/HeroBanner";
import type { RecentlyWatchedItem } from "../../storage/recentlyWatchedStorage";
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

const isMovie = (item: AppMovie | AppSeries): item is AppMovie => {
  return "extension" in item;
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

const hasUsableArtwork = (item: { posterUrl?: string; backdropUrl?: string }) =>
  Boolean(getUsableArtworkUrl(item));

type HomeCategoryGroup<T> = {
  category: AppCategory;
  items: T[];
  totalCount: number;
  usableCount: number;
};

const selectHomeCategoryGroups = <T extends { categoryId?: string; posterUrl?: string; backdropUrl?: string }>(
  categories: AppCategory[],
  items: T[],
  maxCategories: number
) => {
  const candidates: HomeCategoryGroup<T>[] = categories
    .map((category) => {
      const categoryItems = items.filter((item) => item.categoryId === category.id);
      return {
        category,
        items: categoryItems,
        totalCount: categoryItems.length,
        usableCount: categoryItems.filter(hasUsableArtwork).length,
      };
    })
    .filter((group) => group.totalCount >= HOME_POLICY.categoryRailMinUsableItems);

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

export const buildHomeRails = (
  movies: AppMovie[] = [],
  series: AppSeries[] = [],
  liveStreams: AppChannel[] = [],
  continueWatching: RecentlyWatchedItem[] = [],
  vodCategories: AppCategory[] = [],
  seriesCategories: AppCategory[] = []
): HomeRail[] => {
  const rails: HomeRail[] = [];
  const usedKeys = new Set<string>();

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

  // ── 1. Push Continue Watching ──────────────────────────────────────────────
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

  const getDedupped = <T extends { id: string; title: string }>(
    items: T[],
    max: number
  ): T[] => {
    const result: T[] = [];
    for (const item of items) {
      if (result.length >= max) break;
      if (!usedKeys.has(item.id)) {
        usedKeys.add(item.id);
        result.push(item);
      }
    }
    return result;
  };

  // ── 2. Push Trending for You ───────────────────────────────────────────────
  const trending = [...movies, ...series]
    .filter(hasUsableArtwork)
    .sort((left, right) => {
      const leftScore = isMovie(left) ? scoreMovie(left) : scoreSeries(left);
      const rightScore = isMovie(right) ? scoreMovie(right) : scoreSeries(right);
      return rightScore - leftScore;
    });

  if (trending.length > 0) {
    const items: HomeRailItem[] = getDedupped(trending, 15).map((item) =>
      isMovie(item)
        ? ({
            ...item,
            id: item.id,
            title: item.title,
            type: "vod",
            contentType: "MOVIE",
            imageUrl: getUsableArtworkUrl(item),
            backdropUrl: item.backdropUrl,
          } satisfies HomeMovieRailItem)
        : ({
            ...item,
            id: item.id,
            title: item.title,
            type: "series",
            contentType: "SERIES",
            imageUrl: getUsableArtworkUrl(item),
            backdropUrl: item.backdropUrl,
          } satisfies HomeSeriesRailItem)
    );

    rails.push({
      id: "trending",
      title: "Trending for You",
      items,
    });
  }

  // ── 3. Map Dynamic VOD Categories ─────────────────────────────────────────
  const topVodCategories = selectHomeCategoryGroups(vodCategories, movies, 2);

  const vodCategoryRails = topVodCategories.map((group) => {
    const railItems: HomeRailItem[] = [...group.items]
      .filter(hasUsableArtwork)
      .sort((left, right) => scoreMovie(right) - scoreMovie(left))
      .slice(0, 15)
      .map((movie) => ({
        ...movie,
        id: movie.id,
        title: movie.title,
        type: "vod",
        contentType: "MOVIE",
        imageUrl: getUsableArtworkUrl(movie),
        backdropUrl: movie.backdropUrl,
      } satisfies HomeMovieRailItem));

    return {
      id: `category-vod-${group.category.id}`,
      title: group.category.name,
      items: railItems,
    } satisfies HomeRail;
  });

  // ── 4. Map Dynamic Series Categories ──────────────────────────────────────
  const topSeriesCategories = selectHomeCategoryGroups(seriesCategories, series, 2);

  const seriesCategoryRails = topSeriesCategories.map((group) => {
    const railItems: HomeRailItem[] = [...group.items]
      .filter(hasUsableArtwork)
      .sort((left, right) => scoreSeries(right) - scoreSeries(left))
      .slice(0, 15)
      .map((s) => ({
        ...s,
        id: s.id,
        title: s.title,
        type: "series",
        contentType: "SERIES",
        imageUrl: getUsableArtworkUrl(s),
        backdropUrl: s.backdropUrl,
      } satisfies HomeSeriesRailItem));

    return {
      id: `category-series-${group.category.id}`,
      title: group.category.name,
      items: railItems,
    } satisfies HomeRail;
  });

  // ── 5. Push Live TV Highlights ─────────────────────────────────────────────
  if (liveStreams.length > 0) {
    const validLive = liveStreams.filter((stream) => stream.logoUrl);
    if (validLive.length > 0) {
      const items: HomeLiveRailItem[] = validLive.slice(0, 15).map((stream) => ({
        ...stream,
        id: stream.id,
        title: stream.title,
        type: "live",
        contentType: "LIVE",
        imageUrl: stream.logoUrl,
      }));

      rails.push({
        id: "live-highlights",
        title: "Live TV Highlights",
        items,
        variant: "live",
      });
    }
  }

  // ── 6. Push New Movies ────────────────────────────────────────────────────
  if (movies.length > 0) {
    const yearRankedMovies = [...movies]
      .filter((movie) => hasUsableArtwork(movie) && parseMovieYear(movie) > 0)
      .sort((left, right) => {
        const yearDelta = parseMovieYear(right) - parseMovieYear(left);
        if (yearDelta !== 0) {
          return yearDelta;
        }

        return scoreMovie(right) - scoreMovie(left);
      });

    const fallbackMovies = [...movies]
      .filter(hasUsableArtwork)
      .sort((left, right) => scoreMovie(right) - scoreMovie(left));

    const sortedMovies =
      yearRankedMovies.length > 0 ? yearRankedMovies : fallbackMovies;

    if (sortedMovies.length > 0) {
      const dedupedItems = getDedupped(sortedMovies, 15);
      const selectedMovies = dedupedItems.length > 0 ? dedupedItems : sortedMovies.slice(0, 15);
      const items: HomeMovieRailItem[] = selectedMovies.map((movie) => ({
        ...movie,
        id: movie.id,
        title: movie.title,
        type: "vod",
        contentType: "MOVIE",
        imageUrl: getUsableArtworkUrl(movie),
        backdropUrl: movie.backdropUrl,
      }));

      rails.push({
        id: "new-movies",
        title: "New Movies",
        items,
      });
    }
  }

  // ── 7. Push Top VOD Category Rails directly under New Movies ───────────────
  if (vodCategoryRails[0]) {
    rails.push(vodCategoryRails[0]);
  }
  if (vodCategoryRails[1]) {
    rails.push(vodCategoryRails[1]);
  }

  // ── 8. Push Series Spotlight ──────────────────────────────────────────────
  if (series.length > 0) {
    const yearRankedSeries = [...series]
      .filter(
        (seriesItem) => hasUsableArtwork(seriesItem) && parseSeriesYear(seriesItem) > 0
      )
      .sort((left, right) => {
        const yearDelta = parseSeriesYear(right) - parseSeriesYear(left);
        if (yearDelta !== 0) {
          return yearDelta;
        }

        return scoreSeries(right) - scoreSeries(left);
      });

    const fallbackSeries = [...series]
      .filter(hasUsableArtwork)
      .sort((left, right) => scoreSeries(right) - scoreSeries(left));

    const sortedSeries =
      yearRankedSeries.length > 0 ? yearRankedSeries : fallbackSeries;

    if (sortedSeries.length > 0) {
      const dedupedItems = getDedupped(sortedSeries, 15);
      const selectedSeries = dedupedItems.length > 0 ? dedupedItems : sortedSeries.slice(0, 15);
      const items: HomeSeriesRailItem[] = selectedSeries.map((seriesItem) => ({
        ...seriesItem,
        id: seriesItem.id,
        title: seriesItem.title,
        type: "series",
        contentType: "SERIES",
        imageUrl: getUsableArtworkUrl(seriesItem),
        backdropUrl: seriesItem.backdropUrl,
      }));

      rails.push({
        id: "series-spotlight",
        title: "New Series",
        items,
      });
    }
  }

  // ── 9. Push Top Series Category Rails directly under Series Spotlight ──────
  if (seriesCategoryRails[0]) {
    rails.push(seriesCategoryRails[0]);
  }
  if (seriesCategoryRails[1]) {
    rails.push(seriesCategoryRails[1]);
  }

  return rails;
};

export const buildHomeHeroItems = (
  movies: AppMovie[] = [],
  series: AppSeries[] = [],
  liveStreams: AppChannel[] = [],
  continueWatching: RecentlyWatchedItem[] = []
): HeroItem[] => {
  const heroItems: HeroItem[] = [];
  const heroIds = new Set<string>();

  const canPushHero = (id: string) => {
    if (heroIds.has(id)) return false;
    heroIds.add(id);
    return true;
  };

  const pushMovieHero = (movie: AppMovie, description?: string) => {
    const backdropUrl = getUsableArtworkUrl(movie);
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
    const backdropUrl = getUsableArtworkUrl(seriesItem);
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
  if (resumeCandidates.length > 0) {
    const resume = resumeCandidates[0];
    if (resume.type === "vod") {
      const movie = movies.find((item) => item.id === resume.id);
      if (movie) {
        pushMovieHero(
          movie,
          movie.description || "Resume watching where you left off"
        );
      } else {
        pushMovieHero(
          {
            id: resume.id,
            title: resume.title,
            posterUrl: resume.imageUrl,
            backdropUrl: resume.backdropUrl || resume.imageUrl,
          },
          "Resume watching where you left off"
        );
      }
    } else if (resume.type === "series") {
      const seriesItem = series.find((item) => item.id === resume.id);
      if (seriesItem) {
        pushSeriesHero(
          seriesItem,
          seriesItem.description || "Resume watching where you left off"
        );
      } else {
        pushSeriesHero(
          {
            id: resume.id,
            title: resume.title,
            posterUrl: resume.imageUrl,
            backdropUrl: resume.backdropUrl || resume.imageUrl,
          },
          "Resume watching where you left off"
        );
      }
    } else if (resume.type === "live") {
      const live = liveStreams.find((item) => item.id === resume.id);
      if (live) {
        pushLiveHero(live, "Resume watching where you left off");
      } else if (resume.imageUrl) {
        pushLiveHero(
          {
            id: resume.id,
            title: resume.title,
            logoUrl: resume.imageUrl,
            streamType: "live",
          },
          "Resume watching where you left off"
        );
      }
    }
  }

  const sortedMovies = [...movies]
    .filter(hasUsableArtwork)
    .sort((left, right) => scoreMovie(right) - scoreMovie(left))
    .slice(0, 3);

  for (const movie of sortedMovies) {
    pushMovieHero(movie);
  }

  const sortedSeries = [...series]
    .filter(hasUsableArtwork)
    .sort((left, right) => scoreSeries(right) - scoreSeries(left))
    .slice(0, 2);

  for (const seriesItem of sortedSeries) {
    pushSeriesHero(seriesItem);
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
