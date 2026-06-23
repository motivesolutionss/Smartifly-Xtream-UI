# SmartiflyTV Hero Banner Architecture Spec

Implementation status: `Phase 1-5 core delivered` (May 2026)

## 1) Objective
Build a deterministic, resilient, and maintainable hero-banner pipeline for Android TV that:
- never renders an empty hero due to portal inconsistency,
- keeps logic out of UI components,
- supports mixed Xtream provider payload quality,
- remains performance-safe for TV hardware tiers.

## 2) Scope
In scope:
- Home hero selection, image resolution, metadata enrichment, and caching.
- Fallback and error-handling behavior when payload fields are missing or malformed.
- Structural refactor into small focused files.

Out of scope:
- Visual styling redesign.
- Changes to unrelated rails/business modules.

## 3) Historical Problems (Resolved in Current Build)
- Hero image depended mostly on `backdrop_path[0]` from list payloads.
- Some portals returned missing/invalid backdrop in list endpoints.
- Fallback logic was scattered and not centralized.
- URL normalization and quality filtering were inconsistent.

Current state:
- Centralized resolver and selection/enrichment pipeline is implemented.
- Home path uses stabilized hero selection and non-destructive enrichment.

## 4) Functional Requirements
1. Hero must always resolve to a valid display strategy:
- preferred: backdrop image,
- fallback: safe poster/cover image,
- final fallback: branded static placeholder (non-empty).

2. Hero selection must be deterministic for session stability:
- no random visual churn while user is on Home.

3. Hero enrichment must be asynchronous:
- list payload can render first,
- details endpoint can upgrade image/metadata later.

4. Failure in enrichment must not blank existing hero.

5. Logic must be reusable and testable outside Compose UI.

## 5) Non-Functional Requirements
- Performance: no blocking network on main thread.
- Reliability: malformed URLs/empty fields handled without crash.
- Maintainability: no hero “god file”; each file < ~500 lines.
- Observability: structured logs for hero resolution decisions.

## 6) Implemented Design
### 6.1 Domain Contract
Implemented contract:
- `HeroImageSources`: raw URL candidates.
- `HeroResolvedAsset`: resolved URL + source type.
- `MovieMetadata` remains UI payload for Home hero in current release.

Note:
- `HeroPresentationModel` abstraction is optional future enhancement if we need cross-screen hero reuse.

### 6.2 Resolution Pipeline
Pipeline stages (implemented):
1. Candidate collection (movies + series only).
2. Candidate scoring (rating/recency/continuity signal).
3. Image resolution (ordered fallback chain).
4. URL sanitation + validity checks.
5. Optional details enrichment for selected hero.
6. Cache write + publish stable result.

### 6.3 Fallback Order (Initial Policy)
For Movies:
1. `backdrop_path[0]`
2. `cover_big`
3. `cover`
4. `movie_image`
5. `stream_icon`

For Series:
1. `backdrop_path[0]`
2. `cover_big`
3. `cover`

If none valid:
- use local static placeholder asset.

### 6.4 URL Validation Rules
- Accept only `http://` or `https://`.
- Trim whitespace and invisible characters.
- Reject known garbage/non-URL strings.
- Normalize and preserve original host/path (no destructive rewrite).

### 6.5 Enrichment Strategy
- Selected hero triggers one details call:
  - movie: `get_vod_info`
  - series: `get_series_info`
- If enriched image is better/valid, update hero via soft refresh.
- If call fails, keep existing hero and log reason.

### 6.6 Caching
- In-memory cache for active session (mandatory).
- Optional lightweight persisted metadata cache (future phase).
- Never overwrite valid cached hero with empty/invalid enrichment.

### 6.7 Logging/Telemetry
Implemented log keys:
- `hero_candidate_count` (zero-candidate path)
- `hero_selected` with source (`continue_watching` / `session_lock` / `rated_window`)
- `hero_enrichment_start`
- `hero_enrichment_status` (`success` / `skip_or_fail`)
- `hero_reject_reason` (`invalid_url`)

## 7) File-Level Structure
Implemented files:
- `data/hero/HeroModels.kt`
- `data/hero/HeroImageResolver.kt`
- `data/hero/HeroEnrichmentService.kt`
- `data/hero/HeroRepository.kt`

Integrated files:
- `data/mapper/ContentMapper.kt` (resolver-backed mapping)
- `features/home/HomeViewModel.kt` (fast hero + async enrichment)
- `features/home/HomeScreen.kt` (safe fallback binding for render path)

## 8) Rollout Status (Gated)
Phase 1: Resolver foundation - `DONE`
- Models + URL sanitizer + resolver policy implemented.

Phase 2: Hero repository - `DONE`
- Deterministic session lock implemented.

Phase 3: Enrichment - `DONE`
- Detail-based upgrade added with timeout and non-destructive merge.

Phase 4: Home wiring - `DONE`
- Home flow uses repository selection and background enrichment.
- Hero render path has fallback safety when backdrop is missing.

Phase 5: Cleanup - `DONE (core path)`
- Home hero logic centralized in `data/hero` + mapper.
- Remaining optional cleanup is low-priority polishing.

## 9) Acceptance Criteria
1. Hero is never blank on Home for tested portals:
- `SMARTIFLY-01`
- `STAR-001`

2. On missing backdrop payloads, hero still renders fallback image.

3. Enrichment failure does not remove already visible hero.

4. No hero network operations on main thread.

5. Build passes and no regression in Home load.

## 10) Risks and Mitigations
- Risk: Overfetching details.
  - Mitigation: enrich only selected hero (plus optional prefetch cap).

- Risk: Invalid provider image URLs.
  - Mitigation: strict resolver validity checks + placeholder fallback.

- Risk: Logic duplication during migration.
  - Mitigation: enforce single repository ownership before cleanup phase ends.

## 11) Post-Implementation Notes
Decisions applied:
1. Fallback order policy - applied.
2. Session-stable hero behavior - applied.
3. Safe fallback render behavior - applied.
4. Persisted hero metadata cache - deferred (in-memory/session behavior currently sufficient).

Recommended next optional step:
- Add lightweight unit tests for `HeroImageResolver` and `HeroRepository`.
