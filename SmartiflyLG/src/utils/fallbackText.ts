export function formatFallbackTitle(title: string, maxWords = 4, maxChars = 34) {
  const normalized = title.replace(/\s+/g, ' ').trim();

  if (!normalized) {
    return 'Untitled';
  }

  const words = normalized.split(' ');
  let output = words.slice(0, maxWords).join(' ');

  if (words.length > maxWords) {
    output += '…';
  }

  if (output.length > maxChars) {
    output = `${output.slice(0, Math.max(1, maxChars - 1)).trimEnd()}…`;
  }

  return output;
}
