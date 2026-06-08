import { createHash } from 'node:crypto';
import { createReadStream, promises as fs, readFileSync } from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { URL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serviceRoot = path.resolve(__dirname, '..');
const workspaceRoot = path.resolve(serviceRoot, '..');
const localHlsScriptPath = path.join(workspaceRoot, 'SmartiflyLG', 'node_modules', 'hls.js', 'dist', 'hls.min.js');

function loadDotEnv(filePath) {
  let raw;
  try {
    raw = readFileSync(filePath, 'utf8');
  } catch {
    return;
  }

  for (const line of raw.split(/\r?\n/u)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const equalIndex = trimmed.indexOf('=');
    if (equalIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, equalIndex).trim();
    const value = trimmed.slice(equalIndex + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function ensureNumber(value, fallback) {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

loadDotEnv(path.join(serviceRoot, '.env'));

const config = {
  host: process.env.HOST || '0.0.0.0',
  port: ensureNumber(process.env.PORT, 8090),
  ffmpegPath: process.env.FFMPEG_PATH || 'ffmpeg',
  outputRoot: path.resolve(serviceRoot, process.env.OUTPUT_ROOT || './streams'),
  idleTimeoutMs: ensureNumber(process.env.STREAM_IDLE_TIMEOUT_MS, 120_000),
  hlsSegmentTime: ensureNumber(process.env.HLS_SEGMENT_TIME, 4),
  hlsListSize: ensureNumber(process.env.HLS_LIST_SIZE, 6)
};

const browserLikeUserAgent =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36';
const upstreamProxyPrefix = '/upstream';

const validModes = new Set(['copy', 'audio', 'full', 'staged']);
const activeStreams = new Map();

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/gu, (char) => {
    switch (char) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      case "'":
        return '&#39;';
      default:
        return char;
    }
  });
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

function json(res, statusCode, body) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store'
  });
  res.end(JSON.stringify(body, null, 2));
}

function text(res, statusCode, body) {
  res.writeHead(statusCode, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store'
  });
  res.end(body);
}

function html(res, statusCode, body) {
  res.writeHead(statusCode, {
    'Content-Type': 'text/html; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store'
  });
  res.end(body);
}

function buildStreamId(sourceUrl, mode) {
  return createHash('sha1').update(`${mode}:${sourceUrl}`).digest('hex');
}

function buildPlaylistUrl(req, streamId) {
  const hostHeader = req.headers.host || `localhost:${config.port}`;
  const protocol = req.headers['x-forwarded-proto'] || 'http';
  return `${protocol}://${hostHeader}/streams/${streamId}/output.m3u8`;
}

function buildOrigin(req) {
  const hostHeader = req.headers.host || `localhost:${config.port}`;
  const protocol = req.headers['x-forwarded-proto'] || 'http';
  return `${protocol}://${hostHeader}`;
}

