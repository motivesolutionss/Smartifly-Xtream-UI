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
  added: string;
  category_id: string;
  custom_sid: string;
  tv_archive: number;
  direct_source: string;
  tv_archive_duration: number;
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
  (import.meta.env.DEV ? 'http://localhost:5000/v1' : 'https://api.xtreamui.duckdns.org/v1');

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

  const response = await fetch(`${API_BASE_URL}/public/portal/validate?code=${encodeURIComponent(normalizedCode)}`, {
    method: 'GET',
    cache: 'no-store'
  });

  const payload = (await response.json()) as PortalValidationPayload;

  if (!response.ok || !payload.success || !payload.portal) {
    throw new Error(payload.message || `Server identity validation failed with HTTP ${response.status}`);
  }

  return {
    ...payload.portal,
    portalCode: payload.portal.portalCode.trim().toUpperCase(),
    baseUrl: normalizeBaseUrl(payload.portal.baseUrl),
    name: payload.portal.name?.trim() || payload.portal.portalCode.trim().toUpperCase()
  };
}

export async function registerDevice(deviceId: string) {
  const response = await fetch(`${API_BASE_URL}/public/device/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      deviceId,
      mac: buildActivationMac(deviceId),
      brand: 'LG',
      model: 'webOS Emulator',
      platform: 'WEBOS',
      appVersion: 'lg-webos',
      osVersion: getActivationOsVersion()
    })
  });

  if (!response.ok) {
    throw new Error(`Device registration failed with HTTP ${response.status}`);
  }
}

export async function fetchActivationSession(deviceId: string): Promise<DeviceActivationSession> {
  const response = await fetch(`${API_BASE_URL}/public/qr/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      licenseKey: 'TRIAL',
      deviceId,
      mac: buildActivationMac(deviceId),
      platform: 'WEBOS',
      brand: 'LG',
      model: 'webOS Emulator',
      appVersion: 'lg-webos',
      osVersion: getActivationOsVersion()
    })
  });

  const payload = (await response.json()) as DeviceActivationSessionPayload;

  if (!response.ok || !payload.success || !payload.webLink || !payload.token || !payload.settingsCode) {
    throw new Error(`Activation session failed${response.ok ? '' : ` with HTTP ${response.status}`}`);
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

  const response = await fetch(`${API_BASE_URL}/public/device/check?${searchParams.toString()}`, {
    method: 'GET',
    cache: 'no-store'
  });

  const payload = (await response.json()) as DeviceActivationStatusPayload;

  if (!response.ok || !payload.state) {
    throw new Error(payload.reason || `Activation status failed with HTTP ${response.status}`);
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
      const response = await fetch(`${API_BASE_URL}/public/xtream/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          portalUrl,
          username,
          password
        })
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

      const payload = (await response.json()) as { success?: boolean; data?: XtreamAuthResponse; message?: string };
      if (!payload.success || !payload.data) {
        throw new Error(payload.message || 'Xtream login failed');
      }

      return payload.data;
    },
    getLiveCategories: (username: string, password: string) =>
      requestJson<unknown>(portalUrl, {
        username,
        password,
        action: 'get_live_categories'
      }).then((data) => readArray<XtreamCategory>(data, ['categories', 'live_categories'])),
    getVodCategories: (username: string, password: string) =>
      requestJson<unknown>(portalUrl, {
        username,
        password,
        action: 'get_vod_categories'
      }).then((data) => readArray<XtreamCategory>(data, ['categories', 'vod_categories'])),
    getSeriesCategories: (username: string, password: string) =>
      requestJson<unknown>(portalUrl, {
        username,
        password,
        action: 'get_series_categories'
      }).then((data) => readArray<XtreamCategory>(data, ['categories', 'series_categories'])),
    getLiveStreams: (username: string, password: string, categoryId?: string) =>
      requestJson<unknown>(portalUrl, {
        username,
        password,
        action: 'get_live_streams',
        category_id: categoryId
      }).then((data) => readArray<XtreamLiveStream>(data, ['live_streams', 'channels', 'streams'])),
    getVodStreams: (username: string, password: string, categoryId?: string) =>
      requestJson<unknown>(portalUrl, {
        username,
        password,
        action: 'get_vod_streams',
        category_id: categoryId
      }).then((data) => readArray<XtreamMovie>(data, ['vod_streams', 'movies', 'vod'])),
    getSeries: (username: string, password: string, categoryId?: string) =>
      requestJson<unknown>(portalUrl, {
        username,
        password,
        action: 'get_series',
        category_id: categoryId
      }).then((data) => readArray<XtreamSeries>(data, ['series', 'series_list'])),
    getMovieInfo: (username: string, password: string, vodId: number) =>
      requestJson<XtreamMovieInfo>(portalUrl, {
        username,
        password,
        action: 'get_vod_info',
        vod_id: vodId
      }),
    getSeriesInfo: (username: string, password: string, seriesId: number) =>
      requestJson<XtreamSeriesInfo>(portalUrl, {
        username,
        password,
        action: 'get_series_info',
        series_id: seriesId
      }),
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
