import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { config, logger } from '../config';

// Xtream API response types
export interface XtreamUserInfo {
    username: string;
    password: string;
    message: string;
    auth: number;
    status: string;
    exp_date: string | number | null; // FIX: Xtream can return null, number, or string
    is_trial: string;
    active_cons: string;
    created_at: string;
    max_connections: string;
    allowed_output_formats: string[];
}

export interface XtreamServerInfo {
    url: string;
    port: string;
    https_port: string;
    server_protocol: string;
    rtmp_port: string;
    timezone: string;
    timestamp_now: number;
    time_now: string;
}

export interface XtreamAuthResponse {
    user_info: XtreamUserInfo;
    server_info: XtreamServerInfo;
}

export interface XtreamCategory {
    category_id: string;
    category_name: string;
    parent_id: number;
}

export interface XtreamLiveStream {
    num: number;
    name: string;
    stream_type: string;
    stream_id: number;
    stream_icon: string;
    epg_channel_id: string;
    added: string;
    category_id: string;
    custom_sid: string;
    tv_archive: number;
    direct_source: string;
    tv_archive_duration: number;
}

export interface XtreamMovie {
    num: number;
    name: string;
    stream_type: string;
    stream_id: number;
    stream_icon: string;
    rating: string;
    rating_5based: number;
    added: string;
    category_id: string;
    container_extension: string;
    custom_sid: string;
    direct_source: string;
    plot?: string;
    genre?: string;
    backdrop_path?: string[];
    tmdb_id?: string;
    youtube_trailer?: string;
}

export interface XtreamSeries {
    num: number;
    name: string;
    series_id: number;
    cover: string;
    plot: string;
    cast: string;
    director: string;
    genre: string;
    releaseDate: string;
    last_modified: string;
    rating: string;
    rating_5based: number;
    backdrop_path: string[];
    youtube_trailer: string;
    episode_run_time: string;
    category_id: string;
}

class XtreamAPI {
    private client: AxiosInstance;
    private baseUrl: string;
    private username: string;
    private password: string;

    /**
     * HYBRID RESPONSE NORMALIZER
     * Different Xtream UI portals return data in different formats:
     * 1. Direct array: [] (standard)
     * 2. Empty object: {} (some portals return this for empty content)
     * 3. Wrapped array: { "live_streams": [...] } or { "channels": [...] }
     * 4. Error object: { "error": "message" } or { "user_info": { "auth": 0 } }
     * 5. Null/undefined responses
     * 
     * This method normalizes all formats to an array.
     */
    private normalizeArrayResponse<T>(data: any, possibleKeys: string[] = []): T[] {
        // Case 1: Already an array - perfect!
        if (Array.isArray(data)) {
            return data;
        }

        // Case 2: Null, undefined, or empty string - return empty array
        if (data === null || data === undefined || data === '') {
            logger.warn('XtreamAPI: Received null/undefined/empty response, returning empty array');
            return [];
        }

        // Case 3: Empty object {} - treat as empty array
        if (typeof data === 'object' && Object.keys(data).length === 0) {
            logger.warn('XtreamAPI: Received empty object {}, returning empty array');
            return [];
        }

        // Case 4: Error object - detect and log
        if (typeof data === 'object') {
            // Check for authentication failures (auth=0)
            if (data.user_info?.auth === 0 || data.auth === 0) {
                logger.error('XtreamAPI: Authentication failed in response', {
                    message: data.user_info?.message || data.message
                });
                return [];
            }

            // Check if portal returned auth response instead of content data
            // This happens when: 1. Portal doesn't support action param, 2. Account has no content
            if (data.user_info && data.server_info) {
                if (data.user_info.auth === 1) {
                    // Auth succeeded but portal returned auth response instead of content
                    // This typically means the account has no content assigned or portal uses different API
                    logger.warn('XtreamAPI: Portal returned auth response instead of content data', {
                        username: data.user_info.username,
                        status: data.user_info.status,
                        message: 'This portal may use a non-standard API or account has no content assigned'
                    });
                } else {
                    logger.error('XtreamAPI: Portal returned auth response with failed auth', {
                        auth: data.user_info.auth,
                        message: data.user_info.message
                    });
                }
                return [];
            }

            // Check for explicit error fields
            if (data.error || data.Error || data.ERROR) {
                logger.error('XtreamAPI: Error in response', {
                    error: data.error || data.Error || data.ERROR
                });
                return [];
            }

            // Case 5: Wrapped array - try to extract from known keys
            const allKeys = [...possibleKeys, 'data', 'items', 'list', 'streams', 'channels',
                'live_streams', 'vod_streams', 'series', 'movies', 'result', 'results'];

            for (const key of allKeys) {
                if (Array.isArray(data[key])) {
                    logger.info(`XtreamAPI: Extracted array from wrapped response key "${key}"`, {
                        count: data[key].length
                    });
                    return data[key];
                }
            }

            // Case 6: Object with numeric keys (some APIs return {0: {...}, 1: {...}})
            const numericKeys = Object.keys(data).filter(k => !isNaN(Number(k)));
            if (numericKeys.length > 0 && numericKeys.length === Object.keys(data).length) {
                const extracted = Object.values(data) as T[];
                logger.info('XtreamAPI: Converted numeric-keyed object to array', { count: extracted.length });
                return extracted;
            }
        }

        // Case 7: Unknown format - log detailed info for debugging
        logger.error('XtreamAPI: Unable to normalize response to array', {
            type: typeof data,
            isArray: Array.isArray(data),
            keys: typeof data === 'object' ? Object.keys(data).slice(0, 10) : undefined,
            sample: JSON.stringify(data).substring(0, 500),
        });

        return [];
    }

