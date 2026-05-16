#!/usr/bin/env node
/**
 * Deeper episode playback-session diagnostic.
 *
 * Goal:
 * - Go beyond "URL returns 200/206"
 * - Simulate app-like constraints: long-lived streaming, stalls, token freshness,
 *   repeated opens, and optional decode-level probe (ffprobe if present).
 *
 * Usage:
 *   node scripts/diagnose-episode-playback-session.js --stream-id 38573 --ext mkv
 *   node scripts/diagnose-episode-playback-session.js --stream-id 38573 --ext mkv --sessions 4 --read-ms 45000
 *   node scripts/diagnose-episode-playback-session.js --url "http://...mkv?token=..."
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');
const { spawnSync } = require('child_process');

const CONFIG = {
    serverUrl: 'http://premiumtvs.space:8080',
    username: '93362102729',
    password: '53620382639',
    streamId: '38573',
    ext: 'mkv',
    customUrl: '',
    sessions: 4,
    readWindowMs: 45000,
    connectTimeoutMs: 12000,
    betweenSessionsMs: 1500,
    stallGapMs: 12000, // if no chunk for this long -> stall marker
    printPreviewBytes: 64,
};

function parseCli() {
    const args = process.argv.slice(2);
    for (let i = 0; i < args.length; i += 1) {
        const a = args[i];
        const n = args[i + 1];
        if (a === '--stream-id' && n) {
            CONFIG.streamId = String(n); i += 1;
        } else if (a === '--ext' && n) {
            CONFIG.ext = String(n).toLowerCase(); i += 1;
        } else if (a === '--url' && n) {
            CONFIG.customUrl = String(n); i += 1;
        } else if (a === '--sessions' && n) {
            const v = Number(n); if (!Number.isNaN(v) && v > 0) CONFIG.sessions = v; i += 1;
        } else if (a === '--read-ms' && n) {
            const v = Number(n); if (!Number.isNaN(v) && v > 5000) CONFIG.readWindowMs = v; i += 1;
        }
    }
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function xtreamUrl(streamId, ext, nonce = '') {
    const base = CONFIG.serverUrl.replace(/\/$/, '');
    const u = encodeURIComponent(CONFIG.username);
    const p = encodeURIComponent(CONFIG.password);
    const raw = `${base}/series/${u}/${p}/${streamId}.${ext}`;
    if (!nonce) return raw;
    const sep = raw.includes('?') ? '&' : '?';
    return `${raw}${sep}sf_session=${encodeURIComponent(nonce)}`;
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
                timeout: CONFIG.connectTimeoutMs,
                headers: { Range: 'bytes=0-1023', Connection: 'close' },
            }, (res) => {
                const status = res.statusCode || 0;
                const loc = res.headers.location ? String(res.headers.location) : '';
                chain.push({ url: target, status, host: parsed.host, location: loc });
                if ((status === 301 || status === 302 || status === 307 || status === 308) && loc && left > 0) {
                    res.resume();
                    const next = loc.startsWith('http') ? loc : new URL(loc, target).toString();
                    step(next, left - 1);
                    return;
                }
                res.resume();
                resolve({
                    ok: status > 0 && status < 500,
                    finalUrl: target,
                    finalStatus: status,
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

function detectMagic(preview) {
    if (!preview || preview.length < 4) return 'unknown';
    const h = preview.slice(0, 4).toString('hex').toLowerCase();
    if (h === '1a45dfa3') return 'mkv-ebml';
    if (h === '66747970') return 'mp4-ftyp';
    if (preview[0] === 0x47) return 'mpeg-ts';
    return 'unknown';
}

function runFfprobe(url) {
    const probe = spawnSync('ffprobe', [
        '-v', 'error',
        '-show_streams',
        '-show_format',
        '-of', 'json',
        '-i', url,
    ], { encoding: 'utf8', timeout: 20000 });

    if (probe.error) {
        return { ok: false, skipped: true, reason: probe.error.message };
    }
    if (probe.status !== 0) {
        return { ok: false, skipped: false, reason: (probe.stderr || '').trim().slice(0, 400) };
    }
    try {
        const parsed = JSON.parse(probe.stdout || '{}');
        const streamCount = Array.isArray(parsed.streams) ? parsed.streams.length : 0;
        const codecTypes = (parsed.streams || []).map((s) => s.codec_type).filter(Boolean);
        return { ok: true, streamCount, codecTypes };
    } catch (e) {
        return { ok: false, skipped: false, reason: `ffprobe-json-parse:${e.message}` };
    }
}

function streamSessionProbe(finalUrl) {
    return new Promise((resolve) => {
        const started = Date.now();
        const parsed = new URL(finalUrl);
        const lib = parsed.protocol === 'https:' ? https : http;
        let status = 0;
        let firstByteMs = null;
        let headersMs = null;
        let bytes = 0;
        let chunks = 0;
        let maxGapMs = 0;
        let stalls = 0;
        let lastChunkAt = started;
        let contentType = '';
        const previewParts = [];
        let done = false;

        const req = lib.request({
            protocol: parsed.protocol,
            hostname: parsed.hostname,
            port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
            path: parsed.pathname + parsed.search,
            method: 'GET',
            timeout: CONFIG.connectTimeoutMs,
            headers: {
                Range: 'bytes=0-52428799', // 50MB upper sample window
                Connection: 'close',
                'User-Agent': 'VLC/3.0.20 LibVLC/3.0.20',
            },
        }, (res) => {
            status = res.statusCode || 0;
            headersMs = Date.now() - started;
            contentType = String(res.headers['content-type'] || '');

            res.on('data', (chunk) => {
                const now = Date.now();
                const gap = now - lastChunkAt;
                if (gap > maxGapMs) maxGapMs = gap;
                if (gap > CONFIG.stallGapMs) stalls += 1;
                lastChunkAt = now;
                if (firstByteMs == null) firstByteMs = now - started;
                bytes += chunk.length;
                chunks += 1;
                if (previewParts.length < 6) previewParts.push(chunk);
            });

            res.on('error', () => {
                // handled by time-bound finalizer
            });
        });

        req.on('error', (e) => {
            if (done) return;
            done = true;
            resolve({
                ok: false,
                reason: `request-error:${e.message}`,
                status,
                headersMs,
                firstByteMs,
                bytes,
                chunks,
                maxGapMs,
                stalls,
                contentType,
            });
        });

        req.on('timeout', () => {
            req.destroy();
        });

        req.end();

        setTimeout(() => {
            if (done) return;
            done = true;
            req.destroy();
            const elapsedMs = Date.now() - started;
            const preview = Buffer.concat(previewParts).slice(0, CONFIG.printPreviewBytes);
            const magic = detectMagic(preview);
            const healthy = (
                (status === 200 || status === 206)
                && firstByteMs != null
                && firstByteMs < 9000
                && bytes > 1024 * 1024 // >1MB in session window
                && stalls <= 1
            );
            resolve({
                ok: healthy,
                reason: healthy ? 'healthy-session' : 'unstable-session',
                status,
                headersMs,
                firstByteMs,
                bytes,
                chunks,
                maxGapMs,
                stalls,
                elapsedMs,
                contentType,
                magic,
                previewHex: preview.toString('hex'),
            });
        }, CONFIG.readWindowMs);
    });
}

function printChain(chain) {
    for (let i = 0; i < chain.length; i += 1) {
        const c = chain[i];
        const loc = c.location ? ` -> ${c.location}` : '';
        console.log(`   ${i + 1}. [${c.status}] ${c.host}${loc}`);
    }
}

async function runSession(i) {
    const nonce = `s${i + 1}-${Date.now()}`;
    const baseUrl = CONFIG.customUrl || xtreamUrl(CONFIG.streamId, CONFIG.ext, nonce);
    const resolved = await resolveRedirectChain(baseUrl);
    const finalUrl = resolved.finalUrl;
    const ffprobe = runFfprobe(finalUrl);
    const streamProbe = await streamSessionProbe(finalUrl);
    return { baseUrl, resolved, finalUrl, ffprobe, streamProbe };
}

async function main() {
    parseCli();
    console.log('\n═══════════════════════════════════════════════════════');
    console.log(' Smartifly Playback Session Diagnostic');
    console.log(` Stream ID : ${CONFIG.streamId}`);
    console.log(` Ext       : ${CONFIG.ext}`);
    console.log(` Sessions  : ${CONFIG.sessions}`);
    console.log(` Read win  : ${CONFIG.readWindowMs}ms`);
    if (CONFIG.customUrl) console.log(' Mode      : custom URL');
    console.log('═══════════════════════════════════════════════════════\n');

    const results = [];
    for (let i = 0; i < CONFIG.sessions; i += 1) {
        console.log(`Session ${i + 1}/${CONFIG.sessions}`);
        const r = await runSession(i);
        results.push(r);
        console.log(` baseUrl   : ${r.baseUrl}`);
        console.log(` finalUrl  : ${r.finalUrl}`);
        console.log(' redirect chain:');
        printChain(r.resolved.chain || []);
        if (r.ffprobe.ok) {
            console.log(` ffprobe   : ok streams=${r.ffprobe.streamCount} codecs=${(r.ffprobe.codecTypes || []).join(',')}`);
        } else if (r.ffprobe.skipped) {
            console.log(` ffprobe   : skipped (${r.ffprobe.reason})`);
        } else {
            console.log(` ffprobe   : fail (${r.ffprobe.reason})`);
        }
        const s = r.streamProbe;
        console.log(` stream    : ok=${s.ok} reason=${s.reason} status=${s.status}`);
        console.log(` metrics   : headers=${s.headersMs}ms firstByte=${s.firstByteMs}ms bytes=${s.bytes} chunks=${s.chunks} maxGap=${s.maxGapMs}ms stalls=${s.stalls} type=${s.contentType || 'n/a'} magic=${s.magic || 'n/a'}`);
        console.log('');
        if (i < CONFIG.sessions - 1) await sleep(CONFIG.betweenSessionsMs);
    }

    const okCount = results.filter((r) => r.streamProbe.ok).length;
    const failCount = results.length - okCount;
    const avgBytes = Math.round(results.reduce((a, r) => a + (r.streamProbe.bytes || 0), 0) / Math.max(1, results.length));
    const avgFirstByte = Math.round(results.reduce((a, r) => a + (r.streamProbe.firstByteMs || CONFIG.readWindowMs), 0) / Math.max(1, results.length));
    const hosts = [...new Set(results.map((r) => {
        try { return new URL(r.finalUrl).host; } catch { return 'invalid-host'; }
    }))];

    console.log('═══════════════════════════════════════════════════════');
    console.log(' Summary');
    console.log('═══════════════════════════════════════════════════════');
    console.log(` healthy sessions : ${okCount}/${results.length}`);
    console.log(` failed sessions  : ${failCount}/${results.length}`);
    console.log(` avg firstByte    : ${avgFirstByte}ms`);
    console.log(` avg bytes        : ${avgBytes}`);
    console.log(` final hosts seen : ${hosts.join(', ')}`);

    if (okCount === results.length) {
        console.log('\nDiagnosis: delivery + decode probe look healthy in repeated sessions.');
        console.log('If app still fails, issue is likely iOS player lifecycle/state transitions.');
    } else if (okCount > 0) {
        console.log('\nDiagnosis: intermittent session instability (some sessions healthy, some fail).');
        console.log('Likely token/host/session volatility. Route memory + host pinning is recommended.');
    } else {
        console.log('\nDiagnosis: session-level failures persist across attempts.');
        console.log('Likely stream/session incompatibility for this device/player path.');
    }
    console.log('');
}

main().catch((e) => {
    console.error('Fatal:', e.message);
    process.exit(1);
});

