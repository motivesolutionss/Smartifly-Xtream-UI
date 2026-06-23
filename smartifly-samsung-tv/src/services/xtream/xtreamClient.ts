import { httpClient } from "../../api/httpClient";
import { AppError } from "../../types/errors";
import type { AccountService, UserInfo } from "../interfaces/accountService";
import type {
  ContentListRequestOptions,
  ContentRequestOptions,
  ContentService,
} from "../interfaces/contentService";
import type { PlaybackService, PlaybackUrlRequest } from "../interfaces/playbackService";
import type {
  AppCategory,
  AppChannel,
  AppMovie,
  AppMovieDetails,
  AppSeries,
  AppSeriesDetails,
  AppEpgItem,
} from "../../types/appModels";
import type {
  XtreamAccountInfo,
  XtreamCategory,
  XtreamLiveStream,
  XtreamVodStream,
  XtreamSeries,
  XtreamVodInfoResponse,
  XtreamSeriesInfoResponse,
  XtreamShortEpgResponse,
} from "./xtreamTypes";
import { xtreamMapper } from "./xtreamMapper";
import { buildXtreamListRequestParams } from "./xtreamListRequestParams";
import { xtreamUrlBuilder } from "./xtreamUrlBuilder";
import { normalizeServerUrl } from "../../utils/normalizeServerUrl";
import { setPortalImageBaseUrl } from "../../utils/imagePolicy";

export class XtreamClient implements AccountService, ContentService, PlaybackService {
  private serverUrl: string = "";
  private username: string = "";
  private password: string = "";

  constructor(serverUrl?: string, username?: string, password?: string) {
    if (serverUrl) {
      this.serverUrl = serverUrl;
      setPortalImageBaseUrl(serverUrl);
    }
    if (username) this.username = username;
    if (password) this.password = password;
  }

  setCredentials(serverUrl: string, username: string, password: string) {
    this.serverUrl = normalizeServerUrl(serverUrl);
    setPortalImageBaseUrl(this.serverUrl);
    this.username = username;
    this.password = password;
  }

  private buildUrl(action?: string, extraParams: Record<string, string> = {}) {
    this.ensureCredentials();

    return xtreamUrlBuilder.buildApiUrl(
      this.serverUrl,
      this.username,
      this.password,
      action,
      extraParams
    );
  }

  private ensureCredentials() {
    if (!this.serverUrl || !this.username || !this.password) {
      throw new AppError("INVALID_CREDENTIALS", "Playlist credentials are missing");
    }
  }

  async validateCredentials(
    serverUrl: string,
    username: string,
    password: string
  ): Promise<UserInfo> {
    const trimmedUsername = username.trim();
    if (!trimmedUsername || !password) {
      throw new AppError("INVALID_CREDENTIALS", "Playlist credentials are missing");
    }

    const normalizedServerUrl = normalizeServerUrl(serverUrl);
    const url = xtreamUrlBuilder.buildApiUrl(normalizedServerUrl, trimmedUsername, password);
    const data = await httpClient.get<XtreamAccountInfo>(url, 1);

    if (!data?.user_info) {
      throw new AppError("INVALID_RESPONSE", "Missing account information");
    }

    if (Number(data.user_info.auth) !== 1) {
      throw new AppError("INVALID_CREDENTIALS", "Invalid username or password");
    }

    const status = data.user_info.status?.toLowerCase();
    if (status !== "active") {
      const errorCode =
        status === "disabled" || status === "banned"
          ? "ACCOUNT_DISABLED"
          : "ACCOUNT_EXPIRED";
      throw new AppError(errorCode, "Account is not active");
    }

    const expiryTimestamp = Number(data.user_info.exp_date || 0);
    if (expiryTimestamp > 0 && expiryTimestamp * 1000 < Date.now()) {
      throw new AppError("ACCOUNT_EXPIRED", "Account has expired");
    }

    this.setCredentials(normalizedServerUrl, trimmedUsername, password);
    return xtreamMapper.mapAccountInfo(data);
  }

  async getAccountInfo(): Promise<UserInfo> {
    const url = this.buildUrl();
    const data = await httpClient.get<XtreamAccountInfo>(url);
    return xtreamMapper.mapAccountInfo(data);
  }

