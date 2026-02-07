import { useState, useEffect, useCallback } from 'react';
import useStore from '../store';
import { logger } from '../config';

export interface EPGProgram {
    title: string;
    description: string;
    start: string;
    end: string;
    start_timestamp: number;
    stop_timestamp: number;
}

export interface EPGState {
    currentProgram: EPGProgram | null;
    nextProgram: EPGProgram | null;
    progress: number; // 0 to 100
    loading: boolean;
    error: string | null;
}

// =============================================================================
// EPG CACHE (IN-MEMORY)
// =============================================================================

const EPG_CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes
const NO_EPG_TTL_MS = 30 * 60 * 1000; // 30 minutes

type EPGCacheEntry = {
    listings: EPGProgram[];
    timestamp: number;
};

const epgCache = new Map<number, EPGCacheEntry>();
const noEpgCache = new Map<number, number>();
const inflightRequests = new Map<number, Promise<EPGProgram[]>>();

const normalizeListings = (listings: any[]): EPGProgram[] => {
    if (!Array.isArray(listings) || listings.length === 0) return [];

    return listings.map((item: any) => ({
        title: item.title,
        description: item.description,
        start: item.start,
        end: item.end,
        start_timestamp: parseInt(item.start_timestamp, 10),
        stop_timestamp: parseInt(item.stop_timestamp, 10)
    })).sort((a, b) => a.start_timestamp - b.start_timestamp);
};

const resolveFromListings = (listings: EPGProgram[]) => {
    const nowUnix = Math.floor(Date.now() / 1000);
    let current: EPGProgram | null = null;
    let next: EPGProgram | null = null;

    for (let i = 0; i < listings.length; i++) {
        const prog = listings[i];

        if (nowUnix >= prog.start_timestamp && nowUnix < prog.stop_timestamp) {
            current = prog;
            next = listings[i + 1] || null;
            break;
        }
    }

    let progress = 0;
    if (current) {
        const totalDuration = current.stop_timestamp - current.start_timestamp;
        const elapsed = nowUnix - current.start_timestamp;
        if (totalDuration > 0) {
            progress = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
        }
    }

    return {
        currentProgram: current,
        nextProgram: next,
        progress,
    };
};



export const useEPG = (streamId: string | number | undefined, isFocused: boolean) => {
    const getXtreamAPI = useStore((state) => state.getXtreamAPI);
    const [epg, setEpg] = useState<EPGState>({
        currentProgram: null,
        nextProgram: null,
        progress: 0,
        loading: false,
        error: null,
    });

    const fetchEPG = useCallback(async () => {
        if (!streamId || !isFocused) return;

        const api = getXtreamAPI();
        if (!api) return;

        const id = Number(streamId);
        if (!Number.isFinite(id)) return;

        const now = Date.now();
        const noEpgAt = noEpgCache.get(id);
        if (noEpgAt && now - noEpgAt < NO_EPG_TTL_MS) {
            setEpg({
                currentProgram: null,
                nextProgram: null,
                progress: 0,
                loading: false,
                error: null,
            });
            return;
        }

        const cached = epgCache.get(id);
        if (cached && now - cached.timestamp < EPG_CACHE_TTL_MS) {
            const resolved = resolveFromListings(cached.listings);
            setEpg({
                ...resolved,
                loading: false,
                error: null,
            });
            return;
        }

        setEpg(prev => ({ ...prev, loading: true, error: null }));

        try {
            let request = inflightRequests.get(id);
            if (!request) {
                request = (async () => {
                    const data = await api.getEPG(id);
                    const listings = normalizeListings(data?.epg_listings || []);
                    if (listings.length === 0) {
                        noEpgCache.set(id, Date.now());
                    } else {
                        epgCache.set(id, { listings, timestamp: Date.now() });
                    }
                    return listings;
                })();
                inflightRequests.set(id, request);
            }

            const listings = await request;
            if (inflightRequests.get(id) === request) {
                inflightRequests.delete(id);
            }

            if (!listings.length) {
                setEpg({
                    currentProgram: null,
                    nextProgram: null,
                    progress: 0,
                    loading: false,
                    error: null,
                });
                return;
            }

            const resolved = resolveFromListings(listings);
            setEpg({
                ...resolved,
                loading: false,
                error: null,
            });
        } catch (err: any) {
            inflightRequests.delete(id);
            logger.error('useEPG: Failed to fetch', err);
            setEpg(prev => ({ ...prev, loading: false, error: 'Failed to load EPG' }));
        }
    }, [streamId, isFocused, getXtreamAPI]);

    useEffect(() => {
        if (isFocused) {
            fetchEPG();
        }
    }, [fetchEPG, isFocused]);

    return epg;
};

export default useEPG;
