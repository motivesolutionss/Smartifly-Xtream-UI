type IdleDeadline = {
    didTimeout: boolean;
    timeRemaining: () => number;
};

const fallbackDeadline: IdleDeadline = {
    didTimeout: true,
    timeRemaining: () => 0,
};

export const scheduleIdleWork = (
    cb: (deadline: IdleDeadline) => void,
    timeoutMs?: number
) => {
    const globalAny = globalThis as any;
    const requestIdleCallback = globalAny?.requestIdleCallback as
        | ((callback: (deadline: IdleDeadline) => void, options?: { timeout: number }) => any)
        | undefined;
    const cancelIdleCallback = globalAny?.cancelIdleCallback as ((id: any) => void) | undefined;

    if (requestIdleCallback && cancelIdleCallback) {
        const id = timeoutMs ? requestIdleCallback(cb, { timeout: timeoutMs }) : requestIdleCallback(cb);
        return {
            cancel: () => cancelIdleCallback(id),
        };
    }

    const id = setTimeout(() => cb(fallbackDeadline), 0);
    return {
        cancel: () => clearTimeout(id),
    };
};
