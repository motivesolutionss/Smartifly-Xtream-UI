export const EPG_SLOT_DURATION_MS = 30 * 60 * 1000;

export const getCurrentEpgWindowAnchorMs = (nowMs = Date.now()): number => {
  const current = new Date(nowMs);
  current.setMinutes(current.getMinutes() < 30 ? 0 : 30, 0, 0);
  return current.getTime();
};

export const buildEpgTimeSlots = (
  anchorMs: number,
  slotCount: number
): Date[] => {
  return Array.from({ length: slotCount }, (_, index) => {
    return new Date(anchorMs + index * EPG_SLOT_DURATION_MS);
  });
};

export const getMsUntilNextEpgWindow = (nowMs = Date.now()): number => {
  const anchorMs = getCurrentEpgWindowAnchorMs(nowMs);
  return Math.max(1, anchorMs + EPG_SLOT_DURATION_MS - nowMs);
};
