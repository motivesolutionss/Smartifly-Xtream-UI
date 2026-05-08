# TV Player Focus Navigation Fix - Bugfix Design

## Overview

This bugfix addresses critical focus navigation issues in the TV player's D-pad control system for VOD (video on demand) content. The primary issue is that LEFT key navigation fails to rewind video when the HUD is hidden, caused by misconfigured "action catcher" elements that have incorrect positioning (1x1 pixels at 0,0 instead of at screen edges) and broken refocus logic (double `.current` access). Additionally, the codebase uses deprecated React Native TV APIs (`hasTVPreferredFocus`) that need to be replaced with the modern `autoFocus` API.

The fix will reposition action catchers to screen edges, correct the refocus logic, replace deprecated APIs, ensure action catchers are only focusable when HUD is hidden, add proper focus navigation properties, and centralize the seek delta constant. The live channel functionality, which is working correctly, will be preserved without modification.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug - when the HUD is hidden and the user attempts D-pad navigation (particularly LEFT key for rewind)
- **Property (P)**: The desired behavior when D-pad navigation occurs with HUD hidden - action catchers should intercept navigation and trigger seek/channel change actions
- **Preservation**: Existing live channel switching, HUD visibility controls, and all other player functionality that must remain unchanged by the fix
- **TVPlayerFocusLayer**: The component in `Smartifly/tv/src/screens/player/components/TVPlayerFocusLayer.tsx` that manages the invisible focus navigation layer with action catchers
- **Action Catchers**: Invisible Pressable elements positioned at screen edges that intercept D-pad navigation to trigger seek/channel actions
- **Focus Trap**: The central invisible Pressable element that captures focus when HUD is hidden and shows HUD when pressed
- **HUD (Heads-Up Display)**: The visible player controls overlay showing play/pause, seek buttons, progress bar, and settings
- **horizontalActionOriginRef**: A ref that stores the element to refocus after a horizontal action (seek or channel change) completes

## Bug Details

### Bug Condition

The bug manifests when the HUD is hidden and the user presses D-pad navigation keys (particularly LEFT for rewind). The `TVPlayerFocusLayer` component has action catchers that are either not correctly positioned at screen edges, not finding the correct elements in the DOM, or not successfully triggering the seek/channel change actions due to broken refocus logic.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { hudVisible: boolean, keyPressed: string, actionCatcherStyle: object, refocusCode: string }
  OUTPUT: boolean
  
  RETURN (NOT input.hudVisible)
         AND (input.keyPressed IN ['ArrowLeft', 'ArrowRight'])
         AND (
           (input.actionCatcherStyle.width == 1 AND input.actionCatcherStyle.height == 1 AND NOT input.actionCatcherStyle.left AND NOT input.actionCatcherStyle.right)
           OR (input.refocusCode CONTAINS '.current?.current?.focus')
           OR (actionCatchersFocusableWhenHudVisible)
           OR (usesDeprecatedHasTVPreferredFocus)
           OR (noNextFocusUpDown)
           OR (hardcodedSeekDelta)
         )
