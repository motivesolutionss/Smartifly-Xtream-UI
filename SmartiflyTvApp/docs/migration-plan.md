# TV Migration Plan (React Native -> Native Android TV)

## 1) Project Boundary
- Keep mobile in `SmartiflyApp` (React Native).
- Build TV in `SmartiflyTvApp` (native Android TV).
- Share backend contracts only (auth, profiles, catalog, playback URLs).

## 2) Technical Direction
- Language: Kotlin primary, Java allowed where needed.
- UI stack: Jetpack Compose + TV-focused D-pad/focus handling patterns.
- Architecture: `data -> domain -> ui`, unidirectional state flow per screen.

## 3) Migration Phases
1. Foundation (Completed)
2. Login + Profile Selection (Completed)
3. Home + Search + Favorites (Completed)
4. Details + Playback (Completed)
5. Settings + Downloads (Completed)
6. Optimization + QA hardening (In Progress)

### Phase 6 Delivered In This Iteration
- Broadcast + WorkManager download sync pipeline.
- Removed UI/ViewModel polling loop for download progress sync.
- Retry support for failed/paused downloads from TV UI.
- Local file cleanup when deleting download entries.
- Download error mapping for clearer operator/user diagnosis.
- Download tab operational summary (active/completed/failed + storage usage).
- Focus graph hardening across Home tabs, Search keyboard, Player controls, and Profile/Login entry points.
- Added unit-test coverage for download status synchronization.
- Added TV QA hardening checklist for focus traversal, playback soak, and download reliability.
- Settings polish delivered:
  - Account/server visibility in Settings.
  - Sync and maintenance controls for favorites/download storage.
  - Reset-to-default player settings action.

## 4) Focus and Performance Rules
- Every interactive component must define deterministic next focus behavior.
- Keep composables lightweight; avoid large recomposition surfaces.
- Prefer stable state holders per rail/screen.
- Measure with startup/frame metrics before adding visual polish.

## 5) API and Contract Migration
- Reuse request/response schema from RN service layer.
- Create typed DTOs and mapper layer in native app.
- Keep content IDs/profile IDs identical for cross-platform continuity.

## 6) Delivery Milestones
1. Week 1: Foundation + login shell
2. Week 2: Home rails + search
3. Week 3: Details + player controls
4. Week 4: QA, focus audit, performance pass

## 7) Definition of Done for TV
- Smooth D-pad traversal with no focus traps.
- Stable playback controls under long sessions.
- No frame hitching on main browsing flows.
- Crash-free sessions at enterprise reliability targets.
