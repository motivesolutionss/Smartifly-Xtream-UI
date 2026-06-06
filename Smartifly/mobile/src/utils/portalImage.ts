const asText = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const toPortalOrigin = (baseUrl?: string | null): string | null => {
    const cleaned = asText(baseUrl);
    if (!cleaned) return null;
    const withScheme = /^https?:\/\//i.test(cleaned) ? cleaned : `http://${cleaned}`;
    const match = withScheme.match(/^(https?:\/\/[^/?#]+)/i);
    return match?.[1] || null;
};

export const normalizePortalImageUrl = (raw: unknown, portalBaseUrl?: string | null): string => {
    let cleaned = asText(raw)
        .replace(/[\u0000-\u001F]/g, '')
        .replace(/[\u200B-\u200D\uFEFF]/g, '')
        .replace(/^['"]+|['"]+$/g, '')
        .replace(/\\/g, '/')
        .trim();
    if (!cleaned) return '';

    if (cleaned.startsWith('//')) {
        cleaned = `https:${cleaned}`;
    } else if (cleaned.startsWith('/')) {
        const origin = toPortalOrigin(portalBaseUrl);
        if (!origin) return '';
        cleaned = `${origin}${cleaned}`;
    } else if (!/^https?:\/\//i.test(cleaned)) {
        const origin = toPortalOrigin(portalBaseUrl);
        if (!origin) return '';
        cleaned = `${origin}/${cleaned.replace(/^\/+/, '')}`;
    }

    return /^https?:\/\/[^/?#]+/i.test(cleaned) ? cleaned : '';
};

export const resolveLiveImage = (live: any, portalBaseUrl?: string | null): string => {
    const candidates = [
        live?.stream_icon,
        live?.streamIcon,
        live?.logo,
        live?.logo_url,
        live?.tvg_logo,
        live?.channel_icon,
        live?.icon,
        live?.image,
        live?.thumb,
    ];

    for (const candidate of candidates) {
        const raw = asText(candidate);
        if (!raw) continue;
        const normalized = normalizePortalImageUrl(raw, portalBaseUrl);
        if (normalized) return normalized;
        return raw;
    }

    return '';
};
