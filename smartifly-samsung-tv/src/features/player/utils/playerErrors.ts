export const getBrowserMediaErrorMessage = (video: HTMLVideoElement) => {
  const code = video.error?.code;

  if (code === MediaError.MEDIA_ERR_NETWORK) {
    return "Unable to reach the stream server. Please try another stream.";
  }

  if (code === MediaError.MEDIA_ERR_DECODE) {
    return "This stream could not be decoded on this device.";
  }

  if (code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED) {
    return "This stream format is not supported on this device.";
  }

  return "This stream is currently unavailable. Please try again.";
};
