# Stream Normalizer

Small Node.js service that normalizes IPTV HLS streams into a more LG-friendly HLS output.

## What it does

- Accepts a source HLS URL
- Starts an `ffmpeg` process for that source
- Serves the generated `.m3u8` playlist and `.ts` segments
- Reuses active pipelines for repeated requests
- Cleans up idle pipelines automatically

## Why it exists

This is meant to help Smart TV playback when raw IPTV streams are not compatible with LG/webOS browser playback. The first target profile is conservative HLS with:

- `H.264/AVC` video
- `AAC` audio
- MPEG-TS segments

## Quick start

1. Make sure `ffmpeg` is installed.
2. Copy `.env.example` to `.env` if you want custom settings.
3. Set `FFMPEG_PATH` if `ffmpeg` is not on your PATH.
4. Start the service:

```bash
npm start
```

## Main endpoint

Request a normalized stream:

```txt
GET /normalize?src=<original-hls-url>&mode=<copy|audio|full>
```

Example:

```txt
http://localhost:8090/normalize?src=http://103.120.71.199:25461/live/test/1234/247.m3u8&mode=audio
```

Response:

```json
{
  "id": "abc123...",
  "playbackUrl": "http://localhost:8090/streams/abc123/output.m3u8",
  "mode": "audio",
  "sourceUrl": "http://..."
}
```

## Modes

- `copy`: copy video and audio if they are already compatible
- `audio`: copy video, transcode audio to AAC
- `full`: transcode video to H.264 and audio to AAC

Recommended for your current test streams:

- `247`: `mode=audio`
- `384213`: `mode=full`

## Health endpoints

- `GET /health`
- `GET /streams`

## Notes

- The service does not probe codecs by itself yet. You choose the mode explicitly.
- Generated HLS files are stored under `streams/<stream-id>/`.
- Idle streams are stopped after `STREAM_IDLE_TIMEOUT_MS`.
