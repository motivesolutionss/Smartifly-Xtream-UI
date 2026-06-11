#!/usr/bin/env node

const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');
const axios = require('axios');
const m3u8Parser = require('m3u8-parser');
const pLimit = require('p-limit');
const { URL } = require('url');

const DEFAULT_URLS = [
  'http://203.99.56.34:25461/live/test/1234/1.m3u8',
  'http://203.99.56.34:25461/live/test/1234/2.m3u8',
  'http://203.99.56.34:25461/live/test/1234/3.m3u8',
  'http://203.99.56.34:25461/live/test/1234/4.m3u8'
];

async function ensureDir(dir) {
  await fsp.mkdir(dir, { recursive: true });
}

function safeNameFromUrl(u) {
  // create a safe directory name from the URL
  return u.replace(/[:\/\?\#\&=]/g, '_').replace(/^_+|_+$/g, '');
}

async function fetchText(url, timeout = 15000) {
  const res = await axios.get(url, { timeout, responseType: 'text' });
  return res.data;
}

async function downloadTo(url, destPath, retries = 3, timeout = 20000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await axios.get(url, { responseType: 'stream', timeout });
      await new Promise((resolve, reject) => {
        const writer = fs.createWriteStream(destPath);
        res.data.pipe(writer);
        writer.on('finish', resolve);
        writer.on('error', reject);
      });
      return;
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise(r => setTimeout(r, 1000 * attempt));
    }
  }
}

async function processMediaPlaylist(playlistUrl, outDir, concurrency = 8, retries = 3) {
  console.log('Processing media playlist:', playlistUrl);
  const text = await fetchText(playlistUrl);
  const parser = new m3u8Parser.Parser();
  parser.push(text);
  parser.end();
  const segments = (parser.manifest && parser.manifest.segments) || [];

  const baseName = safeNameFromUrl(playlistUrl);
  const streamDir = path.join(outDir, baseName);
  await ensureDir(streamDir);

  const limit = pLimit(concurrency);
  const downloaded = [];

  await Promise.all(
    segments.map((seg, idx) =>
      limit(async () => {
        const segUri = seg.uri;
        const resolved = new URL(segUri, playlistUrl).href;
        const segName = String(idx).padStart(5, '0') + '_' + path.basename(new URL(resolved).pathname);
        const dest = path.join(streamDir, segName);
        try {
          await downloadTo(resolved, dest, retries);
          downloaded.push(segName);
          process.stdout.write('.');
        } catch (err) {
          process.stdout.write('F');
          console.error('\nFailed to download segment', resolved, err.message || err);
        }
      })
    )
  );

  process.stdout.write('\n');

  // Write local playlist replacing segment URIs with local file names
  const localLines = text.split(/\r?\n/).map(line => {
    if (!line || line.startsWith('#')) return line;
    // map sequentially using downloaded list in order
    const segIdx = segments.findIndex(s => {
      try {
        return new URL(s.uri, playlistUrl).href.endsWith(new URL(line, playlistUrl).pathname);
      } catch (e) {
        return false;
      }
    });
    if (segIdx >= 0 && downloaded[segIdx]) return downloaded[segIdx];
    return line;
  });

  const outPlaylist = path.join(streamDir, 'local.m3u8');
  await fsp.writeFile(outPlaylist, localLines.join('\n'), 'utf8');
  console.log('Saved local playlist to', outPlaylist);
}

async function processPlaylist(url, outDir, concurrency, retries) {
  console.log('Fetching playlist:', url);
  const text = await fetchText(url);
  const parser = new m3u8Parser.Parser();
  parser.push(text);
  parser.end();

  if (parser.manifest && parser.manifest.playlists && parser.manifest.playlists.length > 0) {
    console.log('Master playlist detected, processing variants...');
    for (const pl of parser.manifest.playlists) {
      const resolved = new URL(pl.uri, url).href;
      await processMediaPlaylist(resolved, outDir, concurrency, retries);
    }
    // Save master playlist as-is
    const masterDir = path.join(outDir, safeNameFromUrl(url));
    await ensureDir(masterDir);
    await fsp.writeFile(path.join(masterDir, 'master.m3u8'), text, 'utf8');
    console.log('Saved master playlist to', path.join(masterDir, 'master.m3u8'));
  } else {
    await processMediaPlaylist(url, outDir, concurrency, retries);
  }
}

async function main() {
  const argv = process.argv.slice(2);
  const urls = argv.length ? argv.filter(a => !a.startsWith('--')) : DEFAULT_URLS;
  const outDirArg = argv.find(a => a.startsWith('--out='));
  const concurrencyArg = argv.find(a => a.startsWith('--concurrency='));
  const retriesArg = argv.find(a => a.startsWith('--retries='));

  const outDir = outDirArg ? outDirArg.split('=')[1] : path.join(process.cwd(), 'outputs');
  const concurrency = concurrencyArg ? Number(concurrencyArg.split('=')[1]) : 8;
  const retries = retriesArg ? Number(retriesArg.split('=')[1]) : 3;

  await ensureDir(outDir);

  for (const u of urls) {
    try {
      await processPlaylist(u, outDir, concurrency, retries);
    } catch (err) {
      console.error('Error processing playlist', u, err.message || err);
    }
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
