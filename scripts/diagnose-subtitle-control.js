#!/usr/bin/env node
/**
 * Subtitle controllability diagnostic (movies + series).
 *
 * What it does:
 * 1) Finds target content (movie or series).
 * 2) Resolves the real stream URL (redirect chain + tokenized CDN URL).
 * 3) Probes payload headers/magic.
 * 4) Runs ffprobe (if installed) to inspect actual stream tracks.
 * 5) Classifies subtitle situation:
 *    - text-soft-subtitles (generally controllable by player styling)
 *    - bitmap-soft-subtitles (selectable but styling is limited)
 *    - no-soft-subtitles-detected (if subtitles appear, likely burned-in)
 *
 * Usage examples:
 *   node scripts/diagnose-subtitle-control.js --type movie --search "money heist" --movie-id 597489
 *   node scripts/diagnose-subtitle-control.js --type series --search "money heist" --series-id 291 --season 5 --episode 1
 *   node scripts/diagnose-subtitle-control.js --type series --series-id 313 --season 1 --episode 2
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');
const { spawnSync } = require('child_process');

const CONFIG = {
  serverUrl: 'http://premiumtvs.space:8080',
  username: '93362102729',
  password: '53620382639',
  type: 'series', // series | movie
  search: 'money heist',
  movieId: null,
  seriesId: null,
  season: null,
  episode: 1,
  extension: null, // if null -> declared extension from API
  timeoutMs: 15000,
};

const green = (s) => `\x1b[32m${s}\x1b[0m`;
const red = (s) => `\x1b[31m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const bold = (s) => `\x1b[1m${s}\x1b[0m`;

function parseCli() {
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i += 1) {
    const a = args[i];
    const n = args[i + 1];
    if (a === '--type' && n) {
      const t = String(n).toLowerCase();
      if (t === 'movie' || t === 'series') CONFIG.type = t;
      i += 1;
    } else if (a === '--search' && n) {
      CONFIG.search = String(n);
      i += 1;
    } else if (a === '--movie-id' && n) {
      const v = Number(n);
      if (!Number.isNaN(v) && v > 0) CONFIG.movieId = v;
      i += 1;
    } else if (a === '--series-id' && n) {
      const v = Number(n);
      if (!Number.isNaN(v) && v > 0) CONFIG.seriesId = v;
      i += 1;
    } else if (a === '--season' && n) {
      CONFIG.season = String(n);
      i += 1;
    } else if (a === '--episode' && n) {
      const v = Number(n);
      if (!Number.isNaN(v) && v > 0) CONFIG.episode = v;
      i += 1;
    } else if (a === '--ext' && n) {
      CONFIG.extension = String(n).toLowerCase();
      i += 1;
    }
  }
}

function detectMagic(buffer) {
  if (!buffer || buffer.length < 4) return 'unknown';
  const h = buffer.slice(0, 4).toString('hex').toLowerCase();
  if (h === '1a45dfa3') return 'mkv/webm (ebml)';
  if (h === '66747970' || h === '00000020' || h === '00000018' || h === '0000001c') return 'mp4-ish';
  if (buffer[0] === 0x47) return 'mpeg-ts';
  const head = buffer.slice(0, 64).toString('utf8').toLowerCase();
  if (head.includes('<html') || head.includes('<!doctype')) return 'html/error page';
  if (head.startsWith('#extm3u')) return 'hls manifest';
  return 'unknown';
}

function requestJson(url, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const lib = parsed.protocol === 'https:' ? https : http;
    const req = lib.get(url, { timeout: CONFIG.timeoutMs }, (res) => {
      if ((res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307 || res.statusCode === 308)
        && res.headers.location && maxRedirects > 0) {
        res.resume();
        const next = res.headers.location.startsWith('http')
          ? res.headers.location
          : new URL(res.headers.location, url).toString();
        resolve(requestJson(next, maxRedirects - 1));
        return;
      }
      let raw = '';
      res.on('data', (c) => { raw += c; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode || 0, body: JSON.parse(raw) });
        } catch (e) {
          reject(new Error(`Non-JSON response (status ${res.statusCode}): ${String(raw).slice(0, 220)}`));
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('request timeout')); });
  });
}

function resolveRedirectChain(url, maxRedirects = 8) {
  return new Promise((resolve) => {
    const chain = [];
    const step = (target, left) => {
      let parsed;
      try { parsed = new URL(target); } catch (e) {
        resolve({ ok: false, error: e.message, finalUrl: target, chain });
        return;
      }
      const lib = parsed.protocol === 'https:' ? https : http;
      const req = lib.request({
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
        path: parsed.pathname + parsed.search,
        method: 'GET',
        timeout: CONFIG.timeoutMs,
        headers: { Range: 'bytes=0-1023', Connection: 'close' },
      }, (res) => {
        const status = res.statusCode || 0;
        const loc = res.headers.location ? String(res.headers.location) : '';
        chain.push({ url: target, host: parsed.host, status, location: loc });
        if ((status === 301 || status === 302 || status === 307 || status === 308) && loc && left > 0) {
          res.resume();
          const next = loc.startsWith('http') ? loc : new URL(loc, target).toString();
          step(next, left - 1);
          return;
        }
        res.resume();
        resolve({
          ok: status > 0 && status < 500,
          finalStatus: status,
          finalUrl: target,
          chain,
        });
      });
      req.on('error', (e) => resolve({ ok: false, error: e.message, finalUrl: target, chain }));
      req.on('timeout', () => {
        req.destroy();
        resolve({ ok: false, error: 'timeout', finalUrl: target, chain });
      });
      req.end();
    };
    step(url, maxRedirects);
  });
}

function payloadProbe(url) {
  return new Promise((resolve) => {
    const parsed = new URL(url);
    const lib = parsed.protocol === 'https:' ? https : http;
    const req = lib.request({
      protocol: parsed.protocol,
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: 'GET',
      timeout: CONFIG.timeoutMs,
      headers: { Range: 'bytes=0-4095', Connection: 'close' },
    }, (res) => {
      const status = res.statusCode || 0;
      const chunks = [];
      let size = 0;
      res.on('data', (chunk) => {
        if (size > 4096) return;
        const remain = 4096 - size;
        const part = chunk.length > remain ? chunk.subarray(0, remain) : chunk;
        chunks.push(part);
        size += part.length;
      });
      res.on('end', () => {
        const preview = Buffer.concat(chunks);
        resolve({
          status,
          contentType: String(res.headers['content-type'] || ''),
          contentLength: String(res.headers['content-length'] || ''),
          magic: detectMagic(preview),
          previewHex: preview.slice(0, 32).toString('hex'),
          previewText: preview.slice(0, 120).toString('utf8').replace(/[^\x20-\x7E]/g, '.'),
        });
      });
    });
    req.on('error', (e) => resolve({ status: 0, error: e.message }));
    req.on('timeout', () => {
      req.destroy();
      resolve({ status: 408, error: 'timeout' });
    });
    req.end();
  });
}

function runFfprobe(url) {
  const probe = spawnSync('ffprobe', [
    '-v', 'error',
    '-show_streams',
    '-show_format',
    '-of', 'json',
    '-i', url,
  ], { encoding: 'utf8', timeout: 30000 });

  if (probe.error) {
    return { ok: false, skipped: true, reason: probe.error.message };
  }
  if (probe.status !== 0) {
    return {
      ok: false,
      skipped: false,
      reason: (probe.stderr || probe.stdout || '').slice(0, 300),
    };
  }
  try {
    const parsed = JSON.parse(probe.stdout || '{}');
    const streams = Array.isArray(parsed.streams) ? parsed.streams : [];
    const subtitleStreams = streams.filter((s) => s.codec_type === 'subtitle');
    const videoStreams = streams.filter((s) => s.codec_type === 'video');
    const audioStreams = streams.filter((s) => s.codec_type === 'audio');
    return {
      ok: true,
      streams,
      subtitleStreams,
      videoStreams,
      audioStreams,
      format: parsed.format || {},
    };
  } catch (e) {
    return { ok: false, skipped: false, reason: `ffprobe-json-parse:${e.message}` };
  }
}

function classifySubtitleControllability(ffprobeResult, payload) {
  if (!ffprobeResult?.ok) {
    return {
      verdict: 'unknown-no-ffprobe',
      note: 'ffprobe unavailable/failed; cannot confirm subtitle track type.',
    };
  }
  const subs = ffprobeResult.subtitleStreams || [];
  if (subs.length === 0) {
    return {
      verdict: 'no-soft-subtitles-detected',
      note: 'No subtitle stream detected. If subtitles appear on screen, they are likely burned into video.',
    };
  }

  const textCodecs = new Set(['subrip', 'mov_text', 'webvtt', 'ass', 'ssa', 'ttml']);
  const bitmapCodecs = new Set(['hdmv_pgs_subtitle', 'dvd_subtitle', 'xsub', 'dvb_subtitle', 'vobsub']);

  let hasText = false;
  let hasBitmap = false;
  const codecs = [];
  for (const s of subs) {
    const codec = String(s.codec_name || '').toLowerCase();
    if (codec) codecs.push(codec);
    if (textCodecs.has(codec)) hasText = true;
    if (bitmapCodecs.has(codec)) hasBitmap = true;
  }

  if (hasText && !hasBitmap) {
    return {
      verdict: 'text-soft-subtitles',
      note: 'Soft text subtitles detected; player-side size/style controls should be possible.',
      codecs,
    };
  }
  if (hasBitmap && !hasText) {
    return {
      verdict: 'bitmap-soft-subtitles',
      note: 'Soft subtitle tracks exist but are bitmap image-based; styling control is limited.',
      codecs,
    };
  }
  return {
    verdict: 'mixed-soft-subtitles',
    note: 'Mixed subtitle codecs detected (text + bitmap). Some tracks may be styleable, others not.',
    codecs,
  };
}

function buildMovieUrl(streamId, ext) {
  const base = CONFIG.serverUrl.replace(/\/$/, '');
  const u = encodeURIComponent(CONFIG.username);
  const p = encodeURIComponent(CONFIG.password);
  return `${base}/movie/${u}/${p}/${streamId}.${ext}`;
}

function buildSeriesUrl(streamId, ext) {
  const base = CONFIG.serverUrl.replace(/\/$/, '');
  const u = encodeURIComponent(CONFIG.username);
  const p = encodeURIComponent(CONFIG.password);
  return `${base}/series/${u}/${p}/${streamId}.${ext}`;
}

async function resolveMovieTarget() {
  const base = CONFIG.serverUrl.replace(/\/$/, '');
  const u = encodeURIComponent(CONFIG.username);
  const p = encodeURIComponent(CONFIG.password);
  const res = await requestJson(`${base}/player_api.php?username=${u}&password=${p}&action=get_vod_streams`);
  const list = Array.isArray(res.body) ? res.body : [];
  const matches = list.filter((m) => String(m.name || '').toLowerCase().includes(CONFIG.search.toLowerCase()));
  const picked = CONFIG.movieId
    ? list.find((m) => Number(m.stream_id) === Number(CONFIG.movieId))
    : matches[0];
  if (!picked) throw new Error('Movie not found (adjust --search or --movie-id)');
  const ext = CONFIG.extension || String(picked.container_extension || 'mp4').toLowerCase();
  return {
    itemName: picked.name,
    streamId: String(picked.stream_id),
    extension: ext,
    streamUrl: buildMovieUrl(String(picked.stream_id), ext),
    matches,
  };
}

function pickSeasonKey(episodesObj, preferred) {
  const keys = Object.keys(episodesObj || {});
  if (keys.length === 0) return null;
  if (preferred && episodesObj[preferred]) return preferred;
  return keys.sort((a, b) => Number(a) - Number(b))[0];
}

async function resolveSeriesTarget() {
  const base = CONFIG.serverUrl.replace(/\/$/, '');
  const u = encodeURIComponent(CONFIG.username);
  const p = encodeURIComponent(CONFIG.password);
  const listRes = await requestJson(`${base}/player_api.php?username=${u}&password=${p}&action=get_series`);
  const list = Array.isArray(listRes.body) ? listRes.body : [];
  const matches = list.filter((s) => String(s.name || '').toLowerCase().includes(CONFIG.search.toLowerCase()));
  const pickedSeries = CONFIG.seriesId
    ? list.find((s) => Number(s.series_id) === Number(CONFIG.seriesId))
    : matches[0];
  if (!pickedSeries) throw new Error('Series not found (adjust --search or --series-id)');

  const infoRes = await requestJson(`${base}/player_api.php?username=${u}&password=${p}&action=get_series_info&series_id=${pickedSeries.series_id}`);
  const info = infoRes.body || {};
  const episodes = info.episodes || {};
  const seasonKey = pickSeasonKey(episodes, CONFIG.season);
  if (!seasonKey) throw new Error('No seasons/episodes in series info');
  const seasonEpisodesRaw = episodes[seasonKey];
  const seasonEpisodes = Array.isArray(seasonEpisodesRaw)
    ? seasonEpisodesRaw
    : Object.values(seasonEpisodesRaw || {});
  const idx = Math.max(0, CONFIG.episode - 1);
  const episode = seasonEpisodes[idx];
  if (!episode) throw new Error(`Episode ${CONFIG.episode} not found in season ${seasonKey}`);
  const streamId = String(episode.id || episode.stream_id);
  const ext = CONFIG.extension || String(episode.container_extension || 'mp4').toLowerCase();
  return {
    itemName: pickedSeries.name,
    streamId,
    extension: ext,
    season: seasonKey,
    episodeNumber: CONFIG.episode,
    episodeTitle: episode.title || '',
    streamUrl: buildSeriesUrl(streamId, ext),
    matches,
  };
}

function printChain(chain) {
  for (let i = 0; i < chain.length; i += 1) {
    const c = chain[i];
    const next = c.location ? ` -> ${c.location}` : '';
    console.log(`   ${i + 1}. [${c.status}] ${c.host}${next}`);
  }
}

function printFfprobeSummary(fp) {
  if (!fp.ok) {
    if (fp.skipped) {
      console.log(yellow(` ffprobe: skipped (${fp.reason})`));
      return;
    }
    console.log(red(` ffprobe: fail (${fp.reason})`));
    return;
  }
  const v = fp.videoStreams || [];
  const a = fp.audioStreams || [];
  const s = fp.subtitleStreams || [];
  console.log(green(` ffprobe: ok | video=${v.length} audio=${a.length} subtitle=${s.length}`));
  for (let i = 0; i < Math.min(s.length, 20); i += 1) {
    const tr = s[i];
    console.log(`   subtitle[${i}] codec=${tr.codec_name || 'unknown'} lang=${tr.tags?.language || 'n/a'} title=${tr.tags?.title || 'n/a'}`);
  }
}

async function main() {
  parseCli();

  console.log(bold('\n═══════════════════════════════════════════════════════'));
  console.log(bold(' Smartifly Subtitle Control Diagnostic'));
  console.log(`  Server : ${CONFIG.serverUrl}`);
  console.log(`  Type   : ${CONFIG.type}`);
  console.log(`  Search : "${CONFIG.search}"`);
  console.log(bold('═══════════════════════════════════════════════════════\n'));

  let target;
  if (CONFIG.type === 'movie') {
    target = await resolveMovieTarget();
    console.log(`Target movie : ${bold(target.itemName)} (stream_id=${target.streamId})`);
  } else {
    target = await resolveSeriesTarget();
    console.log(`Target series: ${bold(target.itemName)} (stream_id=${target.streamId})`);
    console.log(`Season/Ep    : S${target.season}E${String(target.episodeNumber).padStart(2, '0')} ${target.episodeTitle ? `- ${target.episodeTitle}` : ''}`);
  }
  console.log(`Declared ext : ${target.extension}`);
  console.log(`Base URL     : ${target.streamUrl}`);
  console.log('');

  const resolved = await resolveRedirectChain(target.streamUrl);
  console.log('Redirect chain:');
  printChain(resolved.chain || []);
  console.log(`Final URL     : ${resolved.finalUrl}`);
  console.log('');

  const payload = await payloadProbe(resolved.finalUrl);
  console.log('Payload probe:');
  console.log(` status       : ${payload.status}`);
  console.log(` content-type : ${payload.contentType || 'n/a'}`);
  console.log(` content-len  : ${payload.contentLength || 'n/a'}`);
  console.log(` magic        : ${payload.magic || 'unknown'}`);
  console.log(` preview(hex) : ${payload.previewHex || 'n/a'}`);
  console.log(` preview(text): ${payload.previewText || 'n/a'}`);
  console.log('');

  const fp = runFfprobe(resolved.finalUrl);
  printFfprobeSummary(fp);
  console.log('');

  const cls = classifySubtitleControllability(fp, payload);
  console.log(bold('Diagnosis:'));
  if (cls.verdict === 'text-soft-subtitles') {
    console.log(green(` ${cls.verdict}: ${cls.note}`));
  } else if (cls.verdict === 'bitmap-soft-subtitles' || cls.verdict === 'mixed-soft-subtitles') {
    console.log(yellow(` ${cls.verdict}: ${cls.note}`));
  } else if (cls.verdict === 'no-soft-subtitles-detected') {
    console.log(red(` ${cls.verdict}: ${cls.note}`));
  } else {
    console.log(yellow(` ${cls.verdict}: ${cls.note}`));
  }
  if (cls.codecs && cls.codecs.length) {
    console.log(` codecs       : ${cls.codecs.join(', ')}`);
  }

  console.log('\nWhat this means for your app:');
  if (cls.verdict === 'text-soft-subtitles') {
    console.log(' - Player-side subtitle size/style controls should work for these tracks.');
  } else if (cls.verdict === 'bitmap-soft-subtitles') {
    console.log(' - Subtitles are soft tracks, but image-based; font size/style controls are limited.');
  } else if (cls.verdict === 'no-soft-subtitles-detected') {
    console.log(' - If text is visible during playback, it is likely burned into video frames and not controllable.');
  } else {
    console.log(' - Subtitle control may vary by selected track; test each subtitle track in-app.');
  }
}

main().catch((e) => {
  console.error(red(`\n✗ ${e.message}`));
  process.exit(1);
});

