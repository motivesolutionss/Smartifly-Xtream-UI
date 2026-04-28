import { create } from 'zustand';
import { getAnnouncements } from '../api/backend';
import { logger } from '../config';
import MasterService from '../services/MasterService';
import { inferErrorCategory, toSafeMessageFromUnknown } from '../utils/errorHandling';

export interface FatherControlState {
    status: string;
    message: string | null;
    broadcasts: any[];
    client: string;
    config: any;
    isVerified: boolean;
}

interface AppStatusState {
    announcements: any[];
    announcementsLoading: boolean;
    announcementsError: string | null;
    fatherControl: FatherControlState;
}

interface AppStatusActions {
    fetchAnnouncements: (options?: { force?: boolean }) => Promise<boolean>;
    checkDeviceBan: () => Promise<boolean>;
    verifyFatherControl: () => Promise<boolean>;
    setFatherControl: (next: Partial<FatherControlState>) => void;
    clearAnnouncements: () => void;
}

const initialFatherControl: FatherControlState = {
    status: 'idle',
    message: null,
    broadcasts: [],
    client: 'Unknown',
    config: {},
    isVerified: false,
};

let deviceCheckInFlight: Promise<boolean> | null = null;
let deviceCheckInvocationCount = 0;
let lastDeviceCheckAt = 0;
let lastDeviceCheckResult: boolean | null = null;
let fatherVerifyInFlight: Promise<boolean> | null = null;
const DEVICE_CHECK_TTL_MS = 120000;

const useAppStatusStore = create<AppStatusState & AppStatusActions>((set, get) => ({
    announcements: [],
    announcementsLoading: false,
    announcementsError: null,
    fatherControl: initialFatherControl,

    setFatherControl: (next) => {
        set((state) => ({
            fatherControl: { ...state.fatherControl, ...next },
        }));
    },

    clearAnnouncements: () => {
        set({ announcements: [], announcementsError: null, announcementsLoading: false });
    },

    fetchAnnouncements: async (options) => {
        const { announcements, announcementsLoading } = get();
        const force = options?.force === true;

        if (announcementsLoading) {
            return true;
        }

        if (!force && announcements.length > 0) {
            return true;
        }

        set({ announcementsLoading: true, announcementsError: null });
        const startTime = Date.now();

        try {
            const timeoutPromise = new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('Announcements fetch timed out')), 10000)
            );
            const response = await Promise.race([getAnnouncements({ status: 'PUBLISHED' }), timeoutPromise]);
            const list = Array.isArray(response) ? response : [];
            set({ announcements: list, announcementsLoading: false });
            logger.info('Announcements fetch time', { ms: Date.now() - startTime });
            return true;
        } catch (err: unknown) {
            const errorMessage = toSafeMessageFromUnknown(err, 'ANNOUNCEMENTS_FETCH_FAILED', 'network');
            logger.error('Failed to load announcements', err);
            set({ announcements: [], announcementsLoading: false, announcementsError: errorMessage });
            const isRetryableNetworkIssue = inferErrorCategory(err as any, 'network') === 'network';
            if (force && isRetryableNetworkIssue) {
                try {
                    const useOfflineQueueStore = (await import('./offlineQueueStore')).default;
                    useOfflineQueueStore.getState().enqueueAction('refresh_announcements');
                } catch {
                    // Offline queue is a best-effort fallback.
                }
            }
            return false;
        }
    },

    checkDeviceBan: async () => {
        deviceCheckInvocationCount += 1;
        logger.info('Father: checkDeviceBan invoked', { count: deviceCheckInvocationCount });

        const now = Date.now();
        if (
            lastDeviceCheckResult !== null &&
            now - lastDeviceCheckAt < DEVICE_CHECK_TTL_MS
        ) {
            logger.info('Father: Using recent device check result from cache');
            return lastDeviceCheckResult;
        }

        if (deviceCheckInFlight) {
            logger.info('Father: Device check already in flight, reusing existing request');
            return deviceCheckInFlight;
        }

        deviceCheckInFlight = (async () => {
        try {
            logger.info('Father: Checking device ban status...');

            // Add timeout to prevent hanging forever
            const timeoutPromise = new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('Device check timed out')), 10000)
            );
            const result = await Promise.race([MasterService.deviceCheck(), timeoutPromise]);

            logger.info('Father: Device check result', result);

            if (result.status === 'BANNED') {
                set({
                    fatherControl: {
                        isVerified: false,
                        status: 'BANNED',
                        message: result.message || 'Device banned',
                        broadcasts: [],
                        client: 'Unknown',
                        config: {},
                    },
                });
                lastDeviceCheckAt = Date.now();
                lastDeviceCheckResult = false;
                return false;
            }

            lastDeviceCheckAt = Date.now();
            lastDeviceCheckResult = true;
            return true;
        } catch (err) {
            logger.warn('Father: Device check failed, proceeding as not banned', err);
            lastDeviceCheckAt = Date.now();
            lastDeviceCheckResult = true;
            return true;
        } finally {
            deviceCheckInFlight = null;
        }
        })();

        return deviceCheckInFlight;
    },

    verifyFatherControl: async () => {
        if (fatherVerifyInFlight) {
            return fatherVerifyInFlight;
        }

        fatherVerifyInFlight = (async () => {
            try {
            logger.info('Father: Starting boot check-in...');
            const response = await MasterService.bootCheck();

            logger.info('Father: Check-in result', response);

            const isVerified = response.status === 'OK';

            set({
                fatherControl: {
                    isVerified,
                    status: response.status,
                    config: response.config || {},
                    broadcasts: response.broadcasts || [],
                    client: response.client || 'Unknown',
                    message: response.message || null,
                },
            });

            return isVerified;
            } catch (error) {
                logger.error('Father Control Sync Failed', error);
                return false;
            } finally {
                fatherVerifyInFlight = null;
            }
        })();

        return fatherVerifyInFlight;
    },
}));

export default useAppStatusStore;
export { useAppStatusStore };
