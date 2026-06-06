const CONTROL_CHARS = /[\u0000-\u001F]/g;
const ZERO_WIDTH_CHARS = /[\u200B-\u200D\uFEFF]/g;
const HTTP_PREFIX = /^https?:\/\//i;

const extractOrigin = (value: string): string | null => {
    const match = value.match(/^(https?:\/\/[^/?#]+)/i);
    return match?.[1] || null;
};

const hasValidHttpHost = (value: string): boolean => {
    const match = value.match(/^https?:\/\/([^/?#]+)/i);
    if (!match?.[1]) return false;
    const host = match[1].trim();
    return host.length > 0 && host !== '.';
};

const sanitize = (raw?: string | null): string => {
    if (!raw) return '';
    return raw
        .trim()
        .replace(CONTROL_CHARS, '')
        .replace(ZERO_WIDTH_CHARS, '')
        .replace(/^['"]+|['"]+$/g, '')
        .replace(/\\/g, '/')
        .trim();
};

const toPortalOrigin = (portalBaseUrl?: string | null): string | null => {
    const cleaned = sanitize(portalBaseUrl);
    if (!cleaned) return null;
    const withScheme = HTTP_PREFIX.test(cleaned) ? cleaned : `http://${cleaned}`;
    return extractOrigin(withScheme);
};

export const normalizeImageUrl = (raw?: string | null, portalBaseUrl?: string | null): string | null => {
    let cleaned = sanitize(raw);
    if (!cleaned) return null;

    if (cleaned.startsWith('//')) {
        cleaned = `https:${cleaned}`;
    } else if (cleaned.startsWith('/')) {
        const origin = toPortalOrigin(portalBaseUrl);
        if (!origin) return null;
        cleaned = `${origin}${cleaned}`;
    } else if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
        const origin = toPortalOrigin(portalBaseUrl);
        if (!origin) return null;
        cleaned = `${origin}/${cleaned.replace(/^\/+/, '')}`;
    }

    if (!HTTP_PREFIX.test(cleaned)) return null;
    if (!hasValidHttpHost(cleaned)) return null;
    return cleaned;
};

export const normalizeImageList = (
    values: Array<string | undefined | null>,
    portalBaseUrl?: string | null
): string[] => {
    const output: string[] = [];
    for (const value of values) {
        const normalized = normalizeImageUrl(value, portalBaseUrl);
        if (normalized && !output.includes(normalized)) {
            output.push(normalized);
        }
    }
    return output;
};
