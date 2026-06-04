/**
 * Detects the video resolution / quality based on the stream's title and description.
 * Defaults to "HD" if no match is found.
 */
export const detectVideoResolution = (title: string, description?: string): string => {
  const probe = `${title || ""} ${description || ""}`.toLowerCase();
  
  if (probe.includes("4k") || probe.includes("uhd") || probe.includes("2160") || probe.includes("ultra hd")) {
    return "4K Ultra HD";
  }
  if (probe.includes("1080") || probe.includes("fhd") || probe.includes("full hd")) {
    return "Full HD";
  }
  if (probe.includes("720") || probe.includes("hd")) {
    return "HD";
  }
  if (probe.includes("sd")) {
    return "SD";
  }
  
  return "HD"; // Sensible default
};
