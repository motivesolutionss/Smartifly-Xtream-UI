# Tizen TV Improvement Roadmap

## Summary
Improve the Samsung Tizen app in three phases: first harden reliability and obvious UX gaps, then raise home/search quality with better persistence and ranking, then keep the remaining scale items explicitly deferred until real-TV validation proves they are needed. The plan assumes the implementation stays direct-Xtream on the client side and does not require backend work.

## Phase 1: Reliability and User-Facing Quality
- Add Xtream response sanitization in `src/api/httpClient.ts` before JSON parse failure.
  Default behavior: try safe repair for truncated arrays/objects, invalid backslash escapes, and plain-string error envelopes; if repair still fails, keep the existing `INVALID_RESPONSE` error path.
  Interface change: `httpClient.request` accepts an optional `sanitizeResponseText` stage internally; no public service call sites change unless signal support is added.
- Add hero-detail fail-fast behavior in `src/features/home/Home.tsx`.
  Default behavior: keep the existing 450 ms delay before enabling detail fetch, then abort or ignore the detail request after 3500 ms; never block the base hero and never replace a valid hero with empty detail fields.
  Interface change: thread optional `AbortSignal` support through content service methods used by hero detail fetches if the current fetch layer supports it cleanly.
- Replace the current simple home hero selection with a deterministic rotation policy in `src/features/home/*`.
  Behavior: score candidates using current artwork/metadata signals plus recency, apply cooldown against recently shown hero IDs, apply diversity penalty against repeated genres/categories, and rotate within a top window so the same hero does not appear every session.
  Persistence default: store per-playlist plus per-profile hero rotation state locally with a schema version and a 24-hour cooldown window.
- Improve home rail quality ordering without rewriting the whole home screen.
  Behavior: keep anchor rails stable (`Continue Watching`, `Live`, `New Movies`, `New Series`) but rank category rails by usable artwork ratio, metadata richness, and freshness; apply anti-repeat ordering so the lower rails do not appear in the exact same order every load.
- Add EPG gap filling in `src/features/live-tv/epgQuery.ts`.
  Behavior: after parsing and sorting valid programs, insert synthetic items titled `No Program Info` between consecutive gaps; preserve existing window slicing and visible-channel-only fetching.
  Interface change: extend parsed EPG items with `synthetic?: true`.
- Tighten playback progress persistence.
  Default change: reduce `PROGRESS_PERSIST_INTERVAL_MS` from 30000 to 15000 and `PROGRESS_PERSIST_MIN_STEP_SECONDS` from 20 to 10.
  Constraint: keep live playback excluded and keep minimum resume threshold behavior.
- Add a central session cache reset path.
  Behavior: replace scattered clearing with a single `clearSessionCaches()` coordinator called on sign-out, playlist switch, and any future hard session reset.
  Default clears: home snapshot storage, search session catalog, image failure memory, image warm memory, and recently watched data only when the action is a full local data clear; sign-out should preserve remembered playlists unless product rules say otherwise.

## Phase 2: Image and Search Architecture
- Upgrade image reliability from URL-level memory to URL plus host policy.
  Behavior: add host-level strike tracking, temporary cooldown for unstable hosts, configurable low-trust host list, and host-aware candidate ordering before image preload attempts.
  Default policy: prefer HTTPS and known good hosts, suppress a host after 3 failures inside a short window, clear host penalties on later successful loads.
  Interface change: expand `imageFailureMemory` with host APIs such as `markHostSuccess`, `isHostSuppressed`, and host-based cooldown bookkeeping.
- Add adaptive image prefetch backpressure to `src/hooks/useBudgetedImagePreload.ts`.
  Behavior: keep current budgeted preload flow, but reduce concurrency and candidate count when a host is currently failing or timing out heavily; recover automatically after later successful loads.
  Default policy: degrade host concurrency from 2 to 1 during suppression and cap queued URLs for that host until recovery.
