import {
  buildCacheKey,
  readCacheEntry,
  readFreshCacheValue,
  writeCacheValue
} from './cacheService';

export type XtreamCredentials = {
  portalUrl: string;
  username: string;
  password: string;
};

export type PortalDetails = {
  portalCode: string;
  baseUrl: string;
  name: string;
};

export type XtreamUserInfo = {
  username: string;
  password: string;
  message: string;
  auth: number;
  status: string;
  exp_date: string | number | null;
  is_trial: string;
  active_cons: string;
  created_at: string;
  max_connections: string;
  allowed_output_formats: string[];
};

export type XtreamServerInfo = {
  url: string;
  port: string;
  https_port: string;
  server_protocol: string;
  rtmp_port: string;
  timezone: string;
  timestamp_now: number;
  time_now: string;
};

export type XtreamAuthResponse = {
  user_info: XtreamUserInfo;
  server_info: XtreamServerInfo;
};

type PortalValidationPayload = {
  success?: boolean;
  message?: string;
  portal?: PortalDetails;
};

export type DeviceActivationSession = {
  success: boolean;
  qrCode: string | null;
  webLink: string;
  token: string;
  settingsCode: string;
  expiresIn?: string | null;
};

export type DeviceActivationLicense = {
  id: number;
  userId?: number | null;
  plan: string;
  expiresAt?: string | null;
  xtreamUser?: string | null;
  xtreamPass?: string | null;
  server?: {
    name: string;
    url: string;
  } | null;
};

export type DeviceActivationStatusCode =
  | 'ACTIVE'
  | 'PENDING'
  | 'NO_DEVICE'
  | 'CONTACTED'
  | 'EXPIRED'
  | 'BLOCKED'
  | 'BLACKLISTED'
  | 'DISABLED';

export type DeviceActivationStatus = {
  success?: boolean | null;
  exists?: boolean | null;
  valid: boolean;
  state: string;
  statusCode?: string | null;
  reason?: string | null;
  license?: DeviceActivationLicense | null;
};

type DeviceActivationSessionPayload = {
  success?: boolean;
  qrCode?: string | null;
  webLink?: string;
  token?: string;
  settingsCode?: string;
  expiresIn?: string | null;
};

type DeviceActivationStatusPayload = {
  success?: boolean | null;
  exists?: boolean | null;
  valid?: boolean;
  state?: string;
  statusCode?: string | null;
  reason?: string | null;
  license?: DeviceActivationLicense | null;
};

export type XtreamCategory = {
  category_id: string;
  category_name: string;
  parent_id?: number;
};

export type XtreamLiveStream = {
  num: number;
  name: string;
  stream_type: string;
  stream_id: number;
  stream_icon: string;
  epg_channel_id?: string | null;
  added: string;
  category_id: string;
  custom_sid: string;
  tv_archive: number;
  direct_source: string;
  tv_archive_duration: number;
};

export type XtreamShortEpgListing = {
  id?: string | number;
  title?: string;
  description?: string;
  start?: string;
  end?: string;
  start_timestamp?: string | number;
  stop_timestamp?: string | number;
};

export type XtreamShortEpgEntry = {
  id: string;
  title: string;
  description: string;
  startTime: number;
  endTime: number;
  channelId: string;
};

export type XtreamMovie = {
  num: number;
  name: string;
  stream_type: string;
  stream_id: number;
  stream_icon: string;
  rating?: string;
  rating_5based?: number;
  added?: string;
  category_id: string;
  container_extension?: string;
  custom_sid?: string;
  direct_source?: string;
  plot?: string;
  genre?: string;
  backdrop_path?: string[];
  tmdb_id?: string;
  youtube_trailer?: string;
};

export type XtreamMovieInfo = {
  info?: {
    name?: string;
    plot?: string;
    releasedate?: string;
    rating?: string;
    genre?: string;
    director?: string;
    cast?: string;
    backdrop_path?: string[];
    movie_image?: string;
    youtube_trailer?: string;
  };
  movie_data?: {
    stream_id?: number;
    container_extension?: string;
  };
};

export type XtreamSeries = {
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
};

