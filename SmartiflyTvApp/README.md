# SmartiflyTvApp

Native Android TV app (Kotlin-first, Java-compatible) created as the migration target from `SmartiflyApp/src/screens/tv`.

## Goals
- Deliver smoother TV performance and predictable D-pad focus navigation.
- Keep `SmartiflyApp` for mobile while TV evolves independently.
- Build an enterprise-grade TV architecture suitable for long-term scaling.

## Current Setup
- Android TV app module in `app/`
- Kotlin-first architecture (`core/`, `data/`, `domain/`, `feature/`)
- Production-ready auth flow:
  - Backend portal fetch (`/portals`)
  - Xtream authentication (`/player_api.php`)
  - DataStore-backed session persistence
- Profile flow:
  - DataStore-backed profile set
  - Profile switcher with TV focus animations
- Phase 2 content flow:
  - Xtream catalog ingestion (movies/series categories + items)
  - Home rails with deterministic focus cards
  - Search tab with TV keyboard
  - Persistent favorites tab (DataStore)
- Phase 3 detail/playback flow:
  - Item click opens cinematic detail screen
  - Movie + series detail data from Xtream info endpoints
  - Native ExoPlayer playback shell with TV controls
- Phase 4 settings/download flow:
  - Sidebar routes: Home, Search, Favorites, Downloads, Settings
  - Persistent app/player settings (DataStore-backed)
  - Real background downloads using Android DownloadManager
  - Persistent TV downloads queue/state sync (DataStore-backed)
  - Detail screens can queue movie/episode downloads
  - Advanced player settings parity (quality/audio/subtitles/speed/aspect/mute/stats)
- Phase 6 hardening flow:
  - DownloadManager broadcast + WorkManager sync pipeline
  - Repository-level sync scheduling (no UI/ViewModel polling loop)
  - Download retry flow for failed/paused jobs
  - Local file cleanup on remove/clear-completed
  - Human-readable download error reasons
  - Download dashboard summary (active/completed/failed + storage used)
  - Explicit focus graph wiring (sidebar -> content anchors, content -> sidebar return path)
  - Player focus chain wiring (seek, play/pause, settings, exit, settings panel return)
  - Deterministic initial focus anchors for login/profile/search/downloads/settings
  - Unit tests for download synchronization logic
  - Settings operations panel:
    - Account snapshot (server, user, connections, expiry)
    - Sync controls (catalog + download status)
    - Maintenance controls (clear favorites, clear failed/completed/all downloads)
    - One-click player settings reset
- Focus hardening:
  - Initial focus anchors on sidebar/actions/detail/player controls
  - Deterministic tab-first D-pad entry behavior
- App shell routing: `Login -> Profile Switcher -> Sidebar Tabs -> Detail -> Player`
- Java interop utility (`FocusDebugLogger`) to keep mixed Kotlin/Java support
- TV manifest flags (`leanback` required, `touchscreen` not required)

## Open In Android Studio
1. Open folder: `SmartiflyTvApp`
2. Let Gradle sync.
3. Run on Android TV emulator/device.
4. Use TV remote/D-pad for navigation and form input.

## Build Check
- `./gradlew.bat :app:compileDebugKotlin --console=plain` (passes)
- `./gradlew.bat :app:testDebugUnitTest --console=plain` (passes)

## Suggested Next Migration Slice
1. QA hardening execution on emulator + physical TV (using `docs/tv-qa-hardening-checklist.md`)  
2. UI polish pass (motion tuning, focus glow consistency, typography balancing for TV distance)  
3. Release-readiness pass (proguard/r8, crash reporting hooks, startup profiling)  

Detailed plan: [docs/migration-plan.md](./docs/migration-plan.md)
QA checklist: [docs/tv-qa-hardening-checklist.md](./docs/tv-qa-hardening-checklist.md)