  async getLiveCategories(options?: ContentRequestOptions): Promise<AppCategory[]> {
    const url = this.buildUrl("get_live_categories");
    const data = await httpClient.get<XtreamCategory[]>(url, 2, {
      meta: { source: options?.requestSource ?? "other" },
      signal: options?.signal,
      timeoutMs: options?.timeoutMs,
    });
    if (!Array.isArray(data)) {
      throw new AppError("INVALID_RESPONSE", "Expected live categories array");
    }
    return data.map((cat) => xtreamMapper.toAppCategory(cat, "live"));
  }

  async getLiveStreams(
    categoryId?: string,
    options?: ContentListRequestOptions
  ): Promise<AppChannel[]> {
    const params = buildXtreamListRequestParams(categoryId, options, "live");
    const url = this.buildUrl("get_live_streams", params);
    const data = await httpClient.get<XtreamLiveStream[]>(url, 2, {
      meta: { source: options?.requestSource ?? "other" },
      signal: options?.signal,
      timeoutMs: options?.timeoutMs,
    });
    if (!Array.isArray(data)) {
      throw new AppError("INVALID_RESPONSE", "Expected live streams array");
    }
    return data.map(xtreamMapper.toAppChannel);
  }

  async searchLiveStreams(
    query: string,
    categoryId?: string,
    options?: ContentListRequestOptions
  ): Promise<AppChannel[]> {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return [];

    const params: Record<string, string> = {
      search: trimmedQuery,
      ...buildXtreamListRequestParams(categoryId, options, "live"),
    };
    const url = this.buildUrl("get_live_streams", params);
    const data = await httpClient.get<XtreamLiveStream[]>(url, 1, {
      meta: { source: options?.requestSource ?? "other" },
      signal: options?.signal,
      timeoutMs: options?.timeoutMs,
    });
    if (!Array.isArray(data)) {
      throw new AppError("INVALID_RESPONSE", "Expected live search array");
    }
    return data.map(xtreamMapper.toAppChannel);
  }

  async getVodCategories(options?: ContentRequestOptions): Promise<AppCategory[]> {
    const url = this.buildUrl("get_vod_categories");
    const data = await httpClient.get<XtreamCategory[]>(url, 2, {
      meta: { source: options?.requestSource ?? "other" },
      signal: options?.signal,
      timeoutMs: options?.timeoutMs,
    });
    if (!Array.isArray(data)) {
      throw new AppError("INVALID_RESPONSE", "Expected VOD categories array");
    }
    return data.map((cat) => xtreamMapper.toAppCategory(cat, "vod"));
  }

  async getVodStreams(
    categoryId?: string,
    options?: ContentListRequestOptions
  ): Promise<AppMovie[]> {
    const params = buildXtreamListRequestParams(categoryId, options, "vod");
    const url = this.buildUrl("get_vod_streams", params);
    const data = await httpClient.get<XtreamVodStream[]>(url, 2, {
      meta: { source: options?.requestSource ?? "other" },
      signal: options?.signal,
      timeoutMs: options?.timeoutMs,
    });
    if (!Array.isArray(data)) {
      throw new AppError("INVALID_RESPONSE", "Expected VOD streams array");
    }
    return data.map(xtreamMapper.toAppMovie);
  }

  async searchVodStreams(
    query: string,
    categoryId?: string,
    options?: ContentListRequestOptions
  ): Promise<AppMovie[]> {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return [];

    const params: Record<string, string> = {
      search: trimmedQuery,
      ...buildXtreamListRequestParams(categoryId, options, "vod"),
    };

    const url = this.buildUrl("get_vod_streams", params);
    const data = await httpClient.get<XtreamVodStream[]>(url, 1, {
      meta: { source: options?.requestSource ?? "other" },
      signal: options?.signal,
      timeoutMs: options?.timeoutMs,
    });
    if (!Array.isArray(data)) {
      throw new AppError("INVALID_RESPONSE", "Expected VOD search array");
    }
    return data.map(xtreamMapper.toAppMovie);
  }

  async getVodInfo(vodId: string, options?: ContentRequestOptions): Promise<AppMovieDetails> {
    const url = this.buildUrl("get_vod_info", { vod_id: vodId });
    const data = await httpClient.get<XtreamVodInfoResponse>(url, 2, {
      meta: { source: options?.requestSource ?? "other" },
      signal: options?.signal,
      timeoutMs: options?.timeoutMs,
    });
    if (!data || (!data.info && !data.movie_data)) {
      throw new AppError("INVALID_RESPONSE", "Expected VOD details payload");
    }
    return xtreamMapper.toAppMovieDetails(data, vodId);
  }