export type XtreamSeriesEpisode = {
  id: string;
  stream_id: number;
  title: string;
  plot?: string;
  container_extension?: string;
  season?: number | string;
  episode_num?: number | string;
  info?: {
    plot?: string;
    duration?: string;
    movie_image?: string;
    release_date?: string;
  };
};

export type XtreamSeriesInfo = {
  info?: {
    series_id?: number;
    name?: string;
    plot?: string;
    rating?: string;
    genre?: string;
    director?: string;
    cast?: string;
    cover?: string;
    backdrop_path?: string[];
    youtube_trailer?: string;
    releaseDate?: string;
  };
  seasons?: Array<{
    season_number: number;
    name?: string;
    episode_count?: number;
  }>;
  episodes?: Record<string, XtreamSeriesEpisode[]>;
};

function normalizeBaseUrl(input: string) {
  let value = input.trim().replace(/\/+$/, '');
  if (!value) {
    throw new Error('Portal URL is required');
  }

  if (!/^https?:\/\//i.test(value)) {
    value = `http://${value}`;
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return value.replace(/\/+$/, '');
  }

  const cleanedPath = parsed.pathname
    .replace(/\/player_api\.php\/?$/i, '')
    .replace(/\/panel_api\.php\/?$/i, '')
    .replace(/\/get\.php\/?$/i, '')
    .replace(/\/+$/, '');

  const origin = parsed.origin;
  return cleanedPath ? `${origin}${cleanedPath}` : origin;
}

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV ? 'http://localhost:5000/v1' : 'https://api.smartifly.co/v1');

const CATALOG_CACHE_TTL_MS = 30 * 60 * 1000;
const DETAILS_CACHE_TTL_MS = 15 * 60 * 1000;
const inFlightCatalogRequests = new Map<string, Promise<unknown>>();

function buildActivationMac(deviceId: string) {
  const normalized = deviceId.replace(/[^a-z0-9]/gi, '').toUpperCase();
  return `00:1A:79:${normalized.slice(-6).padStart(6, '0')}`;
}

function getActivationOsVersion() {
  if (typeof navigator === 'undefined') {
    return 'webos';
  }

  const userAgent = navigator.userAgent || 'webos';
  return userAgent.slice(0, 50);
}

type SmartiflyRequestOptions = {
  method?: 'GET' | 'POST';
  body?: unknown;
  timeoutMs?: number;
};

function buildSmartiflyUrl(path: string) {
  const base = API_BASE_URL.replace(/\/+$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}

function parseSmartiflyJson<T>(text: string): T {
  if (!text || !text.trim()) {
    throw new Error('Smartifly API returned an empty response');
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error('Smartifly API returned invalid JSON');
  }
}

function smartiflyRequestJson<T>(
  path: string,
  options: SmartiflyRequestOptions = {}
): Promise<T> {
  return new Promise((resolve, reject) => {
    const method = options.method || 'GET';
    const url = buildSmartiflyUrl(path);
    const xhr = new XMLHttpRequest();

    try {
      xhr.open(method, url, true);
      xhr.timeout = options.timeoutMs || 20000;

      xhr.setRequestHeader('Accept', 'application/json');

      if (method !== 'GET' && options.body !== undefined) {
        xhr.setRequestHeader('Content-Type', 'application/json');
      }

      xhr.onload = function () {
        const status = xhr.status || 0;
        const text = xhr.responseText || '';

        console.warn('[Smartifly API][XHR] response', {
          method,
          path,
          status,
          hasBody: text.length > 0
        });

        if (status >= 200 && status < 300) {
          try {
            resolve(parseSmartiflyJson<T>(text));
          } catch (error) {
            reject(error);
          }
          return;
        }

        let message = `Smartifly API failed with HTTP ${status}`;

        try {
          const payload = JSON.parse(text) as { message?: string; reason?: string; error?: string };
          message = payload.message || payload.reason || payload.error || message;
        } catch {
          // Keep fallback message.
        }

        reject(new Error(message));
      };

      xhr.onerror = function () {
        console.warn('[Smartifly API][XHR] network error', {
          method,
          path,
          status: xhr.status,
          statusText: xhr.statusText
        });

        reject(new Error(`Network request failed: ${method} ${path}`));
      };

      xhr.ontimeout = function () {
        console.warn('[Smartifly API][XHR] timeout', {
          method,
          path
        });

        reject(new Error(`Network request timed out: ${method} ${path}`));
      };

      const payload =
        method === 'GET' || options.body === undefined
          ? null
          : JSON.stringify(options.body);

      console.warn('[Smartifly API][XHR] request', {
        method,
        path,
        url,
        hasBody: payload !== null
      });

      xhr.send(payload);
    } catch (error) {
      reject(error);
    }
  });
}

export async function checkSmartiflyApiHealth() {
  return smartiflyRequestJson<{ ok?: boolean; db?: string }>(
    '/health',
    { method: 'GET', timeoutMs: 10000 }
  );
}

// Xtream portal requests are intentionally left on the existing path for now.
// The webOS 3 activation issue is isolated to Smartifly backend API calls.
async function requestJson<T>(baseUrl: string, params: Record<string, string | number | undefined>) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') {
      continue;
    }

    searchParams.set(key, String(value));
  }

  const response = await fetch(`${normalizeBaseUrl(baseUrl)}/player_api.php?${searchParams.toString()}`, {
    method: 'GET',
    cache: 'no-store'
  });

  if (!response.ok) {
    throw new Error(`Xtream request failed with HTTP ${response.status}`);
  }

  const text = await response.text();
  if (!text.trim()) {
    throw new Error('Xtream returned an empty response');
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error('Xtream returned invalid JSON');
  }
}

