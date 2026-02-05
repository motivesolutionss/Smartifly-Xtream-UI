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



export const useEPG = (streamId: string | number | undefined, isFocused: boolean) => {
    const { getXtreamAPI } = useStore();
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

        setEpg(prev => ({ ...prev, loading: true, error: null }));

        try {
            const data = await api.getEPG(Number(streamId));

            const listings = data?.epg_listings || [];

            if (!Array.isArray(listings) || listings.length === 0) {
                setEpg(prev => ({ ...prev, loading: false }));
                return;
            }

            // Find current program
            const nowUnix = Math.floor(Date.now() / 1000);
            let current: EPGProgram | null = null;
            let next: EPGProgram | null = null;

            // Sort by start time
            // Xtream timestamps are usually strings in JSON, need parsing
            const cleanListings = listings.map((item: any) => ({
                title: item.title, // decodeBase64(item.title) if needed
                description: item.description,
                start: item.start,
                end: item.end,
                start_timestamp: parseInt(item.start_timestamp, 10),
                stop_timestamp: parseInt(item.stop_timestamp, 10)
            })).sort((a, b) => a.start_timestamp - b.start_timestamp);

            for (let i = 0; i < cleanListings.length; i++) {
                const prog = cleanListings[i];

                if (nowUnix >= prog.start_timestamp && nowUnix < prog.stop_timestamp) {
                    current = prog;
                    next = cleanListings[i + 1] || null;
                    break;
                }
            }

            // If we are between programs or data is sparse, current might be null.

            let progress = 0;
            if (current) {
                const totalDuration = current.stop_timestamp - current.start_timestamp;
                const elapsed = nowUnix - current.start_timestamp;
                if (totalDuration > 0) {
                    progress = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
                }
            }

            setEpg({
                currentProgram: current,
                nextProgram: next,
                progress,
                loading: false,
                error: null
            });

        } catch (err: any) {
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
