import type { ContentListRequestOptions } from "../interfaces/contentService";

type XtreamListKind = "live" | "vod" | "series";

const normalizePositiveInteger = (value: number | undefined) => {
  if (!Number.isFinite(value)) return undefined;
  const normalized = Math.trunc(value as number);
  return normalized > 0 ? normalized : undefined;
};

export const buildXtreamListRequestParams = (
  categoryId?: string,
  options?: ContentListRequestOptions,
  kind: XtreamListKind = "vod"
) => {
  const params: Record<string, string> = {};
  const normalizedCategoryId = categoryId?.trim();
  const limit = normalizePositiveInteger(options?.limit);
  const page = normalizePositiveInteger(options?.page);

  if (normalizedCategoryId) {
    params.category_id = normalizedCategoryId;
  }

  if (limit) {
    params.limit = String(limit);
    if (kind === "live") {
      params.per_page = String(limit);
    }
  }

  if (page) {
    params.page = String(page);
    if (kind === "live" && limit) {
      const offset = (page - 1) * limit;
      params.offset = String(offset);
      params.start = String(offset);
    }
  }

  return params;
};