function buildCatalogCacheKey(scope: string, portalUrl: string, username: string, categoryId?: string | number, itemId?: string | number) {
  return buildCacheKey(
    'api',
    scope,
    normalizeBaseUrl(portalUrl),
    username.trim().toLowerCase(),
    categoryId ?? '',
    itemId ?? ''
  );
}

async function requestCached<T>(cacheKey: string, ttlMs: number, fetcher: () => Promise<T>) {
  const fresh = readFreshCacheValue<T>(cacheKey);
  if (fresh !== null) {
    return fresh;
  }

  const inFlight = inFlightCatalogRequests.get(cacheKey);
  if (inFlight) {
    return inFlight as Promise<T>;
  }

  const request = (async () => {
    try {
      const value = await fetcher();
      writeCacheValue(cacheKey, value, ttlMs);
      return value;
    } catch (error) {
      const stale = readCacheEntry<T>(cacheKey)?.value ?? null;
      if (stale !== null) {
        return stale;
      }

      throw error;
    } finally {
      inFlightCatalogRequests.delete(cacheKey);
    }
  })();

  inFlightCatalogRequests.set(cacheKey, request);
  return request;
}

function decodeXtreamBase64(value?: string | null) {
  if (!value) {
    return '';
  }

  try {
    const binary = atob(value);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return value;
  }
}

function readArray<T>(data: unknown, keys: string[]) {
  if (Array.isArray(data)) {
    return data as T[];
  }

  if (!data || typeof data !== 'object') {
    return [];
  }

  const record = data as Record<string, unknown>;
  for (const key of keys) {
    const candidate = record[key];
    if (Array.isArray(candidate)) {
      return candidate as T[];
    }
  }

  return [];
}

export async function validatePortalCode(code: string): Promise<PortalDetails> {
  const normalizedCode = code.trim().toUpperCase();
  if (!normalizedCode) {
    throw new Error('Server Identity is required');
  }

  const payload = await smartiflyRequestJson<PortalValidationPayload>(
    `/public/portal/validate?code=${encodeURIComponent(normalizedCode)}`,
    { method: 'GET' }
  );

  if (!payload.success || !payload.portal) {
    throw new Error(payload.message || 'Server identity validation failed');
  }

  return {
    ...payload.portal,
    portalCode: payload.portal.portalCode.trim().toUpperCase(),
    baseUrl: normalizeBaseUrl(payload.portal.baseUrl),
    name: payload.portal.name?.trim() || payload.portal.portalCode.trim().toUpperCase()
  };
}