END FUNCTION
```

### Examples

- **Action Catcher Positioning Bug**: Action catchers have `width: 1, height: 1, opacity: 0` with no `left` or `right` positioning, causing them to be positioned at (0,0) instead of at screen edges where they can intercept navigation
- **Refocus Bug**: After a horizontal action, the code calls `horizontalActionOriginRef.current?.current?.focus?.()` (double `.current`), which fails because `horizontalActionOriginRef.current` is already the ref object, not a ref container
- **Focusability Bug**: Action catchers are always `focusable` without checking `isHudVisible`, causing focus conflicts when HUD is visible
- **Deprecated API Bug**: Multiple components use `hasTVPreferredFocus` which is deprecated in favor of `autoFocus`
- **Missing Navigation Properties**: Focus trap has no `nextFocusUp` or `nextFocusDown`, potentially allowing focus to escape the player
- **Hardcoded Seek Delta**: Seek operations use hardcoded `10` instead of a centralized constant like `SEEK_DELTA_SECONDS`

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Live channel switching with LEFT/RIGHT keys must continue to work exactly as before
- HUD visibility toggling and auto-hide timer must remain unchanged
- Focus navigation between visible controls when HUD is shown must remain unchanged
- Progress bar scrubbing functionality must remain unchanged
- Settings modal display and navigation must remain unchanged
- Controls lock functionality must remain unchanged
- Error overlay display and button focus must remain unchanged
- Watch progress tracking must remain unchanged
- Video playback controls (play/pause, seek buttons) must remain unchanged

**Scope:**
All inputs that do NOT involve D-pad navigation when HUD is hidden should be completely unaffected by this fix. This includes:
- Mouse/touch interactions (if applicable)
- D-pad navigation when HUD is visible
- SELECT/OK button presses
- BACK button handling
- Settings modal interactions
- All live channel functionality

## Hypothesized Root Cause

Based on the bug description and code analysis, the most likely issues are:

1. **Incorrect Action Catcher Positioning**: The action catchers use `position: 'absolute', width: 1, height: 1, opacity: 0` but have no `left` or `right` positioning properties, causing them to default to (0,0) instead of being positioned at screen edges where they can intercept LEFT/RIGHT navigation

2. **Double Ref Access in Refocus Logic**: The refocus code uses `horizontalActionOriginRef.current?.current?.focus?.()` but `horizontalActionOriginRef.current` is already the ref object (not a ref container), so the double `.current` access fails

3. **Action Catchers Always Focusable**: The action catchers have `focusable` prop without checking `isHudVisible`, causing them to remain focusable even when HUD is visible, creating focus navigation conflicts

4. **Deprecated API Usage**: Multiple components use `hasTVPreferredFocus` which is deprecated and should be replaced with `autoFocus`

5. **Missing Focus Navigation Properties**: The focus trap has no `nextFocusUp` or `nextFocusDown` properties, potentially allowing focus to escape the player when user presses UP/DOWN

6. **Hardcoded Seek Delta**: Seek operations use hardcoded `10` instead of a centralized constant, making it harder to maintain consistency

## Correctness Properties

Property 1: Bug Condition - D-Pad Navigation with Hidden HUD

_For any_ D-pad navigation input (LEFT/RIGHT keys) where the HUD is hidden (isBugCondition returns true), the fixed TVPlayerFocusLayer component SHALL correctly intercept the navigation, trigger the appropriate seek or channel change action, and successfully refocus to the horizontal action origin element.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.8, 2.9**

Property 2: Preservation - All Other Player Functionality

_For any_ input that is NOT D-pad navigation with hidden HUD (isBugCondition returns false), the fixed code SHALL produce exactly the same behavior as the original code, preserving live channel switching, HUD visibility controls, visible control navigation, progress bar scrubbing, settings modal, controls lock, error overlay, watch progress tracking, and all video playback controls.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: `Smartifly/tv/src/screens/player/components/TVPlayerFocusLayer.tsx`

**Function**: `TVPlayerFocusLayer` component

**Specific Changes**:
1. **Fix Action Catcher Positioning**: Update `styles.actionCatcher` to position left catcher at left edge and right catcher at right edge
   - Left catcher: `left: 0, top: '50%', height: '100%'` (full height at left edge)
   - Right catcher: `right: 0, top: '50%', height: '100%'` (full height at right edge)
   - Keep `width: 1, opacity: 0` for invisibility

2. **Fix Refocus Logic**: Change `horizontalActionOriginRef.current?.current?.focus?.()` to `horizontalActionOriginRef.current?.focus?.()` (remove double `.current`)

3. **Fix Action Catcher Focusability**: Add `focusable={!isHudVisible}` to both action catchers so they're only focusable when HUD is hidden

4. **Replace Deprecated API in Focus Trap**: Change `hasTVPreferredFocus={!isHudVisible}` to `autoFocus={!isHudVisible}`

5. **Add Focus Navigation Properties to Focus Trap**: Add `nextFocusUp` and `nextFocusDown` properties pointing to itself to prevent focus escape

**File**: `Smartifly/tv/src/screens/player/components/TVPlayerCenterControls.tsx`

**Function**: `TVPlayerCenterControls` component

**Specific Changes**:
1. **Replace Deprecated API in Play/Pause Button**: Change `hasTVPreferredFocus: isHudVisible` to `autoFocus: isHudVisible` (line 91)

**File**: `Smartifly/tv/src/screens/player/TVPlayerScreen.tsx`

**Function**: `TVPlayerScreen` component

**Specific Changes**:
1. **Replace Deprecated API in Lock Button**: Change `hasTVPreferredFocus` to `autoFocus` in the lock button Pressable

2. **Replace Deprecated API in Error Overlay**: Change `hasTVPreferredFocus` to `autoFocus` in the error overlay "Go Back" button

3. **Create Centralized Seek Delta Constant**: Add `const SEEK_DELTA_SECONDS = 10;` at the top of the component and replace all hardcoded `10` values in seek operations with this constant

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write tests that simulate D-pad navigation events (LEFT/RIGHT keys) when HUD is hidden and assert that the corresponding seek or channel change actions are triggered. Run these tests on the UNFIXED code to observe failures and understand the root cause.

**Test Cases**:
1. **LEFT Key Rewind Test**: Simulate pressing LEFT when HUD is hidden in VOD mode (will fail on unfixed code - no rewind occurs)
2. **RIGHT Key Forward Test**: Simulate pressing RIGHT when HUD is hidden in VOD mode (may work on unfixed code if right catcher is positioned correctly)
3. **LEFT Key Channel Change Test**: Simulate pressing LEFT when HUD is hidden in live mode (may work on unfixed code if live channel logic is separate)
4. **Action Catcher Position Test**: Verify action catchers are positioned at screen edges (will fail on unfixed code - positioned at 0,0)
5. **Refocus After Action Test**: Verify focus returns to horizontal action origin after seek (will fail on unfixed code - double `.current` access)
6. **Action Catcher Focusability Test**: Verify action catchers are not focusable when HUD is visible (will fail on unfixed code - always focusable)

**Expected Counterexamples**:
- LEFT key press does not trigger rewind action when HUD is hidden
- Action catchers are positioned at (0,0) instead of screen edges
- Refocus fails after horizontal action due to double `.current` access
- Action catchers remain focusable when HUD is visible, causing focus conflicts
- Possible causes: incorrect positioning, broken refocus logic, incorrect focusability logic

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := TVPlayerFocusLayer_fixed(input)
  ASSERT expectedBehavior(result)
END FOR
```

