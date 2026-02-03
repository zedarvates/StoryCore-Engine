# ShotFrameViewer.tsx Error Fixes

## Fix 1: Add missing closing `</div>` for `shot-frame-viewer-header`
- Line ~265: Add `</div>` to close the header div
- This will cascade-fix lines 309, 322, 350, 377, 486, 533, 535

## Fix 2: Escape `}` character in template literals
- Line 305: Change `{` to `{'}'}`
- Line 402: Change `{` to `{'}'}`  
- Line 591: Change `{` to `{'}'}`

## Fix 3: Escape `>` character in template literals
- Line 308: Change `>` to `{'>'}`
- Line 432: Change `>` to `{'>'}`
- Line 485: Change `>` to `{'>'}`

## Fix 4: Add missing closing `</div>` for `shot-frame-metadata-grid`
- Line ~593: Add `</div>` to close the metadata grid div

