export type ReleaseTestResult = {
  attempt: number;
  delayMs: number;
  url: string;
  status: number | 'ERROR';
  ok: boolean;
  durationMs: number;
  error?: string;
};

type ReleaseTimingTestParams = {
  streamUrl: string;
  delaysMs?: number[];
  useCacheBuster?: boolean;
  requestFirstSegment?: boolean;
  timeoutMs?: number;
};

type IptvDebugWindow = Window & {
  __smartiflyIptvReleaseTimingTest?: typeof testIptvServerReleaseTiming;
  __smartiflyPollManifestAfterRealClose?: typeof pollManifestAfterRealClose;
  __smartiflyLastLiveUrl?: string;
  __smartiflySetLastLiveUrl?: (url: string | null) => void;
};

type XhrStatusResult = {
  status: number;
  durationMs: number;
  bodyStart?: string;
};

const DEFAULT_DELAYS_MS = [0, 500, 1000, 1500, 2000, 3000, 5000, 8000, 10000, 15000, 20000];

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function addCacheBuster(url: string, key: string) {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}${key}=${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function extractFirstSegmentUrl(manifestUrl: string, manifestText?: string) {
  if (!manifestText) return null;

  const lines = manifestText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const firstSegment = lines.find((line) => {
    if (line.startsWith('#')) return false;
    return line.includes('.ts') || line.includes('.m4s') || line.includes('.aac') || line.includes('.mp4');
  });

  if (!firstSegment) return null;

  if (firstSegment.startsWith('http://') || firstSegment.startsWith('https://')) {
    return firstSegment;
  }

  try {
    return new URL(firstSegment, manifestUrl).toString();
  } catch {
    return null;
  }
}

function xhrGetStatus(url: string, timeoutMs: number): Promise<XhrStatusResult> {
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    const timeoutHandle = window.setTimeout(() => {
      try {
        xhr.abort();
      } catch {
        // ignore
      }
      reject(new Error(`XHR timeout after ${timeoutMs}ms`));
    }, timeoutMs);

    xhr.open('GET', url, true);
    xhr.withCredentials = false;

    xhr.onreadystatechange = () => {
      if (xhr.readyState !== XMLHttpRequest.DONE) return;
      window.clearTimeout(timeoutHandle);
      resolve({
        status: xhr.status,
        durationMs: Date.now() - startedAt,
        bodyStart: typeof xhr.responseText === 'string' ? xhr.responseText.slice(0, 300) : undefined
      });
    };

    xhr.onerror = () => {
      window.clearTimeout(timeoutHandle);
      reject(new Error('XHR network error'));
    };

    xhr.onabort = () => {
      window.clearTimeout(timeoutHandle);
      reject(new Error('XHR aborted'));
    };

    xhr.send();
  });
}

export async function testIptvServerReleaseTiming(params: ReleaseTimingTestParams) {
  const {
    streamUrl,
    delaysMs = DEFAULT_DELAYS_MS,
    useCacheBuster = false,
    requestFirstSegment = true,
    timeoutMs = 10000
  } = params;

  const results: ReleaseTestResult[] = [];

  console.log('========== IPTV RELEASE TIMING TEST START ==========');
  console.log('[release-test] original streamUrl:', streamUrl);
  console.log('[release-test] useCacheBuster:', useCacheBuster);
  console.log('[release-test] requestFirstSegment:', requestFirstSegment);
  console.log('[release-test] browser UA:', window.navigator.userAgent);
  console.log('[release-test] location:', window.location.href);

  const firstUrl = useCacheBuster ? addCacheBuster(streamUrl, '_first') : streamUrl;

  try {
    console.log('[release-test] first manifest request:', firstUrl);

    const first = await xhrGetStatus(firstUrl, timeoutMs);
    console.log('[release-test] first manifest result:', {
      status: first.status,
      durationMs: first.durationMs,
      bodyStart: first.bodyStart
    });

    if (requestFirstSegment && first.status >= 200 && first.status < 300) {
      const segmentUrl = extractFirstSegmentUrl(firstUrl, first.bodyStart);
      if (segmentUrl) {
        console.log('[release-test] first segment request:', segmentUrl);
        try {
          const segment = await xhrGetStatus(segmentUrl, timeoutMs);
          console.log('[release-test] first segment result:', {
            status: segment.status,
            durationMs: segment.durationMs
          });
        } catch (error) {
          console.log('[release-test] first segment failed:', error);
        }
      } else {
        console.log('[release-test] no segment found in the first manifest sample');
      }
    }
  } catch (error) {
    console.log('[release-test] first open failed:', error);
  }

  console.log('[release-test] simulating close/release point now');

  for (let index = 0; index < delaysMs.length; index += 1) {
    const delayMs = delaysMs[index];
    console.log(`[release-test] waiting ${delayMs}ms before retry...`);
    await sleep(delayMs);

    const retryUrl = useCacheBuster ? addCacheBuster(streamUrl, `_retry_${delayMs}`) : streamUrl;
    const startedAt = Date.now();

    try {
      const response = await xhrGetStatus(retryUrl, timeoutMs);
      const result: ReleaseTestResult = {
        attempt: index + 1,
        delayMs,
        url: retryUrl,
        status: response.status,
        ok: response.status >= 200 && response.status < 300,
        durationMs: response.durationMs
      };

      results.push(result);
      console.log('[release-test] retry result:', result);

      if (response.status >= 200 && response.status < 300) {
        console.log(`✅ [release-test] server accepted again after delayMs=${delayMs}`);
        break;
      }

      if (response.status === 403) {
        console.log(`❌ [release-test] still forbidden after delayMs=${delayMs}`);
      }
    } catch (error: any) {
      const result: ReleaseTestResult = {
        attempt: index + 1,
        delayMs,
        url: retryUrl,
        status: 'ERROR',
        ok: false,
        durationMs: Date.now() - startedAt,
        error: String(error?.message || error)
      };

      results.push(result);
      console.log('[release-test] retry error:', result);
    }
  }

  console.table(results);
  console.log('========== IPTV RELEASE TIMING TEST END ==========');

  return results;
}

