# Bugfix Requirements Document

## Introduction

The TV player's D-pad focus navigation system is broken, preventing users from rewinding video content using the LEFT key on their remote control. The focus navigation layer uses invisible "action catchers" positioned at screen edges to intercept D-pad navigation when the HUD (Heads-Up Display) is hidden, but these catchers are misconfigured with incorrect positioning and broken refocus logic. This creates a poor user experience where the primary rewind functionality is completely non-functional, while forward seeking works correctly. Additionally, the codebase uses deprecated React Native TV APIs that need modernization for long-term maintainability.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the HUD is hidden and the user presses the LEFT key on the D-pad THEN the system does not rewind the video (no action occurs or wrong action is triggered)

1.2 WHEN the HUD is hidden and the user attempts to navigate using D-pad directions THEN the focus navigation fails because action catchers are 1x1 pixels with no positioning (positioned at 0,0 by default)

1.3 WHEN the system attempts to refocus after a horizontal action THEN the refocus fails due to double `.current` access (`horizontalActionOriginRef.current?.current?.focus?.()` on line 45 of TVPlayerFocusLayer.tsx)

1.4 WHEN the action catchers are rendered THEN they remain focusable even when `isHudVisible` is true, causing focus navigation conflicts

1.5 WHEN the focus trap attempts to set preferred focus THEN it uses the deprecated `hasTVPreferredFocus` API instead of the modern `autoFocus` API

1.6 WHEN the center controls (play/pause, rewind, forward buttons) set preferred focus THEN they use the deprecated `hasTVPreferredFocus` API (line 91 of TVPlayerCenterControls.tsx)

1.7 WHEN the error overlay buttons and lock button set preferred focus THEN they use the deprecated `hasTVPreferredFocus` API in multiple locations in TVPlayerScreen.tsx

1.8 WHEN the focus trap handles up/down navigation THEN it has no `nextFocusUp` or `nextFocusDown` properties, potentially causing focus to escape the player

1.9 WHEN seeking forward or backward THEN the system uses hardcoded seek delta values (10 seconds) instead of a centralized constant, creating maintenance issues

### Expected Behavior (Correct)

2.1 WHEN the HUD is hidden and the user presses the LEFT key on the D-pad THEN the system SHALL rewind the video by 10 seconds (or change to previous channel if live content)

2.2 WHEN the HUD is hidden and the user attempts to navigate using D-pad directions THEN the focus navigation SHALL work correctly by positioning action catchers at screen edges (left and right edges for horizontal navigation)

2.3 WHEN the system attempts to refocus after a horizontal action THEN the refocus SHALL succeed by accessing the ref correctly with single `.current` access (`horizontalActionOriginRef.current?.focus?.()`)

2.4 WHEN the action catchers are rendered THEN they SHALL only be focusable when `isHudVisible` is false, preventing focus conflicts when HUD is visible

2.5 WHEN the focus trap sets preferred focus THEN it SHALL use the modern `autoFocus` API instead of the deprecated `hasTVPreferredFocus` API

2.6 WHEN the center controls set preferred focus THEN they SHALL use the modern `autoFocus` API instead of the deprecated `hasTVPreferredFocus` API

2.7 WHEN the error overlay buttons and lock button set preferred focus THEN they SHALL use the modern `autoFocus` API instead of the deprecated `hasTVPreferredFocus` API

2.8 WHEN the focus trap handles up/down navigation THEN it SHALL have proper `nextFocusUp` and `nextFocusDown` properties to maintain focus within the player

2.9 WHEN seeking forward or backward THEN the system SHALL use a centralized constant for seek delta values to ensure consistency and ease of maintenance

### Unchanged Behavior (Regression Prevention)

3.1 WHEN the HUD is hidden and the user presses the RIGHT key on the D-pad THEN the system SHALL CONTINUE TO skip forward 10 seconds (or change to next channel if live content)

3.2 WHEN the HUD is visible and the user navigates between visible controls (play/pause, rewind, forward, settings, etc.) THEN the system SHALL CONTINUE TO allow smooth focus navigation between all controls

3.3 WHEN the user presses the SELECT/OK button on the focus trap THEN the system SHALL CONTINUE TO show the HUD

3.4 WHEN the user is scrubbing through the video using the progress bar THEN the system SHALL CONTINUE TO update the video position correctly

3.5 WHEN the user opens the settings modal THEN the system SHALL CONTINUE TO display quality, audio, subtitle, speed, and aspect ratio options

3.6 WHEN the user locks the controls THEN the system SHALL CONTINUE TO hide all interactive elements and prevent accidental input

3.7 WHEN the video is playing and the HUD auto-hides after timeout THEN the system SHALL CONTINUE TO hide the HUD and return focus to the focus trap

3.8 WHEN the user navigates back from the player THEN the system SHALL CONTINUE TO save watch progress and return to the previous screen

3.9 WHEN the video encounters an error THEN the system SHALL CONTINUE TO display the error overlay with "Go Back" and "Retry" buttons

3.10 WHEN the user is watching live content THEN the system SHALL CONTINUE TO handle channel switching with LEFT/RIGHT keys when HUD is hidden
