# Implementation Plan

## Phase 1: Bug Condition Exploration (BEFORE Fix)

- [x] 1. Write bug condition exploration tests
  - **Property 1: Bug Condition** - D-Pad Navigation with Hidden HUD
  - **CRITICAL**: These tests MUST FAIL on unfixed code - failure confirms the bugs exist
  - **DO NOT attempt to fix the tests or the code when they fail**
  - **NOTE**: These tests encode the expected behavior - they will validate the fix when they pass after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bugs exist
  - **Scoped PBT Approach**: For deterministic bugs, scope the property to the concrete failing case(s) to ensure reproducibility
  - Test implementation details from Bug Condition in design:
    - Action catchers positioned at screen edges (left: 0, right: 0) with full height
    - Refocus logic uses single `.current` access
    - Action catchers only focusable when HUD is hidden
    - Modern `autoFocus` API used instead of deprecated `hasTVPreferredFocus`
    - Focus trap has `nextFocusUp` and `nextFocusDown` properties
    - Centralized `SEEK_DELTA_SECONDS` constant used
  - The test assertions should match the Expected Behavior Properties from design
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests FAIL (this is correct - it proves the bugs exist)
  - Document counterexamples found to understand root cause:
    - LEFT key press does not trigger rewind action when HUD is hidden
    - Action catchers positioned at (0,0) instead of screen edges
    - Refocus fails after horizontal action due to double `.current` access
    - Action catchers remain focusable when HUD is visible
    - Deprecated `hasTVPreferredFocus` API used in multiple locations
    - Focus trap missing `nextFocusUp` and `nextFocusDown` properties
    - Hardcoded seek delta values instead of centralized constant
  - Mark task complete when tests are written, run, and failures are documented
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.8, 2.9_

## Phase 2: Preservation Tests (BEFORE Fix)

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - All Other Player Functionality
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for non-buggy inputs:
    - Live channel switching with LEFT/RIGHT keys works correctly
    - HUD visibility toggling and auto-hide timer works correctly
    - Focus navigation between visible controls when HUD is shown works correctly
    - Progress bar scrubbing functionality works correctly
    - Settings modal display and navigation works correctly
    - Controls lock functionality works correctly
    - Error overlay display and button focus works correctly
    - Watch progress tracking works correctly
    - Video playback controls (play/pause, seek buttons) work correctly
  - Write property-based tests capturing observed behavior patterns from Preservation Requirements
  - Property-based testing generates many test cases for stronger guarantees
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10_

## Phase 3: Implementation

