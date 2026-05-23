import { httpClient } from "../../api/httpClient";
import { AppError } from "../../types/errors";
import type { AccountService, UserInfo } from "../interfaces/accountService";
import type { ContentService } from "../interfaces/contentService";
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
import { xtreamUrlBuilder } from "./xtreamUrlBuilder";
import { normalizeServerUrl } from "../../utils/normalizeServerUrl";

export class XtreamClient implements AccountService, ContentService, PlaybackService {
  private serverUrl: string = "";
  private username: string = "";
  private password: string = "";

  constructor(serverUrl?: string, username?: string, password?: string) {
    if (serverUrl) this.serverUrl = serverUrl;
    if (username) this.username = username;
    if (password) this.password = password;
  }

  setCredentials(serverUrl: string, username: string, password: string) {
    this.serverUrl = normalizeServerUrl(serverUrl);
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

  async getLiveCategories(): Promise<AppCategory[]> {
    const url = this.buildUrl("get_live_categories");
    const data = await httpClient.get<XtreamCategory[]>(url);
    if (!Array.isArray(data)) {
      throw new AppError("INVALID_RESPONSE", "Expected live categories array");
    }
    return data.map((cat) => xtreamMapper.toAppCategory(cat, "live"));
  }

  async getLiveStreams(categoryId?: string): Promise<AppChannel[]> {
    const params: Record<string, string> = categoryId
      ? { category_id: categoryId }
      : {};
    const url = this.buildUrl("get_live_streams", params);
    const data = await httpClient.get<XtreamLiveStream[]>(url);
    if (!Array.isArray(data)) {
      throw new AppError("INVALID_RESPONSE", "Expected live streams array");
    }
    return data.map(xtreamMapper.toAppChannel);
  }

  async getVodCategories(): Promise<AppCategory[]> {
    const url = this.buildUrl("get_vod_categories");
    const data = await httpClient.get<XtreamCategory[]>(url);
    if (!Array.isArray(data)) {
      throw new AppError("INVALID_RESPONSE", "Expected VOD categories array");
    }
    return data.map((cat) => xtreamMapper.toAppCategory(cat, "vod"));
  }

  async getVodStreams(categoryId?: string): Promise<AppMovie[]> {
    const params: Record<string, string> = categoryId
      ? { category_id: categoryId }
      : {};
    const url = this.buildUrl("get_vod_streams", params);
    const data = await httpClient.get<XtreamVodStream[]>(url);
    if (!Array.isArray(data)) {
      throw new AppError("INVALID_RESPONSE", "Expected VOD streams array");
    }
    return data.map(xtreamMapper.toAppMovie);
  }

  async getVodInfo(vodId: string): Promise<AppMovieDetails> {
    const url = this.buildUrl("get_vod_info", { vod_id: vodId });
    const data = await httpClient.get<XtreamVodInfoResponse>(url);
    if (!data || (!data.info && !data.movie_data)) {
      throw new AppError("INVALID_RESPONSE", "Expected VOD details payload");
    }
    return xtreamMapper.toAppMovieDetails(data, vodId);
  }

  async getSeriesCategories(): Promise<AppCategory[]> {
    const url = this.buildUrl("get_series_categories");
    const data = await httpClient.get<XtreamCategory[]>(url);
    if (!Array.isArray(data)) {
      throw new AppError("INVALID_RESPONSE", "Expected series categories array");
    }
    return data.map((cat) => xtreamMapper.toAppCategory(cat, "series"));
  }

  async getSeries(categoryId?: string): Promise<AppSeries[]> {
    const params: Record<string, string> = categoryId
      ? { category_id: categoryId }
      : {};
    const url = this.buildUrl("get_series", params);
    const data = await httpClient.get<XtreamSeries[]>(url);
    if (!Array.isArray(data)) {
      throw new AppError("INVALID_RESPONSE", "Expected series array");
    }
    return data.map(xtreamMapper.toAppSeries);
  }

  async getSeriesInfo(seriesId: string): Promise<AppSeriesDetails> {
    const url = this.buildUrl("get_series_info", { series_id: seriesId });
    const data = await httpClient.get<XtreamSeriesInfoResponse>(url);
    if (!data || (!data.info && !data.episodes)) {
      throw new AppError("INVALID_RESPONSE", "Expected series details payload");
    }
    return xtreamMapper.toAppSeriesDetails(data, seriesId);
  }

  async getShortEpg(streamId: string): Promise<AppEpgItem[]> {
    const url = this.buildUrl("get_short_epg", { stream_id: streamId });
    const data = await httpClient.get<XtreamShortEpgResponse>(url, 1);
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
