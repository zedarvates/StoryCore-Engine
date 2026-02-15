# TODO - Fix Accessibility Issues in ExportPanel.tsx

## Plan:
- [x] 1. Add title attribute to Width input (line ~224)
- [x] 2. Add title attribute to Height input (line ~237)
- [x] 3. Add title attribute to Format select (line ~251)
- [x] 4. Add title attribute to Quality select (line ~265)
- [x] 5. Move inline style from progress bar to CSS class (line ~313)

## Notes:
- Add title attributes to form elements for accessibility (axe/forms compliance)
- Replace inline style with CSS custom property for the progress bar fill
- Fixed by using CSS custom property (--progress-width) instead of inline style

## Status: COMPLETED
All 5 accessibility issues have been resolved:
1. Width input now has title="Video width in pixels"
2. Height input now has title="Video height in pixels"  
3. Format select now has title="Select output video format"
4. Quality select now has title="Select output video quality"
5. Progress bar now uses CSS custom property instead of inline style

