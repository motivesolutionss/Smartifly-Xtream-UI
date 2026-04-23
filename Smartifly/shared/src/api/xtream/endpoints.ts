import { AxiosInstance } from 'axios';
import { logger } from '../../config';
import {
    XtreamAuthResponse,
    XtreamCategory,
    XtreamLiveStream,
    XtreamMovie,
    XtreamPageOptions,
    XtreamPagedResponse,
    XtreamSeries,
} from './types';

export interface XtreamEndpointContext {
    client: AxiosInstance;
    baseUrl: string;
    username: string;
    password: string;
    listCacheMs: number;
    pageCacheMs: number;
    buildRequestKey: (action: string, params?: Record<string, unknown>) => string;
    requestCached: <T>(cacheKey: string, ttlMs: number, request: () => Promise<T>) => Promise<T>;
    normalizeArrayResponse: <T>(data: any, possibleKeys?: string[]) => T[];
}

export const authenticate = async (ctx: XtreamEndpointContext): Promise<XtreamAuthResponse> => {
    logger.info('XtreamAPI.authenticate() called');
    const response = await ctx.client.get('/player_api.php', {
        params: {
            username: ctx.username,
            password: ctx.password,
        },
    });
    logger.info('XtreamAPI.authenticate() response received');
    return response.data;
};

export const getLiveCategories = async (ctx: XtreamEndpointContext): Promise<XtreamCategory[]> => {
    const cacheKey = ctx.buildRequestKey('get_live_categories');
    return ctx.requestCached(cacheKey, ctx.listCacheMs, async () => {
        const response = await ctx.client.get('/player_api.php', {
            params: {
                username: ctx.username,
                password: ctx.password,
                action: 'get_live_categories',
            },
        });
        return ctx.normalizeArrayResponse<XtreamCategory>(response.data, ['categories', 'live_categories']);
    });
};

const getPagedList = async <T>(
    ctx: XtreamEndpointContext,
    action: string,
    keys: string[],
    options?: XtreamPageOptions
): Promise<XtreamPagedResponse<T>> => {
    const page = Math.max(1, Math.floor(options?.page ?? 1));
    const limit = Math.max(20, Math.min(500, Math.floor(options?.limit ?? 180)));
    const offset = (page - 1) * limit;

    const params = {
        categoryId: options?.categoryId ?? '',
        page,
        limit,
    };
    const cacheKey = ctx.buildRequestKey(action, params);

    return ctx.requestCached(cacheKey, ctx.pageCacheMs, async () => {
        const response = await ctx.client.get('/player_api.php', {
            params: {
                username: ctx.username,
                password: ctx.password,
                action,
                ...(options?.categoryId ? { category_id: options.categoryId } : {}),
                // Common pagination param variants used by different backends/proxies.
                page,
                limit,
                per_page: limit,
                offset,
                start: offset,
            },
        });

        const normalized = ctx.normalizeArrayResponse<T>(response.data, keys);
        const serverPaginated = normalized.length <= limit;

        return {
            items: normalized,
            page,
            limit,
            hasMore: serverPaginated ? normalized.length === limit : false,
            serverPaginated,
        };
    });
};

export const getLiveStreams = async (
    ctx: XtreamEndpointContext,
    categoryId?: string
): Promise<XtreamLiveStream[]> => {
    logger.debug('Fetching live streams...');
    const cacheKey = ctx.buildRequestKey('get_live_streams', { categoryId: categoryId ?? '' });
    return ctx.requestCached(cacheKey, ctx.listCacheMs, async () => {
        const response = await ctx.client.get('/player_api.php', {
            params: {
                username: ctx.username,
                password: ctx.password,
                action: 'get_live_streams',
                ...(categoryId && { category_id: categoryId }),
            },
        });
        const normalized = ctx.normalizeArrayResponse<XtreamLiveStream>(
            response.data,
            ['live_streams', 'channels', 'streams']
        );
        logger.debug('Live streams loaded', { count: normalized.length });
        return normalized;
    });
};

export const getLiveStreamsPage = async (
    ctx: XtreamEndpointContext,
    options?: XtreamPageOptions
): Promise<XtreamPagedResponse<XtreamLiveStream>> => {
    return getPagedList<XtreamLiveStream>(
        ctx,
        'get_live_streams',
        ['live_streams', 'channels', 'streams'],
        options
    );
};

export const getLiveStreamUrl = (
    ctx: Pick<XtreamEndpointContext, 'baseUrl' | 'username' | 'password'>,
    streamId: number,
    format: string = 'ts'
): string => {
    const user = encodeURIComponent(ctx.username);
    const pass = encodeURIComponent(ctx.password);
    return `${ctx.baseUrl}/live/${user}/${pass}/${streamId}.${format}`;
};

