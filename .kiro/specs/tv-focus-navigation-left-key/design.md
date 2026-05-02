# TV Focus Navigation Left Key Bugfix Design

## Overview

The Smartifly TV app has a focus navigation bug where pressing the left key on content cards in rails with 6+ cards doesn't move focus to the sidebar. This only works for the Series rail because it has fewer than 6 cards. The root cause is that the `sidebarNode` resolution in TVContentRail and TVContinueRail may be failing or timing out for rails with many cards. When `sidebarNode` is undefined or null, the TV focus engine won't navigate to the sidebar, trapping focus within the rail.

The fix ensures that `sidebarNode` is properly resolved and passed to all cards, with fallback mechanisms if node resolution fails. This will restore left key navigation to the sidebar for all rail types while preserving existing focus navigation for other directions (right, up, down).

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug - pressing the left key on a card in a rail with 6+ cards when sidebarNode is undefined or null
- **Property (P)**: The desired behavior when left key is pressed - focus should move to the sidebar menu item
- **Preservation**: Existing focus navigation for right, up, down keys and card press behavior that must remain unchanged
- **sidebarNode**: The React Native node handle for the sidebar menu item that should receive focus when left key is pressed
- **TVContentRail**: The component in `smartifly/tv/src/screens/tv/home/components/TVContentRail.tsx` that renders horizontal scrolling content cards (Movies, Live, Series)
- **TVContinueRail**: The component in `smartifly/tv/src/screens/tv/home/components/TVContinueRail.tsx` that renders continue watching cards
- **TVContentCard**: The component in `smartifly/tv/src/screens/tv/home/components/TVContentCard.tsx` that renders individual content cards with focus props
- **TVContinueCard**: The component in `smartifly/tv/src/screens/tv/home/components/TVContinueCard.tsx` that renders individual continue watching cards
- **nextFocusLeft**: The TV-specific focus prop passed to Pressable components that specifies which node should receive focus when left key is pressed

## Bug Details

### Bug Condition

The bug manifests when a user presses the left key on a card in a content rail with 6 or more cards. The `sidebarNode` resolution in TVContentRail and TVContinueRail may be failing or timing out for rails with many cards. When `sidebarNode` is undefined or null, the `nextFocusLeft` prop passed to each card is also undefined, causing the TV focus engine to not navigate to the sidebar.

The issue occurs because:
1. The `sidebarNode` is resolved asynchronously using `findNodeHandle()` on the `sidebarTargetRef`
2. For rails with many cards, the resolution may timeout or fail before cards are rendered
3. When `sidebarNode` is undefined, cards don't have a valid `nextFocusLeft` target
4. The TV focus engine then keeps focus trapped within the rail

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type KeyboardEvent
  OUTPUT: boolean
  
  RETURN input.keyCode = LEFT_KEY
         AND currentFocusedCard EXISTS IN rail
         AND rail.cardCount >= 6
         AND sidebarNode IS UNDEFINED OR NULL
         AND currentFocusedCard.nextFocusLeft IS UNDEFINED OR NULL
