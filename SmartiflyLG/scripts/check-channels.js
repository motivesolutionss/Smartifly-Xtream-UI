#!/usr/bin/env node

const CHANNELS = [
  {
    name: 'Channel 1',
    url: 'http://203.99.56.34:25461/live/test/1234/1.m3u8'
  },
  {
    name: 'Channel 2',
    url: 'http://203.99.56.34:25461/live/test/1234/2.m3u8'
  },
  {
    name: 'Channel 3',
    url: 'http://203.99.56.34:25461/live/test/1234/3.m3u8'
  },
  {
    name: 'Channel 4',
    url: 'http://203.99.56.34:25461/live/test/1234/4.m3u8'
  }
];

const ROUNDS = 3;
const DELAY_BETWEEN_ROUNDS_MS = 1000;

const userAgent =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function statusMeaning(status) {
  if (status === 200) return 'OK';
  if (status === 403) return 'FORBIDDEN';
  if (status === 404) return 'NOT FOUND';
  if (status === 401) return 'UNAUTHORIZED';
  if (status === 429) return 'RATE LIMITED';
  if (status >= 500) return 'SERVER ERROR';
  return 'OTHER';
}

async function checkChannel(channel, round) {
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
        Range: 'bytes=0-1024'
      }
    });

    // Read a small part of the response so the request actually completes.
    const text = await response.text().catch(() => '');

    const durationMs = Date.now() - startedAt;

    return {
      round,
      channel: channel.name,
      url: channel.url,
      status: response.status,
      statusText: response.statusText,
      meaning: statusMeaning(response.status),
      finalUrl: response.url,
      durationMs,
      contentType: response.headers.get('content-type'),
      contentLength: response.headers.get('content-length'),
      preview: text.slice(0, 80).replace(/\s+/g, ' ')
    };
  } catch (error) {
    const durationMs = Date.now() - startedAt;

    return {
      round,
      channel: channel.name,
      url: channel.url,
      status: null,
      statusText: null,
      meaning: 'REQUEST FAILED',
      finalUrl: null,
      durationMs,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

async function runRound(round) {
  console.log('');
  console.log(`==============================`);
  console.log(`ROUND ${round}`);
  console.log(`==============================`);

  const results = await Promise.all(
    CHANNELS.map((channel) => checkChannel(channel, round))
  );

  for (const result of results) {
    console.log(
      `${result.channel}: ${result.status ?? 'FAILED'} ${result.statusText ?? ''} - ${result.meaning} - ${result.durationMs}ms`
    );

    if (result.error) {
      console.log(`  Error: ${result.error}`);
    }

    if (result.contentType) {
      console.log(`  Content-Type: ${result.contentType}`);
    }

    if (result.contentLength) {
      console.log(`  Content-Length: ${result.contentLength}`);
    }

    if (result.finalUrl && result.finalUrl !== result.url) {
      console.log(`  Final URL: ${result.finalUrl}`);
    }

    if (result.preview) {
      console.log(`  Preview: ${result.preview}`);
    }
  }

  return results;
}

async function main() {
  console.log('Starting simultaneous channel checks...');
  console.log(`Channels: ${CHANNELS.length}`);
  console.log(`Rounds: ${ROUNDS}`);

  const allResults = [];

  for (let round = 1; round <= ROUNDS; round += 1) {
    const roundResults = await runRound(round);
    allResults.push(...roundResults);

    if (round < ROUNDS) {
      await sleep(DELAY_BETWEEN_ROUNDS_MS);
    }
  }

  console.log('');
  console.log('==============================');
  console.log('SUMMARY');
  console.log('==============================');

  for (const channel of CHANNELS) {
    const channelResults = allResults.filter(
      (result) => result.channel === channel.name
    );

    const statuses = channelResults
      .map((result) => result.status ?? 'FAILED')
      .join(' → ');

    console.log(`${channel.name}: ${statuses}`);
  }

  console.log('');
  console.log('Done.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exitCode = 1;
});