function buildFfmpegArgs({ sourceUrl, outputDir, mode }) {
  const segmentPattern = path.join(outputDir, 'segment_%06d.ts');
  const playlistPath = path.join(outputDir, 'output.m3u8');
  const gopSize = config.hlsSegmentTime * 25;
  const args = [
    '-hide_banner',
    '-loglevel',
    'warning',
    '-y',
    '-fflags',
    '+genpts+discardcorrupt',
    '-err_detect',
    'ignore_err',
    '-analyzeduration',
    '15M',
    '-probesize',
    '15M',
    '-user_agent',
    browserLikeUserAgent,
    '-headers',
    'Accept: application/vnd.apple.mpegurl,application/x-mpegURL,video/mp2t,video/*,*/*;q=0.8\r\nCache-Control: no-cache\r\nPragma: no-cache',
    '-reconnect',
    '1',
    '-reconnect_streamed',
    '1',
    '-reconnect_at_eof',
    '1',
    '-reconnect_on_network_error',
    '1',
    '-reconnect_on_http_error',
    '4xx,5xx',
    '-rw_timeout',
    '15000000',
    '-i',
    sourceUrl,
    '-sn',
    '-dn'
  ];

  if (mode === 'copy') {
    args.push('-c:v', 'copy', '-c:a', 'copy');
  } else if (mode === 'audio') {
    args.push('-map', '0:v:0', '-map', '0:a:0?');
    args.push(
      '-c:v',
      'libx264',
      '-preset',
      'veryfast',
      '-tune',
      'zerolatency',
      '-profile:v',
      'main',
      '-level',
      '4.0',
      '-vf',
      'fps=25,format=yuv420p',
      '-pix_fmt',
      'yuv420p',
      '-r',
      '25',
      '-fps_mode',
      'cfr',
      '-g',
      String(gopSize),
      '-keyint_min',
      String(gopSize),
      '-sc_threshold',
      '0',
      '-force_key_frames',
      `expr:gte(t,n_forced*${config.hlsSegmentTime})`
    );
    args.push(
      '-c:a',
      'aac',
      '-b:a',
      '128k',
      '-ar',
      '48000',
      '-ac',
      '2',
      '-af',
      'aresample=async=1:first_pts=0'
    );
  } else {
    args.push('-map', '0:v:0', '-map', '0:a:0?');
    args.push(
      '-c:v',
      'libx264',
      '-preset',
      'veryfast',
      '-tune',
      'zerolatency',
      '-profile:v',
      'main',
      '-level',
      '4.0',
      '-vf',
      'fps=25,format=yuv420p',
      '-pix_fmt',
      'yuv420p',
      '-r',
      '25',
      '-fps_mode',
      'cfr',
      '-g',
      String(gopSize),
      '-keyint_min',
      String(gopSize),
      '-sc_threshold',
      '0',
      '-force_key_frames',
      `expr:gte(t,n_forced*${config.hlsSegmentTime})`
    );
    args.push(
      '-c:a',
      'aac',
      '-b:a',
      '128k',
      '-ar',
      '48000',
      '-ac',
      '2',
      '-af',
      'aresample=async=1:first_pts=0'
    );
  }

  args.push(
    '-max_interleave_delta',
    '0',
    '-muxdelay',
    '0',
    '-muxpreload',
    '0',
    '-avoid_negative_ts',
    'make_zero',
    '-start_at_zero',
    '-f',
    'hls',
    '-hls_time',
    String(config.hlsSegmentTime),
    '-hls_list_size',
    String(config.hlsListSize),
    '-hls_flags',
    'delete_segments+append_list+independent_segments+program_date_time',
    '-hls_segment_type',
    'mpegts',
    '-hls_segment_filename',
    segmentPattern,
    playlistPath
  );

  return args;
}

function buildStageOneArgs({ sourceUrl }) {
  return [
    '-hide_banner',
    '-loglevel',
    'warning',
    '-y',
    '-fflags',
    '+genpts+discardcorrupt',
    '-err_detect',
    'ignore_err',
    '-analyzeduration',
    '20M',
    '-probesize',
    '20M',
    '-user_agent',
    browserLikeUserAgent,
    '-headers',
    'Accept: application/vnd.apple.mpegurl,application/x-mpegURL,video/mp2t,video/*,*/*;q=0.8\r\nCache-Control: no-cache\r\nPragma: no-cache',
    '-reconnect',
    '1',
    '-reconnect_streamed',
    '1',
    '-reconnect_at_eof',
    '1',
    '-reconnect_on_network_error',
    '1',
    '-reconnect_on_http_error',
    '4xx,5xx',
    '-rw_timeout',
    '15000000',
    '-i',
    sourceUrl,
    '-map',
    '0:v:0',
    '-map',
    '0:a:0?',
    '-sn',
    '-dn',
    '-c:v',
    'libx264',
    '-preset',
    'veryfast',
    '-tune',
    'zerolatency',
    '-profile:v',
    'main',
    '-level',
    '4.0',
    '-vf',
    'fps=25,format=yuv420p',
    '-pix_fmt',
    'yuv420p',
    '-r',
    '25',
    '-fps_mode',
    'cfr',
    '-g',
    '50',
    '-keyint_min',
    '50',
    '-sc_threshold',
    '0',
    '-force_key_frames',
    'expr:gte(t,n_forced*2)',
    '-c:a',
    'aac',
    '-b:a',
    '128k',
    '-ar',
    '48000',
    '-ac',
    '2',
    '-af',
    'aresample=async=1:first_pts=0',
    '-max_interleave_delta',
    '0',
    '-muxdelay',
    '0',
    '-muxpreload',
    '0',
    '-avoid_negative_ts',
    'make_zero',
    '-f',
    'mpegts',
    'pipe:1'
  ];
}

