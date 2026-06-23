export type JsonResponseParseResult = {
  data: unknown;
  repaired: boolean;
  strategies: string[];
};

type Candidate = {
  value: string;
  strategies: string[];
};

const stripUnsafeControlChars = (value: string) => {
  return value.replace(/^\uFEFF/, "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
};

const escapeInvalidBackslashes = (value: string) => {
  return value.replace(/\\(?!["\\/bfnrtu])/g, "\\\\");
};

const appendMissingClosers = (value: string) => {
  let inString = false;
  let escaping = false;
  const expectedClosers: string[] = [];

  for (const char of value) {
    if (escaping) {
      escaping = false;
      continue;
    }

    if (char === "\\") {
      escaping = true;
      continue;
    }

    if (char === "\"") {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (char === "{") {
      expectedClosers.push("}");
      continue;
    }

    if (char === "[") {
      expectedClosers.push("]");
      continue;
    }

    if (char === "}" || char === "]") {
      const expected = expectedClosers.pop();
      if (expected !== char) {
        return value;
      }
    }
  }

  if (inString || escaping || expectedClosers.length === 0) {
    return value;
  }

  return value + expectedClosers.reverse().join("");
};

const removeTrailingCommas = (value: string) => {
  return value.replace(/,\s*([}\]])/g, "$1");
};

const wrapPlainTextError = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return value;
  if (/^[\[{]/.test(trimmed)) return value;
  if (trimmed.startsWith("<")) return value;

  return JSON.stringify({
    success: false,
    error: "Invalid response",
    message: trimmed,
  });
};

const pushCandidate = (
  candidates: Candidate[],
  seen: Set<string>,
  value: string,
  strategies: string[]
) => {
  if (seen.has(value)) return;
  seen.add(value);
  candidates.push({ value, strategies });
};

export const parseJsonResponseText = (rawText: string): JsonResponseParseResult => {
  const normalized = stripUnsafeControlChars(rawText);
  const candidates: Candidate[] = [];
  const seen = new Set<string>();

  pushCandidate(
    candidates,
    seen,
    normalized,
    normalized === rawText ? [] : ["strip_unsafe_control_chars"]
  );

  const transformPipeline: Array<{
    name: string;
    apply: (value: string) => string;
  }> = [
    { name: "escape_invalid_backslashes", apply: escapeInvalidBackslashes },
    { name: "append_missing_closers", apply: appendMissingClosers },
    { name: "remove_trailing_commas", apply: removeTrailingCommas },
  ];

  let pipedValue = normalized;
  const pipedStrategies: string[] = normalized === rawText ? [] : ["strip_unsafe_control_chars"];
  for (const transform of transformPipeline) {
    const nextValue = transform.apply(pipedValue);
    if (nextValue !== pipedValue) {
      pipedStrategies.push(transform.name);
      pipedValue = nextValue;
      pushCandidate(candidates, seen, pipedValue, [...pipedStrategies]);
    }
  }

  const wrappedPlainText = wrapPlainTextError(normalized);
  if (wrappedPlainText !== normalized) {
    pushCandidate(candidates, seen, wrappedPlainText, ["wrap_plain_text_error"]);
  }

  let lastError: unknown;
  for (const candidate of candidates) {
    try {
      return {
        data: JSON.parse(candidate.value),
        repaired: candidate.strategies.length > 0,
        strategies: candidate.strategies,
      };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new SyntaxError("Unable to parse JSON response");
};
