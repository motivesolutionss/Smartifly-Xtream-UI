#!/usr/bin/env node
/**
 * Find series by name and diagnose season availability.
 * Usage: node scripts/find-and-diagnose-series.js
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');

const CONFIG = {
    serverUrl: 'http://premiumtvs.space:8080',
    username: '93362102729',
    password: '53620382639',
    searchName: 'money heist (hindi)',
    // Optional: set to a season number string (e.g. '5') to deep inspect only that season.
    // Set to null to inspect all seasons.
    inspectSeason: null,
    // Optional direct selection by series id (bypasses searchName matching choice).
    targetSeriesId: null,
    streamProbeTimeoutMs: 6000,
    payloadProbeBytes: 1024,
    // Safety: never read unbounded stream bodies.
    // For text/json payloads we can capture up to this many bytes as "full response".
    maxFullTextBytes: 512 * 1024,
};

function applyCliOverrides() {
    const args = process.argv.slice(2);
    for (let i = 0; i < args.length; i += 1) {
        const arg = args[i];
        const next = args[i + 1];
        if (arg === '--search' && next) {
            CONFIG.searchName = String(next);
            i += 1;
            continue;
        }
        if (arg === '--series-id' && next) {
            const n = Number(next);
            if (!Number.isNaN(n) && n > 0) {
                CONFIG.targetSeriesId = n;
            }
            i += 1;
            continue;
        }
        if (arg === '--season' && next) {
            CONFIG.inspectSeason = String(next);
            i += 1;
            continue;
        }
        if (arg === '--all-seasons') {
            CONFIG.inspectSeason = null;
            continue;
        }
    }
}

const EXTENSIONS = ['mkv', 'mp4', 'ts', 'avi', 'm4v'];

function request(url, maxRedirects = 5) {
    return new Promise((resolve, reject) => {
        const parsed = new URL(url);
        const lib = parsed.protocol === 'https:' ? https : http;
        const req = lib.get(url, { timeout: 15000 }, (res) => {
            // Follow redirects
            if ((res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307 || res.statusCode === 308)
                && res.headers.location && maxRedirects > 0) {
                res.resume();
                const redirectUrl = res.headers.location.startsWith('http')
                    ? res.headers.location
                    : new URL(res.headers.location, url).toString();
                resolve(request(redirectUrl, maxRedirects - 1));
                return;
            }
            let data = '';
            res.on('data', (c) => { data += c; });
            res.on('end', () => {
                try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
                catch { resolve({ status: res.statusCode, body: data }); }
            });
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    });
}

function probe(url) {
    return new Promise((resolve) => {
        const parsed = new URL(url);
        const lib = parsed.protocol === 'https:' ? https : http;
        const opts = {
            hostname: parsed.hostname,
            port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
            path: parsed.pathname + parsed.search,
            method: 'HEAD',
            timeout: CONFIG.streamProbeTimeoutMs,
            headers: { 'Range': 'bytes=0-1023' },
        };
        const req = lib.request(opts, (res) => {
            resolve({ status: res.statusCode, ok: res.statusCode < 400 });
            res.resume();
        });
        req.on('error', (e) => resolve({ status: 0, ok: false, error: e.message }));
        req.on('timeout', () => { req.destroy(); resolve({ status: 408, ok: false, error: 'timeout' }); });
        req.end();
    });
}

function hexPreview(buffer, max = 24) {
    return buffer.slice(0, max).toString('hex');
}

function asciiPreview(buffer, max = 120) {
    return buffer
        .slice(0, max)
        .toString('utf8')
        .replace(/[^\x20-\x7E]/g, '.');
}

function detectMagic(buffer) {
    if (!buffer || buffer.length < 4) return 'unknown';
    const h = buffer.slice(0, 4).toString('hex').toLowerCase();
    if (h === '1a45dfa3') return 'mkv/webm (EBML)';
    if (h === '00000020' || h === '00000018' || h === '0000001c' || h === '66747970') return 'mp4-ish (ftyp)';
    if (buffer[0] === 0x47) return 'mpeg-ts (sync 0x47)';
    if (buffer.slice(0, 5).toString('utf8').toUpperCase() === '#EXTM') return 'hls manifest (m3u8 text)';
    if (buffer.slice(0, 14).toString('utf8').toLowerCase().includes('<!doctype html') || buffer.slice(0, 5).toString('utf8').toLowerCase() === '<html') return 'html/error page';
    return 'unknown';
}

function probePayload(url, maxRedirects = 6) {
    return probePayloadWithOptions(url, { useRange: true, browserLike: false }, maxRedirects);
}

function probePayloadWithOptions(url, options = { useRange: true, browserLike: false }, maxRedirects = 6) {
    return new Promise((resolve) => {
        const parsed = new URL(url);
        const lib = parsed.protocol === 'https:' ? https : http;
        const headers = {};
        if (options.useRange) {
            headers.Range = `bytes=0-${Math.max(1, CONFIG.payloadProbeBytes - 1)}`;
        }
        if (options.browserLike) {
            headers['User-Agent'] = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36';
            headers.Accept = '*/*';
            headers.Connection = 'close';
        }
        const opts = {
            hostname: parsed.hostname,
            port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
            path: parsed.pathname + parsed.search,
            method: 'GET',
            timeout: CONFIG.streamProbeTimeoutMs,
            headers,
        };
        const req = lib.request(opts, (res) => {
            const status = res.statusCode || 0;
            const location = res.headers.location;
            if ((status === 301 || status === 302 || status === 307 || status === 308) && location && maxRedirects > 0) {
                res.resume();
                const nextUrl = location.startsWith('http')
                    ? location
                    : new URL(location, url).toString();
                resolve(probePayloadWithOptions(nextUrl, options, maxRedirects - 1));
                return;
            }

            const contentType = String(res.headers['content-type'] || '').toLowerCase();
            const isTextLike = contentType.includes('text/')
                || contentType.includes('application/json')
                || contentType.includes('application/xml')
                || contentType.includes('application/xhtml+xml');
            const softLimit = isTextLike ? CONFIG.maxFullTextBytes : CONFIG.payloadProbeBytes;

            const chunks = [];
            let total = 0;
            let finishedByLimit = false;
            res.on('data', (chunk) => {
                if (total >= softLimit) {
                    finishedByLimit = true;
                    return;
                }
                const remaining = softLimit - total;
                const part = chunk.length > remaining ? chunk.subarray(0, remaining) : chunk;
                chunks.push(part);
                total += part.length;
            });
            res.on('end', () => {
                const raw = Buffer.concat(chunks);
                const preview = raw.slice(0, CONFIG.payloadProbeBytes);
                const textBody = isTextLike ? raw.toString('utf8') : '';
                resolve({
                    ok: status > 0 && status < 400,
                    status,
                    finalUrl: url,
                    requestMode: options.useRange ? (options.browserLike ? 'range+browser' : 'range') : (options.browserLike ? 'full+browser' : 'full'),
                    contentType: String(res.headers['content-type'] || ''),
                    contentLength: String(res.headers['content-length'] || ''),
                    headers: res.headers,
                    magic: detectMagic(preview),
                    hex: hexPreview(preview),
                    ascii: asciiPreview(preview),
                    bodyBytesCaptured: raw.length,
                    bodyWasTruncated: finishedByLimit,
                    fullTextBody: textBody,
                });
            });
        });
        req.on('error', (e) => resolve({ ok: false, status: 0, error: e.message, finalUrl: url }));
        req.on('timeout', () => {
            req.destroy();
            resolve({ ok: false, status: 408, error: 'timeout', finalUrl: url });
        });
        req.end();
    });
}

