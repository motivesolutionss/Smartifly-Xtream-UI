import type { ContentService } from "../../services/interfaces/contentService";
import { AppError } from "../../types/errors";
import { createPerfTrace } from "../../utils/perfTrace";

const CATEGORY_PROBE_LIMIT = 5;
const LIVE_STREAM_PROBE_PAGE_SIZE = 1;

export type LiveContentProbeResult = {
  liveCategoryCount: number;
  validatedLiveStreamCount: number;
  usedCatalogFallback: boolean;
};

const getProbeCategoryIds = (categories: Awaited<ReturnType<ContentService["getLiveCategories"]>>) => {
  return categories
    .map((category) => category.id)
    .filter(Boolean)
    .slice(0, CATEGORY_PROBE_LIMIT);
};

export const ensureLiveContentAvailable = async (
  contentService: LiveContentProbeService
): Promise<LiveContentProbeResult> => {
  const trace = createPerfTrace("live_content_probe");

  try {
    const liveCategories = await contentService.getLiveCategories({
      requestSource: "auth_live_probe",
    });
    trace.mark("categories_ready", {
      metricName: "live_content_probe_categories_ready_ms",
      slowAboveMs: 250,
      data: {
        liveCategoryCount: liveCategories.length,
      },
    });
    if (liveCategories.length === 0) {
      throw new AppError("EMPTY_CONTENT", "No live categories found on this server");
    }

    const probeCategoryIds = getProbeCategoryIds(liveCategories);
    for (const categoryId of probeCategoryIds) {
      const liveStreams = await contentService.getLiveStreams(categoryId, {
        limit: LIVE_STREAM_PROBE_PAGE_SIZE,
        page: 1,
        requestSource: "auth_live_probe",
      });
      if (liveStreams.length > 0) {
        const result = {
          liveCategoryCount: liveCategories.length,
          validatedLiveStreamCount: liveStreams.length,
          usedCatalogFallback: false,
        };
        trace.end({
          status: "completed",
          metricName: "live_content_probe_total_ms",
          slowAboveMs: 650,
          data: result,
        });
        return result;
      }
    }

    const liveStreams = await contentService.getLiveStreams(undefined, {
      limit: LIVE_STREAM_PROBE_PAGE_SIZE,
      page: 1,
      requestSource: "auth_live_probe",
    });
    if (liveStreams.length === 0) {
      throw new AppError("EMPTY_CONTENT", "No live content found on this server");
    }

    const result = {
      liveCategoryCount: liveCategories.length,
      validatedLiveStreamCount: liveStreams.length,
      usedCatalogFallback: true,
    };
    trace.end({
      status: "completed",
      metricName: "live_content_probe_total_ms",
      slowAboveMs: 650,
      data: result,
    });
    return result;
  } catch (error) {
    trace.fail(error, {
      metricName: "live_content_probe_total_ms",
      slowAboveMs: 650,
    });
    throw error;
  }
};
type LiveContentProbeService = Pick<ContentService, "getLiveCategories" | "getLiveStreams">;
