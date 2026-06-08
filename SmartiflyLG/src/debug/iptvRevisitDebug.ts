type RevisitPhase =
  | 'C1_FIRST_OPEN'
  | 'C1_CLOSE'
  | 'C2_OPEN'
  | 'C2_CLOSE'
  | 'C1_REVISIT'
  | 'UNKNOWN';

type RevisitEventType =
  | 'OPEN_START'
  | 'MANIFEST_REQUEST_START'
  | 'MANIFEST_REQUEST_DONE'
  | 'SEGMENT_REQUEST_DONE'
  | 'REQUEST_ABORT'
  | 'REQUEST_ERROR'
  | 'CLOSE_START'
  | 'CLOSE_DONE'
  | 'HLS_ERROR'
  | 'NOTE';

type RevisitLogEvent = {
  time: string;
  ts: number;
  phase: RevisitPhase;
  type: RevisitEventType;
  channelId?: string | number | null;
  channelTitle?: string | null;
  streamUrl?: string | null;
  requestUrl?: string | null;
  responseUrl?: string | null;
  status?: number | 'ERROR' | 'ABORTED' | null;
  ok?: boolean;
  durationMs?: number;
  playerSessionId?: string | number | null;
  liveStreamId?: string | number | null;
  requestId?: string;
  errorType?: string;
  errorDetails?: unknown;
  note?: string;
};

type RevisitChannelInfo = {
  channelId?: string | number | null;
  channelTitle?: string | null;
  streamUrl?: string | null;
  playerSessionId?: string | number | null;
  liveStreamId?: string | number | null;
};

declare global {
  interface Window {
    __smartiflyRevisitDebug?: {
      reset: () => void;
      markPhase: (phase: RevisitPhase, info?: RevisitChannelInfo) => void;
      logOpenStart: (info: RevisitChannelInfo) => void;
      logCloseStart: (info: RevisitChannelInfo) => void;
      logCloseDone: (info?: RevisitChannelInfo) => void;
      logHlsRequestStart: (args: {
        requestId: string;
        url: string;
        info?: RevisitChannelInfo;
      }) => void;
      logHlsRequestDone: (args: {
        requestId: string;
        url: string;
        responseUrl?: string;
        status: number;
        durationMs?: number;
        info?: RevisitChannelInfo;
      }) => void;
      logHlsRequestAbort: (args: {
        requestId: string;
        url: string;
        info?: RevisitChannelInfo;
      }) => void;
      logHlsRequestError: (args: {
        requestId: string;
        url: string;
        status?: number;
        error?: unknown;
        info?: RevisitChannelInfo;
      }) => void;
      logHlsError: (args: {
        errorType?: string;
        errorDetails?: unknown;
        info?: RevisitChannelInfo;
      }) => void;
      note: (message: string, info?: RevisitChannelInfo) => void;
      summary: () => void;
      getEvents: () => RevisitLogEvent[];
      getCurrentPhase: () => RevisitPhase;
    };
    __smartiflyRevisitPhase?: RevisitPhase;
    __smartiflyRevisitEvents?: RevisitLogEvent[];
    __smartiflyLastChannelInfo?: RevisitChannelInfo;
  }
}

function nowIso() {
  return new Date().toISOString();
}

function isManifestUrl(url?: string | null) {
  if (!url) {
    return false;
  }

  return url.includes('.m3u8') || url.includes('type=m3u8');
}

function isLikelySegmentUrl(url?: string | null) {
  if (!url) {
    return false;
  }

  return (
    url.includes('.ts') ||
    url.includes('.m4s') ||
    url.includes('.aac') ||
    url.includes('.mp4') ||
    url.includes('/hls/')
  );
}

function ensureEvents() {
  if (!window.__smartiflyRevisitEvents) {
    window.__smartiflyRevisitEvents = [];
  }

  return window.__smartiflyRevisitEvents;
}

function getPhase(): RevisitPhase {
  return window.__smartiflyRevisitPhase || 'UNKNOWN';
}

function normalizeInfo(info?: RevisitChannelInfo): RevisitChannelInfo {
  return {
    channelId: info?.channelId ?? window.__smartiflyLastChannelInfo?.channelId ?? null,
    channelTitle: info?.channelTitle ?? window.__smartiflyLastChannelInfo?.channelTitle ?? null,
    streamUrl: info?.streamUrl ?? window.__smartiflyLastChannelInfo?.streamUrl ?? null,
    playerSessionId: info?.playerSessionId ?? window.__smartiflyLastChannelInfo?.playerSessionId ?? null,
    liveStreamId: info?.liveStreamId ?? window.__smartiflyLastChannelInfo?.liveStreamId ?? null
  };
}

function pushEvent(
  event: Omit<RevisitLogEvent, 'time' | 'ts' | 'phase'> & {
    phase?: RevisitPhase;
  }
) {
  const fullEvent: RevisitLogEvent = {
    time: nowIso(),
    ts: Date.now(),
    phase: event.phase || getPhase(),
    ...event
  };

  ensureEvents().push(fullEvent);

  const statusText =
    fullEvent.status !== undefined && fullEvent.status !== null ? ` status=${fullEvent.status}` : '';

  console.log(`[iptv-revisit] ${fullEvent.phase} ${fullEvent.type}${statusText}`, fullEvent);
}

