# TODO List - Task 4.6: Playhead Indicator and Time Markers

## Objective
Implement comprehensive playhead indicator and time marker features including draggable playhead with snap-to-frame behavior, configurable time ruler with configurable granularity (frames/seconds/minutes), time ruler at top of timeline, and "Go to Time" button for jumping to specific timecode.

## Requirements (1.8, 3.2, 16.1, 16.2, 16.3, 16.4, 16.5, 16.6, 16.7, 16.8)
- Create draggable playhead with snap-to-frame behavior
- Display time markers with configurable granularity (frames/seconds/minutes)
- Add time ruler at top of timeline
- Sync playhead position with preview frame
- Add "Go to Time" button to jump to specific timecode
- Display current timecode at playhead position

## Tasks

### Step 1: Create Enhanced Playhead Component
- [ ] 1.1 Create PlayheadIndicator component with drag support
- [ ] 1.2 Implement snap-to-frame behavior
- [ ] 1.3 Add timecode display on playhead
- [ ] 1.4 Implement visual feedback during drag

### Step 2: Enhance Time Ruler Component
- [ ] 2.1 Create TimeRuler component
- [ ] 2.2 Implement configurable granularity (frames/seconds/minutes)
- [ ] 2.3 Add time markers with labels
- [ ] 2.4 Implement click-to-jump on time ruler

### Step 3: Create "Go to Time" Dialog
- [ ] 3.1 Create GoToTimeDialog component
- [ ] 3.2 Implement timecode input (MM:SS:FF format)
- [ ] 3.3 Add validation for timecode input
- [ ] 3.4 Connect to playhead position

### Step 4: Sync with Preview Frame
- [ ] 4.1 Connect playhead position to preview frame
- [ ] 4.2 Update preview when playhead moves
- [ ] 4.3 Add smooth transition between frames
- [ ] 4.4 Implement frame-accurate seeking

### Step 5: Add Frame Navigation Controls
- [ ] 5.1 Add frame step buttons (prev/next frame)
- [ ] 5.2 Add keyboard shortcuts (Left/Right arrows)
- [ ] 5.3 Add Home/End for sequence start/end
- [ ] 5.4 Add Page Up/Down for 1-second jumps

## Reference Files
- Requirements: `.kiro/specs/sequence-editor-interface/requirements.md`
- Design: `.kiro/specs/sequence-editor-interface/design.md`
- Current: `components/Timeline/PlayheadIndicator.tsx`, `Timeline.tsx`

## Status
- [x] Task 4.1 completed (Virtual scrolling)
- [x] Task 4.2 completed (Track management)
- [x] Task 4.3 completed (Shot/layer rendering)
- [x] Task 4.4 completed (Timeline control bar)
- [x] Task 4.5 completed (Zoom and navigation)
- [ ] Plan approved
- [ ] In Progress
- [ ] Completed

