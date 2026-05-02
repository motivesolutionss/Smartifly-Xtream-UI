# TV Focus Navigation Left Key Bugfix

## Introduction

The Smartifly TV app has a focus navigation bug where pressing the left key on content cards in rails doesn't consistently move focus to the sidebar. This only works for the Series rail because it has fewer than 6 cards. All other rails with 6+ cards prevent left navigation to the sidebar, trapping focus within the rail and degrading the user experience.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a user presses the left key on a card in a content rail with 6 or more cards THEN the focus does not move to the sidebar and remains trapped in the rail

1.2 WHEN a user presses the left key on a card in the Continue Watching rail with 6 or more cards THEN the focus does not move to the sidebar and remains trapped in the rail

1.3 WHEN a user presses the left key on a card in the Live rail with 6 or more cards THEN the focus does not move to the sidebar and remains trapped in the rail

### Expected Behavior (Correct)

2.1 WHEN a user presses the left key on a card in any content rail THEN the focus SHALL move to the corresponding sidebar menu item

2.2 WHEN a user presses the left key on a card in the Continue Watching rail THEN the focus SHALL move to the corresponding sidebar menu item

2.3 WHEN a user presses the left key on a card in the Live rail THEN the focus SHALL move to the corresponding sidebar menu item

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a user presses the right key on a card in any rail THEN the focus SHALL CONTINUE TO move to the next card in the rail

3.2 WHEN a user presses the down key on a card in any rail THEN the focus SHALL CONTINUE TO move to the next rail below

3.3 WHEN a user presses the up key on a card in any rail THEN the focus SHALL CONTINUE TO move to the previous rail above

3.4 WHEN a user presses the left key on the first card in the Series rail (which has fewer than 6 cards) THEN the focus SHALL CONTINUE TO move to the sidebar as it currently does

3.5 WHEN a user clicks a card with the mouse or remote button THEN the focus SHALL CONTINUE TO navigate to the content detail screen

3.6 WHEN a user navigates between sidebar menu items THEN the focus SHALL CONTINUE TO work correctly within the sidebar
