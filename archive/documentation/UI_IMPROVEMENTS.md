# UI Improvements

## Accessibility Enhancements
- Added ARIA labels to all interactive elements.
- Improved keyboard navigation for toolbar, panels, and dialogs.
- Contrast ratios adjusted to meet WCAG AA standards.

## Tailwind Theme
- Introduced a new Tailwind CSS theme with light and dark modes.
- Theme variables are configurable via `tailwind.config.js`.
- Updated component classes to use the new theme utilities.

## Lazy‑Loading
- Implemented lazy‑loading for heavy UI components (e.g., video preview, model selector).
- Uses React `Suspense` and dynamic imports to reduce initial load time.

## New UI Elements
- **Action Buttons**: Added primary and secondary button styles with icons.
- **Side Panels**: New collapsible side panels for asset management and AI settings.
- **Modal Dialogs**: Updated modal system with smoother transitions and focus trapping.

## Usage Instructions
1. **Enable Dark Mode**: Click the moon icon in the toolbar or set `theme: "dark"` in `config/user-settings.json`.
2. **Access New Panels**: Use the **Assets** and **AI Settings** icons on the left sidebar.
3. **Lazy‑Loaded Components**: No extra steps required; components load automatically when needed.

For a detailed walkthrough, see the [User Guide](../README.md#ui-improvements).
