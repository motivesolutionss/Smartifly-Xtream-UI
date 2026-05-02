# TV Focus Navigation Left Key Bugfix - Implementation Plan

## Phase 1: Exploration & Understanding

- [ ] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Left Key Navigation to Sidebar
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: For deterministic bugs, scope the property to the concrete failing case(s) to ensure reproducibility
  - Test that when left key is pressed on a card in a rail with 6+ cards, the `nextFocusLeft` prop is properly set to the sidebar node
  - The test assertions should match the Expected Behavior Properties from design
  - Test implementation details from Bug Condition in design:
    - Verify `sidebarNode` is resolved and not undefined/null
    - Verify `nextFocusLeft` prop is set on each card
    - Verify focus can navigate to sidebar when left key is pressed
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found to understand root cause:
    - Which rails have undefined sidebarNode?
    - At what card count does the bug start occurring?
    - What is the timing of node resolution?
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 1.3_

- [ ] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Other Navigation Directions
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for non-buggy inputs (right, up, down keys and card press)
  - Write property-based tests capturing observed behavior patterns from Preservation Requirements:
    - Right key navigation moves focus to next card in rail
    - Up key navigation moves focus to previous rail
    - Down key navigation moves focus to next rail
    - Card press/click navigates to content detail screen
    - Series rail with fewer than 6 cards continues to work
    - Sidebar navigation continues to work correctly
  - Property-based testing generates many test cases for stronger guarantees
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

## Phase 2: Implementation

- [ ] 3. Fix TVContentRail sidebarNode resolution

  - [ ] 3.1 Improve node resolution robustness in TVContentRail
    - File: `smartifly/tv/src/screens/tv/home/components/TVContentRail.tsx`
    - Increase retry interval from 120ms to 200ms to give sidebar more time to render
    - Add maximum retry count (e.g., 10 retries = 2 seconds total) to prevent infinite loops
    - Add logging when node resolution succeeds or fails for debugging
    - Ensure the retry mechanism properly clears the interval when max retries reached
    - _Bug_Condition: isBugCondition(input) where left key pressed on card in rail with 6+ cards and sidebarNode undefined_
    - _Expected_Behavior: sidebarNode properly resolved and nextFocusLeft set on all cards_
    - _Preservation: Right/up/down key navigation and card press behavior unchanged_
    - _Requirements: 2.1, 3.1, 3.2, 3.3_

  - [ ] 3.2 Fix dependency array in TVContentRail useEffect
    - Remove `sidebarNode` from dependency array to prevent unnecessary re-runs
    - Keep only `sidebarTargetRef` as dependency (or appropriate dependencies based on code structure)
    - This prevents the effect from clearing the resolved node before cards are rendered
    - Verify the effect runs at the right time and doesn't cause infinite loops
    - _Bug_Condition: Dependency array causing premature node resolution clearing_
    - _Expected_Behavior: Effect runs once and maintains sidebarNode across renders_
    - _Preservation: Other effects and component behavior unchanged_
    - _Requirements: 2.1_

  - [ ] 3.3 Add fallback mechanism in TVContentRail
    - If node resolution fails after max retries, add a fallback attempt on next render
    - Use a ref to track resolution attempts and avoid infinite loops
    - Consider using a state variable to trigger re-resolution if sidebar becomes available later
    - Ensure fallback doesn't cause performance issues or infinite loops
    - _Bug_Condition: Node resolution fails and no fallback exists_
    - _Expected_Behavior: Fallback mechanism ensures eventual resolution_
    - _Preservation: No performance degradation or infinite loops_
    - _Requirements: 2.1_

  - [ ] 3.4 Ensure ref stability in TVContentRail
    - Verify that `sidebarTargetRef` is stable across renders
    - Check if ref callback needs memoization to prevent unnecessary re-runs
    - Ensure ref is properly passed from parent component (HomeSection)
    - _Bug_Condition: Unstable ref causing repeated resolution attempts_
    - _Expected_Behavior: Stable ref allowing consistent node resolution_
    - _Preservation: Component structure and prop passing unchanged_
    - _Requirements: 2.1_

- [ ] 4. Fix TVContinueRail sidebarNode resolution

  - [ ] 4.1 Apply same improvements to TVContinueRail as TVContentRail
    - File: `smartifly/tv/src/screens/tv/home/components/TVContinueRail.tsx`
    - Increase retry interval from 120ms to 200ms
    - Add maximum retry count (10 retries = 2 seconds total)
    - Add logging for node resolution success/failure
    - Fix dependency array (remove sidebarNode if present)
    - Add fallback mechanism for failed resolution
    - Ensure ref stability
    - _Bug_Condition: Same as TVContentRail - sidebarNode undefined for rails with 6+ cards_
    - _Expected_Behavior: sidebarNode properly resolved and nextFocusLeft set on all cards_
    - _Preservation: Right/up/down key navigation and card press behavior unchanged_
    - _Requirements: 2.2, 3.1, 3.2, 3.3_

## Phase 3: Verification

- [ ] 5. Verify bug condition exploration test now passes

  - [ ] 5.1 Re-run bug condition exploration test from task 1
    - **Property 1: Expected Behavior** - Left Key Navigation to Sidebar
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - Verify that `nextFocusLeft` prop is now properly set on all cards
    - Verify that focus can navigate to sidebar when left key is pressed
    - Verify that sidebarNode is resolved for all rails (Movies, Live, Continue Watching)
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - Document any remaining issues or edge cases
    - _Requirements: Expected Behavior Properties from design (2.1, 2.2, 2.3)_