    constructor(serverUrl: string, username: string, password: string) {
        // =============================================================
        // DETAILED VALIDATION WITH LOGGING
        // =============================================================
        logger.info('XtreamAPI constructor called with:', {
            serverUrl: serverUrl,
            serverUrlType: typeof serverUrl,
            serverUrlLength: serverUrl?.length,
            username: username,
            usernameType: typeof username,
            hasPassword: !!password
        });

        // Validate serverUrl
        if (serverUrl === undefined) {
            const error = new Error('XtreamAPI: serverUrl is undefined');
            logger.error(error.message);
            throw error;
        }

        if (serverUrl === null) {
            const error = new Error('XtreamAPI: serverUrl is null');
            logger.error(error.message);
            throw error;
        }

        if (typeof serverUrl !== 'string') {
            const error = new Error(`XtreamAPI: serverUrl must be string, got ${typeof serverUrl}`);
            logger.error(error.message);
            throw error;
        }

        if (serverUrl.trim() === '') {
            const error = new Error('XtreamAPI: serverUrl is empty string');
            logger.error(error.message);
            throw error;
        }

        // Validate username
        if (!username || typeof username !== 'string' || username.trim() === '') {
            const error = new Error(`XtreamAPI: username is invalid: "${username}"`);
            logger.error(error.message);
            throw error;
        }

        // Validate password
        if (!password) {
            const error = new Error('XtreamAPI: password is required');
            logger.error(error.message);
            throw error;
        }
        // =============================================================

        this.baseUrl = serverUrl.trim().replace(/\/$/, '');
        this.username = username.trim();
        this.password = password;

        logger.info('XtreamAPI initialized successfully:', {
            baseUrl: this.baseUrl,
            username: this.username
        });

        this.client = axios.create({
            baseURL: this.baseUrl,
            timeout: config.xtream.timeout ?? 30000, // Use configured Xtream timeout with fallback
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
            decompress: true, // Enable gzip decompression
        });

        // =============================================================
        // RESPONSE INTERCEPTOR - ROBUST JSON REPAIR FOR XTREAM SERVERS
        // Xtream servers are notorious for returning truncated JSON.
        // This interceptor handles:
        // 1. Already parsed responses (Axios auto-parse)
        // 2. String responses that need parsing
        // 3. Truncated arrays (need `]`)
        // 4. Truncated objects (need `}`)
        // =============================================================
        this.client.interceptors.response.use(
            (response: AxiosResponse) => {
                // Log raw response info for debugging
                logger.debug('Xtream response received', {
                    url: response.config.url,
                    status: response.status,
                    dataType: typeof response.data,
                    isArray: Array.isArray(response.data),
                    rawLength: typeof response.data === 'string' ? response.data.length : undefined,
                });

                // Case 1: Already parsed by Axios (most common for valid JSON)
                if (typeof response.data !== 'string') {
                    if (Array.isArray(response.data)) {
                        logger.debug('Xtream: Valid array response', { length: response.data.length });
                    }
                    return response;
                }

                // Case 2: String response - needs parsing (happens with broken Content-Type)
                const rawData = response.data.trim();

                // Empty response
                if (!rawData) {
                    logger.warn('Xtream: Empty response');
                    response.data = [];
                    return response;
                }

                // Try normal parse first
                try {
                    response.data = JSON.parse(rawData);
                    logger.debug('Xtream: Parsed string response successfully');
                    return response;
                } catch {
                    // Parse failed - attempt repair
                    logger.debug('Xtream: JSON parse failed, attempting repair...', {
                        length: rawData.length,
                        start: rawData.substring(0, 100),
                        end: rawData.substring(rawData.length - 50),
                    });
                }

                // REPAIR LOGIC: Handle truncated JSON
                try {
                    // Determine if array or object
                    const isArray = rawData.startsWith('[');
                    const isObject = rawData.startsWith('{');

                    if (isArray) {
                        // Truncated array - needs `]` or `}]`
                        // Try progressive repairs
                        const repairs = [
                            rawData + ']',
                            rawData + '}]',
                            rawData + '"}]',
                            rawData + '"}]',
                        ];

                        for (const attempt of repairs) {
                            try {
                                response.data = JSON.parse(attempt);
                                logger.info('Xtream: Repaired truncated array response');
                                return response;
                            } catch {
                                // Try next repair
                            }
                        }
                    } else if (isObject) {
                        // Truncated object - needs `}`
                        const repairs = [
                            rawData + '}',
                            rawData + '"}',
                            rawData + '"}}',
                        ];

                        for (const attempt of repairs) {
                            try {
                                response.data = JSON.parse(attempt);
                                logger.info('Xtream: Repaired truncated object response');
                                return response;
                            } catch {
                                // Try next repair
                            }
                        }
                    }

                    // All repairs failed - log details and throw
                    logger.error('Xtream: JSON repair failed', {
                        url: response.config.url,
                        length: rawData.length,
                        start: rawData.substring(0, 200),
                        end: rawData.substring(rawData.length - 100),
                    });

                    throw new Error(`Xtream returned invalid JSON (${rawData.length} chars, unrepairable)`);

                } catch (repairError: any) {
                    logger.error('Xtream: Fatal JSON error', { message: repairError.message });
                    throw repairError;
                }
            },
            (error: any) => {
                logger.error('Xtream API request failed', {
                    message: error.message,
                    url: error.config?.url,
                    status: error.response?.status,
                });
                throw error;
            }
        );
    }

