## Live TV Enterprise Hardening Plan (Tizen 10-foot, Performance-first)

### Summary
We will upgrade the Live TV experience from “good” to “production-grade premium” with four goals:  
1) deterministic focus/navigation behavior,  
2) scalable rendering for large provider datasets,  
3) resilient network/error handling,  
4) polished but adaptive visuals for low-end and high-end Samsung TVs.  

We will implement this in tightly scoped phases so each phase is testable on emulator + real TV before moving forward.

### Implementation Changes
1. **Focus & Navigation Reliability (highest priority)**
- Fix EPG modal focus lifecycle so pre-modal focus is captured once on open and restored correctly on close.
- Keep and strengthen spatial memory:
  - retain per-category last focused channel and scroll position,
  - restore same channel/row when moving sidebar -> grid.
- Add **soft row snap** behavior in Live grid:
  - keep smooth movement, but align focused row into a stable viewport band.
- Add rail-edge behavior:
  - when user attempts beyond top/bottom/left/right limits, show subtle visual edge feedback (no focus loss, no random jumps).
- Ensure category switching never steals focus unexpectedly while background fetches occur.

2. **Rendering & Memory Hardening (Tizen-critical)**
- Upgrade Live grid virtualization behavior:
  - keep mounted window minimal and stable,
  - avoid unnecessary remounts/reflows during focus movement.
- Improve image loading pipeline:
  - strict viewport-driven lazy rendering (visible rows + small buffer only),
  - bounded preload queue (adaptive cap),
  - deterministic fallback image style for broken logos (branded gradient/initial, not plain empty).
- Throttle high-frequency side effects during hold-navigation:
  - keep focus movement instant,
  - debounce expensive work (EPG refresh trigger, perf logs, prefetch bursts).
- Remove/parameterize magic scroll offsets in VirtualGrid and replace with explicit configuration constants.

3. **EPG UX & Data Scalability**
- Replace hard channel cap with **virtualized full list** in EPG modal.
- Consolidate EPG timestamp parsing/formatting into a single shared utility used by both mini-guide and modal.
- Improve mini-guide:
  - “ON NOW”, start/end time, progress, and “NEXT” in compact form.
  - fallback states for no EPG, stale EPG, and partial EPG.
- Keep EPG modal performant:
  - virtualized channel column,
  - lightweight timeline rendering with safe min/max widths.

4. **Network Resilience & User Feedback**
- Add explicit degraded-network UI:
  - non-blocking banner/toast for temporary connectivity issues,
  - clear retry affordances on hard failures.
- Distinguish error classes in UI (auth/account/server/timeout/empty category) without exposing raw technical errors.
- Preserve last successful channel list during refetch and show clear updating indicator (already present, formalize behavior).
- Ensure all retry policies remain bounded and tuned for TV latency.

5. **Visual Hierarchy & Adaptive Performance Profile**
- Introduce **auto-adaptive visual profile**:
  - full visuals on capable devices,
  - reduced blur/shadow/scale/transitions when runtime pressure is detected.
- Apply focused/unfocused hierarchy tuning:
  - slightly dim non-focused grid cards,
  - stronger focused-card legibility without over-scaling.
- Keep category context visible at depth (sticky context in header/watermark-style subtle cue).
- Maintain TV-safe typography, overscan-safe spacing, and consistent focus rings across sidebar/grid/EPG controls.

### Public Interfaces / Type & API Changes
- `VirtualGrid` props extended to be decision-complete and reusable:
  - `rowSnapMode`, `focusBand`, `bottomSafeArea`, `focusBottomOffset`, `edgeFeedback`.
- `useLiveContent` behavior contract refined:
  - throttled category prefetch and bounded concurrent prefetches.
- `useEpg` contract normalized:
  - shared parsed program model (`startMs/endMs/progress/next[]`) used by both Live page and EPG modal.
- Live TV local store contract expanded if needed for:
  - edge-feedback timestamp/state,
  - optional perf-profile flags (derived runtime state).

### Test Plan & Acceptance Criteria
1. **Focus/navigation**
- Open EPG from grid and close: focus returns to exact pre-modal item.
- Sidebar -> grid -> sidebar -> grid preserves expected channel/row.
- Last item in row/column does not leak focus to random nodes.
- Soft row snap keeps focused row fully visible after every up/down step.

2. **Scalability/performance**
- 1k+ channels and 100+ categories remain navigable without freeze.
- Long d-pad hold produces smooth focus movement (no heavy hitching).
- Memory remains stable during 5+ minutes continuous navigation.
- Image failures show deterministic branded fallback without layout jumps.

3. **Network/error**
- Simulated timeout/unreachable/auth-expired states show correct user-facing messages and recovery actions.
- Category refetch uses previous data + updating indicator; no blank flicker.
- EPG unavailable state renders safe placeholders; app remains usable.

4. **Visual/UX**
- Focus contrast is clear at 8–10 ft viewing distance.
- Adaptive profile reduces effects under stress without visual breakage.
- Mini-guide remains readable and updates correctly with focused channel changes.

### Assumptions & Defaults Locked
- Scroll behavior: **Soft row snap** (chosen).
- EPG channel handling: **Virtualized full list** (chosen).
- Performance strategy: **Auto-adaptive profile** (chosen).
- We keep current architecture (services/hooks/store) and avoid backend work in this phase.