- Persist the search catalog beyond the in-memory session map.
  Behavior: keep the current warm/background/active catalog sync model, but write the lightweight indexed entries to IndexedDB keyed by playlist ID, profile ID, and schema version.
  Fallback: if IndexedDB is unavailable or quota fails, fall back to the current in-memory session store without breaking search.
  Interface change: introduce a storage adapter for search catalog load/save/clear so the search hook no longer depends directly on a module-level `Map`.
- Strengthen local search ranking while keeping current Tizen-safe behavior.
  Behavior: keep precomputed `titleLower`, add compact normalized title keys for punctuation/space-insensitive matching, keep current early-exit ranking, and reuse persisted category metadata for boosting without blocking initial results.
- Add coordinated invalidation rules for the search catalog.
  Default invalidation: clear on playlist switch, clear on profile switch, clear on schema version bump, and treat catalogs older than the chosen TTL as stale but usable until refresh completes.

## Phase 3: Structural Improvements After Emulator and Real-TV Validation
- Extract the home hero pipeline out of the screen component.
  Behavior: move hero candidate building, hero scoring, enrichment merge, and fallback rules into a dedicated home-hero module so `Home.tsx` becomes orchestration only.
- Rework home snapshot generation to choose category pools more intentionally from the first pass.
  Behavior: prefer categories with enough rich artwork and metadata before the snapshot is persisted, instead of first showing poor categories and fixing them later.
- Add a persistent, versioned home-session coordinator.
  Behavior: keep the current snapshot storage but centralize TTL, eviction, playlist/profile invalidation, and refresh-trigger reasons in one place.
- Defer large-scale list pagination for VOD and Series until real-TV testing proves it is needed.
  Current decision: do not implement UI pagination now.
  Future behavior if needed: add data-layer pagination first, keep the current UI shape, and reveal `Load more` or seamless append only if server pagination is real and stable.
- Defer home vertical rail virtualization until home routinely exceeds about 8 rails on real content.
  Current decision: keep current mounted rail list because the present rail count is small and the focus system is sensitive.
- Defer search Web Worker migration until measured main-thread stalls show chunking is no longer enough on real Samsung hardware.
  Current decision: keep chunked main-thread sync and ranking.

## Explicit Non-Goals
- Do not port Android-only platform features such as ExoPlayer DRM, Android PiP, launcher channel integration, WorkManager jobs, Firebase Remote Config, Firebase Analytics, Android SpeechRecognizer, or Firestore-backed cloud sync into this Tizen plan.
- Do not require backend changes for provider telemetry or search API support in this phase.
- Do not change the current direct-Xtream playback architecture.

## Test Plan and Acceptance Criteria
- HTTP/Xtream parsing tests must cover valid JSON, truncated arrays, truncated objects, invalid backslash escapes, and plain-string error payloads; repaired payloads must still produce correct typed results.
- Home hero tests must prove cooldown prevents immediate repeats, diversity penalizes recently used genre/category, and top-window rotation changes the chosen hero without randomness during a single render.
- Hero enrichment tests must prove slow or failed detail requests do not blank or delay the base hero and that successful detail fetches upgrade only missing fields.
- EPG tests must prove invalid items are discarded, gaps create synthetic `No Program Info` entries, and final window slicing still returns only visible-window programs.
- Image policy tests must prove bad URLs are skipped, bad hosts are suppressed after repeated failures, success clears host suppression, and preload concurrency shrinks during suppression.
- Search persistence tests must prove hydrate-from-IndexedDB works, stale catalogs refresh in the background, schema version bumps invalidate old catalogs, and fallback to in-memory mode still returns results.
- Session reset tests must prove sign-out and playlist switch clear the intended caches consistently and do not leave stale home/search/image state behind.
- Playback progress tests must prove VOD/Series persist every 15 seconds or 10-second step, live never persists, and force-save on exit still works.

## Assumptions and Defaults
- Scope is the Tizen Samsung TV app only.
- No backend changes are required for this roadmap.
- Search persistence will use IndexedDB first and fall back to the current in-memory session strategy if unsupported.
- Hero cooldown default is 24 hours per playlist/profile pair.
- Hero detail timeout default is 3500 ms after the existing 450 ms activation delay.
- Pagination, vertical rail virtualization, and Web Worker search sync stay deferred until real-TV evidence justifies them.