function buildStageTwoArgs({ outputDir }) {
  const segmentPattern = path.join(outputDir, 'segment_%06d.ts');
  const playlistPath = path.join(outputDir, 'output.m3u8');
  const gopSize = config.hlsSegmentTime * 25;
  return [
    '-hide_banner',
    '-loglevel',
    'warning',
    '-y',
    '-fflags',
    '+genpts+discardcorrupt',
    '-err_detect',
    'ignore_err',
    '-analyzeduration',
    '10M',
    '-probesize',
    '10M',
    '-i',
    'pipe:0',
    '-map',
    '0:v:0',
    '-map',
    '0:a:0?',
    '-sn',
    '-dn',
    '-c:v',
    'libx264',
    '-preset',
    'veryfast',
    '-tune',
    'zerolatency',
    '-profile:v',
    'main',
    '-level',
    '4.0',
    '-vf',
    'fps=25,format=yuv420p',
    '-pix_fmt',
    'yuv420p',
    '-r',
    '25',
    '-fps_mode',
    'cfr',
    '-g',
    String(gopSize),
    '-keyint_min',
    String(gopSize),
    '-sc_threshold',
    '0',
    '-force_key_frames',
    `expr:gte(t,n_forced*${config.hlsSegmentTime})`,
    '-c:a',
    'aac',
    '-b:a',
    '128k',
    '-ar',
    '48000',
    '-ac',
    '2',
    '-af',
    'aresample=async=1:first_pts=0',
    '-max_interleave_delta',
    '0',
    '-muxdelay',
    '0',
    '-muxpreload',
    '0',
    '-avoid_negative_ts',
    'make_zero',
    '-start_at_zero',
    '-f',
    'hls',
    '-hls_time',
    String(config.hlsSegmentTime),
    '-hls_list_size',
    String(config.hlsListSize),
    '-hls_flags',
    'delete_segments+append_list+independent_segments+program_date_time',
    '-hls_segment_type',
    'mpegts',
    '-hls_segment_filename',
    segmentPattern,
    playlistPath
  ];
}

async function stopStream(stream, reason) {
  clearTimeout(stream.idleTimer);
  activeStreams.delete(stream.id);

  for (const processHandle of stream.processes || []) {
    if (processHandle && !processHandle.killed) {
      processHandle.kill('SIGTERM');
    }
  }

  stream.status = 'stopped';
  stream.stopReason = reason;
}

function scheduleIdleCleanup(stream) {
  clearTimeout(stream.idleTimer);
  stream.lastAccessAt = Date.now();
  stream.idleTimer = setTimeout(() => {
    stopStream(stream, 'idle-timeout').catch((error) => {
      console.error(`[normalizer] failed to stop idle stream ${stream.id}`, error);
    });
  }, config.idleTimeoutMs);
}

