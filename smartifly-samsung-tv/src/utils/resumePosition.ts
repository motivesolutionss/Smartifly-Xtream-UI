const MIN_RESUME_SECONDS = 10;
const END_RESTART_BUFFER_SECONDS = 45;

const isFinitePositive = (value?: number | null): value is number =>
  typeof value === "number" && Number.isFinite(value) && value > 0;

export const getResumePositionSeconds = (
  positionSeconds?: number | null,
  durationSeconds?: number | null
): number | undefined => {
  if (!isFinitePositive(positionSeconds) || positionSeconds < MIN_RESUME_SECONDS) {
    return undefined;
  }

  if (isFinitePositive(durationSeconds)) {
    const safeEndPoint = Math.max(0, durationSeconds - END_RESTART_BUFFER_SECONDS);
    const watchedRatio = positionSeconds / durationSeconds;

    if (positionSeconds >= safeEndPoint || watchedRatio >= 0.95) {
      return undefined;
    }
  }

  return Math.floor(positionSeconds);
};

export const hasResumePosition = (
  positionSeconds?: number | null,
  durationSeconds?: number | null
) => getResumePositionSeconds(positionSeconds, durationSeconds) !== undefined;