- [x] 3. Fix TV Player Focus Navigation Issues

  - [x] 3.1 Fix TVPlayerFocusLayer.tsx - Action Catcher Positioning and Refocus Logic
    - Update `styles.actionCatcher` to position catchers at screen edges:
      - Left catcher: `left: 0, top: 0, height: '100%', width: 1` (full height at left edge)
      - Right catcher: `right: 0, top: 0, height: '100%', width: 1` (full height at right edge)
      - Keep `opacity: 0` for invisibility
    - Fix refocus logic on line 45: change `horizontalActionOriginRef.current?.current?.focus?.()` to `horizontalActionOriginRef.current?.focus?.()`
    - Add `focusable={!isHudVisible}` to both action catchers (left and right) so they're only focusable when HUD is hidden
    - Replace deprecated API in focus trap: change `hasTVPreferredFocus={!isHudVisible}` to `autoFocus={!isHudVisible}`
    - Add focus navigation properties to focus trap: add `nextFocusUp: findNodeHandle(focusTrapRef.current)` and `nextFocusDown: findNodeHandle(focusTrapRef.current)` to prevent focus escape
    - _Bug_Condition: isBugCondition(input) where input.hudVisible = false AND input.keyPressed IN ['ArrowLeft', 'ArrowRight'] AND (actionCatcherStyle has no positioning OR refocusCode has double .current OR actionCatchers always focusable OR uses deprecated hasTVPreferredFocus OR no nextFocusUp/Down)_
    - _Expected_Behavior: D-pad navigation with hidden HUD correctly intercepts navigation, triggers seek/channel actions, and successfully refocuses to horizontal action origin_
    - _Preservation: Live channel switching, HUD visibility controls, visible control navigation, progress bar scrubbing, settings modal, controls lock, error overlay, watch progress tracking, and all video playback controls remain unchanged_
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.8, 2.1, 2.2, 2.3, 2.4, 2.5, 2.8_

  - [x] 3.2 Fix TVPlayerCenterControls.tsx - Replace Deprecated API
    - Replace deprecated API in play/pause button on line 91: change `hasTVPreferredFocus: isHudVisible` to `autoFocus: isHudVisible`
    - _Bug_Condition: isBugCondition(input) where input.usesDeprecatedHasTVPreferredFocus = true_
    - _Expected_Behavior: Play/pause button uses modern autoFocus API_
    - _Preservation: All center control functionality (play/pause, rewind, forward buttons) remains unchanged_
    - _Requirements: 1.6, 2.6_

  - [x] 3.3 Fix TVPlayerScreen.tsx - Replace Deprecated APIs and Centralize Seek Delta
    - Replace deprecated API in lock button (line 765): change `hasTVPreferredFocus` to `autoFocus`
    - Replace deprecated API in error overlay "Go Back" button (line 793): change `hasTVPreferredFocus` to `autoFocus`
    - Create centralized seek delta constant: add `const SEEK_DELTA_SECONDS = 10;` at the top of the component (after imports and before the component function)
    - Replace all hardcoded `10` values in seek operations with `SEEK_DELTA_SECONDS`:
      - In `handleSeekBy` function: change `handleSeekBy(direction * 10)` to `handleSeekBy(direction * SEEK_DELTA_SECONDS)`
      - In any other seek-related code that uses hardcoded `10`
    - _Bug_Condition: isBugCondition(input) where input.usesDeprecatedHasTVPreferredFocus = true OR input.hardcodedSeekDelta = true_
    - _Expected_Behavior: Lock button and error overlay buttons use modern autoFocus API, seek operations use centralized constant_
    - _Preservation: All player screen functionality (lock, error overlay, seek operations) remains unchanged_
    - _Requirements: 1.7, 1.9, 2.7, 2.9_

  - [x] 3.4 Verify bug condition exploration tests now pass
    - **Property 1: Expected Behavior** - D-Pad Navigation with Hidden HUD
    - **IMPORTANT**: Re-run the SAME tests from task 1 - do NOT write new tests
    - The tests from task 1 encode the expected behavior
    - When these tests pass, it confirms the expected behavior is satisfied
    - Run bug condition exploration tests from step 1
    - **EXPECTED OUTCOME**: Tests PASS (confirms bugs are fixed)
    - Verify all assertions pass:
      - Action catchers positioned at screen edges
      - Refocus logic works correctly
      - Action catchers only focusable when HUD is hidden
      - Modern `autoFocus` API used
      - Focus trap has proper navigation properties
      - Centralized seek delta constant used
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.8, 2.9_

  - [x] 3.5 Verify preservation tests still pass
    - **Property 2: Preservation** - All Other Player Functionality
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix:
      - Live channel switching works correctly
      - HUD visibility controls work correctly
      - Visible control navigation works correctly
      - Progress bar scrubbing works correctly
      - Settings modal works correctly
      - Controls lock works correctly
      - Error overlay works correctly
      - Watch progress tracking works correctly
      - Video playback controls work correctly
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10_

## Phase 4: Final Validation

- [x] 4. Checkpoint - Ensure all tests pass
  - Run all bug condition exploration tests - verify they pass
  - Run all preservation property tests - verify they pass
  - Run any additional unit tests or integration tests
  - Verify no TypeScript/linting errors
  - Test manually on TV device if possible:
    - Hide HUD and press LEFT key - verify rewind works
    - Hide HUD and press RIGHT key - verify forward seek works
    - Test live channel switching with LEFT/RIGHT keys
    - Test HUD visibility toggling
    - Test focus navigation between visible controls
    - Test all other player functionality
  - Ensure all tests pass, ask the user if questions arise
