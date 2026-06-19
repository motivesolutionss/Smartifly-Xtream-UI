import { writeFile } from 'node:fs/promises';

type JsonRecord = Record<string, unknown>;

type LiveStreamRecord = JsonRecord & {
  name?: string;
  stream_id?: number;
  num?: number;
  stream_icon?: string;
  direct_source?: string;
  epg_channel_id?: string;
};

type LiveCategoryRecord = JsonRecord & {
  category_id?: string | number;
  category_name?: string;
};

type AuthRecord = JsonRecord & {
  user_info?: {
    allowed_output_formats?: string[];
  };
};

type LiveChannelDump = {
  categoryId: string;
  categoryName: string;
  name?: string;
  streamId?: number;
  num?: number;
  stream_icon?: string;
  epg_channel_id?: string;
  direct_source?: string;
  playbackExtensions: string[];
  playbackUrls: Record<string, string>;
};

type Options = {
  portalUrl: string;
  username: string;
  password: string;
  categoryName: string;
  channelQuery: string;
  allLive: boolean;
  outFile?: string;
};

function readArg(name: string) {
  const prefix = `${name}=`;
  const args = process.argv.slice(2);
  const direct = args.find((arg) => arg.startsWith(prefix));
  if (direct) {
    return direct.slice(prefix.length).trim();
  }

  const index = args.findIndex((arg) => arg === name);
  return index >= 0 ? (args[index + 1] ?? '').trim() : '';
}

function getOptions(): Options {
  return {
    portalUrl: readArg('--portal') || process.env.XTREAM_PORTAL_URL || '',
    username: readArg('--username') || process.env.XTREAM_USERNAME || '',
    password: readArg('--password') || process.env.XTREAM_PASSWORD || '',
    categoryName: readArg('--category') || process.env.XTREAM_CATEGORY || 'Documentary',
    channelQuery: readArg('--channel') || process.env.XTREAM_CHANNEL || 'Discovery',
    allLive: readArg('--all-live') === 'true' || process.argv.slice(2).includes('--all-live'),
    outFile: readArg('--out')
  };
}

function assertRequired(value: string, label: string): asserts value {
  if (!value.trim()) {
    throw new Error(`${label} is required`);
  }
}

function normalizeBaseUrl(input: string) {
  let value = input.trim().replace(/\/+$/, '');
  if (!value) {
    throw new Error('Portal URL is required');
  }

  if (!/^https?:\/\//i.test(value)) {
    value = `http://${value}`;
  }

  return value;
}

async function fetchJson<T>(baseUrl: string, params: Record<string, string | number | undefined>) {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') continue;
    searchParams.set(key, String(value));
  }

  const response = await fetch(`${normalizeBaseUrl(baseUrl)}/player_api.php?${searchParams.toString()}`, {
    method: 'GET',
    cache: 'no-store'
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Xtream request failed with HTTP ${response.status}: ${text.slice(0, 300)}`);
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Xtream returned invalid JSON: ${text.slice(0, 300)}`);
  }
}

function readArray<T>(value: unknown, keys: string[]) {
  if (Array.isArray(value)) {
    return value as T[];
  }

  if (!value || typeof value !== 'object') {
    return [];
  }

  const record = value as JsonRecord;
  for (const key of keys) {
    const candidate = record[key];
    if (Array.isArray(candidate)) {
      return candidate as T[];
    }
  }

  return [];
}

function matchText(value: unknown, query: string) {
  return String(value ?? '').toLowerCase().includes(query.toLowerCase());
}

function getAllowedOutputFormats(auth: AuthRecord) {
  const formats = auth.user_info?.allowed_output_formats;
  return Array.isArray(formats) && formats.length > 0
    ? formats.map((format) => String(format).trim()).filter(Boolean)
    : ['m3u8', 'ts', 'rtmp'];
}