async function startStream({ sourceUrl, mode }) {
  const id = buildStreamId(sourceUrl, mode);
  const existing = activeStreams.get(id);
  if (existing) {
    scheduleIdleCleanup(existing);
    return existing;
  }

  const outputDir = path.join(config.outputRoot, id);
  await fs.rm(outputDir, { recursive: true, force: true });
  await ensureDir(outputDir);

  const upstreamUrl = `${config.publicOrigin}${upstreamProxyPrefix}/${id}/playlist.m3u8`;
  let child;
  let stageOne = null;
  let stageTwo = null;
  let processes = [];

  if (mode === 'staged') {
    stageOne = spawn(config.ffmpegPath, buildStageOneArgs({ sourceUrl: upstreamUrl }), {
      cwd: serviceRoot,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    stageTwo = spawn(config.ffmpegPath, buildStageTwoArgs({ outputDir }), {
      cwd: serviceRoot,
      stdio: ['pipe', 'ignore', 'pipe']
    });

    if (stageOne.stdout && stageTwo.stdin) {
      stageOne.stdout.pipe(stageTwo.stdin);
    }

    child = stageTwo;
    processes = [stageOne, stageTwo];
  } else {
    child = spawn(config.ffmpegPath, buildFfmpegArgs({ sourceUrl: upstreamUrl, outputDir, mode }), {
      cwd: serviceRoot,
      stdio: ['ignore', 'ignore', 'pipe']
    });
    processes = [child];
  }

  const stream = {
    id,
    sourceUrl,
    mode,
    outputDir,
    upstreamUrl,
    process: child,
    processes,
    stageOnePid: stageOne?.pid ?? null,
    stageTwoPid: stageTwo?.pid ?? null,
    pid: child.pid ?? null,
    status: 'starting',
    createdAt: Date.now(),
    lastAccessAt: Date.now(),
    lastError: null,
    stopReason: null,
    stderrTail: []
  };

  const attachStderr = (processHandle, label) => {
    if (!processHandle?.stderr) {
      return;
    }

    processHandle.stderr.on('data', (chunk) => {
      const lines = chunk
        .toString('utf8')
        .split(/\r?\n/u)
        .map((line) => line.trim())
        .filter(Boolean);

      for (const line of lines) {
        stream.stderrTail.push(`${label}: ${line}`);
        if (stream.stderrTail.length > 30) {
          stream.stderrTail.shift();
        }
      }

      if (lines.length > 0 && stream.status === 'starting') {
        stream.status = 'running';
      }
    });
  };

  attachStderr(child, mode === 'staged' ? 'stage2' : 'ffmpeg');
  if (stageOne) {
    attachStderr(stageOne, 'stage1');
  }

  child.on('error', (error) => {
    stream.status = 'error';
    stream.lastError = error.message;
  });

  if (stageOne) {
    stageOne.on('error', (error) => {
      stream.status = 'error';
      stream.lastError = `stage1: ${error.message}`;
    });

    stageOne.on('exit', (code, signal) => {
      if (stream.status === 'stopped') {
        return;
      }

      if (code !== 0) {
        stream.status = 'error';
        stream.lastError = `stage1 exited with code ${code ?? 'unknown'} signal ${signal ?? 'none'}`;
      }
    });
  }

  child.on('exit', (code, signal) => {
    if (stream.status !== 'stopped') {
      stream.status = code === 0 ? 'finished' : 'error';
      stream.lastError =
        code === 0 ? null : `${mode === 'staged' ? 'stage2' : 'ffmpeg'} exited with code ${code ?? 'unknown'} signal ${signal ?? 'none'}`;
    }
  });

  scheduleIdleCleanup(stream);
  activeStreams.set(id, stream);
  return stream;
}

function summarizeStream(stream) {
  return {
    id: stream.id,
    sourceUrl: stream.sourceUrl,
    mode: stream.mode,
    upstreamUrl: stream.upstreamUrl,
    status: stream.status,
    pid: stream.pid,
    stageOnePid: stream.stageOnePid,
    stageTwoPid: stream.stageTwoPid,
    createdAt: new Date(stream.createdAt).toISOString(),
    lastAccessAt: new Date(stream.lastAccessAt).toISOString(),
    stopReason: stream.stopReason,
    lastError: stream.lastError,
    stderrTail: stream.stderrTail
  };
}

function isSafeRelativeStreamPath(relativePath) {
  return /^[a-f0-9]{40}[\\/](output\.m3u8|segment_\d{6}\.ts)$/u.test(relativePath);
}

async function fetchTextWithTrace(url) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': browserLikeUserAgent,
      Accept: 'application/vnd.apple.mpegurl,application/x-mpegURL,video/mp2t,video/*,*/*;q=0.8',
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache'
    },
    redirect: 'follow',
    cache: 'no-store'
  });

  const textBody = await response.text();
  return {
    ok: response.ok,
    status: response.status,
    statusText: response.statusText,
    finalUrl: response.url,
    body: textBody,
    contentType: response.headers.get('content-type') || 'application/octet-stream'
  };
}

function rewritePlaylistUris(body, finalUrl, streamId) {
  const lines = body.split(/\r?\n/u);
  return lines
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        return line;
      }

      const absoluteUrl = new URL(trimmed, finalUrl).toString();
      return `${upstreamProxyPrefix}/${streamId}/asset?url=${encodeURIComponent(absoluteUrl)}`;
    })
    .join('\n');
}

async function proxyUpstreamPlaylist(res, stream) {
  const upstream = await fetchTextWithTrace(stream.sourceUrl);
  if (!upstream.ok) {
    json(res, 502, {
      error: 'Failed to fetch upstream playlist.',
      status: upstream.status,
      statusText: upstream.statusText
    });
    return;
  }

  const rewrittenBody = rewritePlaylistUris(upstream.body, upstream.finalUrl, stream.id);
  res.writeHead(200, {
    'Content-Type': 'application/vnd.apple.mpegurl',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store'
  });
  res.end(rewrittenBody);
}

