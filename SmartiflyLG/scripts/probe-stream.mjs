#!/usr/bin/env node

const userAgent =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36';
const MAX_REDIRECTS = 8;
const DEFAULT_RANGE_END = 8191;
const MAX_SEGMENT_PROBES = 3;
const MAX_VARIANT_PROBES = 3;

function usage() {
  console.log('Usage: npm run probe:stream -- "<stream-url>"');
  console.log('Example: npm run probe:stream -- "http://example/live/123/456/789.m3u8"');
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) {
    return null;
  }

  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function summarizeHeaders(headers) {
  const keys = [
    'content-type',
    'content-length',
    'content-range',
    'accept-ranges',
    'server',
    'cache-control',
    'date',
    'location',
    'vary',
    'etag',
    'last-modified',
    'transfer-encoding',
    'x-cache',
    'x-served-by',
    'access-control-allow-origin',
    'access-control-allow-headers',
    'access-control-allow-methods'
  ];

  return Object.fromEntries(
    keys
      .map((key) => [key, headers.get(key)])
      .filter(([, value]) => typeof value === 'string' && value.length > 0)
  );
}

function printObject(label, value) {
  console.log(label);
  console.log(JSON.stringify(value, null, 2));
}

function isRedirectStatus(status) {
  return status === 301 || status === 302 || status === 303 || status === 307 || status === 308;
}

function buildHeaders(method, extraHeaders = {}) {
  const headers = {
    'User-Agent': userAgent,
    Accept: 'application/vnd.apple.mpegurl,application/x-mpegURL,video/mp2t,video/*,*/*;q=0.8',
    'Cache-Control': 'no-cache',
    Pragma: 'no-cache',
    ...extraHeaders
  };

  if (method === 'GET' && !Object.keys(extraHeaders).some((key) => key.toLowerCase() === 'range')) {
    headers.Range = `bytes=0-${DEFAULT_RANGE_END}`;
  }

  return headers;
}

async function requestWithRedirectTrace(url, method, options = {}) {
  const hops = [];
  let currentUrl = url;

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
    const response = await fetch(currentUrl, {
      method,
      redirect: 'manual',
      cache: 'no-store',
      headers: buildHeaders(method, options.headers)
    });

    const hop = {
      url: currentUrl,
      method,
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      type: response.type,
      headers: summarizeHeaders(response.headers)
    };

    hops.push(hop);

    if (isRedirectStatus(response.status)) {
      const location = response.headers.get('location');
      if (!location) {
        return { hops, response, finalUrl: currentUrl };
      }

      currentUrl = new URL(location, currentUrl).toString();
      continue;
    }

    return { hops, response, finalUrl: currentUrl };
  }

  throw new Error(`Too many redirects while probing ${url}`);
}

function parseAttributeList(text) {
  const result = {};
  let current = '';
  let inQuotes = false;
  const parts = [];

  for (const char of text) {
    if (char === '"') {
      inQuotes = !inQuotes;
      current += char;
      continue;
    }

    if (char === ',' && !inQuotes) {
      if (current.trim()) {
        parts.push(current.trim());
      }
      current = '';
      continue;
    }

    current += char;
  }

  if (current.trim()) {
    parts.push(current.trim());
  }

  for (const part of parts) {
    const equalIndex = part.indexOf('=');
    if (equalIndex === -1) {
      result[part] = true;
      continue;
    }

    const key = part.slice(0, equalIndex).trim();
    let value = part.slice(equalIndex + 1).trim();
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }

  return result;
}

function classifyBytes(bytes) {
  if (!bytes || bytes.length === 0) {
    return { kind: 'empty' };
  }

  if (bytes[0] === 0x47 && bytes.length >= 188) {
    const syncMatches = [0, 188, 376].every((offset) => bytes[offset] === 0x47 || offset >= bytes.length);
    if (syncMatches) {
      return { kind: 'mpeg-ts', syncByte: '0x47' };
    }
  }

  const ascii = new TextDecoder().decode(bytes.slice(0, 32));
  if (ascii.startsWith('#EXTM3U')) {
    return { kind: 'm3u8-text' };
  }

  const probeView = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (let index = 0; index + 8 <= bytes.length; index += 1) {
    const boxSize = probeView.getUint32(index);
    const type = String.fromCharCode(
      bytes[index + 4],
      bytes[index + 5],
      bytes[index + 6],
      bytes[index + 7]
    );
    if (boxSize >= 8 && ['ftyp', 'moov', 'moof', 'mdat'].includes(type)) {
      return { kind: 'mp4-family', boxType: type };
    }
  }

  return { kind: 'binary-unknown' };
}