function printSummary() {
  const events = ensureEvents();

  console.log('========== IPTV REVISIT DEBUG SUMMARY ==========');

  console.table(
    events.map((event) => ({
      time: event.time,
      phase: event.phase,
      type: event.type,
      channelId: event.channelId,
      channelTitle: event.channelTitle,
      status: event.status,
      ok: event.ok,
      requestUrl: event.requestUrl,
      streamUrl: event.streamUrl,
      playerSessionId: event.playerSessionId,
      requestId: event.requestId,
      durationMs: event.durationMs
    }))
  );

  const manifestEvents = events.filter((event) => event.type === 'MANIFEST_REQUEST_DONE');

  console.log('----- Manifest results only -----');

  console.table(
    manifestEvents.map((event) => ({
      phase: event.phase,
      channelId: event.channelId,
      channelTitle: event.channelTitle,
      status: event.status,
      ok: event.ok,
      url: event.requestUrl,
      playerSessionId: event.playerSessionId
    }))
  );

  const c1First = manifestEvents.find((event) => event.phase === 'C1_FIRST_OPEN');
  const c2 = manifestEvents.find((event) => event.phase === 'C2_OPEN');
  const c1Revisit = manifestEvents.find((event) => event.phase === 'C1_REVISIT');

  console.log('----- Key result -----');
  console.log({
    c1FirstStatus: c1First?.status,
    c2Status: c2?.status,
    c1RevisitStatus: c1Revisit?.status,
    c1FirstUrl: c1First?.requestUrl,
    c1RevisitUrl: c1Revisit?.requestUrl,
    sameC1Url: !!c1First?.requestUrl && !!c1Revisit?.requestUrl && c1First.requestUrl === c1Revisit.requestUrl
  });

  if (c1First?.status === 200 && c2?.status === 200 && c1Revisit?.status === 403) {
    console.warn('[iptv-revisit] reproduced: C1 works first, C2 works, C1 revisit returns 403');
  } else if (c1First?.status === 200 && c2?.status === 200 && c1Revisit?.status === 200) {
    console.log('[iptv-revisit] not reproduced: C1 first, C2, and C1 revisit all returned 200');
  } else {
    console.log('[iptv-revisit] mixed result; check the table above for the exact failing phase');
  }

  console.log('========== END IPTV REVISIT DEBUG SUMMARY ==========');
}

export function installIptvRevisitDebug() {
  window.__smartiflyRevisitPhase = 'UNKNOWN';
  window.__smartiflyRevisitEvents = [];

  window.__smartiflyRevisitDebug = {
    reset() {
      window.__smartiflyRevisitPhase = 'UNKNOWN';
      window.__smartiflyRevisitEvents = [];
      window.__smartiflyLastChannelInfo = undefined;

      console.log('[iptv-revisit] reset');
    },

    markPhase(phase, info) {
      window.__smartiflyRevisitPhase = phase;

      if (info) {
        window.__smartiflyLastChannelInfo = normalizeInfo(info);
      }

      pushEvent({
        phase,
        type: 'NOTE',
        ...normalizeInfo(info),
        note: `Phase marked: ${phase}`
      });
    },

    logOpenStart(info) {
      const normalized = normalizeInfo(info);
      window.__smartiflyLastChannelInfo = normalized;

      pushEvent({
        type: 'OPEN_START',
        ...normalized
      });
    },

    logCloseStart(info) {
      const normalized = normalizeInfo(info);
      window.__smartiflyLastChannelInfo = normalized;

      pushEvent({
        type: 'CLOSE_START',
        ...normalized
      });
    },

    logCloseDone(info) {
      const normalized = normalizeInfo(info);

      pushEvent({
        type: 'CLOSE_DONE',
        ...normalized
      });
    },

    logHlsRequestStart({ requestId, url, info }) {
      const normalized = normalizeInfo(info);

      if (isManifestUrl(url)) {
        pushEvent({
          type: 'MANIFEST_REQUEST_START',
          requestId,
          requestUrl: url,
          ...normalized
        });
      }
    },

    logHlsRequestDone({ requestId, url, responseUrl, status, durationMs, info }) {
      const normalized = normalizeInfo(info);

      if (isManifestUrl(url)) {
        pushEvent({
          type: 'MANIFEST_REQUEST_DONE',
          requestId,
          requestUrl: url,
          responseUrl,
          status,
          ok: status >= 200 && status < 300,
          durationMs,
          ...normalized
        });
      } else if (isLikelySegmentUrl(url)) {
        pushEvent({
          type: 'SEGMENT_REQUEST_DONE',
          requestId,
          requestUrl: url,
          responseUrl,
          status,
          ok: status >= 200 && status < 300,
          durationMs,
          ...normalized
        });
      }
    },

    logHlsRequestAbort({ requestId, url, info }) {
      const normalized = normalizeInfo(info);

      pushEvent({
        type: 'REQUEST_ABORT',
        requestId,
        requestUrl: url,
        status: 'ABORTED',
        ok: false,
        ...normalized
      });
    },

    logHlsRequestError({ requestId, url, status, error, info }) {
      const normalized = normalizeInfo(info);

      pushEvent({
        type: 'REQUEST_ERROR',
        requestId,
        requestUrl: url,
        status: status || 'ERROR',
        ok: false,
        errorDetails: error,
        ...normalized
      });
    },

    logHlsError({ errorType, errorDetails, info }) {
      const normalized = normalizeInfo(info);

      pushEvent({
        type: 'HLS_ERROR',
        errorType,
        errorDetails,
        ...normalized
      });
    },

    note(message, info) {
      const normalized = normalizeInfo(info);

      pushEvent({
        type: 'NOTE',
        note: message,
        ...normalized
      });
    },

    summary() {
      printSummary();
    },

    getEvents() {
      return ensureEvents();
    },

    getCurrentPhase() {
      return getPhase();
    }
  };

  console.log('[iptv-revisit] installed');
}
