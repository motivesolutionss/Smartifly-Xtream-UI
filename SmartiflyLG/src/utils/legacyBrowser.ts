export function isLegacyChromiumBrowser() {
  if (typeof navigator === 'undefined') {
    return false;
  }

  const userAgent = navigator.userAgent || '';
  const chromeMatch = userAgent.match(/Chrome\/(\d+)/i);
  const chromeVersion = chromeMatch ? Number(chromeMatch[1]) : Number.NaN;
  const isWebOs = /web0s|webos|smarttv/i.test(userAgent) || typeof (window as Window & { PalmSystem?: unknown }).PalmSystem !== 'undefined';

  if (Number.isFinite(chromeVersion) && chromeVersion <= 49) {
    return true;
  }

  return isWebOs && !Number.isFinite(chromeVersion);
}

export const legacyChromiumBrowser = isLegacyChromiumBrowser();

export function scrollIntoViewCompat(
  element: HTMLElement | null | undefined,
  options?: ScrollIntoViewOptions
) {
  if (!element) {
    return;
  }

  if (!legacyChromiumBrowser) {
    element.scrollIntoView(options);
    return;
  }

  try {
    const alignToTop = options?.block !== 'end';
    element.scrollIntoView(alignToTop);
  } catch {
    element.scrollIntoView(true);
  }
}

export function scrollToTopCompat(
  element: HTMLElement | null | undefined,
  top = 0
) {
  if (!element) {
    return;
  }

  if (!legacyChromiumBrowser) {
    element.scrollTo({ top });
    return;
  }

  element.scrollTop = top;
}

export function scrollChildIntoHorizontalViewCompat(
  container: HTMLElement | null | undefined,
  child: HTMLElement | null | undefined,
  padding = 24
) {
  if (!container || !child) {
    return;
  }

  const currentLeft = container.scrollLeft;
  const visibleLeft = currentLeft + padding;
  const visibleRight = currentLeft + container.clientWidth - padding;
  const childLeft = child.offsetLeft;
  const childRight = childLeft + child.offsetWidth;

  let nextLeft = currentLeft;

  if (childLeft < visibleLeft) {
    nextLeft = Math.max(0, childLeft - padding);
  } else if (childRight > visibleRight) {
    nextLeft = Math.max(0, childRight - container.clientWidth + padding);
  }

  if (nextLeft === currentLeft) {
    return;
  }

  if (!legacyChromiumBrowser) {
    container.scrollTo({ left: nextLeft });
    return;
  }

  container.scrollLeft = nextLeft;
}

export function closestCompat(
  element: HTMLElement | null | undefined,
  selector: string
): HTMLElement | null {
  if (!element) {
    return null;
  }

  const className = selector.startsWith('.') ? selector.slice(1) : selector;
  let current: HTMLElement | null = element;
  while (current) {
    if (current.classList && current.classList.contains(className)) {
      return current;
    }
    current = current.parentElement;
  }
  return null;
}
