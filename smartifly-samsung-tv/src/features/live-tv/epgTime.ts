export const parseTimestampToSeconds = (value: string): number => {
  const asNumber = Number(value);
  if (Number.isFinite(asNumber) && asNumber > 0) {
    // Xtream usually returns unix seconds; guard for millis.
    return asNumber > 10_000_000_000 ? Math.floor(asNumber / 1000) : Math.floor(asNumber);
  }

  const parsedMillis = Date.parse(value);
  if (Number.isFinite(parsedMillis) && parsedMillis > 0) {
    return Math.floor(parsedMillis / 1000);
  }

  return 0;
};

export const formatEpgTime = (timestamp: string): string => {
  const seconds = parseTimestampToSeconds(timestamp);
  if (seconds <= 0) return "--:--";

  return new Date(seconds * 1000).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const calculateProgramWidth = (
  startTimestamp: string,
  endTimestamp: string,
  pixelsPerMinute = 4,
  minWidthPx = 110
): string => {
  const start = parseTimestampToSeconds(startTimestamp);
  const end = parseTimestampToSeconds(endTimestamp);
  const durationMinutes = Math.max(0, (end - start) / 60);
  const pixels = Math.max(minWidthPx, durationMinutes * pixelsPerMinute);
  return `${pixels}px`;
};
