#!/usr/bin/env node

const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Web0S.TV-2024; Linux/SmartTV) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const DEFAULT_DELAY_MS = 800;

function usage() {
  console.log('Usage: npm run probe:switch -- --portal <url> --username <user> --password <pass> --channels 2,3,2');
  console.log('');
  console.log('Options:');
  console.log('  --portal <url>          Xtream portal base URL, example: http://103.120.71.199:25461');
  console.log('  --username <value>      Xtream username');
  console.log('  --password <value>      Xtream password');
  console.log('  --channels <list>       Comma-separated live stream ids, example: 53,54,53');
  console.log('  --format <ext>          Stream extension, default: m3u8');
  console.log('  --delay-ms <ms>         Delay between switch steps, default: 800');
  console.log('  --double-hit            Request the manifest twice per step to emulate old rewrite + hls.js flow');
  console.log('  --head-first            Send HEAD before GET on each step');
  console.log('  --range-none            Do not send a Range header on GET requests');
  console.log('  --user-agent <value>    Override the probe User-Agent');
  console.log('');
  console.log('Example:');
  console.log(
    '  npm run probe:switch -- --portal http://103.120.71.199:25461 --username test --password 1234 --channels 53,54,53'
  );
}

function parseArgs(argv) {
  const options = {
    portal: '',
    username: '',
    password: '',
    channels: [],
    format: 'm3u8',
    delayMs: DEFAULT_DELAY_MS,
    doubleHit: false,
    headFirst: false,
    useRange: true,
    userAgent: DEFAULT_USER_AGENT
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    switch (arg) {
      case '--portal':
        options.portal = argv[++index] ?? '';
        break;
      case '--username':
        options.username = argv[++index] ?? '';
        break;
      case '--password':
        options.password = argv[++index] ?? '';
        break;
      case '--channels':
        options.channels = String(argv[++index] ?? '')
          .split(',')
          .map((value) => Number(value.trim()))
          .filter((value) => Number.isInteger(value) && value > 0);
        break;
      case '--format':
        options.format = String(argv[++index] ?? 'm3u8').trim() || 'm3u8';
        break;
      case '--delay-ms':
        options.delayMs = Number(argv[++index] ?? DEFAULT_DELAY_MS);
        break;
      case '--double-hit':
        options.doubleHit = true;
        break;
      case '--head-first':
        options.headFirst = true;
        break;
      case '--range-none':
        options.useRange = false;
        break;
      case '--user-agent':
        options.userAgent = argv[++index] ?? DEFAULT_USER_AGENT;
        break;
      case '--help':
      case '-h':
        usage();
        process.exit(0);
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function validateOptions(options) {
  if (!options.portal || !options.username || !options.password || options.channels.length === 0) {
    usage();
    throw new Error('Missing required arguments');
  }

  if (!Number.isFinite(options.delayMs) || options.delayMs < 0) {
    throw new Error(`Invalid --delay-ms value: ${options.delayMs}`);
  }
}

function normalizeBaseUrl(url) {
  return url.replace(/\/+$/, '');
}

function buildStreamUrl({ portal, username, password, streamId, format }) {
  return `${normalizeBaseUrl(portal)}/live/${encodeURIComponent(username)}/${encodeURIComponent(password)}/${streamId}.${format}`;
}

function waitForMs(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function summarizeHeaders(headers) {
  const interestingKeys = [
    'content-type',
    'content-length',
    'cache-control',
    'server',
    'location',
    'date',
    'etag',
    'last-modified',
    'access-control-allow-origin'
  ];

  return Object.fromEntries(
    interestingKeys
      .map((key) => [key, headers.get(key)])
      .filter(([, value]) => typeof value === 'string' && value.length > 0)
  );
}

function buildHeaders({ userAgent, useRange }) {
  return {
    'User-Agent': userAgent,
    Accept: 'application/vnd.apple.mpegurl,application/x-mpegURL,video/mp2t,video/*,*/*;q=0.8',
    'Cache-Control': 'no-cache',
    Pragma: 'no-cache',
    ...(useRange ? { Range: 'bytes=0-4095' } : {})
  };
}

async function requestTrace(url, method, options) {
  const startedAt = Date.now();
  let response = null;
  let error = null;

  try {
    response = await fetch(url, {
      method,
      redirect: 'follow',
      cache: 'no-store',
      headers: buildHeaders(options)
    });
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }

  const durationMs = Date.now() - startedAt;
  return {
    method,
    requestedUrl: url,
    finalUrl: response?.url || url,
    status: response?.status ?? null,
    ok: response?.ok ?? false,
    statusText: response?.statusText ?? null,
    redirected: Boolean(response && response.url && response.url !== url),
    durationMs,
    headers: response ? summarizeHeaders(response.headers) : {},
    error
  };
}

function printStepHeader(step, totalSteps, streamId, url) {
  console.log('');
  console.log(`== Step ${step}/${totalSteps} | stream ${streamId} ==`);
  console.log(url);
}

function printTrace(label, trace) {
  console.log(`${label}: ${trace.method} ${trace.status ?? 'ERR'} ${trace.statusText ?? ''}`.trim());
  console.log(
    JSON.stringify(
      {
        requestedUrl: trace.requestedUrl,
        finalUrl: trace.finalUrl,
        ok: trace.ok,
        redirected: trace.redirected,
        durationMs: trace.durationMs,
        headers: trace.headers,
        error: trace.error
      },
      null,
      2
    )
  );
}

async function run() {
  const options = parseArgs(process.argv.slice(2));
  validateOptions(options);

  const summary = [];
  console.log('Live switch probe starting...');
  console.log(
    JSON.stringify(
      {
        portal: normalizeBaseUrl(options.portal),
        channels: options.channels,
        format: options.format,
        delayMs: options.delayMs,
        doubleHit: options.doubleHit,
        headFirst: options.headFirst,
        useRange: options.useRange
      },
      null,
      2
    )
  );

  for (let index = 0; index < options.channels.length; index += 1) {
    const streamId = options.channels[index];
    const streamUrl = buildStreamUrl({
      portal: options.portal,
      username: options.username,
      password: options.password,
      streamId,
      format: options.format
    });

    printStepHeader(index + 1, options.channels.length, streamId, streamUrl);

    const stepSummary = {
      step: index + 1,
      streamId,
      streamUrl,
      traces: []
    };

    if (options.headFirst) {
      const headTrace = await requestTrace(streamUrl, 'HEAD', options);
      stepSummary.traces.push({ label: 'head', ...headTrace });
      printTrace('head', headTrace);
    }

    const getTrace = await requestTrace(streamUrl, 'GET', options);
    stepSummary.traces.push({ label: 'get-1', ...getTrace });
    printTrace('get-1', getTrace);

    if (options.doubleHit) {
      const secondTrace = await requestTrace(streamUrl, 'GET', options);
      stepSummary.traces.push({ label: 'get-2', ...secondTrace });
      printTrace('get-2', secondTrace);
    }

    summary.push(stepSummary);

    if (index < options.channels.length - 1 && options.delayMs > 0) {
      console.log(`waiting ${options.delayMs}ms before next switch...`);
      await waitForMs(options.delayMs);
    }
  }

  console.log('');
  console.log('== Summary ==');
  console.log(
    JSON.stringify(
      summary.map((step) => ({
        step: step.step,
        streamId: step.streamId,
        results: step.traces.map((trace) => ({
          label: trace.label,
          status: trace.status,
          ok: trace.ok,
          durationMs: trace.durationMs,
          redirected: trace.redirected,
          finalUrl: trace.finalUrl,
          error: trace.error
        }))
      })),
      null,
      2
    )
  );
}

run().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exitCode = 1;
});
