import { AxiosInstance } from 'axios';
import { logger } from '../config';
import { XtreamRequestCache } from './xtream/cache';
import { createXtreamClient, validateXtreamCredentials } from './xtream/client';
import {
    authenticate as authenticateEndpoint,
    getLiveCategories as getLiveCategoriesEndpoint,
    getLiveStreams as getLiveStreamsEndpoint,
    getLiveStreamsPage as getLiveStreamsPageEndpoint,
    getLiveStreamUrl as getLiveStreamUrlEndpoint,
    getVodCategories as getVodCategoriesEndpoint,
    getVodStreams as getVodStreamsEndpoint,
    getVodStreamsPage as getVodStreamsPageEndpoint,
    getVodStreamUrl as getVodStreamUrlEndpoint,
    getVodInfo as getVodInfoEndpoint,
    getSeriesCategories as getSeriesCategoriesEndpoint,
    getSeries as getSeriesEndpoint,
    getSeriesPage as getSeriesPageEndpoint,
    getSeriesInfo as getSeriesInfoEndpoint,
    getSeriesEpisodeUrl as getSeriesEpisodeUrlEndpoint,
    XtreamEndpointContext,
} from './xtream/endpoints';
import { normalizeArrayResponse } from './xtream/normalizer';
import type {
    XtreamAuthResponse,
    XtreamCategory,
    XtreamLiveStream,
    XtreamMovie,
    XtreamPageOptions,
    XtreamPagedResponse,
    XtreamSeries,
    XtreamServerInfo,
    XtreamUserInfo,
} from './xtream/types';

export type {
    XtreamAuthResponse,
    XtreamCategory,
    XtreamLiveStream,
    XtreamMovie,
    XtreamPageOptions,
    XtreamPagedResponse,
    XtreamSeries,
    XtreamServerInfo,
    XtreamUserInfo,
};

class XtreamAPI {
    private client: AxiosInstance;
    private baseUrl: string;
    private username: string;
    private password: string;
    private requestCache = new XtreamRequestCache();
    private readonly listCacheMs = 15000;
    private readonly pageCacheMs = 8000;

    constructor(serverUrl: string, username: string, password: string) {
        validateXtreamCredentials(serverUrl, username, password);

        this.baseUrl = serverUrl.trim().replace(/\/$/, '');
        this.username = username.trim();
        this.password = password;

        logger.info('XtreamAPI initialized successfully:', {
            baseUrl: this.baseUrl,
            username: this.username,
        });

        this.client = createXtreamClient(this.baseUrl);
    }

    private getEndpointContext(): XtreamEndpointContext {
        return {
            client: this.client,
            baseUrl: this.baseUrl,
            username: this.username,
            password: this.password,
            listCacheMs: this.listCacheMs,
            pageCacheMs: this.pageCacheMs,
            buildRequestKey: this.requestCache.buildRequestKey.bind(this.requestCache),
            requestCached: this.requestCache.requestCached.bind(this.requestCache),
            normalizeArrayResponse,
        };
    }

    clearRuntimeCaches(): void {
        this.requestCache.clear();
    }

    async authenticate(): Promise<XtreamAuthResponse> {
        return authenticateEndpoint(this.getEndpointContext());
    }

    async getLiveCategories(): Promise<XtreamCategory[]> {
        return getLiveCategoriesEndpoint(this.getEndpointContext());
    }

    async getLiveStreams(categoryId?: string): Promise<XtreamLiveStream[]> {
        return getLiveStreamsEndpoint(this.getEndpointContext(), categoryId);
    }

    async getLiveStreamsPage(options?: XtreamPageOptions): Promise<XtreamPagedResponse<XtreamLiveStream>> {
        return getLiveStreamsPageEndpoint(this.getEndpointContext(), options);
    }

    getLiveStreamUrl(streamId: number, format: string = 'ts'): string {
        return getLiveStreamUrlEndpoint(this.getEndpointContext(), streamId, format);
    }

    async getVodCategories(): Promise<XtreamCategory[]> {
        return getVodCategoriesEndpoint(this.getEndpointContext());
    }

    async getVodStreams(categoryId?: string): Promise<XtreamMovie[]> {
        return getVodStreamsEndpoint(this.getEndpointContext(), categoryId);
    }

    async getVodStreamsPage(options?: XtreamPageOptions): Promise<XtreamPagedResponse<XtreamMovie>> {
        return getVodStreamsPageEndpoint(this.getEndpointContext(), options);
    }

    getVodStreamUrl(streamId: number, extension: string = 'mkv'): string {
        return getVodStreamUrlEndpoint(this.getEndpointContext(), streamId, extension);
    }

    async getVodInfo(vodId: number): Promise<any> {
        return getVodInfoEndpoint(this.getEndpointContext(), vodId);
    }

    async getSeriesCategories(): Promise<XtreamCategory[]> {
        return getSeriesCategoriesEndpoint(this.getEndpointContext());
    }

    async getSeries(categoryId?: string): Promise<XtreamSeries[]> {
        return getSeriesEndpoint(this.getEndpointContext(), categoryId);
    }

    async getSeriesPage(options?: XtreamPageOptions): Promise<XtreamPagedResponse<XtreamSeries>> {
        return getSeriesPageEndpoint(this.getEndpointContext(), options);
    }

    async getSeriesInfo(seriesId: number): Promise<any> {
        return getSeriesInfoEndpoint(this.getEndpointContext(), seriesId);
    }

    getSeriesEpisodeUrl(streamId: number, extension: string = 'mkv'): string {
        return getSeriesEpisodeUrlEndpoint(this.getEndpointContext(), streamId, extension);
    }
}

export default XtreamAPI;
