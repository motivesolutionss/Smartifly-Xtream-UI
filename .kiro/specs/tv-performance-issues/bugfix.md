# Bugfix Requirements Document

## Introduction

The Smartifly Android TV app (`Smartifly/tv`) suffers from a cluster of performance regressions that cause visible jank, unnecessary re-renders, wasted memory, and fragile timer behaviour during normal D-pad navigation and video playback. The issues span style creation, animation threading, memoization, algorithmic complexity, component duplication, and external resource dependencies. This document captures the defective behaviours, the correct behaviours that must replace them, and the existing behaviours that must not regress.

---

## Bug Analysis

### Current Behavior (Defect)

**Issue 1 — TVContentCard: `createStyles` recreated on unstable theme reference**

1.1 WHEN `useTheme()` returns a new `theme` object reference (even with identical color values) THEN the system calls `createStyles(liveColor, accentColor)` and allocates a new `StyleSheet` object on every render cycle.

1.2 WHEN `liveColor` is derived as `theme.colors.live` inside the component body THEN the system passes a potentially new string reference into `useMemo`, causing the memo to invalidate even when the color value has not changed.

---

**Issue 2 — TVHeroBanner: crossfade animations run on the JS thread**

1.3 WHEN a hero item transition is triggered THEN the system computes `baseLayerOpacity` and `incomingLayerOpacity` via `Animated.multiply(baseOpacity, baseReveal)` using the legacy `Animated` API, executing opacity interpolation on the JavaScript thread instead of the UI thread.

1.4 WHEN `Animated.parallel` crossfade animations are running alongside Reanimated `useSharedValue`/`useAnimatedStyle` animations in the same component THEN the system mixes two animation runtimes, preventing the JS-thread animations from being offloaded, causing frame drops during backdrop transitions.

---

**Issue 3 — TVHomeScreen: inline JSX nodes defeat `HomeSection` memoization**

1.5 WHEN `TVHomeScreen` renders and calls `renderPinnedSection('Home', <HomeSection ... />)` THEN the system creates a new `<HomeSection>` JSX element on every render of `TVHomeScreen`, causing `React.memo` on `HomeSection` to receive a new `node` prop reference and re-render unconditionally.

1.6 WHEN `activeRoute` or `isInteracted` state changes in `TVHomeScreen` THEN the system re-renders all child screen nodes passed as inline JSX to `renderPinnedSection` and `renderActiveSection`, even for screens that are not currently active.

---

**Issue 4 — Duplicated `CategoryItem` / `CategoryList` components across three screens**

1.7 WHEN `TVMoviesScreen`, `TVSeriesScreen`, and `TVLiveScreen` are loaded THEN the system registers three separate, nearly-identical `CategoryItem` component definitions and three separate `CategoryList` component definitions in memory, tripling the component footprint for identical logic.

1.8 WHEN a bug or style change is required in the category list THEN the system requires the same fix to be applied in three separate files, increasing the risk of inconsistency.

---

**Issue 5 — `useHomeRails`: `selectTopNBy` sorts on every insertion**

1.9 WHEN `selectTopNBy` processes a dataset of N items to find the top K results THEN the system calls `top.sort()` after every single insertion into the `top` array, resulting in O(N × K log K) total sort operations instead of O(N log K).

1.10 WHEN `trending_movies` or `top_rated` rails are resolved against a catalogue of 10,000+ movies with `maxItems = 15` THEN the system executes up to 10,000 full sort passes over the accumulator array, causing measurable CPU spikes during rail resolution.

---

**Issue 6 — TVPlayerScreen: `handleProgress` recreated on every render**

1.11 WHEN `TVPlayerScreen` re-renders for any reason THEN the system creates a new `handleProgress` function reference because it is declared as a plain `const` function without `useCallback`.

1.12 WHEN the new `handleProgress` reference is passed to the `onProgress` prop of `<Video>` THEN the system causes the `react-native-video` component to detect a prop change and potentially re-register the progress callback on every render.

---

**Issue 7 — TVPlayerScreen: `showHUD` stale closure causes cascading timer resets**

1.13 WHEN `paused`, `showSettings`, or `controlsLocked` state changes THEN the system creates a new `showHUD` function reference via `useCallback`, which invalidates the `useEffect([showHUD])` dependency, which immediately calls `showHUD` again, which resets the 5-second HUD hide timer.

1.14 WHEN the user toggles `paused` repeatedly THEN the system triggers a cascade of `showHUD` calls and timer resets, preventing the HUD from auto-hiding correctly and causing stale closure reads of `paused` inside the timeout callback.

---

**Issue 8 — TVHomeScreen: `focusTargets` state causes full re-render on every D-pad focus event**

1.15 WHEN any focusable element in `TVHomeScreen` receives focus during D-pad navigation THEN the system calls `setFocusTargets(...)` with a new object, triggering a full re-render of `TVHomeScreen` and all its mounted child sections.