**Expected Behavior**: D-pad navigation with hidden HUD correctly triggers seek/channel actions and refocuses properly.

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT TVPlayerFocusLayer_original(input) = TVPlayerFocusLayer_fixed(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for live channel switching, HUD visibility, and visible control navigation, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Live Channel Switching Preservation**: Observe that LEFT/RIGHT keys change channels correctly in live mode on unfixed code, then write test to verify this continues after fix
2. **HUD Visibility Preservation**: Observe that HUD shows/hides correctly on unfixed code, then write test to verify this continues after fix
3. **Visible Control Navigation Preservation**: Observe that D-pad navigation between visible controls works correctly when HUD is shown on unfixed code, then write test to verify this continues after fix
4. **Progress Bar Scrubbing Preservation**: Observe that progress bar scrubbing works correctly on unfixed code, then write test to verify this continues after fix
5. **Settings Modal Preservation**: Observe that settings modal displays and navigates correctly on unfixed code, then write test to verify this continues after fix

### Unit Tests

- Test action catcher positioning (left at left edge, right at right edge)
- Test refocus logic after horizontal action (single `.current` access)
- Test action catcher focusability based on HUD visibility
- Test deprecated API replacement (autoFocus instead of hasTVPreferredFocus)
- Test focus navigation properties (nextFocusUp/Down on focus trap)
- Test centralized seek delta constant usage

### Property-Based Tests

- Generate random HUD visibility states and verify action catcher focusability is correct
- Generate random D-pad navigation sequences and verify seek/channel actions are triggered correctly
- Generate random player states and verify live channel switching continues to work across many scenarios
- Test that all non-D-pad inputs continue to work across many scenarios

### Integration Tests

- Test full player flow with D-pad navigation in VOD mode (HUD hidden, press LEFT, verify rewind)
- Test full player flow with D-pad navigation in live mode (HUD hidden, press LEFT, verify channel change)
- Test switching between HUD visible and hidden states and using D-pad navigation
- Test that visual feedback occurs when D-pad navigation triggers actions
- Test that focus returns correctly after horizontal actions
- Test that deprecated APIs are fully replaced and no warnings appear
