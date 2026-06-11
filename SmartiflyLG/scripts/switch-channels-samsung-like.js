#!/usr/bin/env node

import http from 'node:http';
import https from 'node:https';

const CHANNELS = {
  1: {
    name: 'Channel 1',
    url: 'http://203.99.56.34:25461/live/test/1234/1.m3u8',
  },
  2: {
    name: 'Channel 2',
    url: 'http://203.99.56.34:25461/live/test/1234/2.m3u8',
  },
  3: {
    name: 'Channel 3',
    url: 'http://203.99.56.34:25461/live/test/1234/3.m3u8',
  },
  4: {
    name: 'Channel 4',
    url: 'http://203.99.56.34:25461/live/test/1234/4.m3u8',
  },
};

const SWITCH_SEQUENCE = [
  1, 2, 3, 2, 1,
  2, 3, 4, 3, 2,
  1, 4, 2, 3, 1,
];

/**
 * Samsung AVPlay path uses a 12s live buffer target in your controller.
 * So this script watches each channel long enough to request several real segments.
 */
const MIN_WATCH_MS = 12000;
const MAX_WATCH_MS = 20000;

/**
 * Pause after closing before opening the next channel.
 */
const RELEASE_PAUSE_MS = 3000;

/**
 * How often to refresh the live playlist while "watching".
 * HLS target duration is around 10–12s in your logs, so 4s is reasonable.
 */
const PLAYLIST_REFRESH_MS = 4000;

/**
 * Set false if you only want playlist checks.
 * Keep true to behave more like real playback.
 */
const DOWNLOAD_SEGMENTS = true;

const MAX_REDIRECTS = 5;

/**
 * This matches the custom header your Samsung AVPlay controller tries to set:
 * SET_HTTP_CUSTOM_HEADER: User-Agent: Smartifly/1.0
 */
const USER_AGENT = 'Smartifly/1.0';

let activeSession = null;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomMs(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

function nowTime() {
  return new Date().toLocaleTimeString();
}

function statusMeaning(status) {
  if (status === 200) return 'OK';
  if (status === 206) return 'PARTIAL CONTENT';
  if (status === 301 || status === 302 || status === 303 || status === 307 || status === 308) {
    return 'REDIRECT';
  }
  if (status === 401) return 'UNAUTHORIZED';
  if (status === 403) return 'FORBIDDEN';
  if (status === 404) return 'NOT FOUND';
  if (status === 429) return 'RATE LIMITED';
  if (status >= 500) return 'SERVER ERROR';
  return 'OTHER';
}

function makeAgent(url) {
  const parsed = new URL(url);

  const options = {
    keepAlive: false,
    maxSockets: 2,
  };

  return parsed.protocol === 'https:'
    ? new https.Agent(options)
    : new http.Agent(options);
}

function buildHeaders({ isPlaylist }) {
  const headers = {
    'User-Agent': USER_AGENT,
    Accept: isPlaylist
      ? 'application/vnd.apple.mpegurl,application/x-mpegURL,*/*'
      : 'video/mp2t,video/*,*/*',
    'Cache-Control': 'no-cache',
    Pragma: 'no-cache',
    Connection: 'close',
  };

  /**
   * Important:
   * No Range header for playlist requests.
   * Samsung AVPlay likely does normal playlist GETs.
   */
  return headers;
}

function requestOnce(url, { isPlaylist }) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const client = parsed.protocol === 'https:' ? https : http;

    const chunks = [];
    const startedAt = Date.now();

    const req = client.request(
      parsed,
      {
        method: 'GET',
        headers: buildHeaders({ isPlaylist }),
        agent: activeSession?.agent,
      },
      (res) => {
        res.on('data', (chunk) => {
          chunks.push(chunk);
        });

        res.on('end', () => {
          const body = Buffer.concat(chunks).toString('utf8');
          const durationMs = Date.now() - startedAt;

          resolve({
            url,
            finalUrl: url,
            status: res.statusCode,
            statusText: res.statusMessage,
            meaning: statusMeaning(res.statusCode),
            durationMs,
            headers: res.headers,
            contentType: res.headers['content-type'] || null,
            contentLength: res.headers['content-length'] || null,
            location: res.headers.location || null,
            body,
            preview: body.slice(0, 120).replace(/\s+/g, ' '),
          });
        });
      }
    );

    req.on('error', reject);

    req.setTimeout(15000, () => {
      req.destroy(new Error('Request timed out'));
    });

    req.end();

    if (activeSession) {
      activeSession.requests.add(req);
      req.on('close', () => activeSession?.requests.delete(req));
    }
  });
}