  async getSeriesCategories(options?: ContentRequestOptions): Promise<AppCategory[]> {
    const url = this.buildUrl("get_series_categories");
    const data = await httpClient.get<XtreamCategory[]>(url, 2, {
      meta: { source: options?.requestSource ?? "other" },
      signal: options?.signal,
      timeoutMs: options?.timeoutMs,
    });
    if (!Array.isArray(data)) {
      throw new AppError("INVALID_RESPONSE", "Expected series categories array");
    }
    return data.map((cat) => xtreamMapper.toAppCategory(cat, "series"));
  }

  async getSeries(
    categoryId?: string,
    options?: ContentListRequestOptions
  ): Promise<AppSeries[]> {
    const params = buildXtreamListRequestParams(categoryId, options, "series");
    const url = this.buildUrl("get_series", params);
    const data = await httpClient.get<XtreamSeries[]>(url, 2, {
      meta: { source: options?.requestSource ?? "other" },
      signal: options?.signal,
      timeoutMs: options?.timeoutMs,
    });
    if (!Array.isArray(data)) {
      throw new AppError("INVALID_RESPONSE", "Expected series array");
    }
    return data.map(xtreamMapper.toAppSeries);
  }

  async searchSeries(
    query: string,
    categoryId?: string,
    options?: ContentListRequestOptions
  ): Promise<AppSeries[]> {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return [];

    const params: Record<string, string> = {
      search: trimmedQuery,
      ...buildXtreamListRequestParams(categoryId, options, "series"),
    };

    const url = this.buildUrl("get_series", params);
    const data = await httpClient.get<XtreamSeries[]>(url, 1, {
      meta: { source: options?.requestSource ?? "other" },
      signal: options?.signal,
      timeoutMs: options?.timeoutMs,
    });
    if (!Array.isArray(data)) {
      throw new AppError("INVALID_RESPONSE", "Expected series search array");
    }
    return data.map(xtreamMapper.toAppSeries);
  }

  async getSeriesInfo(seriesId: string, options?: ContentRequestOptions): Promise<AppSeriesDetails> {
    const url = this.buildUrl("get_series_info", { series_id: seriesId });
    const data = await httpClient.get<XtreamSeriesInfoResponse>(url, 2, {
      meta: { source: options?.requestSource ?? "other" },
      signal: options?.signal,
      timeoutMs: options?.timeoutMs,
    });
    if (!data || (!data.info && !data.episodes)) {
      throw new AppError("INVALID_RESPONSE", "Expected series details payload");
    }
    return xtreamMapper.toAppSeriesDetails(data, seriesId);
  }

  async getShortEpg(streamId: string, options?: ContentRequestOptions): Promise<AppEpgItem[]> {
    const url = this.buildUrl("get_short_epg", { stream_id: streamId });
    const data = await httpClient.get<XtreamShortEpgResponse>(url, 1, {
      meta: { source: options?.requestSource ?? "other" },
      signal: options?.signal,
      timeoutMs: options?.timeoutMs,
    });
    return xtreamMapper.toAppEpg(data.epg_listings || []);
  }

  async getPlaybackUrl(request: PlaybackUrlRequest): Promise<string> {
    this.ensureCredentials();
    if (!request.streamId || !request.streamId.trim()) {
      throw new AppError("PLAYBACK_FAILED", "Stream is unavailable");
    }
    const safeStreamId = request.streamId.trim();

    if (request.contentType === "live") {
      return xtreamUrlBuilder.buildLiveStreamUrl(
        this.serverUrl,
        this.username,
        this.password,
        safeStreamId,
        request.extension || "ts"
      );
    }

    if (request.contentType === "vod") {
      return xtreamUrlBuilder.buildVodUrl(
        this.serverUrl,
        this.username,
        this.password,
        safeStreamId,
        request.extension || "mp4"
      );
    }

    return xtreamUrlBuilder.buildSeriesUrl(
      this.serverUrl,
      this.username,
      this.password,
      safeStreamId,
      request.extension || "mp4"
    );
  }
}
