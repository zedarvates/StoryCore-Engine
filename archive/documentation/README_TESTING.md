# StoryCore Dashboard - Refactored Version

## Local Testing Instructions

### Quick Start

1. **Start a local server** (required for ES modules):
   ```bash
   # Option 1: Using Node.js
   npx http-server . -p 8080
   
   # Option 2: Using Python
   python -m http.server 8080
   
   # Option 3: Using PHP
   php -S localhost:8080
   ```

2. **Open in browser**:
   ```
   http://localhost:8080
   ```

### Test Checklist

#### ✅ Basic Functionality
- [ ] Page loads without console errors
- [ ] Master grid (3x3) displays with colored status indicators
- [ ] Clicking panels updates sidebar details
- [ ] Sliders update values in real-time

#### ✅ Model Download System
- [ ] Click "📥 Download Models" → Modal opens
- [ ] Switch between Automatic/Manual modes
- [ ] Click "Start Download" → Progress bar appears
- [ ] Download completes with success message
- [ ] No JavaScript errors in console

#### ✅ Backend Configuration
- [ ] Click "Configure Backend..." → Modal opens
- [ ] Enter URL and test connection
- [ ] Save configuration updates status

#### ✅ Missing Models Banner
- [ ] Banner appears after 2 seconds (30% chance)
- [ ] Click "Auto-Fix" button works
- [ ] Info panel expands/collapses
- [ ] Dismiss button hides banner

#### ✅ Image Upload
- [ ] Click "Before" panel → File picker opens
- [ ] Upload image → Displays in panel
- [ ] Processing simulation starts automatically
- [ ] "After" panel shows result after 3 seconds

#### ✅ Manual Re-Promote
- [ ] Click "Manual Re-Promote" → Processing starts
- [ ] Shows spinner and "Processing..." message
- [ ] Completes with success notification

### Console Debugging

Open browser DevTools (F12) and check:
- **No errors** in Console tab
- **Network tab** shows all JS modules loading successfully
- **Elements tab** shows proper DOM structure

### File Structure

```
/
├── index.html              # Main HTML structure
├── css/
│   └── styles.css          # Custom styles
├── js/
│   ├── init.js            # Main initialization
│   ├── state.js           # Global state management
│   ├── ui.js              # DOM utilities and UI functions
│   ├── models.js          # Model download and management
│   └── backend.js         # Backend connection management
└── README.md              # This file
```

### Common Issues

**ES Module Errors**: Must serve from HTTP server, not file:// protocol
**CORS Errors**: Use proper local server (not just opening HTML file)
**Missing Functions**: Check browser console for specific error messages

### Demo Features

- **Image Upload**: Simulates processing with 3-second delay
- **Model Download**: Simulates download progress and validation
- **Backend Connection**: Tests actual HTTP connections
- **Missing Models**: 30% chance of showing banner on page load