1.16 WHEN the user navigates rapidly with the D-pad THEN the system fires multiple `setFocusTargets` state updates in quick succession, each causing a synchronous React reconciliation pass over the entire home screen tree.

---

**Issue 9 — `FALLBACK_POSTER` depends on an external placeholder service**

1.17 WHEN a content card image fails to load and `FALLBACK_POSTER` is used as the fallback source THEN the system makes a network request to `https://via.placeholder.com`, an external third-party service with no SLA guarantees.

1.18 WHEN `via.placeholder.com` is slow, rate-limited, or unavailable THEN the system displays a blank or broken image for every card that falls back, degrading the visual experience across all content rails and grids.

---

**Issue 10 — TVContentRail uses `FlatList` instead of `FlashList` for horizontal rails**

1.19 WHEN `TVContentRail` renders a horizontal content rail with 10–15 items THEN the system uses React Native's `FlatList`, which does not recycle cell views and allocates a new component instance per item.

1.20 WHEN multiple `TVContentRail` instances are visible simultaneously on the home screen THEN the system holds all rendered card components in memory without recycling, consuming more memory and increasing layout work compared to `FlashList`.

---

### Expected Behavior (Correct)

**Issue 1 — TVContentCard: stable style memoization**

2.1 WHEN `useTheme()` returns a new object reference but the color values are unchanged THEN the system SHALL NOT call `createStyles` again; the memoized `StyleSheet` object SHALL be reused.

2.2 WHEN `liveColor` is extracted as a primitive string before being passed to `useMemo` THEN the system SHALL only invalidate the style memo when the color string value itself changes.

---

**Issue 2 — TVHeroBanner: crossfade animations on the UI thread**

2.3 WHEN a hero item transition is triggered THEN the system SHALL perform the crossfade opacity animation entirely on the UI thread using Reanimated `useSharedValue` and `useAnimatedStyle`, eliminating JS-thread involvement during the transition.

2.4 WHEN the component uses both entrance animations and crossfade animations THEN the system SHALL use a single animation runtime (Reanimated) for all animated values, removing the mixed `Animated` / Reanimated usage.

---

**Issue 3 — TVHomeScreen: stable section rendering**

2.5 WHEN `TVHomeScreen` renders THEN the system SHALL render `HomeSection` as a stable, directly-placed child component rather than passing it as an inline JSX node argument, so that `React.memo` can correctly bail out on unchanged props.

2.6 WHEN `activeRoute` changes THEN the system SHALL re-render only the components whose visibility or props are directly affected, without recreating JSX nodes for unrelated sections.

---

**Issue 4 — Shared `CategoryItem` / `CategoryList` components**

2.7 WHEN `TVMoviesScreen`, `TVSeriesScreen`, and `TVLiveScreen` render their category panels THEN the system SHALL use a single shared `CategoryItem` and `CategoryList` component defined in a common location, with no duplicated definitions.

2.8 WHEN a fix or style change is applied to the shared category components THEN the system SHALL reflect the change across all three screens without requiring edits in multiple files.

---

**Issue 5 — `selectTopNBy`: efficient top-N selection**

2.9 WHEN `selectTopNBy` processes N items to find the top K results THEN the system SHALL maintain a bounded max-heap or equivalent structure so that the total complexity is O(N log K) rather than O(N × K log K).

2.10 WHEN `trending_movies` or `top_rated` rails are resolved against a catalogue of 10,000+ movies THEN the system SHALL complete rail resolution without triggering more than O(N log K) comparison operations.

---

**Issue 6 — TVPlayerScreen: memoized `handleProgress`**

2.11 WHEN `TVPlayerScreen` re-renders THEN the system SHALL preserve the same `handleProgress` function reference across renders by wrapping it with `useCallback` and declaring stable dependencies.

2.12 WHEN `handleProgress` is passed to the `onProgress` prop of `<Video>` THEN the system SHALL not cause the Video component to detect a prop change on renders unrelated to progress tracking.

---

**Issue 7 — TVPlayerScreen: stable HUD timer without stale closures**

2.13 WHEN `paused`, `showSettings`, or `controlsLocked` change THEN the system SHALL read the current values of these flags inside the timer callback via refs rather than closing over stale state, so that the HUD hide decision is always based on the latest values.

2.14 WHEN `showHUD` is called THEN the system SHALL reset the hide timer exactly once without triggering a cascade of `useEffect` re-executions caused by a changing `showHUD` reference.

---

**Issue 8 — TVHomeScreen: focus tracking without re-renders**

2.15 WHEN a focusable element receives focus during D-pad navigation THEN the system SHALL record the focus target handle without calling `setState`, using a `ref` or equivalent mutable container so that `TVHomeScreen` does not re-render.