async function proxyUpstreamAsset(res, assetUrl) {
  let upstreamUrl;
  try {
    upstreamUrl = new URL(assetUrl).toString();
  } catch {
    json(res, 400, { error: 'Invalid upstream asset URL.' });
    return;
  }

  const response = await fetch(upstreamUrl, {
    headers: {
      'User-Agent': browserLikeUserAgent,
      Accept: 'video/mp2t,application/octet-stream,*/*;q=0.8',
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache'
    },
    redirect: 'follow',
    cache: 'no-store'
  });

  if (!response.ok || !response.body) {
    json(res, 502, {
      error: 'Failed to fetch upstream asset.',
      status: response.status,
      statusText: response.statusText
    });
    return;
  }

  res.writeHead(200, {
    'Content-Type': response.headers.get('content-type') || 'application/octet-stream',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store'
  });

  const reader = response.body.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      if (value) {
        res.write(Buffer.from(value));
      }
    }
    res.end();
  } catch (error) {
    res.destroy(error instanceof Error ? error : undefined);
  }
}

async function serveStreamAsset(req, res, relativePath) {
  const normalized = relativePath.replace(/\//gu, path.sep);
  if (!isSafeRelativeStreamPath(normalized)) {
    json(res, 400, { error: 'Invalid stream asset path.' });
    return;
  }

  const absolutePath = path.join(config.outputRoot, normalized);
  try {
    const stat = await fs.stat(absolutePath);
    const extension = path.extname(absolutePath).toLowerCase();
    const contentType =
      extension === '.m3u8'
        ? 'application/vnd.apple.mpegurl'
        : extension === '.ts'
          ? 'video/mp2t'
          : 'application/octet-stream';

    const streamId = normalized.split(path.sep)[0];
    const active = activeStreams.get(streamId);
    if (active) {
      scheduleIdleCleanup(active);
    }

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stat.size,
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': extension === '.m3u8' ? 'no-store' : 'public, max-age=5'
    });

    const fileStream = createReadStream(absolutePath);
    fileStream.on('error', () => {
      if (!res.headersSent) {
        json(res, 500, { error: 'Failed to read generated asset.' });
      } else {
        res.destroy();
      }
    });
    fileStream.pipe(res);
  } catch {
    json(res, 404, { error: 'Generated asset not found yet.' });
  }
}

async function serveStaticFile(res, filePath, contentType) {
  try {
    const stat = await fs.stat(filePath);
    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stat.size,
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=300'
    });

    const fileStream = createReadStream(filePath);
    fileStream.on('error', () => {
      if (!res.headersSent) {
        json(res, 500, { error: 'Failed to read static asset.' });
      } else {
        res.destroy();
      }
    });
    fileStream.pipe(res);
  } catch {
    json(res, 404, { error: 'Static asset not found.' });
  }
}

