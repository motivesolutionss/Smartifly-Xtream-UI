#!/usr/bin/env node

import http from 'node:http';
import https from 'node:https';

const CHANNELS = {
  1: {
    name: 'Channel 1',
    url: 'http://203.99.56.34:25461/live/test/1234/1.m3u8'
  },
  2: {
    name: 'Channel 2',
    url: 'http://203.99.56.34:25461/live/test/1234/2.m3u8'
  },
  3: {
    name: 'Channel 3',
    url: 'http://203.99.56.34:25461/live/test/1234/3.m3u8'
  },
  4: {
    name: 'Channel 4',
    url: 'http://203.99.56.34:25461/live/test/1234/4.m3u8'
  }
};

const SWITCH_SEQUENCE = [
  1, 2, 3, 2, 1,
  2, 3, 4, 3, 2,
  1, 4, 2, 3, 1
];

const MIN_WATCH_MS = 5000;
const MAX_WATCH_MS = 12000;

const RELEASE_PAUSE_MS = 3000;

const PLAYLIST_RANGE = 'bytes=0-4096';
const SEGMENT_RANGE = 'bytes=0-4096';

const PROBE_FIRST_SEGMENT = true;

const MAX_REDIRECTS = 5;

const userAgent =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36';

let activeStream = null;

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
  if (status === 301) return 'REDIRECT';
  if (status === 302) return 'REDIRECT';
  if (status === 401) return 'UNAUTHORIZED';
  if (status === 403) return 'FORBIDDEN';
  if (status === 404) return 'NOT FOUND';
  if (status === 429) return 'RATE LIMITED';
  if (status >= 500) return 'SERVER ERROR';
  return 'OTHER';
}

function buildHeaders(rangeValue) {
  return {
    'User-Agent': userAgent,
    Accept: 'application/vnd.apple.mpegurl,application/x-mpegURL,video/mp2t,video/*,*/*;q=0.8',
    'Cache-Control': 'no-cache',
    Pragma: 'no-cache',
    Range: rangeValue,
    Connection: 'close'
  };
}

function makeAgent(url) {
  const parsed = new URL(url);

  const options = {
    keepAlive: false,
    maxSockets: 1
  };

  if (parsed.protocol === 'https:') {
    return new https.Agent(options);
  }

  return new http.Agent(options);
}

function requestOnce(url, rangeValue, agent) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const client = parsed.protocol === 'https:' ? https : http;

    const chunks = [];
    const startedAt = Date.now();

    const req = client.request(
      parsed,
      {
        method: 'GET',
        headers: buildHeaders(rangeValue),
        agent
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
            preview: body.slice(0, 120).replace(/\s+/g, ' '),
            body
          });
        });
      }
    );

    req.on('error', reject);

    req.setTimeout(10000, () => {
      req.destroy(new Error('Request timed out'));
    });

    req.end();

    if (activeStream) {
      activeStream.requests.push(req);
    }
  });
}

async function requestWithRedirects(url, rangeValue, label, agent) {
  let currentUrl = url;

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
    const result = await requestOnce(currentUrl, rangeValue, agent);

    const isRedirect =
      result.status === 301 ||
      result.status === 302 ||
      result.status === 303 ||
      result.status === 307 ||
      result.status === 308;

    if (!isRedirect) {
      return {
        label,
        ...result,
        finalUrl: currentUrl
      };
    }

    if (!result.location) {
      return {
        label,
        ...result,
        finalUrl: currentUrl
      };
    }

    currentUrl = new URL(result.location, currentUrl).toString();
  }

  throw new Error(`Too many redirects for ${url}`);
}

function findFirstSegmentUrl(playlistText, playlistUrl) {
  const lines = playlistText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    if (line.startsWith('#')) {
      continue;
    }

    try {
      return new URL(line, playlistUrl).toString();
    } catch {
      return line;
    }
  }

  return null;
}

async function closeActiveStream() {
  if (!activeStream) {
    return;
  }

  console.log('');
  console.log(`Closing previous stream: ${activeStream.channelName}`);

  for (const req of activeStream.requests) {
    try {
      req.destroy();
    } catch {
      // ignore
    }
  }

  try {
    activeStream.agent.destroy();
  } catch {
    // ignore
  }

  activeStream = null;

  console.log(`Waiting ${(RELEASE_PAUSE_MS / 1000).toFixed(1)}s for server-side release...`);
  await sleep(RELEASE_PAUSE_MS);
}