function detectTsPacketSize(bytes) {
  const candidates = [188, 192, 204, 208];

  for (const packetSize of candidates) {
    if (bytes.length < packetSize * 3) {
      continue;
    }

    if (bytes[0] !== 0x47) {
      continue;
    }

    if (bytes[packetSize] === 0x47 && bytes[packetSize * 2] === 0x47) {
      return packetSize;
    }
  }

  return bytes[0] === 0x47 ? 188 : null;
}

function parseTsSection(bytes, startIndex) {
  if (startIndex >= bytes.length) {
    return null;
  }

  let offset = startIndex;
  const pointerField = bytes[offset];
  offset += 1 + pointerField;

  if (offset + 3 >= bytes.length) {
    return null;
  }

  const tableId = bytes[offset];
  const sectionLength = ((bytes[offset + 1] & 0x0f) << 8) | bytes[offset + 2];
  const sectionEnd = offset + 3 + sectionLength;

  if (sectionEnd > bytes.length) {
    return null;
  }

  return {
    tableId,
    sectionStart: offset,
    sectionEnd
  };
}

function parseTsCodecClues(bytes) {
  const packetSize = detectTsPacketSize(bytes);
  if (!packetSize) {
    return {
      packetSize: null,
      patPid: null,
      pmtPid: null,
      streamTypes: [],
      videoStreamTypes: [],
      audioStreamTypes: [],
      notes: ['Could not detect TS packet size']
    };
  }

  const patPid = 0;
  let pmtPid = null;
  const streamTypes = [];

  for (let offset = 0; offset + packetSize <= bytes.length; offset += packetSize) {
    if (bytes[offset] !== 0x47) {
      continue;
    }

    const payloadUnitStart = (bytes[offset + 1] & 0x40) !== 0;
    const pid = ((bytes[offset + 1] & 0x1f) << 8) | bytes[offset + 2];
    const adaptationFieldControl = (bytes[offset + 3] & 0x30) >> 4;

    let payloadOffset = offset + 4;
    if (adaptationFieldControl === 2 || adaptationFieldControl === 0) {
      continue;
    }

    if (adaptationFieldControl === 3) {
      const adaptationLength = bytes[payloadOffset];
      payloadOffset += 1 + adaptationLength;
    }

    if (payloadOffset >= offset + packetSize) {
      continue;
    }

    if (pid === patPid && payloadUnitStart) {
      const section = parseTsSection(bytes, payloadOffset);
      if (!section || section.tableId !== 0x00) {
        continue;
      }

      let sectionOffset = section.sectionStart + 8;
      const end = section.sectionEnd - 4;

      while (sectionOffset + 4 <= end) {
        const programNumber = (bytes[sectionOffset] << 8) | bytes[sectionOffset + 1];
        const programMapPid = ((bytes[sectionOffset + 2] & 0x1f) << 8) | bytes[sectionOffset + 3];
        if (programNumber !== 0) {
          pmtPid = programMapPid;
          break;
        }
        sectionOffset += 4;
      }
      continue;
    }

    if (pmtPid == null || pid !== pmtPid || !payloadUnitStart) {
      continue;
    }

    const section = parseTsSection(bytes, payloadOffset);
    if (!section || section.tableId !== 0x02) {
      continue;
    }

    const programInfoLength = ((bytes[section.sectionStart + 10] & 0x0f) << 8) | bytes[section.sectionStart + 11];
    let sectionOffset = section.sectionStart + 12 + programInfoLength;
    const end = section.sectionEnd - 4;

    while (sectionOffset + 5 <= end) {
      const streamType = bytes[sectionOffset];
      const elementaryPid = ((bytes[sectionOffset + 1] & 0x1f) << 8) | bytes[sectionOffset + 2];
      const esInfoLength = ((bytes[sectionOffset + 3] & 0x0f) << 8) | bytes[sectionOffset + 4];

      streamTypes.push({
        streamType: `0x${streamType.toString(16).padStart(2, '0')}`,
        elementaryPid,
        codecGuess: guessCodecFromStreamType(streamType)
      });

      sectionOffset += 5 + esInfoLength;
    }

    break;
  }

  return {
    packetSize,
    patPid,
    pmtPid,
    streamTypes,
    videoStreamTypes: streamTypes.filter((entry) => entry.codecGuess.kind === 'video'),
    audioStreamTypes: streamTypes.filter((entry) => entry.codecGuess.kind === 'audio'),
    notes: []
  };
}

