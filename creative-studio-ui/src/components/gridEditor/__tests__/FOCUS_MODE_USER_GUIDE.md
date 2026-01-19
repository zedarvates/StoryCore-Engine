# Focus Mode - User Guide

## What is Focus Mode?

Focus Mode is a feature that allows you to zoom in on a single panel from the 3x3 grid for detailed editing. When you enter focus mode, the selected panel is maximized in the viewport, making it easier to work with fine details, annotations, and transformations.

## How to Use Focus Mode

### Entering Focus Mode

There are two ways to enter focus mode:

1. **Double-Click Method** (Recommended)
   - Simply double-click on any panel in the grid
   - The panel will smoothly zoom and center in the viewport
   - A blue "Exit Focus Mode" button will appear at the top center

2. **Programmatic Method** (For developers)
   ```typescript
   const { focusPanel } = useViewportStore();
   
   // Calculate panel bounds
   const panelBounds = {
     width: 640,  // Panel width in pixels
     height: 360, // Panel height in pixels
   };
   
   // Enter focus mode
   focusPanel(panelId, panelBounds);
   ```

### Exiting Focus Mode

There are two ways to exit focus mode:

1. **Escape Key** (Fastest)
   - Press the `Esc` key on your keyboard
   - The view will smoothly transition back to the full grid

2. **Exit Button**
   - Click the blue "Exit Focus Mode" button at the top center
   - The view will smoothly transition back to the full grid

## Features

### ✨ Smooth Transitions

Focus mode uses smooth CSS animations (0.3 seconds) to transition between grid view and focus view. This provides a polished, professional experience without jarring jumps.

### 🎯 Maximized Display

When you enter focus mode, the panel is automatically zoomed to fill 95% of the viewport. This maximizes the available space for editing while leaving a small margin for visual comfort.

### 🔒 Selection Preservation

Your panel selection is preserved when entering and exiting focus mode. If you had multiple panels selected, they will remain selected after exiting focus mode.

### 🗺️ Clean Interface

The minimap automatically hides when you enter focus mode, providing a cleaner, distraction-free editing environment.

## Visual Guide

```
┌─────────────────────────────────────────────────────────────┐
│                    GRID VIEW (Normal)                        │
│  ┌─────────┬─────────┬─────────┐                           │
│  │ Panel 1 │ Panel 2 │ Panel 3 │                           │
│  ├─────────┼─────────┼─────────┤                           │
│  │ Panel 4 │ Panel 5 │ Panel 6 │  ← Double-click Panel 5   │
│  ├─────────┼─────────┼─────────┤                           │
│  │ Panel 7 │ Panel 8 │ Panel 9 │                           │
│  └─────────┴─────────┴─────────┘                           │
└─────────────────────────────────────────────────────────────┘
                          ↓
                  (Smooth 0.3s transition)
                          ↓
┌─────────────────────────────────────────────────────────────┐
│              [Exit Focus Mode]  ← Click or press Esc        │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                      │   │
│  │                                                      │   │
│  │                                                      │   │
│  │                   Panel 5                            │   │
│  │              (Maximized View)                        │   │
│  │                                                      │   │
│  │                                                      │   │
│  │                                                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│                    FOCUS MODE                                │
└─────────────────────────────────────────────────────────────┘
```

## Use Cases

### 1. Detailed Annotation Work

When you need to add precise annotations, text, or drawings to a panel, focus mode gives you the space and clarity to work with fine details.

```
Example: Adding director's notes to a specific panel
1. Double-click the panel
2. Use annotation tools with better precision
3. Press Esc to return to grid view
```

### 2. Fine-Tuned Transformations

When adjusting position, scale, or rotation with pixel-perfect precision, focus mode provides a larger workspace.

```
Example: Adjusting panel crop boundaries
1. Double-click the panel
2. Use crop tool with better visibility
3. Press Esc to return to grid view
```

### 3. Layer Management

When working with multiple layers in a single panel, focus mode makes it easier to see and manage layer composition.

```
Example: Reordering and adjusting layer opacity
1. Double-click the panel
2. Work with layer stack in larger view
3. Press Esc to return to grid view
```

