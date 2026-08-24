# StoryCore Harbour — manual accessibility verification protocol

Last updated: 2026-08-12

Automated browser checks already cover labels, local validation focus, tab semantics, arrow-key navigation, panel focus, live regions, reduced motion, minimum width, and horizontal overflow. This protocol closes the remaining human checks before Marketplace submission.

## Test environment record

Record for each pass:

- App commit and version;
- operating system;
- Anna host/runtime version if visible;
- browser/webview version;
- screen reader and version;
- zoom level or forced-colour mode;
- output language used;
- date and tester initials.

Do not record the tester's creative prompt or generated project content.

## Pass A — keyboard only

Use no mouse or touch input.

1. Open the normal App URL without `?acceptance=1`.
2. Press Tab through the header, four-step navigation, form controls, and actions.
3. Confirm disabled steps are not actionable before a successful project.
4. Submit a concept shorter than twenty characters.
5. Confirm the error is announced and receives focus.
6. Correct the form and complete a project.
7. Confirm focus moves to the World heading.
8. Focus a step tab and test:
   - Right and Down Arrow: next enabled step;
   - Left and Up Arrow: previous enabled step;
   - Home: first step;
   - End: final enabled step.
9. Confirm every active tab has one roving tab stop and the visible panel matches it.
10. Save and export using keyboard only.
11. Arm **Delete saved projects**, press Escape, and confirm no deletion occurs.
12. Arm again and complete deletion with keyboard only.

Pass criteria:

- no keyboard trap;
- visible focus at all times;
- logical order;
- all core actions reachable;
- destructive action cannot occur from one accidental activation.

## Pass B — NVDA on Windows

Recommended baseline: current stable NVDA with the Anna desktop/web host.

### Concept

- App title and connected/offline runtime status are announced.
- Step navigation is announced as a tab list with one selected tab.
- Every input has a useful label.
- Required status is understandable without relying on the red asterisk alone.
- Concept help and character counter are associated with the textarea.
- Local validation error is announced immediately and not repeated indefinitely.

### Loading and failures

- Generation status is announced once, with updated repair status when applicable.
- Quota, permission, provider, timeout, contract, storage, and concurrency failures are announced as errors.
- Focus lands on the fatal heading without losing access to the retry button.

### Result

- World heading is announced after success.
- Character and location cards have understandable heading order.
- Scene and shot hierarchy is navigable by headings.
- Continuity score is understandable as a number; warnings are in a list.
- Save status is announced without moving focus unexpectedly.

### Deletion

- First activation announces the fifteen-second confirmation requirement.
- Both confirmation buttons have an explicit permanent-deletion accessible name.
- Escape cancellation is announced.
- Progress and final record count are announced.
- A conflict or incomplete deletion is not announced as success.

Pass criteria:

- every required instruction and state is available through speech;
- no meaningful information depends only on visual placement or colour;
- heading navigation presents a coherent document outline.

## Pass C — VoiceOver on macOS

Repeat the core Concept → World → Scenes → Continuity → Export flow using VoiceOver navigation.

Pay particular attention to:

- tab-list interaction inside the Anna-hosted iframe;
- focus transfer after panel changes;
- `aria-live` announcements that may differ from Chromium/NVDA;
- export control naming;
- deletion confirmation and Escape cancellation.

Any host-level iframe navigation issue must be recorded separately from an App semantic defect.

## Pass D — 200% and 400% zoom

Test the App at its declared minimum view and at the default 900 × 820 view.

At 200%:

- all form fields and actions remain available;
- text does not clip or overlap;
- cards reflow into one column when needed;
- no two-dimensional scrolling is required for ordinary reading;
- destructive controls remain distinguishable from primary actions.

At 400% or equivalent text scaling:

- the user can still complete the core flow with vertical scrolling;
- fixed elements do not cover focused controls;
- status/error messages remain adjacent to the relevant workflow;
- the four steps may wrap but remain ordered and operable.

## Pass E — forced colours / high contrast

On Windows, enable a system high-contrast theme and use `forced-colors: active` where supported.

Verify:

- focus rings remain visible;
- selected step is not indicated only by cyan colour;
- disabled controls remain identifiable;
- error, warning, success, and armed-delete states have textual labels;
- score ring and buttons remain distinguishable;
- generated content remains readable.

Log any CSS property suppressed by forced colours and add a narrow fix rather than disabling forced-colour adaptation.

## Pass F — reduced motion

Enable the OS reduced-motion setting.

Verify:

- spinner and scroll transitions do not create continuous or disorienting motion;
- focus movement remains clear;
- no information depends on animation completion.

The automated test sets reduced motion, but this manual pass confirms host/webview behaviour.

## Pass G — language and pronunciation

Run one complete project in English and one in French.

Verify:

- user-generated French accents and punctuation are read correctly;
- identifiers or English technical labels do not dominate the user-facing result;
- the App's current English chrome does not prevent a French user from understanding required actions.

Record whether a fully localized French UI is a release requirement or a post-0.1 improvement based on beta evidence.

## Defect severity

- **P0:** inaccessible destructive action, data exposure, keyboard trap with no escape, or focus loss preventing recovery.
- **P1:** core generation, result review, save, reload, export, or deletion cannot be completed with keyboard/screen reader.
- **P2:** confusing announcement, poor heading structure, zoom/contrast issue with a workaround.
- **P3:** minor verbosity, pronunciation, or visual polish.

No P0 or P1 accessibility defect may remain at submission.

## Completion record

For each environment, record only:

```text
environment_id
commit
os_and_version
anna_host_version
browser_or_webview
assistive_technology
keyboard_pass
screen_reader_pass
zoom_200_pass
zoom_400_pass
forced_colours_pass
reduced_motion_pass
p0_count
p1_count
p2_count
notes_without_project_content
```

The HBR-004 manual gate closes only after at least:

- one Windows keyboard + NVDA pass;
- one macOS VoiceOver pass when a macOS environment is available, or a documented Marketplace-supported alternative;
- 200% zoom and forced-colour checks;
- all P0/P1 findings resolved and rerun.
