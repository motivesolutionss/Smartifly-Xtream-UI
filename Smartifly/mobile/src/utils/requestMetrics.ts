import { logger } from '../config';

export interface RequestMetricEvent {
    scope: 'backend' | 'xtream' | 'master' | string;
    method: string;
    endpoint: string;
    durationMs: number;
    status?: number;
    success: boolean;
}

interface EndpointMetrics {
    count: number;
    successCount: number;
    errorCount: number;
    totalDurationMs: number;
    maxDurationMs: number;
    lastDurationMs: number;
    lastStatus?: number;
    lastAt: number;
}

const SLOW_REQUEST_MS = 1800;
const metricsMap = new Map<string, EndpointMetrics>();

const sanitizeEndpoint = (endpoint: string) => {
    if (!endpoint) return 'unknown';
    return endpoint.split('?')[0];
};

const getMetricKey = (scope: string, method: string, endpoint: string) => {
    return `${scope}|${method.toUpperCase()}|${sanitizeEndpoint(endpoint)}`;
};

export const recordRequestMetric = (event: RequestMetricEvent) => {
    const endpoint = sanitizeEndpoint(event.endpoint);
    const key = getMetricKey(event.scope, event.method, endpoint);
    const existing = metricsMap.get(key);

    const next: EndpointMetrics = existing
        ? {
            ...existing,
            count: existing.count + 1,
            successCount: existing.successCount + (event.success ? 1 : 0),
            errorCount: existing.errorCount + (event.success ? 0 : 1),
            totalDurationMs: existing.totalDurationMs + event.durationMs,
            maxDurationMs: Math.max(existing.maxDurationMs, event.durationMs),
            lastDurationMs: event.durationMs,
            lastStatus: event.status,
            lastAt: Date.now(),
        }
        : {
            count: 1,
            successCount: event.success ? 1 : 0,
            errorCount: event.success ? 0 : 1,
            totalDurationMs: event.durationMs,
            maxDurationMs: event.durationMs,
            lastDurationMs: event.durationMs,
            lastStatus: event.status,
            lastAt: Date.now(),
        };

    metricsMap.set(key, next);

    if (event.durationMs >= SLOW_REQUEST_MS) {
        logger.warn('Slow request detected', {
            scope: event.scope,
            method: event.method.toUpperCase(),
            endpoint,
            durationMs: event.durationMs,
            status: event.status,
        });
    }
};

export const getRequestMetricsSnapshot = () => {
    const snapshot: Array<{
        scope: string;
        method: string;
        endpoint: string;
        count: number;
        successRate: number;
        avgDurationMs: number;
        maxDurationMs: number;
        lastDurationMs: number;
        lastStatus?: number;
        lastAt: number;
    }> = [];

    for (const [key, value] of metricsMap.entries()) {
        const [scope, method, endpoint] = key.split('|');
        snapshot.push({
            scope,
            method,
            endpoint,
            count: value.count,
            successRate: value.count > 0 ? Math.round((value.successCount / value.count) * 100) : 0,
            avgDurationMs: value.count > 0 ? Math.round(value.totalDurationMs / value.count) : 0,
            maxDurationMs: value.maxDurationMs,
            lastDurationMs: value.lastDurationMs,
            lastStatus: value.lastStatus,
            lastAt: value.lastAt,
        });
    }

    return snapshot.sort((a, b) => b.lastAt - a.lastAt);
};

export const clearRequestMetrics = () => {
    metricsMap.clear();
};
