# TV QA Hardening Checklist

## Scope
- Platform: Android TV emulator + physical TV device.
- Build: `debug` and one `release` candidate build.
- Session duration targets: 30 min smoke, 2 hour soak.

## 1) Focus Traversal Matrix
- Login screen:
  - D-pad reaches server chips, username, password, refresh, sign-in.
  - Focus never gets trapped inside keyboard or chip rail.
- Profile switcher:
  - First profile receives deterministic initial focus.
  - Left/right navigation across all profiles remains stable with 10+ profiles.
- Home sidebar:
  - Right from any sidebar action enters active tab content anchor.
  - Left from tab content anchor returns to active sidebar tab.
- Search:
  - Initial focus lands on first keyboard key.
  - Left from keyboard returns to sidebar active tab.
  - Result grid navigation has no dead-end focus traps.
- Downloads:
  - Initial focus lands on `Clear Completed`.
  - Long-press remove and retry actions preserve predictable focus recovery.
- Player:
  - Bottom controls follow deterministic left/right order.
  - Settings panel first control receives focus; left returns to settings toggle.

## 2) Playback Reliability
- Start movie playback from home, search, favorites, and downloads.
- Start series playback from detail episode list.
- Seek repeatedly (+10s/-10s) for 3 minutes.
- Toggle player settings (quality/audio/subtitles/speed/aspect/mute/stats) while playing.
- Exit and re-enter playback 20 times without crash/leak symptoms.

## 3) Download Reliability
- Queue 3+ downloads and verify progression updates.
- Validate paused/failed item retry flow.
- Validate completed item offline playback from downloads tab.
- Validate clear-completed removes files from local storage.
- Reboot app/device and confirm download list/state restoration.

## 4) Performance Baseline
- Home tab scroll at least 10 rails deep; no visible frame hitching.
- Search keyboard input burst (40+ chars) without dropped focus input.
- Player overlays open/close repeatedly without stutter.
- Capture baseline metrics:
  - cold start time
  - memory after 30 minute browsing
  - memory after 2 hour playback + settings toggles

## 5) Regression Gate
- No crashes in `adb logcat` across smoke + soak.
- No unrecoverable focus traps in any main flow.
- No playback black screen after seek/settings toggle loops.
- Downloads state remains consistent after restart.
