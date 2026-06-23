import { stableHash } from "../../utils/imagePolicy";
import type { HomeRail, HomeRailItem } from "./homeTypes";
import type { HomeRailPolicy } from "./homeAdaptivePolicy";

type RailDebug = {
  title: string;
  totalScore: number;
  anchorScore: number;
  sizeScore: number;
  imageScore: number;
  freshnessScore: number;
};

type RankResult = {
  rails: HomeRail[];
  debugTopRails: RailDebug[];
};

type RankedRail = {
  rail: HomeRail;
  score: number;
  debug: RailDebug;
};

const orderMemoryByProfile = new Map<string, string>();

const getCurrentYear = (nowDate = new Date()) => nowDate.getFullYear();

const parseYear = (item: HomeRailItem) => {
  if ("year" in item && item.year) {
    const parsed = Number.parseInt(item.year, 10);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  const titleYearMatch = item.title.match(/\b(19|20)\d{2}\b/);
  if (!titleYearMatch) {
    return 0;
  }

  const parsedTitleYear = Number.parseInt(titleYearMatch[0], 10);
  return Number.isFinite(parsedTitleYear) ? parsedTitleYear : 0;
};

const hasUsableArtwork = (item: HomeRailItem) => Boolean(item.imageUrl || item.backdropUrl);

const freshnessScore = (items: HomeRailItem[], nowDate = new Date()) => {
  if (items.length === 0) return 0;

  const nowYear = getCurrentYear(nowDate);
  const sample = items.slice(0, 24);
  let score = 0;

  sample.forEach((item) => {
    const year = parseYear(item);
    if (year <= 0) return;

    const age = Math.max(0, nowYear - year);
    score +=
      age <= 1 ? 1 :
      age <= 3 ? 0.7 :
      age <= 7 ? 0.4 :
      0.15;
  });

  return (score / Math.max(1, sample.length)) * 18;
};

const stableNoise = (seed: number, title: string, index: number) => {
  const mixed = seed * 31 + stableHash(title) * 17 + index * 13;
  const bounded = Math.abs(mixed) % 1000;
  return Math.round((bounded / 1000) * 6) / 10;
};

const diversifyItems = (items: HomeRailItem[], seed: number) => {
  if (items.length <= 6) {
    return items;
  }

  const buckets = new Map<string, HomeRailItem[]>();
  items.forEach((item) => {
    const bucketKey = `${item.type}|${"categoryId" in item ? item.categoryId ?? "uncategorized" : "uncategorized"}`;
    const bucket = buckets.get(bucketKey);
    if (bucket) {
      bucket.push(item);
      return;
    }

    buckets.set(bucketKey, [item]);
  });

  const shuffle = <T,>(values: T[]) => {
    const next = [...values];
    let localSeed = seed;

    for (let index = next.length - 1; index > 0; index -= 1) {
      localSeed = (localSeed * 1664525 + 1013904223) >>> 0;
      const swapIndex = localSeed % (index + 1);
      const current = next[index];
      next[index] = next[swapIndex]!;
      next[swapIndex] = current!;
    }

    return next;
  };

  const preparedBuckets = [...buckets.entries()].map(([key, bucket]) => [key, shuffle(bucket)] as const);
  const result: HomeRailItem[] = [];
  let added = true;

  while (added) {
    added = false;
    preparedBuckets.forEach(([, bucket]) => {
      const next = bucket.shift();
      if (!next) return;
      result.push(next);
      added = true;
    });
  }

  return result;
};

const railScoreBreakdown = (rail: HomeRail, nowDate = new Date()) => {
  const title = rail.title.toLowerCase();
  const sizeScore = (Math.min(rail.items.length, 30) / 30) * 30;
  const imageReadinessCount = rail.items.slice(0, 18).filter(hasUsableArtwork).length;
  const imageScore = (imageReadinessCount / Math.max(1, rail.items.slice(0, 18).length)) * 25;
  const anchorScore =
    title.includes("continue watching") ? 55 :
    title.includes("live channels") ? 45 :
    title.includes("live tv highlights") ? 30 :
    title === "movies" ? 38 :
    title === "series" ? 36 :
    title.includes("live") ? 28 :
    title.includes("movies") ? 24 :
    title.includes("series") ? 22 :
    title.includes("trending") ? 28 :
    18;
  const noveltyPenalty = title.includes("spotlight") ? -4 : 0;
  const freshness = freshnessScore(rail.items, nowDate);

  return {
    total: anchorScore + sizeScore + imageScore + freshness + noveltyPenalty,
    anchorScore,
    sizeScore,
    imageScore,
    freshnessScore: freshness,
  };
};

const applyAnchorGuards = (rails: HomeRail[]) => {
  if (rails.length === 0) return rails;

  const ordered = [...rails];

  const pullToTop = (match: (title: string) => boolean, maxIndex: number) => {
    const matchIndex = ordered.findIndex((rail) => match(rail.title.toLowerCase()));
    if (matchIndex <= maxIndex || matchIndex === -1) {
      return;
    }

    const [matched] = ordered.splice(matchIndex, 1);
    if (matched) {
      ordered.splice(maxIndex, 0, matched);
    }
  };

  pullToTop((title) => title.includes("continue watching"), 0);
  pullToTop((title) => title.includes("live channels"), 2);
  pullToTop((title) => title === "movies", 3);
  pullToTop((title) => title === "series", 4);
  pullToTop((title) => title.includes("trending"), 5);
  pullToTop((title) => title === "new movies", 6);
  pullToTop((title) => title.includes("live tv highlights"), 7);

  return ordered;
};

const applyAntiRepeat = (rails: HomeRail[], profileId: string, sessionSeed: number) => {
  if (rails.length <= 4) {
    return rails;
  }

  const signature = rails
    .slice(0, 6)
    .map((rail) => rail.title.toLowerCase())
    .join("|");
  const previousSignature = orderMemoryByProfile.get(profileId);

  if (previousSignature !== signature) {
    orderMemoryByProfile.set(profileId, signature);
    return rails;
  }

  const head = rails.slice(0, 3);
  const tail = rails.slice(3);

  if (tail.length <= 1) {
    return rails;
  }

  const offset = Math.max(1, Math.abs(sessionSeed) % tail.length);
  const rotatedTail = [...tail];
  const moved = rotatedTail.splice(rotatedTail.length - offset, offset);
  rotatedTail.unshift(...moved);
  const rotated = [...head, ...rotatedTail];

  orderMemoryByProfile.set(
    profileId,
    rotated
      .slice(0, 6)
      .map((rail) => rail.title.toLowerCase())
      .join("|")
  );

  return rotated;
};

export const rankHomeRails = ({
  rails,
  profileId,
  policy,
  nowDate = new Date(),
}: {
  rails: HomeRail[];
  profileId: string;
  policy: Pick<HomeRailPolicy, "itemsPerRail" | "totalRailsCap">;
  nowDate?: Date;
}): RankResult => {
  if (rails.length === 0) {
    return {
      rails: [],
      debugTopRails: [],
    };
  }

  const sessionSeed = stableHash(`${profileId}|${nowDate.toISOString().slice(0, 10)}`);
  const ranked: RankedRail[] = rails.map((rail, index) => {
    const breakdown = railScoreBreakdown(rail, nowDate);
    const itemSeed = stableHash(`${profileId}|${nowDate.toISOString().slice(0, 10)}|${rail.title}`);
    const diversifiedItems = diversifyItems(rail.items, itemSeed).slice(0, policy.itemsPerRail);
    const totalScore = breakdown.total + stableNoise(sessionSeed, rail.title, index);

    return {
      rail: {
        ...rail,
        items: diversifiedItems,
      },
      score: totalScore,
      debug: {
        title: rail.title,
        totalScore,
        anchorScore: breakdown.anchorScore,
        sizeScore: breakdown.sizeScore,
        imageScore: breakdown.imageScore,
        freshnessScore: breakdown.freshnessScore,
      },
    };
  });

  const sorted = [...ranked]
    .sort((left, right) => right.score - left.score)
    .slice(0, policy.totalRailsCap);
  const anchored = applyAnchorGuards(sorted.map((entry) => entry.rail));
  const finalRails = applyAntiRepeat(anchored, profileId, sessionSeed);

  return {
    rails: finalRails,
    debugTopRails: sorted.slice(0, 5).map((entry) => entry.debug),
  };
};

export const resetHomeRailRankerSession = () => {
  orderMemoryByProfile.clear();
};
