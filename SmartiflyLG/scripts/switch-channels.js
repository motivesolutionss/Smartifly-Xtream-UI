#!/usr/bin/env node

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

/**
 * This sequence simulates a user switching channels back and forth.
 *
 * You can change this sequence however you want.
 */
const SWITCH_SEQUENCE = [
  1, 2, 3, 2, 1,
  2, 3, 4, 3, 2,
  1, 4, 2, 3, 1
];

/**
 * Human-like pause between switches.
 * The script will wait randomly between MIN and MAX.
 */
const MIN_PAUSE_MS = 3000;  // 3 seconds
const MAX_PAUSE_MS = 8000;  // 8 seconds

const userAgent =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomPauseMs() {
  return Math.floor(
    Math.random() * (MAX_PAUSE_MS - MIN_PAUSE_MS + 1) + MIN_PAUSE_MS
  );
}

function statusMeaning(status) {
  if (status === 200) return 'OK';
  if (status === 403) return 'FORBIDDEN';
  if (status === 401) return 'UNAUTHORIZED';
  if (status === 404) return 'NOT FOUND';
  if (status === 429) return 'RATE LIMITED';
  if (status >= 500) return 'SERVER ERROR';
  return 'OTHER';
}

function nowTime() {
  return new Date().toLocaleTimeString();
}

async function requestChannel(channelNumber, stepNumber) {
  const channel = CHANNELS[channelNumber];

  if (!channel) {
    throw new Error(`Unknown channel number: ${channelNumber}`);
  }

  const startedAt = Date.now();

  try {
    const response = await fetch(channel.url, {
      method: 'GET',
      redirect: 'follow',
      cache: 'no-store',
      headers: {
        'User-Agent': userAgent,
        Accept: 'application/vnd.apple.mpegurl,application/x-mpegURL,*/*',
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',

        /**
         * Small range request.
         * We only need enough data to confirm if playlist is allowed.
         */
        Range: 'bytes=0-2048'
      }
    });

    const body = await response.text().catch(() => '');
    const durationMs = Date.now() - startedAt;

    return {
      stepNumber,
      time: nowTime(),
      channelNumber,
      channelName: channel.name,
      url: channel.url,
      status: response.status,
      statusText: response.statusText,
      meaning: statusMeaning(response.status),
      durationMs,
      contentType: response.headers.get('content-type'),
      contentLength: response.headers.get('content-length'),
      finalUrl: response.url,
      preview: body.slice(0, 100).replace(/\s+/g, ' ')
    };
  } catch (error) {
    const durationMs = Date.now() - startedAt;

    return {
      stepNumber,
      time: nowTime(),
      channelNumber,
      channelName: channel.name,
      url: channel.url,
      status: null,
      statusText: null,
      meaning: 'REQUEST FAILED',
      durationMs,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

function printResult(result) {
  console.log('');
  console.log(`Step ${result.stepNumber} | ${result.time}`);
  console.log(`Switched to: ${result.channelName}`);
  console.log(
    `Response: ${result.status ?? 'FAILED'} ${result.statusText ?? ''} - ${result.meaning}`
  );
  console.log(`Duration: ${result.durationMs}ms`);

  if (result.contentType) {
    console.log(`Content-Type: ${result.contentType}`);
  }

  if (result.contentLength) {
    console.log(`Content-Length: ${result.contentLength}`);
  }

  if (result.finalUrl && result.finalUrl !== result.url) {
    console.log(`Final URL: ${result.finalUrl}`);
  }

  if (result.preview) {
    console.log(`Preview: ${result.preview}`);
  }

  if (result.error) {
    console.log(`Error: ${result.error}`);
  }
}

function printSummary(results) {
  console.log('');
  console.log('==============================');
  console.log('SUMMARY');
  console.log('==============================');

  for (const result of results) {
    console.log(
      `Step ${result.stepNumber}: ${result.channelName} → ${result.status ?? 'FAILED'} ${result.meaning}`
    );
  }

  console.log('');
  console.log('Per-channel result:');

  for (const channelNumber of Object.keys(CHANNELS)) {
    const channel = CHANNELS[channelNumber];

    const channelResults = results.filter(
      (result) => result.channelNumber === Number(channelNumber)
    );

    const statuses = channelResults
      .map((result) => result.status ?? 'FAILED')
      .join(' → ');

    console.log(`${channel.name}: ${statuses || 'Not tested'}`);
  }
}

async function main() {
  console.log('Starting realistic channel switching test...');
  console.log('');
  console.log(`Channels available: ${Object.keys(CHANNELS).length}`);
  console.log(`Switches to perform: ${SWITCH_SEQUENCE.length}`);
  console.log(`Pause between switches: ${MIN_PAUSE_MS / 1000}s - ${MAX_PAUSE_MS / 1000}s`);
  console.log('');
  console.log(`Switch sequence: ${SWITCH_SEQUENCE.join(' → ')}`);

  const results = [];

  for (let index = 0; index < SWITCH_SEQUENCE.length; index += 1) {
    const stepNumber = index + 1;
    const channelNumber = SWITCH_SEQUENCE[index];

    const result = await requestChannel(channelNumber, stepNumber);
    results.push(result);

    printResult(result);

    if (index < SWITCH_SEQUENCE.length - 1) {
      const pause = randomPauseMs();
      console.log(`Waiting ${(pause / 1000).toFixed(1)} seconds before next switch...`);
      await sleep(pause);
    }
  }

  printSummary(results);

  console.log('');
  console.log('Done.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exitCode = 1;
});