function getCandidateExtensions(allowedOutputFormats: string[]) {
  return Array.from(
    new Set([
      ...allowedOutputFormats,
      'm3u8',
      'ts',
      'rtmp',
      'mp4',
      'mkv',
      'm4v',
      'avi',
      'mov',
      'webm'
    ])
  );
}

function buildPlaybackUrls(
  portalUrl: string,
  username: string,
  password: string,
  streamId: number | undefined,
  extensions: string[]
) {
  if (!streamId) {
    return {};
  }

  const base = normalizeBaseUrl(portalUrl);
  const user = encodeURIComponent(username);
  const pass = encodeURIComponent(password);

  return extensions.reduce<Record<string, string>>((acc, extension) => {
    const cleanExtension = String(extension).trim();
    if (!cleanExtension) {
      return acc;
    }

    acc[cleanExtension] = `${base}/live/${user}/${pass}/${streamId}.${cleanExtension}`;
    return acc;
  }, {});
}

function buildReadableTable(channels: LiveChannelDump[]) {
  const lines: string[] = [];
  lines.push('category | name | streamId | formats | url');
  lines.push('--- | --- | --- | --- | ---');

  for (const channel of channels) {
    const formats = channel.playbackExtensions.join(', ');
    const urlPreview =
      channel.playbackUrls.m3u8 ??
      channel.playbackUrls.ts ??
      channel.playbackUrls.rtmp ??
      Object.values(channel.playbackUrls)[0] ??
      '';

    lines.push(
      [
        channel.categoryName || channel.categoryId || '',
        channel.name || '',
        channel.streamId ?? '',
        formats,
        urlPreview
      ]
        .map((value) => String(value).replace(/\|/g, '\\|'))
        .join(' | ')
    );
  }

  return `${lines.join('\n')}\n`;
}