function guessCodecFromStreamType(streamType) {
  switch (streamType) {
    case 0x01:
    case 0x02:
    case 0x10:
    case 0x1b:
      return { kind: 'video', codec: streamType === 0x1b ? 'H.264/AVC' : 'MPEG-2/legacy video' };
    case 0x24:
      return { kind: 'video', codec: 'H.265/HEVC' };
    case 0x03:
    case 0x04:
    case 0x0f:
    case 0x11:
    case 0x81:
      return { kind: 'audio', codec: streamType === 0x0f || streamType === 0x11 ? 'AAC' : 'MPEG audio' };
    case 0x06:
      return { kind: 'data', codec: 'private/unknown' };
    default:
      return { kind: 'unknown', codec: 'unknown' };
  }
}

function toAbsoluteUrl(baseUrl, maybeRelativeUrl) {
  try {
    return new URL(maybeRelativeUrl, baseUrl).toString();
  } catch {
    return maybeRelativeUrl;
  }
}

function parsePlaylist(text, playlistUrl) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const parsed = {
    url: playlistUrl,
    isM3u8: text.startsWith('#EXTM3U'),
    isMaster: false,
    isMedia: false,
    version: null,
    targetDuration: null,
    mediaSequence: null,
    discontinuitySequence: null,
    playlistType: null,
    allowCache: null,
    endList: false,
    independentSegments: false,
    startTimeOffset: null,
    hasEncryption: false,
    keys: [],
    maps: [],
    programDateTimes: [],
    variants: [],
    segments: [],
    tags: [],
    preview: lines.slice(0, 30)
  };

  let pendingStreamInf = null;
  let pendingMediaInfo = null;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];

    if (line.startsWith('#EXT-X-VERSION:')) {
      parsed.version = Number(line.slice('#EXT-X-VERSION:'.length));
      parsed.tags.push(line);
      continue;
    }

    if (line.startsWith('#EXT-X-TARGETDURATION:')) {
      parsed.targetDuration = Number(line.slice('#EXT-X-TARGETDURATION:'.length));
      parsed.tags.push(line);
      continue;
    }

    if (line.startsWith('#EXT-X-MEDIA-SEQUENCE:')) {
      parsed.mediaSequence = Number(line.slice('#EXT-X-MEDIA-SEQUENCE:'.length));
      parsed.tags.push(line);
      continue;
    }

    if (line.startsWith('#EXT-X-DISCONTINUITY-SEQUENCE:')) {
      parsed.discontinuitySequence = Number(line.slice('#EXT-X-DISCONTINUITY-SEQUENCE:'.length));
      parsed.tags.push(line);
      continue;
    }

    if (line.startsWith('#EXT-X-PLAYLIST-TYPE:')) {
      parsed.playlistType = line.slice('#EXT-X-PLAYLIST-TYPE:'.length);
      parsed.tags.push(line);
      continue;
    }

    if (line.startsWith('#EXT-X-ALLOW-CACHE:')) {
      parsed.allowCache = line.slice('#EXT-X-ALLOW-CACHE:'.length);
      parsed.tags.push(line);
      continue;
    }

    if (line === '#EXT-X-INDEPENDENT-SEGMENTS') {
      parsed.independentSegments = true;
      parsed.tags.push(line);
      continue;
    }

    if (line.startsWith('#EXT-X-STREAM-INF:')) {
      parsed.isMaster = true;
      pendingStreamInf = parseAttributeList(line.slice('#EXT-X-STREAM-INF:'.length));
      parsed.tags.push(line);
      continue;
    }

    if (line.startsWith('#EXT-X-MAP:')) {
      parsed.hasEncryption = parsed.hasEncryption || false;
      const attributes = parseAttributeList(line.slice('#EXT-X-MAP:'.length));
      parsed.maps.push(attributes);
      parsed.tags.push(line);
      continue;
    }

    if (line.startsWith('#EXT-X-KEY:')) {
      parsed.hasEncryption = true;
      const attributes = parseAttributeList(line.slice('#EXT-X-KEY:'.length));
      parsed.keys.push(attributes);
      parsed.tags.push(line);
      continue;
    }

    if (line.startsWith('#EXT-X-PROGRAM-DATE-TIME:')) {
      parsed.programDateTimes.push(line.slice('#EXT-X-PROGRAM-DATE-TIME:'.length));
      parsed.tags.push(line);
      continue;
    }

    if (line.startsWith('#EXT-X-START:')) {
      const attributes = parseAttributeList(line.slice('#EXT-X-START:'.length));
      parsed.startTimeOffset = attributes['TIME-OFFSET'] ?? null;
      parsed.tags.push(line);
      continue;
    }

    if (line.startsWith('#EXTINF:')) {
      parsed.isMedia = true;
      pendingMediaInfo = line.slice('#EXTINF:'.length);
      parsed.tags.push(line);
      continue;
    }

    if (line.startsWith('#EXT-X-ENDLIST')) {
      parsed.endList = true;
      parsed.tags.push(line);
      continue;
    }

    if (line.startsWith('#')) {
      parsed.tags.push(line);
      continue;
    }

    if (pendingStreamInf) {
      parsed.variants.push({
        uri: toAbsoluteUrl(playlistUrl, line),
        attributes: pendingStreamInf
      });
      pendingStreamInf = null;
      continue;
    }

    if (pendingMediaInfo != null || parsed.isMedia) {
      parsed.segments.push({
        uri: toAbsoluteUrl(playlistUrl, line),
        extinf: pendingMediaInfo
      });
      pendingMediaInfo = null;
      continue;
    }
  }

  if (!parsed.isMaster && (parsed.isMedia || parsed.segments.length > 0)) {
    parsed.isMedia = true;
  }

  return parsed;
}

