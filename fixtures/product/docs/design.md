# design

Operator UI only. No schema recap.

## Retry

`retry-budget 4`. Then `backoff 175ms`.

## Surface

Poll `ui-poll 800ms`. Overdue bays use pattern `hatch-45`, not a fill color split. Toast cap `max-toast 2`. Overdue badge `ui/badges/bay-overdue.svg`.

Keyboard `Alt+Shift+K` wakes the focused bay. Empty state copy is `No bay is awake`.

Stacking `z-index: 40`. Focus `focus-ring 3px`. One ring token. No hex pair for the same ring.