export async function registerDevice(deviceId: string) {
  await smartiflyRequestJson<{ success?: boolean; message?: string }>(
    '/public/device/register',
    {
      method: 'POST',
      body: {
        deviceId,
        mac: buildActivationMac(deviceId),
        brand: 'LG',
        model: 'webOS Emulator',
        platform: 'WEBOS',
        appVersion: 'lg-webos',
        osVersion: getActivationOsVersion()
      }
    }
  );
}

export async function fetchActivationSession(deviceId: string): Promise<DeviceActivationSession> {
  const payload = await smartiflyRequestJson<DeviceActivationSessionPayload>(
    '/public/qr/generate',
    {
      method: 'POST',
      body: {
        licenseKey: 'TRIAL',
        deviceId,
        mac: buildActivationMac(deviceId),
        platform: 'WEBOS',
        brand: 'LG',
        model: 'webOS Emulator',
        appVersion: 'lg-webos',
        osVersion: getActivationOsVersion()
      }
    }
  );

  if (!payload.success || !payload.webLink || !payload.token || !payload.settingsCode) {
    throw new Error('Activation session failed');
  }

  return {
    success: true,
    qrCode: payload.qrCode ?? null,
    webLink: payload.webLink,
    token: payload.token,
    settingsCode: payload.settingsCode,
    expiresIn: payload.expiresIn ?? null
  };
}

export async function checkDeviceActivation(deviceId: string): Promise<DeviceActivationStatus> {
  const searchParams = new URLSearchParams({
    deviceId,
    mac: buildActivationMac(deviceId)
  });

  const payload = await smartiflyRequestJson<DeviceActivationStatusPayload>(
    `/public/device/check?${searchParams.toString()}`,
    { method: 'GET' }
  );

  if (!payload.state) {
    throw new Error(payload.reason || 'Activation status failed');
  }

  return {
    success: payload.success ?? null,
    exists: payload.exists ?? null,
    valid: payload.valid ?? false,
    state: payload.state,
    statusCode: payload.statusCode ?? null,
    reason: payload.reason ?? null,
    license: payload.license ?? null
  };
}

