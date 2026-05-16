#!/usr/bin/env node

const parseArgs = (argv) => {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      out[key] = 'true';
      continue;
    }
    out[key] = next;
    i += 1;
  }
  return out;
};

const normalize = (value) => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

const candidateList = (values) => {
  const seen = new Set();
  const urls = values
    .map(normalize)
    .filter(Boolean)
    .sort((a, b) => (a.startsWith('https://') ? 0 : 1) - (b.startsWith('https://') ? 0 : 1));

  for (const url of urls) {
    seen.add(url);
  }

  return Array.from(seen);
};

const pickFirst = (values) => candidateList(values)[0] || '';

const main = async () => {
  const args = parseArgs(process.argv.slice(2));
  const server = normalize(args.server || process.env.XTREAM_SERVER_URL);
  const username = normalize(args.username || process.env.XTREAM_USERNAME);
  const password = normalize(args.password || process.env.XTREAM_PASSWORD);
  const vodId = Number(args.vodId || args.vod || process.env.XTREAM_VOD_ID);

  if (!server || !username || !password || !Number.isFinite(vodId) || vodId <= 0) {
    console.error(
      [
        'Usage:',
        '  node scripts/inspect-vod-info.js --server <url> --username <user> --password <pass> --vodId <id>',
        '',
        'Or set env vars:',
        '  XTREAM_SERVER_URL, XTREAM_USERNAME, XTREAM_PASSWORD, XTREAM_VOD_ID',
      ].join('\n')
    );
    process.exit(2);
  }

  const baseUrl = server.replace(/\/$/, '');
  const url = new URL(`${baseUrl}/player_api.php`);
  url.searchParams.set('username', username);
  url.searchParams.set('password', password);
  url.searchParams.set('action', 'get_vod_info');
  url.searchParams.set('vod_id', String(vodId));

  const response = await fetch(url.toString());
  const text = await response.text();
  let payload;
  try {
    payload = JSON.parse(text);
  } catch (error) {
    console.error('Failed to parse JSON response');
    console.error(text);
    process.exit(1);
  }

  const info = payload?.info || {};
  const movieData = payload?.movie_data || {};

  const rawFields = {
    info: {
      name: info?.name,
      backdrop_path: info?.backdrop_path,
      cover_big: info?.cover_big,
      movie_image: info?.movie_image,
      cover: info?.cover,
    },
    movie_data: {
      name: movieData?.name,
      backdrop_path: movieData?.backdrop_path,
      backdrop: movieData?.backdrop,
      cover_big: movieData?.cover_big,
      movie_image: movieData?.movie_image,
      cover: movieData?.cover,
      stream_icon: movieData?.stream_icon,
    },
  };

  const mobileBackdropCandidates = candidateList([
    Array.isArray(info?.backdrop_path) ? info.backdrop_path[0] : info?.backdrop_path,
    Array.isArray(movieData?.backdrop_path) ? movieData.backdrop_path[0] : movieData?.backdrop_path,
    movieData?.backdrop,
    info?.movie_image,
    movieData?.movie_image,
    info?.cover_big,
    movieData?.cover_big,
    info?.cover,
    movieData?.cover,
    movieData?.stream_icon,
  ]);

  const tvBackdropCandidates = candidateList([
    Array.isArray(info?.backdrop_path) ? info.backdrop_path[0] : info?.backdrop_path,
    Array.isArray(movieData?.backdrop_path) ? movieData.backdrop_path[0] : movieData?.backdrop_path,
    movieData?.backdrop,
    info?.movie_image,
    movieData?.movie_image,
    movieData?.stream_icon,
  ]);

  const posterCandidates = candidateList([
    info?.movie_image,
    movieData?.movie_image,
    info?.cover_big,
    movieData?.cover_big,
    info?.cover,
    movieData?.cover,
    movieData?.stream_icon,
  ]);

  const summary = {
    request: {
      url: `${baseUrl}/player_api.php?action=get_vod_info&vod_id=${vodId}`,
      vodId,
      ok: response.ok,
      status: response.status,
    },
    title: info?.name || movieData?.name || '',
    rawFields,
    picks: {
      mobileBackdropFirst: pickFirst(mobileBackdropCandidates),
      tvBackdropFirst: pickFirst(tvBackdropCandidates),
      posterFirst: pickFirst(posterCandidates),
    },
    candidates: {
      mobileBackdropCandidates,
      tvBackdropCandidates,
      posterCandidates,
    },
    payloadPreviewKeys: Object.keys(payload || {}),
  };

  console.log(JSON.stringify(summary, null, 2));
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