async function main() {
  const options = getOptions();
  assertRequired(options.portalUrl, '--portal / XTREAM_PORTAL_URL');
  assertRequired(options.username, '--username / XTREAM_USERNAME');
  assertRequired(options.password, '--password / XTREAM_PASSWORD');

  const portalUrl = options.portalUrl.trim();
  const username = options.username.trim();
  const password = options.password.trim();
  const categoryName = options.categoryName.trim();
  const channelQuery = options.channelQuery.trim();

  console.log('Xtream dump starting');
  console.log(`portal=${portalUrl}`);
  console.log(`username=${username}`);
  console.log(`category=${categoryName}`);
  console.log(`channel=${channelQuery}`);
  console.log(`allLive=${options.allLive ? 'true' : 'false'}`);

  const auth = await fetchJson<AuthRecord>(portalUrl, {
    username,
    password
  });
  console.log('\n=== AUTH RESPONSE ===');
  console.log(JSON.stringify(auth, null, 2));

  const allowedOutputFormats = getAllowedOutputFormats(auth);
  const candidateExtensions = getCandidateExtensions(allowedOutputFormats);
  console.log('\n=== LIVE PLAYBACK FORMATS ===');
  console.log(JSON.stringify(allowedOutputFormats, null, 2));

  const categoriesPayload = await fetchJson<unknown>(portalUrl, {
    username,
    password,
    action: 'get_live_categories'
  });
  const categories = readArray<LiveCategoryRecord>(categoriesPayload, ['categories', 'live_categories']);
  const selectedCategory =
    categories.find((category) => matchText(category.category_name, categoryName) || matchText(category.category_name, channelQuery)) ??
    categories[0] ??
    null;

  console.log('\n=== LIVE CATEGORIES RESPONSE ===');
  console.log(JSON.stringify(categoriesPayload, null, 2));

  const allStreamsPayload = options.allLive
    ? await fetchJson<unknown>(portalUrl, {
        username,
        password,
        action: 'get_live_streams'
      })
    : null;

  const allLiveStreams = options.allLive
    ? (readArray<LiveStreamRecord>(allStreamsPayload, ['live_streams', 'channels', 'streams']) as Array<
        LiveStreamRecord & {
          categoryId: string;
          categoryName: string;
        }
      >).map((stream) => ({
        ...stream,
        categoryId: String(stream.category_id ?? ''),
        categoryName: String(
          categories.find((category) => String(category.category_id ?? '') === String(stream.category_id ?? ''))
            ?.category_name ?? ''
        )
      }))
    : (await Promise.all(
        categories.map(async (category) => {
          const categoryId = String(category.category_id ?? '').trim();
          if (!categoryId) {
            return [];
          }

          const streamsPayload = await fetchJson<unknown>(portalUrl, {
            username,
            password,
            action: 'get_live_streams',
            category_id: categoryId
          });
          const streams = readArray<LiveStreamRecord>(streamsPayload, ['live_streams', 'channels', 'streams']);
          return streams.map((stream) => ({
            ...stream,
            categoryId,
            categoryName: String(category.category_name ?? '')
          }));
        })
      )).flat();

  if (!selectedCategory) {
    console.log('\nNo live categories returned by the portal.');
    return;
  }

  const categoryId = String(selectedCategory.category_id ?? '');

  const streams = options.allLive
    ? allLiveStreams
    : allLiveStreams.filter((stream) => String(stream.categoryId ?? '') === categoryId);
  const matchedStreams = options.allLive
    ? streams
    : streams.filter((stream) => {
        return (
          matchText(stream.name, channelQuery) ||
          matchText(stream.stream_icon, channelQuery) ||
          matchText(stream.direct_source, channelQuery)
        );
      });

  if (!options.allLive) {
    console.log(`\nSelected category: ${selectedCategory.category_name ?? '(unknown)'} [${categoryId}]`);
  }

  console.log(options.allLive ? '\n=== ALL LIVE STREAMS RESPONSE ===' : '\n=== LIVE STREAMS RESPONSE ===');
  console.log(JSON.stringify(streams, null, 2));

  if (!options.allLive && matchedStreams.length === 0) {
    console.log('\nNo stream matched the channel query in the selected category.');
  }

  if (!options.allLive) {
    console.log('\n=== MATCHED CHANNEL RECORDS ===');
    console.log(JSON.stringify(matchedStreams, null, 2));
  }

  const allLiveChannels: LiveChannelDump[] = allLiveStreams.map((stream) => ({
    categoryId: stream.categoryId,
    categoryName: stream.categoryName,
    name: stream.name,
    streamId: stream.stream_id,
    num: stream.num,
    stream_icon: stream.stream_icon,
    epg_channel_id: stream.epg_channel_id,
    direct_source: stream.direct_source,
    playbackExtensions: candidateExtensions,
    playbackUrls: buildPlaybackUrls(portalUrl, username, password, stream.stream_id, candidateExtensions)
  }));

  console.log('\n=== ALL LIVE CHANNELS COUNT ===');
  console.log(String(allLiveChannels.length));

  const dump = {
    requestedAt: new Date().toISOString(),
    portalUrl,
    username,
    categoryName,
    channelQuery,
    allowedOutputFormats,
    candidateExtensions,
    auth,
    categoriesPayload,
    selectedCategory,
    streamsPayload: streams,
    matchedStreams,
    allLiveChannels
  };

  if (options.outFile) {
    await writeFile(options.outFile, `${JSON.stringify(dump, null, 2)}\n`, 'utf8');
    console.log(`\nWrote raw dump to ${options.outFile}`);
    console.log(`All live channels saved: ${allLiveChannels.length}`);

    const readableFile = options.outFile.replace(/\.json$/i, '-table.txt');
    await writeFile(readableFile, buildReadableTable(allLiveChannels), 'utf8');
    console.log(`Wrote readable table to ${readableFile}`);
  }
}

main().catch((error) => {
  console.error('Xtream dump failed');
  console.error(error);
  process.exit(1);
});