export const getVodCategories = async (ctx: XtreamEndpointContext): Promise<XtreamCategory[]> => {
    const cacheKey = ctx.buildRequestKey('get_vod_categories');
    return ctx.requestCached(cacheKey, ctx.listCacheMs, async () => {
        const response = await ctx.client.get('/player_api.php', {
            params: {
                username: ctx.username,
                password: ctx.password,
                action: 'get_vod_categories',
            },
        });
        return ctx.normalizeArrayResponse<XtreamCategory>(response.data, ['categories', 'vod_categories']);
    });
};

export const getVodStreams = async (
    ctx: XtreamEndpointContext,
    categoryId?: string
): Promise<XtreamMovie[]> => {
    const cacheKey = ctx.buildRequestKey('get_vod_streams', { categoryId: categoryId ?? '' });
    return ctx.requestCached(cacheKey, ctx.listCacheMs, async () => {
        const response = await ctx.client.get('/player_api.php', {
            params: {
                username: ctx.username,
                password: ctx.password,
                action: 'get_vod_streams',
                ...(categoryId && { category_id: categoryId }),
            },
        });
        return ctx.normalizeArrayResponse<XtreamMovie>(response.data, ['vod_streams', 'movies', 'vod']);
    });
};

export const getVodStreamsPage = async (
    ctx: XtreamEndpointContext,
    options?: XtreamPageOptions
): Promise<XtreamPagedResponse<XtreamMovie>> => {
    return getPagedList<XtreamMovie>(ctx, 'get_vod_streams', ['vod_streams', 'movies', 'vod'], options);
};

export const getVodStreamUrl = (
    ctx: Pick<XtreamEndpointContext, 'baseUrl' | 'username' | 'password'>,
    streamId: number,
    extension: string = 'mkv'
): string => {
    const user = encodeURIComponent(ctx.username);
    const pass = encodeURIComponent(ctx.password);
    return `${ctx.baseUrl}/movie/${user}/${pass}/${streamId}.${extension}`;
};

export const getVodInfo = async (
    ctx: Pick<XtreamEndpointContext, 'client' | 'username' | 'password'>,
    vodId: number
): Promise<any> => {
    const response = await ctx.client.get('/player_api.php', {
        params: {
            username: ctx.username,
            password: ctx.password,
            action: 'get_vod_info',
            vod_id: vodId,
        },
    });
    return response.data;
};

export const getSeriesCategories = async (ctx: XtreamEndpointContext): Promise<XtreamCategory[]> => {
    const cacheKey = ctx.buildRequestKey('get_series_categories');
    return ctx.requestCached(cacheKey, ctx.listCacheMs, async () => {
        const response = await ctx.client.get('/player_api.php', {
            params: {
                username: ctx.username,
                password: ctx.password,
                action: 'get_series_categories',
            },
        });
        return ctx.normalizeArrayResponse<XtreamCategory>(response.data, ['categories', 'series_categories']);
    });
};

export const getSeries = async (
    ctx: XtreamEndpointContext,
    categoryId?: string
): Promise<XtreamSeries[]> => {
    const cacheKey = ctx.buildRequestKey('get_series', { categoryId: categoryId ?? '' });
    return ctx.requestCached(cacheKey, ctx.listCacheMs, async () => {
        const response = await ctx.client.get('/player_api.php', {
            params: {
                username: ctx.username,
                password: ctx.password,
                action: 'get_series',
                ...(categoryId && { category_id: categoryId }),
            },
        });
        return ctx.normalizeArrayResponse<XtreamSeries>(response.data, ['series', 'series_list']);
    });
};

export const getSeriesPage = async (
    ctx: XtreamEndpointContext,
    options?: XtreamPageOptions
): Promise<XtreamPagedResponse<XtreamSeries>> => {
    return getPagedList<XtreamSeries>(ctx, 'get_series', ['series', 'series_list'], options);
};

export const getSeriesInfo = async (
    ctx: Pick<XtreamEndpointContext, 'client' | 'username' | 'password'>,
    seriesId: number
): Promise<any> => {
    const response = await ctx.client.get('/player_api.php', {
        params: {
            username: ctx.username,
            password: ctx.password,
            action: 'get_series_info',
            series_id: seriesId,
        },
    });
    return response.data;
};

export const getSeriesEpisodeUrl = (
    ctx: Pick<XtreamEndpointContext, 'baseUrl' | 'username' | 'password'>,
    streamId: number,
    extension: string = 'mkv'
): string => {
    const user = encodeURIComponent(ctx.username);
    const pass = encodeURIComponent(ctx.password);
    return `${ctx.baseUrl}/series/${user}/${pass}/${streamId}.${extension}`;
};
