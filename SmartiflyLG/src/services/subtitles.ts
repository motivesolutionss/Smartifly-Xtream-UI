export type ExternalSubtitleTrack = {
  id: string;
  label: string;
  language: string;
  url: string;
  format: 'vtt' | 'srt' | 'unknown';
};

function safeTrim(value: unknown) {
  if (value === undefined || value === null) {
    return '';
  }

  return String(value).trim();
}

function normalizeBaseUrl(input: string) {
  let value = safeTrim(input).replace(/\/+$/, '');
  if (!value) {
    return '';
  }

  if (!/^https?:\/\//i.test(value)) {
    value = `http://${value}`;
  }

  return value;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function readSubtitleCollection(value: unknown): unknown[] {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return [];
    }

    if ((trimmed.startsWith('[') && trimmed.endsWith(']')) || (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
      try {
        return readSubtitleCollection(JSON.parse(trimmed));
      } catch {
        return [trimmed];
      }
    }

    return [trimmed];
  }

  if (isPlainObject(value)) {
    return Object.keys(value).map((key) => {
      const entry = value[key];
      if (isPlainObject(entry)) {
        return {
          id: key,
          ...entry
        };
      }

      return {
        id: key,
        url: entry
      };
    });
  }

  return [];
}

function getFormat(url: string, explicitFormat?: string) {
  const normalizedFormat = safeTrim(explicitFormat).toLowerCase();
  if (normalizedFormat === 'vtt' || normalizedFormat === 'webvtt') {
    return 'vtt' as const;
  }
  if (normalizedFormat === 'srt') {
    return 'srt' as const;
  }

  const cleanUrl = url.split('?')[0].toLowerCase();
  if (cleanUrl.endsWith('.vtt')) {
    return 'vtt' as const;
  }
  if (cleanUrl.endsWith('.srt')) {
    return 'srt' as const;
  }

  return 'unknown' as const;
}

function toAbsoluteUrl(baseUrl: string, rawUrl: string) {
  const trimmed = safeTrim(rawUrl);
  if (!trimmed) {
    return '';
  }

  if (/^(data|blob):/i.test(trimmed) || /^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  try {
    return new URL(trimmed, `${normalizeBaseUrl(baseUrl)}/`).toString();
  } catch {
    return trimmed;
  }
}

function normalizeTrack(baseUrl: string, value: unknown, index: number): ExternalSubtitleTrack | null {
  if (typeof value === 'string') {
    const url = toAbsoluteUrl(baseUrl, value);
    if (!url) {
      return null;
    }

    return {
      id: `subtitle-${index}`,
      label: `Subtitle ${index + 1}`,
      language: '',
      url,
      format: getFormat(url)
    };
  }

  if (!isPlainObject(value)) {
    return null;
  }

  const url = toAbsoluteUrl(
    baseUrl,
    safeTrim(value.url) ||
      safeTrim(value.file) ||
      safeTrim(value.path) ||
      safeTrim(value.src) ||
      safeTrim(value.location) ||
      safeTrim(value.download)
  );

  if (!url) {
    return null;
  }

  const language =
    safeTrim(value.lang) ||
    safeTrim(value.language) ||
    safeTrim(value.code) ||
    safeTrim(value.iso) ||
    '';

  const label =
    safeTrim(value.label) ||
    safeTrim(value.title) ||
    safeTrim(value.name) ||
    language.toUpperCase() ||
    `Subtitle ${index + 1}`;

  return {
    id: safeTrim(value.id) || `subtitle-${index}`,
    label,
    language,
    url,
    format: getFormat(url, safeTrim(value.format) || safeTrim(value.ext) || safeTrim(value.type))
  };
}

export function extractSubtitleTracks(baseUrl: string, payload: unknown, fallback: ExternalSubtitleTrack[] = []) {
  const sources: unknown[] = [];
  const root = isPlainObject(payload) ? payload : {};
  const info = isPlainObject(root.info) ? root.info : {};
  const movieData = isPlainObject(root.movie_data) ? root.movie_data : {};

  [
    root.subtitles,
    root.subtitle,
    root.subtitle_tracks,
    root.subtitleTracks,
    info.subtitles,
    info.subtitle,
    info.subtitle_tracks,
    info.subtitleTracks,
    movieData.subtitles,
    movieData.subtitle,
    movieData.subtitle_tracks,
    movieData.subtitleTracks
  ].forEach((entry) => {
    sources.push.apply(sources, readSubtitleCollection(entry));
  });

  const normalized: ExternalSubtitleTrack[] = [];
  const seen = Object.create(null) as Record<string, boolean>;

  for (let i = 0; i < sources.length; i++) {
    const track = normalizeTrack(baseUrl, sources[i], i);
    if (!track) {
      continue;
    }

    const dedupeKey = `${track.url}::${track.language}::${track.label}`;
    if (seen[dedupeKey]) {
      continue;
    }
    seen[dedupeKey] = true;
    normalized.push(track);
  }

  return normalized.length > 0 ? normalized : fallback;
}

function normalizeCueTimes(value: string) {
  const normalized = value.replace(/,/g, '.').trim();
  const parts = normalized.split(':');

  if (parts.length === 2) {
    return `00:${parts[0]}:${parts[1]}`;
  }

  return normalized;
}

export function convertSrtToVtt(srt: string) {
  const body = safeTrim(srt).replace(/\r+/g, '');
  if (!body) {
    return 'WEBVTT\n\n';
  }

  const converted = body.replace(
    /(\d{2}:\d{2}:\d{2}[,.]\d{1,3}|\d{1,2}:\d{2}[,.]\d{1,3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,.]\d{1,3}|\d{1,2}:\d{2}[,.]\d{1,3})/g,
    (_, start, end) => `${normalizeCueTimes(start)} --> ${normalizeCueTimes(end)}`
  );

  return `WEBVTT\n\n${converted}\n`;
}
