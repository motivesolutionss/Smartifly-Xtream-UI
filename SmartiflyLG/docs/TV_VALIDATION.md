# SmartiflyLG TV Release Validation

## Target Devices

`appinfo.json` is set to `resolution: "1920x1080"`, which is the FHD web app resolution on webOS TV.

- Primary target support: `webOS TV 6.0`, `webOS TV 22`, `webOS TV 23`, `webOS TV 24`, `webOS TV 25`, `webOS TV 26`
- Resolution note:
  `1920x1080` is the recommended FHD graphics resolution for web apps on UHD models.
- Distribution note:
  Full HD models support graphics up to `1280x720`, so if QA or Seller Lounge distribution requires FHD-model coverage, prepare and validate a separate `1280x720` package.

## Stream Test Matrix

Fill this table with real candidate streams before release.

| Type | Label | URL | Container / Manifest | Video Codec | Resolution | Bitrate | Audio Codec | Real LG TV Pass/Fail | Notes |
|---|---|---|---|---|---|---|---|---|---|
| Live | Live 1 |  | `.m3u8` |  |  |  |  |  |  |
| Live | Live 2 |  | `.m3u8` |  |  |  |  |  |  |
| Live | Live 3 |  | `.m3u8` |  |  |  |  |  |  |
| VOD | VOD 1 |  | `.mp4` |  |  |  |  |  |  |
| VOD | VOD 2 |  | `.mp4` |  |  |  |  |  |  |
| VOD | VOD 3 |  | `.mp4` |  |  |  |  |  |  |
| Series | Episode 1 |  | `.mp4` / episode URL |  |  |  |  |  |  |
| Series | Episode 2 |  | `.mp4` / episode URL |  |  |  |  |  |  |
| Series | Episode 3 |  | `.mp4` / episode URL |  |  |  |  |  |  |

Minimum metadata to capture per stream:

- Exact playback URL used by the app
- Video codec and profile
- Resolution and frame rate
- Peak and average bitrate
- Audio codec
- Any HLS tag quirks or fallback behavior

## What Each Environment Can Validate

| Environment | Playback | Back Button | Media Keys | Suspend / Resume | Use For |
|---|---|---|---|---|---|
| Desktop browser | Partial | No | No | No | Basic UI logic, routing, API shape, rendering sanity |
| webOS Simulator | Partial | Partial | Partial | Partial | Packaging smoke test, focus navigation, layout, basic app flow |
| Deprecated Emulator 6.0.0 | Low confidence | Partial | Low confidence | Low confidence | Rough smoke only; do not sign off release behavior from this |
| Real LG TV | Required | Required | Required | Required | Final validation for streaming, navigation, remote behavior, and release sign-off |

Environment guidance:

- Browser can validate:
  startup, screen flow, React rendering, API integration, and general UX behavior.
- Simulator can validate:
  app launch, package install, most focus behavior, and broad layout correctness.
- Emulator 6.0.0 can validate:
  only rough smoke behavior; stutter or media-key issues there are not release proof.
- Real TV must validate:
  actual HLS / MP4 playback, buffering behavior, audio level, Back handling, media keys, and lifecycle behavior.

## Release Blockers

These must pass on a real LG TV before ship:

- App installs, launches, and reopens cleanly from packaged `.ipk`
- At least `3 live .m3u8` streams play successfully on real TV
- At least `3 VOD .mp4` streams play successfully on real TV
- At least `3 series episode` streams play successfully on real TV
- No infinite retry loop, black screen, or unrecoverable stuck-buffer state during `30 minutes` continuous playback
- Back navigation works correctly from player, details, browse screens, and entry screen
- Remote media keys behave correctly:
  Play/Pause, Rewind, Fast Forward, Stop, OK/Enter, arrows, Back
- Suspend/resume is stable:
  app survives Home/app switching and resumes without broken playback state
- Audio is clearly audible at normal TV volume and does not remain muted unexpectedly
- No crash, white screen, or fatal startup error after cold launch
- Stream URLs used for release are confirmed against LG-supported codec / bitrate / audio constraints for the target webOS TV versions

## Sign-Off Rule

Do not release SmartiflyLG based only on browser, Simulator, or deprecated Emulator results.

Minimum sign-off requirement:

- One real LG TV tested
- Full stream matrix completed
- All release blockers above marked passed

## References

- LG webOS TV `appinfo.json` metadata:
  https://webostv.developer.lge.com/develop/references/appinfo-json
- LG supported app resolution:
  https://webostv.developer.lge.com/develop/specifications/app-resolution
- LG streaming protocol and DRM:
  https://webostv.developer.lge.com/develop/specifications/streaming-protocol-drm
- LG app lifecycle:
  https://webostv.developer.lge.com/develop/getting-started/app-lifecycle
- LG app lifecycle management:
  https://webostv.developer.lge.com/develop/guides/app-lifecycle-management
- LG emulator introduction:
  https://webostv.developer.lge.com/develop/tools/emulator-introduction