2.16 WHEN focus moves between elements THEN the system SHALL update the focus target synchronously without scheduling a React reconciliation pass over the home screen tree.

---

**Issue 9 — Bundled fallback poster asset**

2.17 WHEN a content card image fails to load THEN the system SHALL display a locally bundled fallback image asset that requires no network request.

2.18 WHEN `via.placeholder.com` is unavailable THEN the system SHALL display the bundled fallback without any visible failure or blank card.

---

**Issue 10 — TVContentRail uses `FlashList`**

2.19 WHEN `TVContentRail` renders a horizontal content rail THEN the system SHALL use `FlashList` with an appropriate `estimatedItemSize` so that cell views are recycled during scrolling.

2.20 WHEN multiple `TVContentRail` instances are visible simultaneously THEN the system SHALL recycle card component instances across rails, reducing peak memory allocation compared to `FlatList`.

---

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a content card is focused via D-pad THEN the system SHALL CONTINUE TO display the focus ring animation and scale zoom effect as before.

3.2 WHEN the hero banner displays a new item THEN the system SHALL CONTINUE TO show the crossfade transition between backdrop images with the same visual timing and appearance.

3.3 WHEN the user navigates between sidebar routes (Home, Movies, Series, Live) THEN the system SHALL CONTINUE TO switch the active section and restore focus to the correct entry point.

3.4 WHEN `TVMoviesScreen`, `TVSeriesScreen`, or `TVLiveScreen` renders THEN the system SHALL CONTINUE TO display the category panel on the left and the content grid on the right with the same layout and interaction behaviour.

3.5 WHEN the home screen rails are resolved THEN the system SHALL CONTINUE TO return the correct top-N items ranked by the same scoring criteria (recency for trending, rating for top-rated).

3.6 WHEN the video player is playing and the user presses a D-pad key THEN the system SHALL CONTINUE TO show the HUD and reset the auto-hide timer.

3.7 WHEN the video player is paused THEN the system SHALL CONTINUE TO keep the HUD visible indefinitely until the user resumes playback.

3.8 WHEN a content card image URL is valid and reachable THEN the system SHALL CONTINUE TO load and display the remote image without using the fallback asset.

3.9 WHEN `TVContentRail` renders items THEN the system SHALL CONTINUE TO support `onPressItem` and `onFocusItem` callbacks with the same behaviour as before.

3.10 WHEN watch progress is tracked during video playback THEN the system SHALL CONTINUE TO call `trackMovie`, `trackEpisode`, or `trackLive` at the correct throttled interval with accurate position and duration values.

---

## Bug Condition Pseudocode

### Issue 1 — Unstable style memoization

```pascal
FUNCTION isBugCondition_1(render)
  INPUT: render — a TVContentCard render cycle
  OUTPUT: boolean
  RETURN theme_object_reference_changed(render) AND color_values_unchanged(render)
END FUNCTION

// Fix Checking
FOR ALL render WHERE isBugCondition_1(render) DO
  result ← createStyles_call_count(render)
  ASSERT result = 0  // createStyles must NOT be called
END FOR

// Preservation Checking
FOR ALL render WHERE NOT isBugCondition_1(render) DO
  ASSERT F(render).styles = F'(render).styles
END FOR
```

### Issue 5 — selectTopNBy algorithmic complexity

```pascal
FUNCTION isBugCondition_5(X)
  INPUT: X = { items: array, n: number }
  OUTPUT: boolean
  RETURN length(X.items) > 1000 AND X.n <= 20
END FUNCTION

// Fix Checking
FOR ALL X WHERE isBugCondition_5(X) DO
  result ← selectTopNBy'(X.items, X.n, scoreFunc)
  ASSERT sort_operation_count(result) <= length(X.items) * log2(X.n) * CONSTANT
  ASSERT result = correct_top_n(X.items, X.n, scoreFunc)
END FOR

// Preservation Checking
FOR ALL X WHERE NOT isBugCondition_5(X) DO
  ASSERT selectTopNBy(X.items, X.n, scoreFunc) = selectTopNBy'(X.items, X.n, scoreFunc)
END FOR
```

### Issue 7 — Stale closure HUD timer

```pascal
FUNCTION isBugCondition_7(event)
  INPUT: event — a paused/showSettings/controlsLocked state change
  OUTPUT: boolean
  RETURN showHUD_reference_changed_after(event) AND useEffect_showHUD_dep_triggered(event)
END FUNCTION

// Fix Checking
FOR ALL event WHERE isBugCondition_7(event) DO
  result ← hud_timer_reset_count(event)
  ASSERT result = 1  // exactly one timer reset, no cascade
END FOR

// Preservation Checking
FOR ALL event WHERE NOT isBugCondition_7(event) DO
  ASSERT F(event).hud_visibility = F'(event).hud_visibility
END FOR
```