    async authenticate(): Promise<XtreamAuthResponse> {
        logger.info('XtreamAPI.authenticate() called');
        const response = await this.client.get('/player_api.php', {
            params: {
                username: this.username,
                password: this.password,
            },
        });
        logger.info('XtreamAPI.authenticate() response received');
        return response.data;
    }

    async getLiveCategories(): Promise<XtreamCategory[]> {
        const response = await this.client.get('/player_api.php', {
            params: {
                username: this.username,
                password: this.password,
                action: 'get_live_categories',
            },
        });
        // HYBRID: Normalize response to handle different portal formats
        return this.normalizeArrayResponse<XtreamCategory>(response.data, ['categories', 'live_categories']);
    }

    async getLiveStreams(categoryId?: string): Promise<XtreamLiveStream[]> {
        logger.debug('Fetching live streams...');
        const response = await this.client.get('/player_api.php', {
            params: {
                username: this.username,
                password: this.password,
                action: 'get_live_streams',
                ...(categoryId && { category_id: categoryId }),
            },
        });
        // HYBRID: Normalize response to handle different portal formats
        const normalized = this.normalizeArrayResponse<XtreamLiveStream>(response.data, ['live_streams', 'channels', 'streams']);
        logger.debug('Live streams loaded', { count: normalized.length });
        return normalized;
    }

