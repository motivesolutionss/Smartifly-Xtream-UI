const SESSION_PREFIX = "perf";

let traceCounter = 0;

const randomToken = () => Math.random().toString(36).slice(2, 8);

const pageLoadedAt = new Date().toISOString();
const sessionId = `${SESSION_PREFIX}-${Date.now().toString(36)}-${randomToken()}`;

export const getPerfSessionId = () => sessionId;

export const getPerfSessionContext = () => ({
  sessionId,
  pageLoadedAt,
});

export const nextPerfTraceId = () => {
  traceCounter += 1;
  return traceCounter;
};