function isSuspiciousPayload(payload) {
    const ct = String(payload?.contentType || '').toLowerCase();
    const magic = String(payload?.magic || '').toLowerCase();
    const bytes = Number(payload?.bodyBytesCaptured || 0);
    const looksHtml = ct.includes('text/html') || magic.includes('html');
    return bytes === 0 || looksHtml;
}

function episodeUrl(streamId, ext) {
    const u = encodeURIComponent(CONFIG.username);
    const p = encodeURIComponent(CONFIG.password);
    return `${CONFIG.serverUrl}/series/${u}/${p}/${streamId}.${ext}`;
}

const green = (s) => `\x1b[32m${s}\x1b[0m`;
const red = (s) => `\x1b[31m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const bold = (s) => `\x1b[1m${s}\x1b[0m`;

async function main() {
    applyCliOverrides();
    const base = CONFIG.serverUrl.replace(/\/$/, '');
    const u = encodeURIComponent(CONFIG.username);
    const p = encodeURIComponent(CONFIG.password);

    console.log(bold('\n═══════════════════════════════════════════════════════'));
    console.log(bold(' Smartifly Series Diagnostic'));
    console.log(`  Server : ${CONFIG.serverUrl}`);
    console.log(`  Search : "${CONFIG.searchName}"`);
    console.log(bold('═══════════════════════════════════════════════════════\n'));

    // Step 1 — fetch all series
    console.log('① Fetching series list...');
    let allSeries;
    try {
        const res = await request(`${base}/player_api.php?username=${u}&password=${p}&action=get_series`);
        if (!Array.isArray(res.body)) {
            console.error(red(`   ✗ Unexpected response (status ${res.status})`));
            console.error('   Body:', JSON.stringify(res.body).slice(0, 400));
            process.exit(1);
        }
        allSeries = res.body;
        console.log(`   ✓ ${allSeries.length} series found on server\n`);
    } catch (e) {
        console.error(red('   ✗ Failed: ' + e.message));
        process.exit(1);
    }

    // Step 2 — find matching series
    const query = CONFIG.searchName.toLowerCase();
    const matches = allSeries.filter(s => String(s.name || '').toLowerCase().includes(query));

    if (matches.length === 0) {
        console.log(yellow(`⚠  No series found matching "${CONFIG.searchName}"`));
        console.log('   Try a shorter search term.\n');
        process.exit(0);
    }

    console.log(`② Found ${matches.length} match(es):\n`);
    matches.forEach((s, i) => {
        console.log(`   [${i + 1}] ID: ${s.series_id}  Name: ${s.name}  Category: ${s.category_id}`);
    });

    // Use explicit series id if provided, otherwise first match
    const target = CONFIG.targetSeriesId
        ? (matches.find((s) => Number(s.series_id) === Number(CONFIG.targetSeriesId)) || null)
        : matches[0];
    if (!target) {
        console.log(red(`\n   ✗ series-id ${CONFIG.targetSeriesId} not found in matches for "${CONFIG.searchName}"`));
        process.exit(1);
    }
    console.log(`\n   → Using: ${bold(target.name)} (ID: ${target.series_id})\n`);

    // Step 3 — fetch series info
    console.log('③ Fetching full series info (all seasons + episodes)...');
    let seriesInfo;
    try {
        const res = await request(`${base}/player_api.php?username=${u}&password=${p}&action=get_series_info&series_id=${target.series_id}`);
        if (!res.body?.episodes) {
            console.error(red(`   ✗ No episodes in response (status ${res.status})`));
            console.error('   Body:', JSON.stringify(res.body).slice(0, 400));
            process.exit(1);
        }
        seriesInfo = res.body;
        const seasonCount = Object.keys(seriesInfo.episodes).length;
        console.log(`   ✓ ${seasonCount} seasons in response\n`);
    } catch (e) {
        console.error(red('   ✗ Failed: ' + e.message));
        process.exit(1);
    }

    let seasons = Object.keys(seriesInfo.episodes).sort((a, b) => Number(a) - Number(b));
    if (CONFIG.inspectSeason) {
        seasons = seasons.filter((s) => String(s) === String(CONFIG.inspectSeason));
        if (seasons.length === 0) {
            console.log(yellow(`⚠ Requested inspectSeason=${CONFIG.inspectSeason} not found in API response`));
            process.exit(0);
        }
    }

    // Step 4 — probe each season
    console.log('④ Probing stream URLs for each season...\n');

    const summary = [];

    for (const season of seasons) {
        const eps = Array.isArray(seriesInfo.episodes[season])
            ? seriesInfo.episodes[season]
            : Object.values(seriesInfo.episodes[season] || {});

        if (eps.length === 0) {
            console.log(`Season ${season}: ${yellow('no episodes in response')}`);
            summary.push({ season, status: 'no episodes', workingExts: [] });
            continue;
        }

        const first = eps[0];
        const streamId = first.id || first.stream_id;
        const declaredExt = first.container_extension || 'mkv';

        console.log(bold(`─── Season ${season} (${eps.length} episodes) ─────────────────────`));
        console.log(`    First episode : E${first.episode_num} "${first.title}"`);
        console.log(`    Stream ID     : ${streamId}`);
        console.log(`    Declared ext  : ${declaredExt}`);
        console.log(`    Probing extensions...\n`);

        const workingExts = [];
        const extDiagnostics = {};

        for (const ext of EXTENSIONS) {
            const url = episodeUrl(streamId, ext);
            const result = await probe(url);
            const marker = result.ok ? green('✓') : red('✗');
            const detail = result.error ? ` (${result.error})` : ` HTTP ${result.status}`;
            const tag = ext === declaredExt ? yellow(' ← declared') : '';
            console.log(`    ${marker} .${ext.padEnd(4)} ${detail}${tag}`);
            if (result.ok) workingExts.push(ext);
            extDiagnostics[ext] = result;
        }

        // Probe all episodes with declared ext to see how many are broken
        console.log(`\n    Probing all ${eps.length} episodes (.${declaredExt})...`);
        let working = 0, broken = 0, timedOut = 0;
        for (const ep of eps) {
            const sid = ep.id || ep.stream_id;
            const url = episodeUrl(sid, declaredExt);
            const result = await probe(url);
            if (result.ok) working++;
            else if (result.error === 'timeout') timedOut++;
            else broken++;
        }
        console.log(`    ${green('Working')}: ${working}  ${red('Broken')}: ${broken}  ${yellow('Timeout')}: ${timedOut}\n`);

        summary.push({ season, workingExts, working, broken, timedOut, declaredExt, streamId });

        console.log('    Payload probe (first episode by extension):');
        for (const ext of EXTENSIONS) {
            const d = extDiagnostics[ext];
            if (!d?.ok) {
                console.log(`      .${ext}: ${red('skip')} (not reachable)`);
                continue;
            }
            const payload = await probePayload(episodeUrl(streamId, ext));
            const status = payload.error ? `${payload.status} (${payload.error})` : `${payload.status}`;
            console.log(`      .${ext}: HTTP ${status} | mode=${payload.requestMode || 'range'} | type=${payload.contentType || 'n/a'} | magic=${payload.magic}`);
            console.log(`             finalUrl=${payload.finalUrl || 'n/a'}`);
            console.log(`             contentLength=${payload.contentLength || 'n/a'} | captured=${payload.bodyBytesCaptured ?? 0} bytes | truncated=${payload.bodyWasTruncated ? 'yes' : 'no'}`);
            console.log(`             hex=${payload.hex || 'n/a'}`);
            console.log(`             ascii=${payload.ascii || 'n/a'}`);
            if (payload.headers && typeof payload.headers === 'object') {
                const server = payload.headers.server || payload.headers.Server || 'n/a';
                const via = payload.headers.via || payload.headers.Via || 'n/a';
                const loc = payload.headers.location || payload.headers.Location || '';
                console.log(`             server=${String(server)} | via=${String(via)}${loc ? ` | location=${String(loc)}` : ''}`);
            }
            if (payload.fullTextBody) {
                const compact = payload.fullTextBody
                    .replace(/\s+/g, ' ')
                    .trim()
                    .slice(0, 600);
                console.log(`             textBody="${compact}"`);
            }

            if (isSuspiciousPayload(payload)) {
                const fallback = await probePayloadWithOptions(episodeUrl(streamId, ext), { useRange: false, browserLike: true });
                const fStatus = fallback.error ? `${fallback.status} (${fallback.error})` : `${fallback.status}`;
                console.log(`             ↳ secondProbe: HTTP ${fStatus} | mode=${fallback.requestMode || 'full+browser'} | type=${fallback.contentType || 'n/a'} | magic=${fallback.magic}`);
                console.log(`               finalUrl=${fallback.finalUrl || 'n/a'}`);
                console.log(`               contentLength=${fallback.contentLength || 'n/a'} | captured=${fallback.bodyBytesCaptured ?? 0} bytes | truncated=${fallback.bodyWasTruncated ? 'yes' : 'no'}`);
                console.log(`               hex=${fallback.hex || 'n/a'}`);
                console.log(`               ascii=${fallback.ascii || 'n/a'}`);
                if (fallback.fullTextBody) {
                    const compact2 = fallback.fullTextBody
                        .replace(/\s+/g, ' ')
                        .trim()
                        .slice(0, 1200);
                    console.log(`               textBody="${compact2}"`);
                }
            }
        }
        console.log('');

        // Deep-diagnose every episode in season using declared extension.
        // This catches "one bad episode while others work" cases.
        console.log(`    Deep payload diagnosis for all episodes (.${declaredExt}):`);
        const perEpisode = [];
        for (const ep of eps) {
            const sid = ep.id || ep.stream_id;
            const url = episodeUrl(sid, declaredExt);
            let payload = await probePayload(url);
            let usedSecondProbe = false;
            if (isSuspiciousPayload(payload)) {
                payload = await probePayloadWithOptions(url, { useRange: false, browserLike: true });
                usedSecondProbe = true;
            }
            const row = {
                episode: ep.episode_num,
                title: String(ep.title || '').trim(),
                streamId: sid,
                status: payload.status || 0,
                contentType: String(payload.contentType || ''),
                magic: String(payload.magic || ''),
                finalUrl: String(payload.finalUrl || ''),
                secondProbe: usedSecondProbe,
                okMedia: (
                    payload.status > 0
                    && payload.status < 400
                    && !String(payload.contentType || '').toLowerCase().includes('text/html')
                    && !String(payload.magic || '').toLowerCase().includes('html')
                ),
            };
            perEpisode.push(row);
        }

        const badEpisodes = perEpisode.filter((r) => !r.okMedia);
        for (const row of perEpisode) {
            const mark = row.okMedia ? green('✓') : red('✗');
            const note = row.secondProbe ? ' (2nd probe)' : '';
            const host = (() => {
                try { return new URL(row.finalUrl).host; } catch { return 'n/a'; }
            })();
            console.log(
                `      ${mark} E${String(row.episode).padStart(2, '0')} sid=${row.streamId} ` +
                `HTTP ${row.status} type=${row.contentType || 'n/a'} magic=${row.magic || 'n/a'} host=${host}${note}`
            );
        }

        if (badEpisodes.length > 0) {
            console.log(red(`      Found ${badEpisodes.length} episode(s) with suspicious/non-media payload.`));
            for (const row of badEpisodes.slice(0, 5)) {
                console.log(
                    `      → E${row.episode} sid=${row.streamId} status=${row.status} type=${row.contentType} magic=${row.magic}`
                );
            }
        } else {
            console.log(green('      All episodes in this season returned media-like payloads.'));
        }
        console.log('');
    }

    // Step 5 — summary
    console.log(bold('\n═══════════════════════════════════════════════════════'));
    console.log(bold(' Summary'));
    console.log(bold('═══════════════════════════════════════════════════════'));
    for (const s of summary) {
        if (s.status === 'no episodes') {
            console.log(`  Season ${s.season}: ${yellow('no episodes in API response')}`);
            continue;
        }
        const extStatus = s.workingExts.length > 0
            ? green(`WORKING (${s.workingExts.join(', ')})`)
            : red('BROKEN — no extension works');
        const epStatus = `${s.working} working / ${s.broken} broken / ${s.timedOut} timeout`;
        console.log(`  Season ${s.season}: ${extStatus}  |  Episodes: ${epStatus}`);
    }

    // Step 6 — diagnosis
    console.log(bold('\n═══════════════════════════════════════════════════════'));
    console.log(bold(' Diagnosis'));
    console.log(bold('═══════════════════════════════════════════════════════'));

    const brokenSeasons = summary.filter(s => s.workingExts?.length === 0 && s.status !== 'no episodes');
    const workingSeasons = summary.filter(s => s.workingExts?.length > 0);

    if (brokenSeasons.length === 0) {
        console.log(green('  All seasons have working streams. Issue may be intermittent.'));
    } else {
        console.log(red(`  ${brokenSeasons.length} season(s) have no working streams: ${brokenSeasons.map(s => `Season ${s.season}`).join(', ')}`));
        console.log('');
        console.log('  Possible causes:');
        console.log('  1. Content was removed from the server (most likely)');
        console.log('  2. Stream IDs point to dead/expired sources');
        console.log('  3. Server requires authentication that expired');
        if (workingSeasons.length > 0) {
            console.log(`\n  Season ${workingSeasons.map(s => s.season).join(', ')} work fine — confirms server is reachable.`);
            console.log('  The broken seasons simply have missing content on this portal.');
        }
    }
    console.log('');
}

main().catch((e) => { console.error(red('Fatal: ' + e.message)); process.exit(1); });
