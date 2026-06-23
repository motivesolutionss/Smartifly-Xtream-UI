import { httpClient } from "../../api/httpClient";
import { AppError } from "../../types/errors";
import { normalizeServerUrl } from "../../utils/normalizeServerUrl";
import type { AppMovie } from "../../types/appModels";
import type { AnalyticsService, SmartRow } from "../interfaces/analyticsService";
import { getBackendBaseUrl } from "./backendConfig";

type AnalyticsEnvelope = Record<string, unknown>;

const SERVER_ERROR_COOLDOWN_MS = 90_000;

const asStringList = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => (typeof entry === "string" ? entry : null)).filter((entry): entry is string => Boolean(entry));
};

const asMapList = (value: unknown): Record<string, unknown>[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is Record<string, unknown> => Boolean(entry && typeof entry === "object"));
};

const parseYear = (value: unknown) => {
  if (typeof value !== "string") return undefined;
  const match = value.match(/\b(19|20)\d{2}\b/);
  return match?.[0];
};

const toSmartRowMovie = (item: Record<string, unknown>): AppMovie => ({
  id: String(item.contentId ?? item.id ?? ""),
  title: typeof item.title === "string" ? item.title : "Unknown",
  description: typeof item.overview === "string" ? item.overview : undefined,
  posterUrl: typeof item.posterPath === "string" ? item.posterPath : undefined,
  backdropUrl: typeof item.backdropPath === "string" ? item.backdropPath : undefined,
  rating:
    typeof item.rating === "string" || typeof item.rating === "number"
      ? String(item.rating)
      : undefined,
  year:
    parseYear(item.releaseDate) ??
    (typeof item.releaseDate === "string" ? item.releaseDate : undefined),
  duration: undefined,
  extension: undefined,
  categoryId:
    typeof item.categoryId === "string" || typeof item.categoryId === "number"
      ? String(item.categoryId)
      : undefined,
});

export class BackendAnalyticsClient implements AnalyticsService {
  private readonly baseUrl: string;
  private readonly blockedUntilMs = new Map<string, number>();

  constructor(baseUrl: string = getBackendBaseUrl()) {
    this.baseUrl = normalizeServerUrl(baseUrl);
  }

  private isCoolingDown(key: string) {
    return (this.blockedUntilMs.get(key) ?? 0) > Date.now();
  }

  private startCooldown(key: string) {
    this.blockedUntilMs.set(key, Date.now() + SERVER_ERROR_COOLDOWN_MS);
  }

  private mapErrorResponse(key: string) {
    return (response: Response) => {
      if (response.status >= 500) {
        this.startCooldown(key);
      }
      return null;
    };
  }

  async getTrendingIds(): Promise<string[]> {
    const key = "trending";
    if (this.isCoolingDown(key)) return [];

    try {
      const url = new URL("/v1/public/analytics/trending", this.baseUrl);
      const response = await httpClient.request<AnalyticsEnvelope>(url.toString(), {
        method: "GET",
        retries: 1,
        mapErrorResponse: this.mapErrorResponse(key),
      });
      return asStringList(response.data);
    } catch (error) {
      if (error instanceof AppError && error.code === "BACKEND_NOT_CONFIGURED") {
        return [];
      }
      return [];
    }
  }

  async getSmartRows(profileId: string): Promise<SmartRow[]> {
    const trimmedProfileId = profileId.trim();
    if (!trimmedProfileId) return [];

    const key = `smart_rows:${trimmedProfileId}`;
    if (this.isCoolingDown(key)) return [];

    try {
      const url = new URL("/v1/public/analytics/discovery/smart-rows", this.baseUrl);
      url.searchParams.set("profileId", trimmedProfileId);

      const response = await httpClient.request<AnalyticsEnvelope>(url.toString(), {
        method: "GET",
        retries: 1,
        mapErrorResponse: this.mapErrorResponse(key),
      });

      return asMapList(response.rows).map((row) => ({
        title: typeof row.title === "string" ? row.title : "Smart Row",
        items: asMapList(row.items)
          .map(toSmartRowMovie)
          .filter((item) => Boolean(item.id && item.title)),
      })).filter((row) => row.items.length > 0);
    } catch (error) {
      if (error instanceof AppError && error.code === "BACKEND_NOT_CONFIGURED") {
        return [];
      }
      return [];
    }
  }
}

export class NoopAnalyticsClient implements AnalyticsService {
  async getTrendingIds(): Promise<string[]> {
    return [];
  }

  async getSmartRows(): Promise<SmartRow[]> {
    return [];
  }
}