- [ ] 5.2 Verify preservation tests still pass
    - **Property 2: Preservation** - Other Navigation Directions
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - Verify right key navigation still moves focus to next card
    - Verify up key navigation still moves focus to previous rail
    - Verify down key navigation still moves focus to next rail
    - Verify card press/click still navigates to content detail screen
    - Verify Series rail with fewer than 6 cards still works correctly
    - Verify sidebar navigation still works correctly
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix (no regressions)
    - _Requirements: Preservation Properties from design (3.1, 3.2, 3.3, 3.4, 3.5, 3.6)_

## Phase 4: Additional Testing

- [ ] 6. Write unit tests for node resolution logic

  - [ ] 6.1 Test sidebarNode resolution for TVContentRail
    - Test that sidebarNode is properly resolved for rails with 6+ cards
    - Test that sidebarNode is properly resolved for rails with fewer than 6 cards
    - Test that nextFocusLeft prop is set correctly on all cards
    - Test that node resolution retries work correctly
    - Test edge cases:
      - No sidebar ref provided
      - Sidebar ref becomes available after initial attempt
      - Multiple rapid re-renders
      - Component unmounts during resolution
    - _Requirements: 2.1_

  - [ ] 6.2 Test sidebarNode resolution for TVContinueRail
    - Test that sidebarNode is properly resolved for Continue Watching rail
    - Test that nextFocusLeft prop is set correctly on all cards
    - Test that node resolution retries work correctly
    - Test edge cases similar to TVContentRail
    - _Requirements: 2.2_

  - [ ] 6.3 Test fallback mechanism
    - Test that fallback mechanism triggers when initial resolution fails
    - Test that fallback doesn't cause infinite loops
    - Test that fallback successfully resolves node when sidebar becomes available
    - _Requirements: 2.1, 2.2_

  - [ ] 6.4 Test ref stability
    - Test that sidebarTargetRef is stable across renders
    - Test that ref changes trigger appropriate re-resolution
    - Test that ref memoization (if used) works correctly
    - _Requirements: 2.1, 2.2_

- [ ] 7. Write property-based tests for focus navigation

  - [ ] 7.1 Property test: Left key navigation works for all rail configurations
    - Generate random rail configurations (different card counts: 1-20 cards)
    - For each configuration, verify left key on first card navigates to sidebar
    - Verify that sidebarNode is resolved for all configurations
    - Verify that nextFocusLeft is set correctly
    - _Requirements: 2.1, 2.2, 2.3_

  - [ ] 7.2 Property test: Right key navigation preserved across all configurations
    - Generate random rail configurations and keyboard inputs
    - For each configuration, verify right key navigates to next card
    - Verify that right key navigation is not affected by left key fix
    - _Requirements: 3.1_

  - [ ] 7.3 Property test: Up/down key navigation preserved
    - Generate random multi-rail scenarios
    - Verify up key navigates to previous rail
    - Verify down key navigates to next rail
    - Verify up/down navigation is not affected by left key fix
    - _Requirements: 3.2, 3.3_

  - [ ] 7.4 Property test: Card press behavior preserved
    - Generate random card selections and press events
    - Verify card press navigates to content detail screen
    - Verify card press behavior is not affected by left key fix
    - _Requirements: 3.5_

  - [ ] 7.5 Property test: Sidebar navigation preserved
    - Generate random sidebar navigation scenarios
    - Verify sidebar menu item navigation works correctly
    - Verify sidebar navigation is not affected by left key fix
    - _Requirements: 3.6_

- [ ] 8. Write integration tests for full focus navigation flow

  - [ ] 8.1 Test full focus navigation in home screen with multiple rails
    - Set up home screen with Movies, Live, Continue Watching, and Series rails
    - Test navigating between all rails using up/down keys
    - Test left key navigation from each rail to sidebar
    - Test right key navigation within each rail
    - Verify focus state is correct at each step
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3_

  - [ ] 8.2 Test switching between different rails and using left key navigation
    - Start in Movies rail, navigate left to sidebar
    - Switch to Live rail, navigate left to sidebar
    - Switch to Continue Watching rail, navigate left to sidebar
    - Switch to Series rail, navigate left to sidebar
    - Verify focus correctly moves to sidebar from each rail
    - _Requirements: 2.1, 2.2, 2.3_

  - [ ] 8.3 Test focus correctly moves to sidebar and back to rails
    - Navigate from Movies rail to sidebar using left key
    - Navigate back to Movies rail using right key
    - Verify focus returns to the same card or first card
    - Repeat for other rails
    - _Requirements: 2.1, 2.2, 2.3, 3.1_

  - [ ] 8.4 Test edge cases in focus navigation
    - Test rapid key presses (left, right, up, down in quick succession)
    - Test focus navigation when rails have different card counts
    - Test focus navigation when sidebar is not fully rendered
    - Test focus navigation when cards are being loaded/updated
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3_

## Phase 5: Checkpoint

- [ ] 9. Checkpoint - Ensure all tests pass
  - Run all unit tests and verify they pass
  - Run all property-based tests and verify they pass
  - Run all integration tests and verify they pass
  - Verify no regressions in existing functionality
  - Verify bug condition exploration test passes (bug is fixed)
  - Verify preservation tests pass (no regressions)
  - Document any issues or edge cases found
  - Ask the user if questions arise
  - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_
