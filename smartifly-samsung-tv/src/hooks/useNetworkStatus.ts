import { useEffect, useState } from "react";

export type NetworkStatus = "online" | "offline" | "degraded";

/**
 * useNetworkStatus
 *
 * Tracks the browser/Tizen network state and exposes a three-state status:
 *  - "online"   — navigator.onLine is true and no recent fetch failures
 *  - "offline"  — navigator.onLine is false
 *  - "degraded" — online but experiencing slow/failed requests
 *
 * The "degraded" state is set externally via `markDegraded()` and
 * automatically clears after DEGRADED_CLEAR_MS.
 *
 * Usage:
 *   const { status, markDegraded } = useNetworkStatus();
 */

const DEGRADED_CLEAR_MS = 8_000;

// Module-level listeners so multiple hook instances share one state.
type Listener = (status: NetworkStatus) => void;
const listeners = new Set<Listener>();
let currentStatus: NetworkStatus = navigator.onLine ? "online" : "offline";
let degradedTimer: number | null = null;

const broadcast = (next: NetworkStatus) => {
  currentStatus = next;
  listeners.forEach((fn) => fn(next));
};

const handleOnline = () => {
  if (degradedTimer !== null) return; // stay degraded until it clears
  broadcast("online");
};

const handleOffline = () => {
  if (degradedTimer !== null) {
    window.clearTimeout(degradedTimer);
    degradedTimer = null;
  }
  broadcast("offline");
};

window.addEventListener("online", handleOnline);
window.addEventListener("offline", handleOffline);

/** Call this from fetch error handlers to signal a degraded connection. */
export const markNetworkDegraded = () => {
  if (currentStatus === "offline") return;
  if (degradedTimer !== null) window.clearTimeout(degradedTimer);
  broadcast("degraded");
  degradedTimer = window.setTimeout(() => {
    degradedTimer = null;
    if (navigator.onLine) broadcast("online");
  }, DEGRADED_CLEAR_MS);
};

export const useNetworkStatus = () => {
  const [status, setStatus] = useState<NetworkStatus>(currentStatus);

  useEffect(() => {
    const listener: Listener = (next) => setStatus(next);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return { status, markDegraded: markNetworkDegraded };
};