async function requestWithRedirects(url, { isPlaylist }) {
  let currentUrl = url;

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
    const result = await requestOnce(currentUrl, { isPlaylist });

    const isRedirect =
      result.status === 301 ||
      result.status === 302 ||
      result.status === 303 ||
      result.status === 307 ||
      result.status === 308;

    if (!isRedirect) {
      return {
        ...result,
        finalUrl: currentUrl,
      };
    }

    if (!result.location) {
      return {
        ...result,
        finalUrl: currentUrl,
      };
    }

    currentUrl = new URL(result.location, currentUrl).toString();
  }

  throw new Error(`Too many redirects for ${url}`);
}

function parsePlaylist(text, playlistUrl) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const segments = [];
  let targetDuration = null;
  let mediaSequence = null;

  for (const line of lines) {
    if (line.startsWith('#EXT-X-TARGETDURATION:')) {
      targetDuration = Number(line.slice('#EXT-X-TARGETDURATION:'.length));
      continue;
    }

    if (line.startsWith('#EXT-X-MEDIA-SEQUENCE:')) {
      mediaSequence = Number(line.slice('#EXT-X-MEDIA-SEQUENCE:'.length));
      continue;
    }

    if (line.startsWith('#')) {
      continue;
    }

    try {
      segments.push(new URL(line, playlistUrl).toString());
    } catch {
      segments.push(line);
    }
  }

  return {
    isM3u8: text.startsWith('#EXTM3U'),
    targetDuration,
    mediaSequence,
    segments,
  };
}

async function closeActiveSession() {
  if (!activeSession) return;

  console.log('');
  console.log(`Closing previous stream: ${activeSession.channelName}`);

  for (const req of activeSession.requests) {
    try {
      req.destroy();
    } catch {
      // ignore
    }
  }

  try {
    activeSession.agent.destroy();
  } catch {
    // ignore
  }

  activeSession = null;

  console.log(`Waiting ${(RELEASE_PAUSE_MS / 1000).toFixed(1)}s for server-side release...`);
  await sleep(RELEASE_PAUSE_MS);
}

async function watchChannel(channelNumber, stepNumber) {
  const channel = CHANNELS[channelNumber];

  if (!channel) {
    throw new Error(`Unknown channel number: ${channelNumber}`);
  }

  activeSession = {
    channelName: channel.name,
    agent: makeAgent(channel.url),
    requests: new Set(),
  };

  const watchMs = randomMs(MIN_WATCH_MS, MAX_WATCH_MS);
  const stopAt = Date.now() + watchMs;

  const result = {
    stepNumber,
    time: nowTime(),
    channelNumber,
    channelName: channel.name,
    watchMs,
    playlistAttempts: [],
    segmentAttempts: [],
    error: null,
  };

  const downloadedSegments = new Set();

  try {
    while (Date.now() < stopAt) {
      const playlistResponse = await requestWithRedirects(channel.url, {
        isPlaylist: true,
      });

      result.playlistAttempts.push(playlistResponse);

      if (playlistResponse.status !== 200) {
        break;
      }

      const playlist = parsePlaylist(playlistResponse.body, playlistResponse.finalUrl);

      if (DOWNLOAD_SEGMENTS && playlist.isM3u8 && playlist.segments.length > 0) {
        /**
         * Download only new segments, similar to a live player moving forward.
         * Limit to last 2 segments from current playlist to avoid over-requesting.
         */
        const latestSegments = playlist.segments.slice(-2);

        for (const segmentUrl of latestSegments) {
          if (downloadedSegments.has(segmentUrl)) continue;
          downloadedSegments.add(segmentUrl);

          const segmentResponse = await requestWithRedirects(segmentUrl, {
            isPlaylist: false,
          });

          result.segmentAttempts.push(segmentResponse);

          if (segmentResponse.status === 403) {
            break;
          }
        }
      }

      await sleep(PLAYLIST_REFRESH_MS);
    }

    return result;
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
    return result;
  }
}

function lastItem(items) {
  return items.length > 0 ? items[items.length - 1] : null;
}