async function fetchText(url, options = {}) {
  const response = await fetch(url, {
    method: 'GET',
    redirect: 'follow',
    cache: 'no-store',
    headers: buildHeaders('GET', options.headers)
  });

  const text = await response.text();
  return {
    response,
    text,
    url: response.url || url
  };
}

async function probeBinary(url) {
  const response = await fetch(url, {
    method: 'GET',
    redirect: 'follow',
    cache: 'no-store',
    headers: buildHeaders('GET', { Range: `bytes=0-${DEFAULT_RANGE_END}` })
  });

  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  return {
    response,
    url: response.url || url,
    bytes
  };
}

async function probeSegment(url, index) {
  try {
    const traced = await requestWithRedirectTrace(url, 'GET', {
      headers: { Range: `bytes=0-${DEFAULT_RANGE_END}` }
    });
    const finalUrl = traced.finalUrl;
    const binary = await probeBinary(finalUrl);
    const signature = classifyBytes(binary.bytes);
    const tsClues = signature.kind === 'mpeg-ts' ? parseTsCodecClues(binary.bytes) : null;

    return {
      index,
      requestedUrl: url,
      finalUrl,
      headers: summarizeHeaders(binary.response.headers),
      status: binary.response.status,
      statusText: binary.response.statusText,
      ok: binary.response.ok,
      byteLength: binary.bytes.length,
      byteSize: formatBytes(binary.bytes.length),
      signature,
      tsClues,
      firstBytesHex: Array.from(binary.bytes.slice(0, 16))
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join(' ')
    };
  } catch (error) {
    return {
      index,
      requestedUrl: url,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

async function probePlaylist(url, depth = 0, label = 'playlist') {
  const traced = await requestWithRedirectTrace(url, 'GET');
  const finalUrl = traced.finalUrl;
  const preview = await fetchText(finalUrl);
  const playlist = parsePlaylist(preview.text, finalUrl);

  const report = {
    label,
    requestedUrl: url,
    finalUrl,
    response: {
      status: preview.response.status,
      statusText: preview.response.statusText,
      ok: preview.response.ok,
      headers: summarizeHeaders(preview.response.headers)
    },
    summary: {
      isM3u8: playlist.isM3u8,
      isMaster: playlist.isMaster,
      isMedia: playlist.isMedia,
      version: playlist.version,
      targetDuration: playlist.targetDuration,
      mediaSequence: playlist.mediaSequence,
      discontinuitySequence: playlist.discontinuitySequence,
      playlistType: playlist.playlistType,
      allowCache: playlist.allowCache,
      endList: playlist.endList,
      independentSegments: playlist.independentSegments,
      startTimeOffset: playlist.startTimeOffset,
      hasEncryption: playlist.hasEncryption,
      variantCount: playlist.variants.length,
      segmentCount: playlist.segments.length,
      keyCount: playlist.keys.length,
      mapCount: playlist.maps.length,
      programDateTimeCount: playlist.programDateTimes.length
    },
    headers: playlist.preview,
    tags: playlist.tags,
    variants: playlist.variants.slice(0, MAX_VARIANT_PROBES),
    segments: playlist.segments.slice(0, MAX_SEGMENT_PROBES)
  };

  if (playlist.isMaster && depth < 1 && playlist.variants.length > 0) {
    report.variantProbes = [];
    for (let index = 0; index < Math.min(playlist.variants.length, MAX_VARIANT_PROBES); index += 1) {
      const variant = playlist.variants[index];
      report.variantProbes.push(await probePlaylist(variant.uri, depth + 1, `variant-${index + 1}`));
    }
  }

  if (playlist.isMedia && playlist.segments.length > 0) {
    report.segmentProbes = [];
    for (let index = 0; index < Math.min(playlist.segments.length, MAX_SEGMENT_PROBES); index += 1) {
      report.segmentProbes.push(await probeSegment(playlist.segments[index].uri, index + 1));
    }
  }

  return report;
}

async function probeNonPlaylist(url) {
  const traced = await requestWithRedirectTrace(url, 'GET');
  const binary = await probeBinary(traced.finalUrl);
  const signature = classifyBytes(binary.bytes);
  const asciiPreview = new TextDecoder().decode(binary.bytes.slice(0, 160));

  return {
    requestedUrl: url,
    finalUrl: traced.finalUrl,
    response: {
      status: binary.response.status,
      statusText: binary.response.statusText,
      ok: binary.response.ok,
      headers: summarizeHeaders(binary.response.headers)
    },
    signature,
    byteLength: binary.bytes.length,
    byteSize: formatBytes(binary.bytes.length),
    firstBytesHex: Array.from(binary.bytes.slice(0, 32))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join(' '),
    asciiPreview
  };
}

async function probeHead(url) {
  const traced = await requestWithRedirectTrace(url, 'HEAD');
  return {
    hops: traced.hops,
    finalUrl: traced.finalUrl
  };
}

async function main() {
  const input = process.argv.slice(2).find((value) => !value.startsWith('-'));
  if (!input) {
    usage();
    process.exitCode = 1;
    return;
  }

  let targetUrl;
  try {
    targetUrl = new URL(input).toString();
  } catch {
    console.error(`Invalid URL: ${input}`);
    process.exitCode = 1;
    return;
  }

  console.log(`Probing stream: ${targetUrl}`);
  console.log('');

  try {
    const head = await probeHead(targetUrl);
    console.log('== HEAD trace ==');
    head.hops.forEach((hop, index) => {
      console.log(`[${index + 1}] ${hop.status} ${hop.statusText} ${hop.url}`);
      if (Object.keys(hop.headers).length > 0) {
        printObject('headers:', hop.headers);
      }
    });
    console.log(`finalUrl: ${head.finalUrl}`);
    console.log('');
  } catch (error) {
    console.log('== HEAD trace failed ==');
    console.log(error instanceof Error ? error.message : String(error));
    console.log('');
  }

  try {
    const traced = await requestWithRedirectTrace(targetUrl, 'GET');
    console.log('== GET trace ==');
    traced.hops.forEach((hop, index) => {
      console.log(`[${index + 1}] ${hop.status} ${hop.statusText} ${hop.url}`);
      if (Object.keys(hop.headers).length > 0) {
        printObject('headers:', hop.headers);
      }
    });
    console.log(`finalUrl: ${traced.finalUrl}`);
    console.log('');

    const contentType = String(traced.hops[traced.hops.length - 1]?.headers['content-type'] || '').toLowerCase();
    const looksLikePlaylist =
      targetUrl.toLowerCase().includes('.m3u8') ||
      contentType.includes('mpegurl') ||
      contentType.includes('m3u8');

    if (looksLikePlaylist) {
      const playlistReport = await probePlaylist(targetUrl);
      console.log('== playlist report ==');
      printObject('report:', playlistReport);
    } else {
      const nonPlaylistReport = await probeNonPlaylist(targetUrl);
      console.log('== binary report ==');
      printObject('report:', nonPlaylistReport);
    }
  } catch (error) {
    console.log('== GET trace failed ==');
    console.log(error instanceof Error ? error.message : String(error));
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exitCode = 1;
});
