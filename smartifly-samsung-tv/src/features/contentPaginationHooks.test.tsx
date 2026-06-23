import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { PropsWithChildren } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { services } from "../services";
import { useLiveContent } from "./live-tv/hooks/useLiveContent";
import { useSeriesContent } from "./series/hooks/useSeriesContent";
import { useVodContent } from "./vod/hooks/useVodContent";

const LIVE_CONTENT_PAGE_SIZE = 80;
const VOD_CONTENT_PAGE_SIZE = 60;
const SERIES_CONTENT_PAGE_SIZE = 60;

const createQueryWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe("content pagination hooks", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches VOD content in bounded pages and loads the next page on demand", async () => {
    vi.spyOn(services.content, "getVodCategories").mockResolvedValue([
      { id: "vod-a", name: "Vod A", type: "vod" },
    ]);

    const vodStreamsSpy = vi
      .spyOn(services.content, "getVodStreams")
      .mockResolvedValueOnce(
        Array.from({ length: VOD_CONTENT_PAGE_SIZE }, (_, index) => ({
          id: `vod-${index + 1}`,
          title: `Vod ${index + 1}`,
          categoryId: "vod-a",
        }))
      )
      .mockResolvedValueOnce([
        {
          id: "vod-next-1",
          title: "Vod Next 1",
          categoryId: "vod-a",
        },
      ]);

    const { result } = renderHook(() => useVodContent("vod-a"), {
      wrapper: createQueryWrapper(),
    });

    await waitFor(() =>
      expect(vodStreamsSpy).toHaveBeenCalledWith("vod-a", {
        limit: VOD_CONTENT_PAGE_SIZE,
        page: 1,
      })
    );

    expect(result.current.movies).toHaveLength(VOD_CONTENT_PAGE_SIZE);
    expect(result.current.hasMoreMovies).toBe(true);

    await act(async () => {
      await result.current.loadMoreMovies();
    });

    await waitFor(() =>
      expect(vodStreamsSpy).toHaveBeenNthCalledWith(2, "vod-a", {
        limit: VOD_CONTENT_PAGE_SIZE,
        page: 2,
      })
    );

    expect(result.current.movies).toHaveLength(VOD_CONTENT_PAGE_SIZE + 1);
  });

  it("fetches Series content in bounded pages and loads the next page on demand", async () => {
    vi.spyOn(services.content, "getSeriesCategories").mockResolvedValue([
      { id: "series-a", name: "Series A", type: "series" },
    ]);

    const seriesSpy = vi
      .spyOn(services.content, "getSeries")
      .mockResolvedValueOnce(
        Array.from({ length: SERIES_CONTENT_PAGE_SIZE }, (_, index) => ({
          id: `series-${index + 1}`,
          title: `Series ${index + 1}`,
          categoryId: "series-a",
        }))
      )
      .mockResolvedValueOnce([
        {
          id: "series-next-1",
          title: "Series Next 1",
          categoryId: "series-a",
        },
      ]);

    const { result } = renderHook(() => useSeriesContent("series-a"), {
      wrapper: createQueryWrapper(),
    });

    await waitFor(() =>
      expect(seriesSpy).toHaveBeenCalledWith("series-a", {
        limit: SERIES_CONTENT_PAGE_SIZE,
        page: 1,
      })
    );

    expect(result.current.series).toHaveLength(SERIES_CONTENT_PAGE_SIZE);
    expect(result.current.hasMoreSeries).toBe(true);

    await act(async () => {
      await result.current.loadMoreSeries();
    });

    await waitFor(() =>
      expect(seriesSpy).toHaveBeenNthCalledWith(2, "series-a", {
        limit: SERIES_CONTENT_PAGE_SIZE,
        page: 2,
      })
    );

    expect(result.current.series).toHaveLength(SERIES_CONTENT_PAGE_SIZE + 1);
  });

  it("fetches Live content in bounded pages and loads the next page on demand", async () => {
    vi.spyOn(services.content, "getLiveCategories").mockResolvedValue([
      { id: "live-a", name: "Live A", type: "live" },
    ]);

    const liveStreamsSpy = vi
      .spyOn(services.content, "getLiveStreams")
      .mockResolvedValueOnce(
        Array.from({ length: LIVE_CONTENT_PAGE_SIZE }, (_, index) => ({
          id: `live-${index + 1}`,
          title: `Live ${index + 1}`,
          categoryId: "live-a",
          streamType: "live" as const,
        }))
      )
      .mockResolvedValueOnce([
        {
          id: "live-next-1",
          title: "Live Next 1",
          categoryId: "live-a",
          streamType: "live" as const,
        },
      ]);

    const { result } = renderHook(() => useLiveContent(), {
      wrapper: createQueryWrapper(),
    });

    await waitFor(() =>
      expect(liveStreamsSpy).toHaveBeenCalledWith("live-a", {
        limit: LIVE_CONTENT_PAGE_SIZE,
        page: 1,
      })
    );

    expect(result.current.channels).toHaveLength(LIVE_CONTENT_PAGE_SIZE);
    expect(result.current.hasMoreChannels).toBe(true);

    await act(async () => {
      await result.current.loadMoreChannels();
    });

    await waitFor(() =>
      expect(liveStreamsSpy).toHaveBeenNthCalledWith(2, "live-a", {
        limit: LIVE_CONTENT_PAGE_SIZE,
        page: 2,
      })
    );

    expect(result.current.channels).toHaveLength(LIVE_CONTENT_PAGE_SIZE + 1);
  });
});