async function waitForFile(filePath, timeoutMs = 12_000, intervalMs = 250) {
  const startedAt = Date.now();
  while (Date.now() - startedAt <= timeoutMs) {
    try {
      await fs.stat(filePath);
      return true;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }

  return false;
}

async function handleNormalize(req, res, parsedUrl) {
  const sourceUrl = parsedUrl.searchParams.get('src');
  const mode = parsedUrl.searchParams.get('mode') || 'full';

  if (!sourceUrl) {
    json(res, 400, { error: 'Missing required src query parameter.' });
    return;
  }

  if (!validModes.has(mode)) {
    json(res, 400, { error: `Invalid mode. Use one of: ${Array.from(validModes).join(', ')}` });
    return;
  }

  try {
    new URL(sourceUrl);
  } catch {
    json(res, 400, { error: 'src must be a valid absolute URL.' });
    return;
  }

  try {
    config.publicOrigin = buildOrigin(req);
    const stream = await startStream({ sourceUrl, mode });
    json(res, 200, {
      id: stream.id,
      mode: stream.mode,
      sourceUrl: stream.sourceUrl,
      status: stream.status,
      playbackUrl: buildPlaylistUrl(req, stream.id),
      diagnosticsUrl: `${buildPlaylistUrl(req, stream.id).replace('/streams/', '/stream-info/').replace('/output.m3u8', '')}`
    });
  } catch (error) {
    json(res, 500, {
      error: 'Failed to start stream normalization.',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}

async function handleDirectPlaylist(req, res, parsedUrl) {
  const sourceUrl = parsedUrl.searchParams.get('src');
  const mode = parsedUrl.searchParams.get('mode') || 'full';

  if (!sourceUrl) {
    json(res, 400, { error: 'Missing required src query parameter.' });
    return;
  }

  if (!validModes.has(mode)) {
    json(res, 400, { error: `Invalid mode. Use one of: ${Array.from(validModes).join(', ')}` });
    return;
  }

  try {
    new URL(sourceUrl);
  } catch {
    json(res, 400, { error: 'src must be a valid absolute URL.' });
    return;
  }

  config.publicOrigin = buildOrigin(req);
  const stream = await startStream({ sourceUrl, mode });
  const outputPath = path.join(stream.outputDir, 'output.m3u8');
  const isReady = await waitForFile(outputPath);

  if (!isReady) {
    json(res, 504, {
      error: 'Timed out waiting for normalized playlist generation.',
      streamId: stream.id,
      diagnosticsUrl: `${buildOrigin(req)}/stream-info/${stream.id}`
    });
    return;
  }

  await serveStreamAsset(req, res, `${stream.id}/output.m3u8`);
}

function renderPlayerPage(req, parsedUrl) {
  const initialUrl = parsedUrl.searchParams.get('src') || '';
  const origin = buildOrigin(req);
  const safeInitialUrl = escapeHtml(initialUrl);
  const sampleNormalized247 = `${origin}/direct.m3u8?src=${encodeURIComponent(
    'http://103.120.71.199:25461/live/test/1234/247.m3u8'
  )}&mode=audio`;
  const sampleStaged247 = `${origin}/direct.m3u8?src=${encodeURIComponent(
    'http://103.120.71.199:25461/live/test/1234/247.m3u8'
  )}&mode=staged`;
  const sampleNormalized384213 = `${origin}/direct.m3u8?src=${encodeURIComponent(
    'http://premiumtvs.space:8080/live/93362102729/53620382639/384213.m3u8'
  )}&mode=full`;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Stream Tester</title>
    <style>
      :root {
        color-scheme: dark;
        --bg: #08111a;
        --panel: #0f1a26;
        --panel-2: #132233;
        --border: rgba(255, 255, 255, 0.12);
        --text: #edf3fa;
        --muted: #8da0b5;
        --accent: #5fd1ff;
        --accent-2: #88f7c1;
      }

      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: Segoe UI, Arial, sans-serif;
        background:
          radial-gradient(circle at top, rgba(95, 209, 255, 0.14), transparent 28%),
          linear-gradient(180deg, #071018 0%, #04070b 100%);
        color: var(--text);
      }

      main {
        max-width: 1100px;
        margin: 0 auto;
        padding: 28px;
      }

      .panel {
        background: linear-gradient(180deg, rgba(15, 26, 38, 0.96), rgba(10, 18, 28, 0.96));
        border: 1px solid var(--border);
        border-radius: 20px;
        padding: 20px;
        box-shadow: 0 20px 70px rgba(0, 0, 0, 0.35);
      }

      h1 {
        margin: 0 0 10px;
        font-size: 34px;
      }

      p {
        margin: 0 0 14px;
        color: var(--muted);
        line-height: 1.5;
      }

      form {
        display: grid;
        gap: 12px;
        margin-top: 18px;
      }

      input[type="url"] {
        width: 100%;
        padding: 14px 16px;
        border-radius: 14px;
        border: 1px solid var(--border);
        background: rgba(255, 255, 255, 0.04);
        color: var(--text);
        font-size: 15px;
      }

      .actions {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
      }

      button, .sample {
        border: 0;
        border-radius: 999px;
        padding: 12px 16px;
        font-size: 14px;
        cursor: pointer;
      }

      button {
        background: linear-gradient(135deg, var(--accent), var(--accent-2));
        color: #071018;
        font-weight: 700;
      }

      .sample {
        display: inline-flex;
        align-items: center;
        text-decoration: none;
        background: rgba(255, 255, 255, 0.06);
        color: var(--text);
      }

      .grid {
        display: grid;
        gap: 18px;
        margin-top: 22px;
      }

      @media (min-width: 900px) {
        .grid {
          grid-template-columns: 1.2fr 0.8fr;
        }
      }

      video {
        width: 100%;
        border-radius: 18px;
        background: #000;
        min-height: 320px;
      }

      .log {
        background: rgba(0, 0, 0, 0.28);
        border: 1px solid var(--border);
        border-radius: 16px;
        padding: 14px;
        min-height: 320px;
        white-space: pre-wrap;
        word-break: break-word;
        color: #dbe7f3;
        font: 13px/1.45 Consolas, monospace;
      }

      .muted {
        color: var(--muted);
        font-size: 13px;
      }
    </style>
  </head>
  <body>
    <main>
      <section class="panel">
        <h1>Manual Stream Tester</h1>
        <p>Paste any stream URL here and we will open it in a plain video player so we can see whether the stream itself plays.</p>
        <p class="muted">This is separate from the LG app. It does not change Xtream playback logic.</p>
        <form id="player-form">
          <input id="stream-url" name="src" type="url" placeholder="Paste HLS or normalized URL here" value="${safeInitialUrl}" />
          <div class="actions">
            <button type="submit">Open Stream</button>
            <a class="sample" href="/player?src=${encodeURIComponent(sampleNormalized247)}">Try normalized 247</a>
            <a class="sample" href="/player?src=${encodeURIComponent(sampleStaged247)}">Try staged 247</a>
            <a class="sample" href="/player?src=${encodeURIComponent(sampleNormalized384213)}">Try normalized 384213</a>
          </div>
        </form>
      </section>

      <section class="grid">
        <div class="panel">
          <video id="player" controls autoplay playsinline></video>
        </div>
        <div class="panel">
          <div id="log" class="log">Waiting for a URL...</div>
        </div>
      </section>
    </main>

    <script src="/assets/hls.min.js"></script>
    <script>
      const form = document.getElementById('player-form');
      const input = document.getElementById('stream-url');
      const player = document.getElementById('player');
      const log = document.getElementById('log');
      const events = ['loadstart', 'loadedmetadata', 'loadeddata', 'canplay', 'canplaythrough', 'play', 'playing', 'pause', 'waiting', 'stalled', 'suspend', 'seeking', 'seeked', 'timeupdate', 'progress', 'ended', 'error'];
      let hlsInstance = null;

      function addLog(message) {
        const line = '[' + new Date().toLocaleTimeString() + '] ' + message;
        log.textContent = line + '\\n' + log.textContent;
      }

      function resetHls() {
        if (hlsInstance) {
          hlsInstance.destroy();
          hlsInstance = null;
        }
      }

      function currentErrorMessage() {
        if (!player.error) {
          return 'none';
        }

        return 'MediaError code=' + player.error.code;
      }

      events.forEach((eventName) => {
        player.addEventListener(eventName, () => {
          const buffered = [];
          for (let index = 0; index < player.buffered.length; index += 1) {
            buffered.push(player.buffered.start(index).toFixed(2) + '-' + player.buffered.end(index).toFixed(2));
          }

          addLog(
            eventName +
              ' | currentTime=' + player.currentTime.toFixed(2) +
              ' | paused=' + player.paused +
              ' | readyState=' + player.readyState +
              ' | networkState=' + player.networkState +
              ' | buffered=' + (buffered.join(', ') || 'empty') +
              ' | error=' + currentErrorMessage()
          );
        });
      });

      function openStream(url) {
        if (!url) {
          addLog('No URL provided.');
          return;
        }

        localStorage.setItem('manual-stream-tester-url', url);
        log.textContent = '';
        addLog('Opening ' + url);
        resetHls();
        player.pause();
        player.removeAttribute('src');
        player.load();

        const isHls = /\\.m3u8($|\\?)/i.test(url);
        const canUseNativeHls = player.canPlayType('application/vnd.apple.mpegurl') || player.canPlayType('application/x-mpegURL');
        const hasHlsJs = typeof window.Hls !== 'undefined';

        if (isHls && hasHlsJs && window.Hls.isSupported()) {
          addLog('Using hls.js fallback for HLS playback');
          hlsInstance = new window.Hls({
            enableWorker: true,
            lowLatencyMode: false
          });

          hlsInstance.on(window.Hls.Events.MEDIA_ATTACHED, () => {
            addLog('hls.js media attached');
          });
          hlsInstance.on(window.Hls.Events.MANIFEST_LOADING, () => {
            addLog('hls.js manifest loading');
          });
          hlsInstance.on(window.Hls.Events.MANIFEST_PARSED, (_event, data) => {
            addLog('hls.js manifest parsed | levels=' + data.levels.length);
            player.play().then(() => {
              addLog('play() resolved');
            }).catch((error) => {
              addLog('play() rejected: ' + (error && error.message ? error.message : String(error)));
            });
          });
          hlsInstance.on(window.Hls.Events.ERROR, (_event, data) => {
            addLog('hls.js error | type=' + data.type + ' | details=' + data.details + ' | fatal=' + data.fatal);
          });

          hlsInstance.loadSource(url);
          hlsInstance.attachMedia(player);
          return;
        }

        if (isHls && canUseNativeHls) {
          addLog('Using native HLS playback');
        } else if (isHls && !hasHlsJs) {
          addLog('HLS stream detected but hls.js is unavailable');
        } else if (isHls) {
          addLog('HLS stream detected but this browser does not support native HLS');
        }

        player.src = url;
        player.load();
        player.play().then(() => {
          addLog('play() resolved');
        }).catch((error) => {
          addLog('play() rejected: ' + (error && error.message ? error.message : String(error)));
        });
      }

      form.addEventListener('submit', (event) => {
        event.preventDefault();
        const url = input.value.trim();
        const nextUrl = new URL(window.location.href);
        nextUrl.searchParams.set('src', url);
        window.history.replaceState({}, '', nextUrl.toString());
        openStream(url);
      });

      const initial = input.value.trim() || localStorage.getItem('manual-stream-tester-url') || '';
      if (initial) {
        input.value = initial;
        openStream(initial);
      }
    </script>
  </body>
</html>`;
}

async function handleRequest(req, res) {
  const parsedUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }

  if (req.method !== 'GET') {
    json(res, 405, { error: 'Method not allowed.' });
    return;
  }

  if (parsedUrl.pathname === '/health') {
    json(res, 200, {
      ok: true,
      ffmpegPath: config.ffmpegPath,
      outputRoot: config.outputRoot,
      activeStreamCount: activeStreams.size
    });
    return;
  }

  if (parsedUrl.pathname === '/streams') {
    json(res, 200, {
      streams: Array.from(activeStreams.values(), summarizeStream)
    });
    return;
  }

  if (parsedUrl.pathname.startsWith('/stream-info/')) {
    const streamId = parsedUrl.pathname.slice('/stream-info/'.length);
    const stream = activeStreams.get(streamId);
    if (!stream) {
      json(res, 404, { error: 'Stream not found.' });
      return;
    }
    json(res, 200, summarizeStream(stream));
    return;
  }

  if (parsedUrl.pathname === '/normalize') {
    await handleNormalize(req, res, parsedUrl);
    return;
  }

  if (parsedUrl.pathname === '/direct.m3u8') {
    await handleDirectPlaylist(req, res, parsedUrl);
    return;
  }

  if (parsedUrl.pathname === '/player') {
    html(res, 200, renderPlayerPage(req, parsedUrl));
    return;
  }

  if (parsedUrl.pathname === '/assets/hls.min.js') {
    await serveStaticFile(res, localHlsScriptPath, 'application/javascript; charset=utf-8');
    return;
  }

  if (parsedUrl.pathname.startsWith(`${upstreamProxyPrefix}/`)) {
    const relative = parsedUrl.pathname.slice(`${upstreamProxyPrefix}/`.length);
    const [streamId, resource] = relative.split('/');
    const stream = activeStreams.get(streamId);

    if (!stream) {
      json(res, 404, { error: 'Upstream stream not found.' });
      return;
    }

    scheduleIdleCleanup(stream);

    if (resource === 'playlist.m3u8') {
      await proxyUpstreamPlaylist(res, stream);
      return;
    }

    if (resource === 'asset') {
      const assetUrl = parsedUrl.searchParams.get('url');
      if (!assetUrl) {
        json(res, 400, { error: 'Missing upstream asset url parameter.' });
        return;
      }
      await proxyUpstreamAsset(res, assetUrl);
      return;
    }

    json(res, 404, { error: 'Unknown upstream proxy resource.' });
    return;
  }

  if (parsedUrl.pathname.startsWith('/streams/')) {
    const relativePath = parsedUrl.pathname.slice('/streams/'.length);
    await serveStreamAsset(req, res, relativePath);
    return;
  }

  text(
    res,
    200,
    [
      'Stream Normalizer is running.',
      '',
      'Endpoints:',
      '  GET /health',
      '  GET /streams',
      '  GET /player',
      '  GET /normalize?src=<url>&mode=<copy|audio|full|staged>',
      '  GET /streams/<stream-id>/output.m3u8'
    ].join('\n')
  );
}

await ensureDir(config.outputRoot);

const server = http.createServer((req, res) => {
  handleRequest(req, res).catch((error) => {
    console.error('[normalizer] unhandled request error', error);
    if (!res.headersSent) {
      json(res, 500, {
        error: 'Unhandled server error.',
        details: error instanceof Error ? error.message : String(error)
      });
    } else {
      res.destroy();
    }
  });
});

server.listen(config.port, config.host, () => {
  console.log(
    `[normalizer] listening on http://${config.host}:${config.port} using ffmpeg="${config.ffmpegPath}"`
  );
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    const stops = Array.from(activeStreams.values(), (stream) => stopStream(stream, signal));
    Promise.allSettled(stops).finally(() => {
      server.close(() => process.exit(0));
    });
  });
}