END FUNCTION
```

### Examples

- **Example 1**: User presses left key on first card in Movies rail (8 cards) → Focus remains on card instead of moving to sidebar
- **Example 2**: User presses left key on first card in Live rail (10 cards) → Focus remains on card instead of moving to sidebar
- **Example 3**: User presses left key on first card in Continue Watching rail (7 cards) → Focus remains on card instead of moving to sidebar
- **Example 4**: User presses left key on first card in Series rail (4 cards) → Focus correctly moves to sidebar (this works because Series has fewer cards and sidebarNode resolves in time)
- **Example 5**: Edge case - User rapidly navigates between rails and presses left key → sidebarNode may not be resolved yet, causing focus to remain trapped

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Mouse clicks on action buttons must continue to work exactly as before
- Right key navigation must continue to move focus to the next card in the rail
- Down key navigation must continue to move focus to the next rail below
- Up key navigation must continue to move focus to the previous rail above
- Card press/click behavior must continue to navigate to the content detail screen
- Sidebar navigation must continue to work correctly within the sidebar
- Series rail with fewer than 6 cards must continue to work as it currently does

**Scope:**
All inputs that do NOT involve pressing the left key on a card in a rail with 6+ cards should be completely unaffected by this fix. This includes:
- Right key navigation within rails
- Up/down key navigation between rails
- Mouse clicks on cards
- Sidebar navigation
- All other keyboard inputs

## Hypothesized Root Cause

Based on the bug description and code analysis, the most likely issues are:

1. **Timing Issue in Node Resolution**: The `useEffect` in TVContentRail and TVContinueRail attempts to resolve `sidebarNode` using `findNodeHandle()`. For rails with many cards, the sidebar ref may not be ready when the effect runs, and the retry interval (120ms) may not be sufficient for all cases.

2. **Dependency Array Issue**: The `useEffect` dependency array includes `sidebarNode`, which can cause the effect to run multiple times and potentially clear the resolved node before cards are rendered.

3. **Ref Stability**: The `sidebarTargetRef` passed from HomeSection may not be stable across renders, causing the node resolution to fail or be re-attempted unnecessarily.

4. **Missing Fallback**: There's no fallback mechanism if node resolution fails. Once the interval clears, there's no retry if the node becomes available later.

5. **Performance Degradation**: For rails with 6+ cards, the rendering performance may be degraded, causing the sidebar ref to not be ready in time for the initial node resolution attempt.

## Correctness Properties

Property 1: Bug Condition - Left Key Navigation to Sidebar

_For any_ keyboard input where the left key is pressed on a card in a rail with 6+ cards, the fixed TVContentRail and TVContinueRail components SHALL ensure that the `sidebarNode` is properly resolved and passed as `nextFocusLeft` to each card, allowing the TV focus engine to navigate focus to the sidebar menu item.

**Validates: Requirements 2.1, 2.2, 2.3**

Property 2: Preservation - Other Navigation Directions

_For any_ keyboard input that is NOT a left key press (right, up, down keys, or other inputs), the fixed code SHALL produce exactly the same behavior as the original code, preserving all existing focus navigation for other directions and card press behavior.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct, the fix involves improving the `sidebarNode` resolution mechanism in both TVContentRail and TVContinueRail:

**File**: `smartifly/tv/src/screens/tv/home/components/TVContentRail.tsx`

**Function**: `TVContentRail` component

**Specific Changes**:

1. **Improve Node Resolution Robustness**: 
   - Increase the retry interval from 120ms to 200ms to give the sidebar more time to render
   - Add a maximum retry count (e.g., 10 retries = 2 seconds total) to prevent infinite loops
   - Log when node resolution succeeds or fails for debugging

2. **Fix Dependency Array**:
   - Remove `sidebarNode` from the dependency array to prevent unnecessary re-runs
   - Keep only `sidebarTargetNode` and `sidebarTargetRef` as dependencies

3. **Add Fallback Mechanism**:
   - If node resolution fails after max retries, attempt one final resolution on the next render
   - Consider using a ref to track resolution attempts and avoid infinite loops

4. **Ensure Ref Stability**:
   - Verify that `sidebarTargetRef` is stable across renders
   - Consider memoizing the ref callback if needed

**File**: `smartifly/tv/src/screens/tv/home/components/TVContinueRail.tsx`

**Function**: `TVContinueRail` component

**Specific Changes**:
- Apply the same improvements as TVContentRail for consistency

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write tests that simulate left key presses on cards in rails with 6+ cards and assert that the `nextFocusLeft` prop is properly set to the sidebar node. Run these tests on the UNFIXED code to observe failures and understand the root cause.

**Test Cases**:
1. **Movies Rail Left Navigation Test**: Simulate pressing left key on first card in Movies rail (8 cards) - will fail on unfixed code because sidebarNode is undefined
2. **Live Rail Left Navigation Test**: Simulate pressing left key on first card in Live rail (10 cards) - will fail on unfixed code because sidebarNode is undefined
3. **Continue Watching Rail Left Navigation Test**: Simulate pressing left key on first card in Continue Watching rail (7 cards) - will fail on unfixed code because sidebarNode is undefined
4. **Series Rail Left Navigation Test**: Simulate pressing left key on first card in Series rail (4 cards) - will pass on unfixed code because Series has fewer cards and sidebarNode resolves in time

**Expected Counterexamples**:
- `nextFocusLeft` prop is undefined on cards in rails with 6+ cards
- Focus remains on card instead of moving to sidebar when left key is pressed
- Possible causes: sidebarNode resolution timeout, dependency array issue, ref instability

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := TVContentRail_fixed(input)
  ASSERT result.nextFocusLeft IS DEFINED AND NOT NULL
  ASSERT focusNavigatesToSidebar(result)
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT TVContentRail_original(input) = TVContentRail_fixed(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for right/up/down key navigation and card press behavior, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Right Key Navigation Preservation**: Verify right key navigation continues to move focus to next card
2. **Up Key Navigation Preservation**: Verify up key navigation continues to move focus to previous rail
3. **Down Key Navigation Preservation**: Verify down key navigation continues to move focus to next rail
4. **Card Press Preservation**: Verify card press/click behavior continues to navigate to detail screen
5. **Series Rail Preservation**: Verify Series rail with fewer than 6 cards continues to work correctly
6. **Sidebar Navigation Preservation**: Verify sidebar navigation continues to work correctly

### Unit Tests

- Test that sidebarNode is properly resolved for rails with 6+ cards
- Test that nextFocusLeft prop is set correctly on all cards
- Test that node resolution retries work correctly
- Test edge cases (no sidebar ref, sidebar ref becomes available later, etc.)

### Property-Based Tests

- Generate random rail configurations (different card counts) and verify left key navigation works
- Generate random keyboard inputs and verify non-left-key inputs continue to work
- Test that sidebarNode resolution is robust across different timing scenarios

### Integration Tests

- Test full focus navigation flow in home screen with multiple rails
- Test switching between different rails and using left key navigation
- Test that focus correctly moves to sidebar and back to rails
