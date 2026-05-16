#!/usr/bin/env node
/**
 * Episode-focused VLC startup diagnostic.
 *
 * Why this exists:
 * - Some episodes return "working" on HEAD/range probes but still fail to start in iOS VLC.
 * - We need startup-level diagnostics: TTFB, sustained chunk flow, mid-start stalls, token freshness.
 *
 * Usage:
 *   node scripts/diagnose-episode-vlc.js
 *   node scripts/diagnose-episode-vlc.js --stream-id 38573 --ext mkv --attempts 6 --window-ms 35000
 *   node scripts/diagnose-episode-vlc.js --url "http://...mkv?token=..."
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');

const CONFIG = {
    serverUrl: 'http://premiumtvs.space:8080',
    username: '93362102729',
    password: '53620382639',
    streamId: '38573',
    ext: 'mkv',
    attempts: 6,
    startupWindowMs: 35000,
    connectTimeoutMs: 12000,
    betweenAttemptsMs: 1500,
    customUrl: '',
};

function parseCli() {
    const args = process.argv.slice(2);
    for (let i = 0; i < args.length; i += 1) {
        const arg = args[i];
        const next = args[i + 1];
        if (arg === '--stream-id' && next) {
            CONFIG.streamId = String(next);
            i += 1;
        } else if (arg === '--ext' && next) {
            CONFIG.ext = String(next).toLowerCase();
            i += 1;
        } else if (arg === '--attempts' && next) {
            const n = Number(next);
            if (!Number.isNaN(n) && n > 0) CONFIG.attempts = n;
            i += 1;
        } else if (arg === '--window-ms' && next) {
            const n = Number(next);
            if (!Number.isNaN(n) && n > 1000) CONFIG.startupWindowMs = n;
            i += 1;
        } else if (arg === '--url' && next) {
            CONFIG.customUrl = String(next);
            i += 1;
        }
    }
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildXtreamUrl(streamId, ext, cacheBust = '') {
    const base = CONFIG.serverUrl.replace(/\/$/, '');
    const u = encodeURIComponent(CONFIG.username);
    const p = encodeURIComponent(CONFIG.password);
    const url = `${base}/series/${u}/${p}/${streamId}.${ext}`;
    if (!cacheBust) return url;
    return `${url}?sf_diag=${encodeURIComponent(cacheBust)}`;
}

function resolveFinalUrl(url, maxRedirects = 8) {
    return new Promise((resolve) => {
        const seen = [];
        const walk = (target, left) => {
            const parsed = new URL(target);
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
                seen.push({ url: target, status, host: parsed.host, location: String(res.headers.location || '') });
                const loc = res.headers.location;
                if ((status === 301 || status === 302 || status === 307 || status === 308) && loc && left > 0) {
                    res.resume();
                    const next = loc.startsWith('http') ? loc : new URL(loc, target).toString();
                    walk(next, left - 1);
                    return;
                }
                res.resume();
                resolve({ finalUrl: target, chain: seen, status });
            });
            req.on('error', (e) => resolve({ finalUrl: target, chain: seen, status: 0, error: e.message }));
            req.on('timeout', () => {
                req.destroy();
                resolve({ finalUrl: target, chain: seen, status: 408, error: 'timeout' });
            });
            req.end();
        };
        walk(url, maxRedirects);
    });
}

function startupProbe(url) {
    return new Promise((resolve) => {
        const startedAt = Date.now();
        const parsed = new URL(url);
        const lib = parsed.protocol === 'https:' ? https : http;
        const chunks = [];
        let bytes = 0;
        let firstByteMs = null;
        let headersAtMs = null;
        let statusCode = 0;
        let contentType = '';
        let contentLength = '';
        let maxGapMs = 0;
        let lastChunkAt = startedAt;
        let timedOut = false;
        let ended = false;

        const req = lib.request({
            protocol: parsed.protocol,
            hostname: parsed.hostname,
            port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
            path: parsed.pathname + parsed.search,
            method: 'GET',
            timeout: CONFIG.connectTimeoutMs,
            headers: {
                Range: 'bytes=0-10485759', // 10MB sample
                'User-Agent': 'VLC/3.0.20 LibVLC/3.0.20',
                Connection: 'close',
            },
        }, (res) => {
            statusCode = res.statusCode || 0;
            headersAtMs = Date.now() - startedAt;
            contentType = String(res.headers['content-type'] || '');
            contentLength = String(res.headers['content-length'] || '');

            res.on('data', (chunk) => {
                const now = Date.now();
                const gap = now - lastChunkAt;
                if (gap > maxGapMs) maxGapMs = gap;
                lastChunkAt = now;
                if (firstByteMs == null) firstByteMs = now - startedAt;
                bytes += chunk.length;
                if (chunks.length < 8) chunks.push(chunk); // only keep preview chunks
            });

            res.on('end', () => {
                ended = true;
            });
        });

        req.on('error', (e) => {
            if (ended) return;
            ended = true;
            resolve({
                ok: false,
                reason: `request-error:${e.message}`,
                statusCode,
                headersAtMs,
                firstByteMs,
                bytes,
                contentType,
                contentLength,
                maxGapMs,
            });
        });

        req.on('timeout', () => {
            req.destroy();
            timedOut = true;
        });

        req.end();

        const hardStop = setTimeout(() => {
            req.destroy();
            const elapsed = Date.now() - startedAt;
            const preview = Buffer.concat(chunks).slice(0, 64);
            const magic = preview.slice(0, 4).toString('hex').toLowerCase() === '1a45dfa3' ? 'mkv-ebml' : 'other';
            const healthyStart = (
                (statusCode === 200 || statusCode === 206)
                && bytes > 128 * 1024
                && firstByteMs != null
                && firstByteMs < 8000
                && maxGapMs < 10000
            );
            resolve({
                ok: healthyStart,
                reason: healthyStart ? 'healthy-start' : (timedOut ? 'socket-timeout' : 'startup-window-ended'),
                statusCode,
                headersAtMs,
                firstByteMs,
                bytes,
                elapsedMs: elapsed,
                contentType,
                contentLength,
                maxGapMs,
                magic,
                previewHex: preview.toString('hex'),
            });
        }, CONFIG.startupWindowMs);

        // Keep this timer attached so the process never exits before an attempt resolves.
    });
}

function printChain(chain) {
    for (let i = 0; i < chain.length; i += 1) {
        const r = chain[i];
        const loc = r.location ? ` -> ${r.location}` : '';
        console.log(`   ${i + 1}. [${r.status}] ${r.host}${loc}`);
    }
}

async function runAttempt(index) {
    const attemptTag = `a${index + 1}-${Date.now()}`;
    const baseUrl = CONFIG.customUrl || buildXtreamUrl(CONFIG.streamId, CONFIG.ext, attemptTag);
    const resolved = await resolveFinalUrl(baseUrl);
    const urlToProbe = resolved.finalUrl;
    const startup = await startupProbe(urlToProbe);
    return { attemptTag, baseUrl, resolved, startup };
}

async function main() {
    parseCli();
    console.log('\n═══════════════════════════════════════════════════════');
    console.log(' Smartifly Episode VLC Startup Diagnostic');
    console.log(` Stream ID : ${CONFIG.streamId}`);
    console.log(` Ext       : ${CONFIG.ext}`);
    console.log(` Attempts  : ${CONFIG.attempts}`);
    console.log(` Window    : ${CONFIG.startupWindowMs}ms`);
    if (CONFIG.customUrl) console.log(' Mode      : custom URL');
    console.log('═══════════════════════════════════════════════════════\n');

    const results = [];
    for (let i = 0; i < CONFIG.attempts; i += 1) {
        console.log(`Attempt ${i + 1}/${CONFIG.attempts}`);
        try {
            const r = await runAttempt(i);
            results.push(r);
            console.log(` baseUrl   : ${r.baseUrl}`);
            console.log(` finalUrl  : ${r.resolved.finalUrl}`);
            console.log(' redirect chain:');
            printChain(r.resolved.chain);
            const s = r.startup;
            console.log(` startup   : ok=${s.ok} reason=${s.reason} status=${s.statusCode}`);
            console.log(` metrics   : headers=${s.headersAtMs}ms firstByte=${s.firstByteMs}ms bytes=${s.bytes} maxGap=${s.maxGapMs}ms type=${s.contentType || 'n/a'} magic=${s.magic || 'n/a'}`);
            console.log('');
        } catch (e) {
            const errMsg = e && e.message ? e.message : String(e);
            console.log(` startup   : ok=false reason=attempt-crash:${errMsg}`);
            console.log('');
            results.push({
                startup: {
                    ok: false,
                    reason: `attempt-crash:${errMsg}`,
                    firstByteMs: CONFIG.startupWindowMs,
                    bytes: 0,
                },
            });
        }
        if (i < CONFIG.attempts - 1) {
            await sleep(CONFIG.betweenAttemptsMs);
        }
    }

    const okCount = results.filter((r) => r.startup.ok).length;
    const failCount = results.length - okCount;
    const avgBytes = Math.round(results.reduce((a, r) => a + (r.startup.bytes || 0), 0) / Math.max(1, results.length));
    const avgFirstByte = Math.round(results.reduce((a, r) => a + (r.startup.firstByteMs || CONFIG.startupWindowMs), 0) / Math.max(1, results.length));

    console.log('═══════════════════════════════════════════════════════');
    console.log(' Summary');
    console.log('═══════════════════════════════════════════════════════');
    console.log(` healthy starts : ${okCount}/${results.length}`);
    console.log(` failed starts  : ${failCount}/${results.length}`);
    console.log(` avg firstByte  : ${avgFirstByte}ms`);
    console.log(` avg bytes      : ${avgBytes}`);

    if (failCount > 0 && okCount === 0) {
        console.log('\nDiagnosis: stream is reachable but startup is unstable for VLC-style session windows.');
        console.log('Likely causes: token/session volatility, redirect host inconsistency, or mid-start stall.');
        console.log('Action: choose best final host route and persist per stream, or preflight before mount.');
    } else if (okCount > 0 && failCount > 0) {
        console.log('\nDiagnosis: intermittent startup path. Some attempts are healthy, some stall.');
        console.log('Action: adaptive per-stream routing + automatic retry with fresh URL is required.');
    } else {
        console.log('\nDiagnosis: startup path looks healthy in repeated probes.');
        console.log('If app still fails, issue is likely native player/session lifecycle rather than source media.');
    }
    console.log('');
}

main().catch((e) => {
    console.error('Fatal:', e.message);
    process.exit(1);
});