async function openChannel(channelNumber, stepNumber) {
  const channel = CHANNELS[channelNumber];

  if (!channel) {
    throw new Error(`Unknown channel number: ${channelNumber}`);
  }

  const agent = makeAgent(channel.url);

  activeStream = {
    channelName: channel.name,
    agent,
    requests: []
  };

  const result = {
    stepNumber,
    time: nowTime(),
    channelNumber,
    channelName: channel.name,
    playlist: null,
    segment: null,
    error: null
  };

  try {
    const playlistResult = await requestWithRedirects(
      channel.url,
      PLAYLIST_RANGE,
      'playlist',
      agent
    );

    result.playlist = playlistResult;

    if (
      PROBE_FIRST_SEGMENT &&
      playlistResult.status === 200 &&
      playlistResult.body &&
      playlistResult.body.startsWith('#EXTM3U')
    ) {
      const segmentUrl = findFirstSegmentUrl(
        playlistResult.body,
        playlistResult.finalUrl
      );

      if (segmentUrl) {
        const segmentResult = await requestWithRedirects(
          segmentUrl,
          SEGMENT_RANGE,
          'first segment',
          agent
        );

        result.segment = segmentResult;
      }
    }

    return result;
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
    return result;
  }
}

function printFetchResult(title, item) {
  if (!item) return;

  console.log(`${title}: ${item.status} ${item.statusText} - ${item.meaning}`);
  console.log(`  Duration: ${item.durationMs}ms`);

  if (item.contentType) {
    console.log(`  Content-Type: ${item.contentType}`);
  }

  if (item.contentLength) {
    console.log(`  Content-Length: ${item.contentLength}`);
  }

  if (item.finalUrl && item.finalUrl !== item.url) {
    console.log(`  Final URL: ${item.finalUrl}`);
  }

  if (item.preview) {
    console.log(`  Preview: ${item.preview}`);
  }
}

function printStep(result) {
  console.log('');
  console.log('==============================');
  console.log(`Step ${result.stepNumber} | ${result.time}`);
  console.log(`Opening: ${result.channelName}`);
  console.log('==============================');

  if (result.error) {
    console.log(`Error: ${result.error}`);
    return;
  }

  printFetchResult('Playlist response', result.playlist);
  printFetchResult('First segment response', result.segment);
}

function printSummary(results) {
  console.log('');
  console.log('==============================');
  console.log('SUMMARY');
  console.log('==============================');

  for (const result of results) {
    const playlistStatus = result.playlist?.status ?? 'FAILED';
    const playlistMeaning = result.playlist?.meaning ?? result.error ?? 'UNKNOWN';

    const segmentStatus = result.segment?.status ?? 'N/A';
    const segmentMeaning = result.segment?.meaning ?? 'N/A';

    console.log(
      `Step ${result.stepNumber}: ${result.channelName} | playlist ${playlistStatus} ${playlistMeaning} | segment ${segmentStatus} ${segmentMeaning}`
    );
  }

  console.log('');
  console.log('Per-channel playlist result:');

  for (const channelNumber of Object.keys(CHANNELS)) {
    const channel = CHANNELS[channelNumber];

    const channelResults = results.filter(
      (result) => result.channelNumber === Number(channelNumber)
    );

    const statuses = channelResults
      .map((result) => result.playlist?.status ?? 'FAILED')
      .join(' → ');

    console.log(`${channel.name}: ${statuses || 'Not tested'}`);
  }
}

async function main() {
  console.log('Starting realistic channel switching test with stream release...');
  console.log('');
  console.log(`Channels available: ${Object.keys(CHANNELS).length}`);
  console.log(`Switches to perform: ${SWITCH_SEQUENCE.length}`);
  console.log(`Watch time per channel: ${MIN_WATCH_MS / 1000}s - ${MAX_WATCH_MS / 1000}s`);
  console.log(`Release pause after closing: ${RELEASE_PAUSE_MS / 1000}s`);
  console.log(`Probe first segment: ${PROBE_FIRST_SEGMENT ? 'yes' : 'no'}`);
  console.log('');
  console.log(`Switch sequence: ${SWITCH_SEQUENCE.join(' → ')}`);

  const results = [];

  for (let index = 0; index < SWITCH_SEQUENCE.length; index += 1) {
    const stepNumber = index + 1;
    const channelNumber = SWITCH_SEQUENCE[index];

    await closeActiveStream();

    const result = await openChannel(channelNumber, stepNumber);
    results.push(result);

    printStep(result);

    if (index < SWITCH_SEQUENCE.length - 1) {
      const watchMs = randomMs(MIN_WATCH_MS, MAX_WATCH_MS);
      console.log('');
      console.log(`Watching ${result.channelName} for ${(watchMs / 1000).toFixed(1)}s...`);
      await sleep(watchMs);
    }
  }

  await closeActiveStream();

  printSummary(results);

  console.log('');
  console.log('Done.');
}

main().catch(async (error) => {
  try {
    await closeActiveStream();
  } catch {
    // ignore
  }

  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exitCode = 1;
});