function printAttempt(prefix, item) {
  if (!item) {
    console.log(`${prefix}: N/A`);
    return;
  }

  console.log(`${prefix}: ${item.status} ${item.statusText} - ${item.meaning}`);
  console.log(`  Duration: ${item.durationMs}ms`);

  if (item.contentType) {
    console.log(`  Content-Type: ${item.contentType}`);
  }

  if (item.contentLength) {
    console.log(`  Content-Length: ${item.contentLength}`);
  }

  if (item.preview && item.contentType?.includes('mpegurl')) {
    console.log(`  Preview: ${item.preview}`);
  }
}

function printStep(result) {
  console.log('');
  console.log('==============================');
  console.log(`Step ${result.stepNumber} | ${result.time}`);
  console.log(`Opening: ${result.channelName}`);
  console.log(`Watch time: ${(result.watchMs / 1000).toFixed(1)}s`);
  console.log('==============================');

  if (result.error) {
    console.log(`Error: ${result.error}`);
    return;
  }

  console.log(`Playlist requests: ${result.playlistAttempts.length}`);
  console.log(`Segment requests: ${result.segmentAttempts.length}`);

  printAttempt('First playlist response', result.playlistAttempts[0]);
  printAttempt('Last playlist response', lastItem(result.playlistAttempts));

  const first403Playlist = result.playlistAttempts.find((item) => item.status === 403);
  const first403Segment = result.segmentAttempts.find((item) => item.status === 403);

  if (first403Playlist) {
    printAttempt('First playlist 403', first403Playlist);
  }

  if (first403Segment) {
    printAttempt('First segment 403', first403Segment);
  }
}

function printSummary(results) {
  console.log('');
  console.log('==============================');
  console.log('SUMMARY');
  console.log('==============================');

  for (const result of results) {
    const firstPlaylist = result.playlistAttempts[0];
    const lastPlaylist = lastItem(result.playlistAttempts);
    const anyPlaylist403 = result.playlistAttempts.some((item) => item.status === 403);
    const anySegment403 = result.segmentAttempts.some((item) => item.status === 403);

    console.log(
      `Step ${result.stepNumber}: ${result.channelName} | ` +
        `first playlist ${firstPlaylist?.status ?? 'FAILED'} | ` +
        `last playlist ${lastPlaylist?.status ?? 'FAILED'} | ` +
        `segments ${result.segmentAttempts.length} | ` +
        `playlist403 ${anyPlaylist403 ? 'YES' : 'NO'} | ` +
        `segment403 ${anySegment403 ? 'YES' : 'NO'}`
    );
  }

  console.log('');
  console.log('Per-channel first playlist result:');

  for (const channelNumber of Object.keys(CHANNELS)) {
    const channel = CHANNELS[channelNumber];

    const channelResults = results.filter(
      (result) => result.channelNumber === Number(channelNumber)
    );

    const statuses = channelResults
      .map((result) => result.playlistAttempts[0]?.status ?? 'FAILED')
      .join(' → ');

    console.log(`${channel.name}: ${statuses || 'Not tested'}`);
  }
}

async function main() {
  console.log('Starting Samsung-like HLS switching test...');
  console.log('');
  console.log(`User-Agent: ${USER_AGENT}`);
  console.log(`Channels available: ${Object.keys(CHANNELS).length}`);
  console.log(`Switches to perform: ${SWITCH_SEQUENCE.length}`);
  console.log(`Watch time per channel: ${MIN_WATCH_MS / 1000}s - ${MAX_WATCH_MS / 1000}s`);
  console.log(`Release pause after closing: ${RELEASE_PAUSE_MS / 1000}s`);
  console.log(`Playlist refresh interval: ${PLAYLIST_REFRESH_MS / 1000}s`);
  console.log(`Download segments: ${DOWNLOAD_SEGMENTS ? 'yes' : 'no'}`);
  console.log('');
  console.log(`Switch sequence: ${SWITCH_SEQUENCE.join(' → ')}`);

  const results = [];

  for (let index = 0; index < SWITCH_SEQUENCE.length; index += 1) {
    const stepNumber = index + 1;
    const channelNumber = SWITCH_SEQUENCE[index];

    await closeActiveSession();

    const result = await watchChannel(channelNumber, stepNumber);
    results.push(result);

    printStep(result);
  }

  await closeActiveSession();

  printSummary(results);

  console.log('');
  console.log('Done.');
}

main().catch(async (error) => {
  try {
    await closeActiveSession();
  } catch {
    // ignore
  }

  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exitCode = 1;
});