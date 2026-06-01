export const cleanChannelTitle = (title: string): string => {
  if (!title) return "";

  // Strip common category prefixes and delimiters like
  // "CRIC || Willow 2 HD" -> "Willow 2 HD"
  const delimiters = ["||", "|", " - ", " : "];
  for (const delimiter of delimiters) {
    if (title.includes(delimiter)) {
      const parts = title.split(delimiter);
      if (parts.length > 1 && parts[1].trim()) {
        return parts[1].trim();
      }
    }
  }

  // Prefix pattern like "UK: Willow" -> "Willow"
  const colonIndex = title.indexOf(":");
  if (colonIndex > 0 && colonIndex < 8) {
    const afterColon = title.substring(colonIndex + 1).trim();
    if (afterColon) return afterColon;
  }

  return title;
};