    getLiveStreamUrl(streamId: number, format: string = 'ts'): string {
        // FIX #3: URL-encode credentials to handle special characters
        const user = encodeURIComponent(this.username);
        const pass = encodeURIComponent(this.password);
        return `${this.baseUrl}/live/${user}/${pass}/${streamId}.${format}`;
    }

    async getVodCategories(): Promise<XtreamCategory[]> {
        const response = await this.client.get('/player_api.php', {
            params: {
                username: this.username,
                password: this.password,
                action: 'get_vod_categories',
            },
        });
        // HYBRID: Normalize response to handle different portal formats
        return this.normalizeArrayResponse<XtreamCategory>(response.data, ['categories', 'vod_categories']);
    }

    async getVodStreams(categoryId?: string): Promise<XtreamMovie[]> {
        const response = await this.client.get('/player_api.php', {
            params: {
                username: this.username,
                password: this.password,
                action: 'get_vod_streams',
                ...(categoryId && { category_id: categoryId }),
            },
        });
        // HYBRID: Normalize response to handle different portal formats
        return this.normalizeArrayResponse<XtreamMovie>(response.data, ['vod_streams', 'movies', 'vod']);
    }

    getVodStreamUrl(streamId: number, extension: string = 'mkv'): string {
        // FIX #3: URL-encode credentials to handle special characters
        const user = encodeURIComponent(this.username);
        const pass = encodeURIComponent(this.password);
        return `${this.baseUrl}/movie/${user}/${pass}/${streamId}.${extension}`;
    }

    async getVodInfo(vodId: number): Promise<any> {
        const response = await this.client.get('/player_api.php', {
            params: {
                username: this.username,
                password: this.password,
                action: 'get_vod_info',
                vod_id: vodId,
            },
        });
        return response.data;
    }

    async getSeriesCategories(): Promise<XtreamCategory[]> {
        const response = await this.client.get('/player_api.php', {
            params: {
                username: this.username,
                password: this.password,
                action: 'get_series_categories',
            },
        });
        // HYBRID: Normalize response to handle different portal formats
        return this.normalizeArrayResponse<XtreamCategory>(response.data, ['categories', 'series_categories']);
    }

    async getSeries(categoryId?: string): Promise<XtreamSeries[]> {
        const response = await this.client.get('/player_api.php', {
            params: {
                username: this.username,
                password: this.password,
                action: 'get_series',
                ...(categoryId && { category_id: categoryId }),
            },
        });
        // HYBRID: Normalize response to handle different portal formats
        return this.normalizeArrayResponse<XtreamSeries>(response.data, ['series', 'series_list']);
    }

    async getSeriesInfo(seriesId: number): Promise<any> {
        const response = await this.client.get('/player_api.php', {
            params: {
                username: this.username,
                password: this.password,
                action: 'get_series_info',
                series_id: seriesId,
            },
        });
        return response.data;
    }

    getSeriesEpisodeUrl(streamId: number, extension: string = 'mkv'): string {
        // FIX #3: URL-encode credentials to handle special characters
        const user = encodeURIComponent(this.username);
        const pass = encodeURIComponent(this.password);
        return `${this.baseUrl}/series/${user}/${pass}/${streamId}.${extension}`;
    }

    async getEPG(streamId: number): Promise<any> {
        const response = await this.client.get('/player_api.php', {
            params: {
                username: this.username,
                password: this.password,
                action: 'get_short_epg',
                stream_id: streamId,
            },
        });
        return response.data;
    }
}

export default XtreamAPI;
