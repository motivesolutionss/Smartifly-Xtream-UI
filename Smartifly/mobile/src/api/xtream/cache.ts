import { config, logger } from '../../config';

export class XtreamRequestCache {
    private readonly responseCache: Map<string, { expiresAt: number; data: unknown }> = new Map();
    private readonly inflightRequests: Map<string, Promise<unknown>> = new Map();
    private readonly requestRetryCount = Math.max(0, config.xtream.retryCount ?? 1);

    clear(): void {
        this.responseCache.clear();
        this.inflightRequests.clear();
    }

    buildRequestKey(action: string, params?: Record<string, unknown>): string {
        if (!params) return action;
        const keys = Object.keys(params).sort();
        const serialized = keys.map((key) => `${key}:${String(params[key] ?? '')}`).join('|');
        return `${action}|${serialized}`;
    }

    private isRetryableRequestError(error: any): boolean {
        const status = error?.response?.status;
        const code = String(error?.code || '');
        const message = String(error?.message || '').toLowerCase();

        if (status === 429 || (typeof status === 'number' && status >= 500)) {
            return true;
        }

        if (
            code === 'ECONNABORTED' ||
            code === 'ETIMEDOUT' ||
            code === 'ERR_NETWORK' ||
            code === 'ERR_CONNECTION_TIMED_OUT'
        ) {
            return true;
        }

        return message.includes('network') || message.includes('timeout');
    }

    private async runWithRetry<T>(label: string, request: () => Promise<T>): Promise<T> {
        let attempt = 0;
        let lastError: unknown = null;

        while (attempt <= this.requestRetryCount) {
            try {
                return await request();
            } catch (error) {
                lastError = error;
                const shouldRetry = attempt < this.requestRetryCount && this.isRetryableRequestError(error);
                if (!shouldRetry) {
                    break;
                }

                const delayMs = 200 * Math.pow(2, attempt);
                logger.warn('Xtream request retry', {
                    label,
                    attempt: attempt + 1,
                    maxAttempts: this.requestRetryCount + 1,
                    delayMs,
                    message: (error as any)?.message,
                });
                await new Promise<void>((resolve) => setTimeout(() => resolve(), delayMs));
                attempt += 1;
            }
        }

        throw lastError;
    }

    async requestCached<T>(
        cacheKey: string,
        ttlMs: number,
        request: () => Promise<T>
    ): Promise<T> {
        const now = Date.now();
        const cached = this.responseCache.get(cacheKey);
        if (cached && cached.expiresAt > now) {
            return cached.data as T;
        }

        const inflight = this.inflightRequests.get(cacheKey);
        if (inflight) {
            return inflight as Promise<T>;
        }

        const pending = this.runWithRetry(cacheKey, request)
            .then((data) => {
                if (ttlMs > 0) {
                    this.responseCache.set(cacheKey, {
                        expiresAt: Date.now() + ttlMs,
                        data,
                    });
                }
                return data;
            })
            .finally(() => {
                this.inflightRequests.delete(cacheKey);
            });

        this.inflightRequests.set(cacheKey, pending as Promise<unknown>);
        return pending;
    }
}
