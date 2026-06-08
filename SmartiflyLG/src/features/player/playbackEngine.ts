import type { PlaybackRequest } from '../../store/appStore';

export type PlaybackEngine = 'native' | 'shaka' | 'hlsjs';

type ChoosePlaybackEngineArgs = {
  playback: PlaybackRequest;
  streamUrl: string;
  overrideEngine?: PlaybackEngine | null;
  preferNativeHlsForLiveM3u8?: boolean;
  /** webOS live HLS: native demux often fails; one Shaka open avoids double-hitting the server */
  preferShakaForLiveHls?: boolean;
};

export type PlaybackEngineDecision = {
  engine: PlaybackEngine;
  reason: string;
  allowShakaFallback: boolean;
};

function getUrlExtension(streamUrl: string) {
  const cleanUrl = streamUrl.split('?')[0]?.toLowerCase() ?? '';

  if (cleanUrl.endsWith('.m3u8')) {
    return 'm3u8';
  }

  if (cleanUrl.endsWith('.mp4')) {
    return 'mp4';
  }

  if (cleanUrl.endsWith('.ts')) {
    return 'ts';
  }

  return 'other';
}

export function choosePlaybackEngine({
  playback,
  streamUrl,
  overrideEngine,
  preferNativeHlsForLiveM3u8 = false,
  preferShakaForLiveHls = false
}: ChoosePlaybackEngineArgs): PlaybackEngineDecision {
  if (overrideEngine === 'shaka') {
    return {
      engine: 'shaka',
      reason: 'Forced Shaka fallback after native playback failed',
      allowShakaFallback: false
    };
  }

  // Smartifly IPTV playback is typically clear HLS / MP4 without DRM metadata.
  // Prefer the native <video> pipeline for these simple cases because it is
  // lighter on webOS TV hardware. Keep Shaka for explicit fallback or formats
  // that are more likely to need an MSE-based pipeline.
  const extension = getUrlExtension(streamUrl);

  if (playback.kind === 'live' && extension === 'm3u8' && preferShakaForLiveHls) {
    return {
      engine: 'shaka',
      reason: 'Live HLS on webOS uses Shaka first to avoid native demux failure and duplicate opens',
      allowShakaFallback: false
    };
  }

  if (playback.kind === 'live' && extension === 'm3u8' && preferNativeHlsForLiveM3u8) {
    return {
      engine: 'native',
      reason: 'Live HLS prefers the native video pipeline first when the device advertises HLS support',
      allowShakaFallback: true
    };
  }

  if (playback.kind === 'live' && (extension === 'm3u8' || extension === 'ts')) {
    return {
      engine: 'hlsjs',
      reason: `Live ${extension.toUpperCase()} uses hls.js for reliable segment buffering on webOS`,
      allowShakaFallback: extension === 'm3u8'
    };
  }

  if ((playback.kind === 'movie' || playback.kind === 'series') && extension === 'mp4') {
    return {
      engine: 'native',
      reason: 'Direct MP4 playback without DRM prefers native video on webOS TV',
      allowShakaFallback: true
    };
  }

  return {
    engine: 'shaka',
    reason: `Format .${extension} falls back to Shaka / MSE path`,
    allowShakaFallback: false
  };
}
