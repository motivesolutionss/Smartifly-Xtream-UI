#!/usr/bin/env node
/**
 * Series Season Diagnostic Script
 *
 * Fetches all episodes for a series and tests each stream URL
 * to find why some seasons work and others don't.
 *
 * Usage:
 *   node scripts/diagnose-series.js
 *
 * Fill in the CONFIG section below before running.
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');

// =============================================================================
// CONFIG — fill these in before running
// =============================================================================
const CONFIG = {
    serverUrl: 'http://YOUR_SERVER_URL',   // e.g. http://192.168.1.100:8080
    username: 'YOUR_USERNAME',
    password: 'YOUR_PASSWORD',
    seriesId: 0,                            // e.g. 12345 — get from app logs or series URL
    // How long to wait for each stream URL probe (ms)
    streamProbeTimeoutMs: 5000,
};
// =============================================================================

const EXTENSIONS = ['mkv', 'mp4', 'ts', 'avi', 'm4v'];

// ── Helpers ──────────────────────────────────────────────────────────────────

function apiRequest(url) {
    return new Promise((resolve, reject) => {
        const parsed = new URL(url);
        const lib = parsed.protocol === 'https:' ? https : http;
        const req = lib.get(url, { timeout: 10000 }, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
                catch { resolve({ status: res.statusCode, body: data }); }
            });
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('Request timed out')); });
    });
}

/**
 * Probe a stream URL — returns the HTTP status code.
 * Uses a HEAD request first (fast), falls back to GET with range if HEAD fails.
 */
function probeStreamUrl(url) {
    return new Promise((resolve) => {
        const parsed = new URL(url);
        const lib = parsed.protocol === 'https:' ? https : http;
        const options = {
            hostname: parsed.hostname,
            port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
            path: parsed.pathname + parsed.search,
            method: 'HEAD',
            timeout: CONFIG.streamProbeTimeoutMs,
            headers: { 'Range': 'bytes=0-1023' },
        };

        const req = lib.request(options, (res) => {
            resolve({ status: res.statusCode, ok: res.statusCode < 400 });
            res.resume(); // drain
        });

        req.on('error', (err) => resolve({ status: 0, ok: false, error: err.message }));
        req.on('timeout', () => { req.destroy(); resolve({ status: 408, ok: false, error: 'timeout' }); });
        req.end();
    });
}

function buildEpisodeUrl(streamId, extension) {
    const user = encodeURIComponent(CONFIG.username);
    const pass = encodeURIComponent(CONFIG.password);
    const base = CONFIG.serverUrl.replace(/\/$/, '');
    return `${base}/series/${user}/${pass}/${streamId}.${extension}`;
}

function colorStatus(ok) {
    return ok ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m';
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
    if (!CONFIG.serverUrl.startsWith('http') || CONFIG.seriesId === 0) {
        console.error('\n❌  Fill in CONFIG at the top of the script before running.\n');
        process.exit(1);
    }

    const apiBase = CONFIG.serverUrl.replace(/\/$/, '');
    const user = encodeURIComponent(CONFIG.username);
    const pass = encodeURIComponent(CONFIG.password);

    console.log('\n═══════════════════════════════════════════════════════');
    console.log(' Series Season Diagnostic');
    console.log(`  Server  : ${CONFIG.serverUrl}`);
    console.log(`  Series  : ${CONFIG.seriesId}`);
    console.log('═══════════════════════════════════════════════════════\n');

    // 1. Fetch series info
    console.log('① Fetching series info from API...');
    const infoUrl = `${apiBase}/player_api.php?username=${user}&password=${pass}&action=get_series_info&series_id=${CONFIG.seriesId}`;
    let seriesData;
    try {
        const res = await apiRequest(infoUrl);
        if (res.status !== 200 || !res.body?.info) {
            console.error(`   ✗ API returned status ${res.status}. Check credentials and series ID.`);
            console.error('   Response:', JSON.stringify(res.body).slice(0, 300));
            process.exit(1);
        }
        seriesData = res.body;
        console.log(`   ✓ "${seriesData.info.name}" — ${Object.keys(seriesData.episodes || {}).length} seasons found\n`);
    } catch (err) {
        console.error('   ✗ Failed to fetch series info:', err.message);
        process.exit(1);
    }

    const episodes = seriesData.episodes || {};
    const seasons = Object.keys(episodes).sort((a, b) => Number(a) - Number(b));

    if (seasons.length === 0) {
        console.log('⚠  No episodes found in API response.');
        process.exit(0);
    }

    // 2. For each season, probe the first episode with all extensions
    const results = {};

    for (const season of seasons) {
        const seasonEpisodes = Array.isArray(episodes[season])
            ? episodes[season]
            : Object.values(episodes[season] || {});

        if (seasonEpisodes.length === 0) {
            console.log(`Season ${season}: no episodes in response`);
            continue;
        }

        const firstEp = seasonEpisodes[0];
        const streamId = firstEp.id || firstEp.stream_id;
        const declaredExt = firstEp.container_extension || 'mkv';

        console.log(`─── Season ${season} (${seasonEpisodes.length} episodes) ───────────────────`);
        console.log(`    First episode : E${firstEp.episode_num} "${firstEp.title}"`);
        console.log(`    Stream ID     : ${streamId}`);
        console.log(`    Declared ext  : ${declaredExt}`);
        console.log(`    Probing stream URLs...\n`);

        results[season] = { streamId, declaredExt, probes: {} };

        for (const ext of EXTENSIONS) {
            const url = buildEpisodeUrl(streamId, ext);
            const probe = await probeStreamUrl(url);
            results[season].probes[ext] = probe;
            const marker = colorStatus(probe.ok);
            const detail = probe.error ? ` (${probe.error})` : ` HTTP ${probe.status}`;
            const isDeclared = ext === declaredExt ? ' ← declared' : '';
            console.log(`    ${marker} .${ext.padEnd(4)} ${detail}${isDeclared}`);
        }

        // Also probe all episodes in this season briefly (just declared ext)
        console.log(`\n    Probing all ${seasonEpisodes.length} episodes (.${declaredExt})...`);
        let working = 0;
        let broken = 0;
        for (const ep of seasonEpisodes) {
            const sid = ep.id || ep.stream_id;
            const url = buildEpisodeUrl(sid, declaredExt);
            const probe = await probeStreamUrl(url);
            if (probe.ok) working++;
            else broken++;
        }
        console.log(`    Working: ${working}  Broken: ${broken}\n`);
    }

    // 3. Summary
    console.log('\n═══════════════════════════════════════════════════════');
    console.log(' Summary');
    console.log('═══════════════════════════════════════════════════════');
    for (const season of seasons) {
        const r = results[season];
        if (!r) continue;
        const workingExts = Object.entries(r.probes)
            .filter(([, p]) => p.ok)
            .map(([ext]) => ext);
        const status = workingExts.length > 0
            ? `\x1b[32mWORKING\x1b[0m (${workingExts.join(', ')})`
            : '\x1b[31mBROKEN — no extension works\x1b[0m';
        console.log(`  Season ${season}: ${status}`);
    }
    console.log('');
}

main().catch((err) => {
    console.error('Unexpected error:', err);
    process.exit(1);
});