### 4. Quality Review

When reviewing the quality of a generated or edited panel, focus mode provides a clearer view for assessment.

```
Example: Checking image quality after generation
1. Double-click the panel
2. Inspect details at larger size
3. Press Esc to return to grid view
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| **Double-Click** | Enter focus mode for clicked panel |
| **Esc** | Exit focus mode |
| **Space + Drag** | Pan viewport (works in both modes) |
| **Mouse Wheel** | Zoom in/out (works in both modes) |

## Tips and Tricks

### 💡 Quick Navigation

You can quickly switch between panels in focus mode:
1. Press `Esc` to exit focus mode
2. Double-click a different panel
3. The new panel will be focused

### 💡 Combine with Selection

Focus mode works seamlessly with multi-selection:
1. Select multiple panels (Shift + Click)
2. Double-click one of the selected panels
3. Exit focus mode - all panels remain selected

### 💡 Use with Zoom Controls

While in focus mode, you can still use zoom controls:
- Click `+` to zoom in further
- Click `-` to zoom out
- Click `1:1` for actual pixel size
- Click fit icon to re-center the panel

### 💡 Keyboard-First Workflow

For maximum efficiency:
1. Use arrow keys to navigate panels (if implemented)
2. Double-click to focus
3. Make edits
4. Press `Esc` to exit
5. Repeat

## Accessibility

Focus mode is designed with accessibility in mind:

- **Keyboard Navigation:** Full keyboard support with Escape key
- **Visual Feedback:** Clear "Exit Focus Mode" button
- **Screen Reader Support:** Button has proper ARIA labels
- **High Contrast:** Button styling works in high contrast modes

## Technical Details

### Performance

- **Smooth Animations:** Hardware-accelerated CSS transitions
- **No Re-rendering:** Grid content is not re-rendered during transition
- **Efficient Memory:** No additional memory overhead
- **Fast Response:** Instant response to double-click and Escape key

### Browser Support

Focus mode works in all modern browsers:
- ✅ Chrome/Edge (Chromium) 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Opera 76+

### Responsive Design

Focus mode adapts to different screen sizes:
- **Desktop:** Full-size panel with comfortable margins
- **Tablet:** Optimized for touch interactions
- **Mobile:** Adapted for smaller screens (if supported)

## Troubleshooting

### Issue: Double-click not working

**Solution:** Make sure you're double-clicking directly on the panel, not on the grid lines or empty space.

### Issue: Transition is choppy

**Solution:** This may occur on older hardware. The transition will still work, just less smoothly. Consider disabling animations in browser settings if needed.

### Issue: Exit button not visible

**Solution:** The button appears at the top center. If your viewport is very small, it may be partially hidden. Try maximizing your browser window.

### Issue: Selection lost after focus mode

**Solution:** This should not happen. If it does, please report it as a bug. Selection state should always be preserved.

## FAQ

**Q: Can I edit the panel while in focus mode?**
A: Yes! All editing tools work normally in focus mode. You can transform, crop, annotate, and manage layers.

**Q: Can I focus multiple panels at once?**
A: No, focus mode is designed for single-panel editing. However, you can keep multiple panels selected while focusing on one.

**Q: Does focus mode affect the actual grid layout?**
A: No, focus mode is purely a viewport feature. It doesn't change the grid structure or panel positions.

**Q: Can I customize the transition speed?**
A: Currently, the transition is fixed at 0.3 seconds. Custom transition speeds may be added in future updates.

**Q: Does focus mode work with all panel types?**
A: Yes, focus mode works with all panels regardless of their content (images, annotations, effects).

## Related Features

- **Viewport Controls:** Zoom and pan work in both grid and focus modes
- **Panel Selection:** Selection is preserved during focus mode
- **Transform Tools:** All transform tools work in focus mode
- **Layer Management:** Layer stack is accessible in focus mode
- **Crop Tool:** Crop tool benefits from larger workspace in focus mode

## Feedback

We're constantly improving focus mode. If you have suggestions or encounter issues, please let us know!

---

**Last Updated:** January 2026
**Version:** 1.0
**Feature Status:** ✅ Complete