export function createXtreamApi(portalUrl: string) {
  return {
    authenticate: async (username: string, password: string) => {
      const authUrl = new URL('/player_api.php', normalizeBaseUrl(portalUrl));
      authUrl.searchParams.set('username', username);
      authUrl.searchParams.set('password', password);

      const response = await fetch(authUrl.toString(), {
        method: 'GET',
        cache: 'no-store'
      });

      if (!response.ok) {
        let message = `Xtream login failed with HTTP ${response.status}`;

        try {
          const payload = (await response.json()) as { message?: string };
          if (payload.message) {
            message = payload.message;
          }
        } catch {
          // Ignore non-JSON error bodies and keep the HTTP status fallback.
        }

        throw new Error(message);
      }

      const payload = (await response.json()) as XtreamAuthResponse & { message?: string };
      if (!payload.user_info || !payload.server_info) {
        throw new Error(payload.message || 'Xtream login failed');
      }

      return {
        user_info: payload.user_info,
        server_info: payload.server_info
      };
    },
    getLiveCategories: (username: string, password: string) =>
      requestCached(
        buildCatalogCacheKey('live-categories', portalUrl, username),
        CATALOG_CACHE_TTL_MS,
        async () =>
          readArray<XtreamCategory>(
            await requestJson<unknown>(portalUrl, {
              username,
              password,
              action: 'get_live_categories'
            }),
            ['categories', 'live_categories']
          )
      ),
    getVodCategories: (username: string, password: string) =>
      requestCached(
        buildCatalogCacheKey('vod-categories', portalUrl, username),
        CATALOG_CACHE_TTL_MS,
        async () =>
          readArray<XtreamCategory>(
            await requestJson<unknown>(portalUrl, {
              username,
              password,
              action: 'get_vod_categories'
            }),
            ['categories', 'vod_categories']
          )
      ),
    getSeriesCategories: (username: string, password: string) =>
      requestCached(
        buildCatalogCacheKey('series-categories', portalUrl, username),
        CATALOG_CACHE_TTL_MS,
        async () =>
          readArray<XtreamCategory>(
            await requestJson<unknown>(portalUrl, {
              username,
              password,
              action: 'get_series_categories'
            }),
            ['categories', 'series_categories']
          )
      ),
    getLiveStreams: (username: string, password: string, categoryId?: string) =>
      requestCached(
        buildCatalogCacheKey('live-streams', portalUrl, username, categoryId),
        CATALOG_CACHE_TTL_MS,
        async () =>
          readArray<XtreamLiveStream>(
            await requestJson<unknown>(portalUrl, {
              username,
              password,
              action: 'get_live_streams',
              category_id: categoryId
            }),
            ['live_streams', 'channels', 'streams']
          )
      ),
    getVodStreams: (username: string, password: string, categoryId?: string) =>
      requestCached(
        buildCatalogCacheKey('vod-streams', portalUrl, username, categoryId),
        CATALOG_CACHE_TTL_MS,
        async () =>
          readArray<XtreamMovie>(
            await requestJson<unknown>(portalUrl, {
              username,
              password,
              action: 'get_vod_streams',
              category_id: categoryId
            }),
            ['vod_streams', 'movies', 'vod']
          )
      ),
    getSeries: (username: string, password: string, categoryId?: string) =>
      requestCached(
        buildCatalogCacheKey('series', portalUrl, username, categoryId),
        CATALOG_CACHE_TTL_MS,
        async () =>
          readArray<XtreamSeries>(
            await requestJson<unknown>(portalUrl, {
              username,
              password,
              action: 'get_series',
              category_id: categoryId
            }),
            ['series', 'series_list']
          )
      ),
    getMovieInfo: (username: string, password: string, vodId: number) =>
      requestCached(
        buildCatalogCacheKey('movie-info', portalUrl, username, '', vodId),
        DETAILS_CACHE_TTL_MS,
        async () =>
          await requestJson<XtreamMovieInfo>(portalUrl, {
            username,
            password,
            action: 'get_vod_info',
            vod_id: vodId
          })
      ),
    getSeriesInfo: (username: string, password: string, seriesId: number) =>
      requestCached(
        buildCatalogCacheKey('series-info', portalUrl, username, '', seriesId),
        DETAILS_CACHE_TTL_MS,
        async () =>
          await requestJson<XtreamSeriesInfo>(portalUrl, {
            username,
            password,
            action: 'get_series_info',
            series_id: seriesId
          })
      ),
    getShortEpg: async (username: string, password: string, streamId: number, limit = 10) => {
      const response = await requestJson<Record<string, unknown>>(portalUrl, {
        username,
        password,
        action: 'get_short_epg',
        stream_id: streamId,
        limit
      });
      const listings = Array.isArray(response.epg_listings)
        ? (response.epg_listings as XtreamShortEpgListing[])
        : [];

      return listings.map<XtreamShortEpgEntry>((item) => ({
        id: String(item.id ?? `${streamId}-${item.start_timestamp ?? item.start ?? '0'}`),
        title: decodeXtreamBase64(item.title).trim() || 'Live Broadcast',
        description: decodeXtreamBase64(item.description).trim(),
        startTime: Number(item.start_timestamp ?? 0) * 1000,
        endTime: Number(item.stop_timestamp ?? 0) * 1000,
        channelId: String(streamId)
      }));
    },
    getLiveStreamUrl: (username: string, password: string, streamId: number, format = 'ts') => {
      const user = encodeURIComponent(username);
      const pass = encodeURIComponent(password);
      return `${normalizeBaseUrl(portalUrl)}/live/${user}/${pass}/${streamId}.${format}`;
    },
    getVodStreamUrl: (username: string, password: string, streamId: number, extension = 'mkv') => {
      const user = encodeURIComponent(username);
      const pass = encodeURIComponent(password);
      return `${normalizeBaseUrl(portalUrl)}/movie/${user}/${pass}/${streamId}.${extension}`;
    },
    getSeriesStreamUrl: (username: string, password: string, streamId: number, extension = 'mkv') => {
      const user = encodeURIComponent(username);
      const pass = encodeURIComponent(password);
      return `${normalizeBaseUrl(portalUrl)}/series/${user}/${pass}/${streamId}.${extension}`;
    }
  };
}
