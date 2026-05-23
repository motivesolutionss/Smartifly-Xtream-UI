export const xtreamUrlBuilder = {
  buildApiUrl: (
    serverUrl: string,
    username: string,
    password: string,
    action?: string,
    extraParams: Record<string, string> = {}
  ) => {
    const url = new URL(`${serverUrl}/player_api.php`);
    url.searchParams.append("username", username);
    url.searchParams.append("password", password);
    if (action) url.searchParams.append("action", action);

    Object.entries(extraParams).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });

    return url.toString();
  },

  buildLiveStreamUrl: (
    serverUrl: string,
    username: string,
    password: string,
    streamId: string,
    extension: string = "ts"
  ) => {
    return buildStreamUrl(serverUrl, "live", username, password, streamId, extension);
  },

  buildVodUrl: (
    serverUrl: string,
    username: string,
    password: string,
    streamId: string,
    extension: string = "mp4"
  ) => {
    return buildStreamUrl(serverUrl, "movie", username, password, streamId, extension);
  },

  buildSeriesUrl: (
    serverUrl: string,
    username: string,
    password: string,
    streamId: string,
    extension: string = "mp4"
  ) => {
    return buildStreamUrl(serverUrl, "series", username, password, streamId, extension);
  },
};

const encodePathPart = (value: string) => encodeURIComponent(value);

const sanitizeExtension = (extension: string) => {
  return extension.replace(/^\./, "").trim() || "mp4";
};

const buildStreamUrl = (
  serverUrl: string,
  path: "live" | "movie" | "series",
  username: string,
  password: string,
  streamId: string,
  extension: string
) => {
  const baseUrl = serverUrl.replace(/\/+$/, "");
  const safeExtension = sanitizeExtension(extension);

  return [
    baseUrl,
    path,
    encodePathPart(username),
    encodePathPart(password),
    `${encodePathPart(streamId)}.${safeExtension}`,
  ].join("/");
};
