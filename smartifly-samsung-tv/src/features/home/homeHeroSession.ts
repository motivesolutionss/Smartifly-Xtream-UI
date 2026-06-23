import type { HeroItem } from "../../components/common/HeroBanner";

const lockedHeroByProfile = new Map<string, string>();

const getHeroKey = (item: HeroItem) => `${item.type}:${item.id}`;

export const stabilizeHomeHeroOrder = (
  profileId: string | null | undefined,
  heroItems: HeroItem[]
) => {
  if (!profileId || heroItems.length <= 1) {
    return heroItems;
  }

  const lockedHeroKey = lockedHeroByProfile.get(profileId);
  if (lockedHeroKey) {
    const lockedHero = heroItems.find((item) => getHeroKey(item) === lockedHeroKey);
    if (lockedHero) {
      return [
        lockedHero,
        ...heroItems.filter((item) => getHeroKey(item) !== lockedHeroKey),
      ];
    }
  }

  const firstHero = heroItems[0];
  if (firstHero) {
    lockedHeroByProfile.set(profileId, getHeroKey(firstHero));
  }

  return heroItems;
};

export const resetHomeHeroSession = () => {
  lockedHeroByProfile.clear();
};