export function setLastLiveUrl(url: string | null) {
  const debugWindow = window as IptvDebugWindow;
  debugWindow.__smartiflyLastLiveUrl = url ?? undefined;
  console.log('[iptv-debug] last live URL updated', { url: url ?? null });
}

export async function pollManifestAfterRealClose(params: {
  streamUrl: string;
  delaysMs?: number[];
  cacheBust?: boolean;
  timeoutMs?: number;
}) {
  const {
    streamUrl,
    delaysMs = [0, 250, 500, 1000, 1500, 2000, 3000, 5000, 8000, 10000],
    cacheBust = false,
    timeoutMs = 10000
  } = params;

  const results: Array<{
    label: string;
    url: string;
    status: number | 'ERROR';
    ok: boolean;
    durationMs: number;
    error?: string;
    bodyStart?: string;
  }> = [];

  console.log('========== IPTV POST-CLOSE POLL START ==========');
  console.log('[post-close-poll] original URL:', streamUrl);
  console.log('[post-close-poll] cacheBust:', cacheBust);
  console.log('[post-close-poll] UA:', window.navigator.userAgent);
  console.log('[post-close-poll] location:', window.location.href);

  for (const delayMs of delaysMs) {
    await sleep(delayMs);

    const requestUrl = cacheBust ? addCacheBuster(streamUrl) : streamUrl;
    const label = `after_real_close_${delayMs}ms`;
    const result = await xhrGetStatus(requestUrl, timeoutMs)
      .then((response) => ({
        label,
        url: requestUrl,
        status: response.status,
        ok: response.status >= 200 && response.status < 300,
        durationMs: response.durationMs,
        bodyStart: response.bodyStart
      }))
      .catch((error: any) => ({
        label,
        url: requestUrl,
        status: 'ERROR' as const,
        ok: false,
        durationMs: 0,
        error: String(error?.message || error)
      }));

    results.push(result);
    console.log('[post-close-poll] result:', {
      delayMs,
      status: result.status,
      ok: result.ok,
      durationMs: result.durationMs,
      url: result.url,
      bodyStart: result.bodyStart,
      error: result.error
    });
  }

  console.table(
    results.map((result) => ({
      label: result.label,
      status: result.status,
      ok: result.ok,
      durationMs: result.durationMs
    }))
  );

  console.log('========== IPTV POST-CLOSE POLL END ==========');
  return results;
}

export function installIptvDebugTools() {
  const debugWindow = window as IptvDebugWindow;
  debugWindow.__smartiflyIptvReleaseTimingTest = testIptvServerReleaseTiming;
  debugWindow.__smartiflyPollManifestAfterRealClose = pollManifestAfterRealClose;
  debugWindow.__smartiflySetLastLiveUrl = setLastLiveUrl;
  console.log('[iptv-debug] installed persistent IPTV debug tools');
}
