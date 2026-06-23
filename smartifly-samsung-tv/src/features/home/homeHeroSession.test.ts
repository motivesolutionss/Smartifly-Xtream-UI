import { describe, expect, it, beforeEach } from "vitest";
import type { HeroItem } from "../../components/common/HeroBanner";
import { resetHomeHeroSession, stabilizeHomeHeroOrder } from "./homeHeroSession";

const createHero = (id: string, type: HeroItem["type"] = "vod"): HeroItem => ({
  id,
  title: `Hero ${id}`,
  description: `Description ${id}`,
  backdropUrl: `https://cdn.example.com/${id}.jpg`,
  type,
  data: { id, title: `Hero ${id}` },
});

describe("stabilizeHomeHeroOrder", () => {
  beforeEach(() => {
    resetHomeHeroSession();
  });

  it("locks the first hero for the active profile across subsequent reorders", () => {
    const firstPass = stabilizeHomeHeroOrder("profile-1", [
      createHero("movie-1"),
      createHero("movie-2"),
      createHero("movie-3"),
    ]);

    const secondPass = stabilizeHomeHeroOrder("profile-1", [
      createHero("movie-3"),
      createHero("movie-2"),
      createHero("movie-1"),
    ]);

    expect(firstPass[0]?.id).toBe("movie-1");
    expect(secondPass.map((item) => item.id)).toEqual([
      "movie-1",
      "movie-3",
      "movie-2",
    ]);
  });

  it("falls back to the new first hero when the locked hero is no longer available", () => {
    stabilizeHomeHeroOrder("profile-1", [createHero("movie-1"), createHero("movie-2")]);

    const nextPass = stabilizeHomeHeroOrder("profile-1", [
      createHero("movie-3"),
      createHero("movie-4"),
    ]);

    expect(nextPass[0]?.id).toBe("movie-3");
  });
});
