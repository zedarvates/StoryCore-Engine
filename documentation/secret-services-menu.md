# Secret Services Menu - Developer Guide

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Architecture](#architecture)
4. [Adding New Experimental Features](#adding-new-experimental-features)
5. [Configuration Options](#configuration-options)
6. [Testing Experimental Features](#testing-experimental-features)
7. [Troubleshooting](#troubleshooting)
8. [API Reference](#api-reference)

---

## Overview

The **Secret Services Menu** is a keyboard-activated hidden navigation feature that provides access to experimental and work-in-progress functionality within the StoryCore-Engine creative studio. This system enables developers and QA testers to safely test new features without exposing incomplete functionality to regular users.

### Key Features

- **🔐 Hidden by Default**: Experimental features are invisible to regular users
- **⌨️ Keyboard Activation**: Access via `Ctrl+Shift+Alt` keyboard shortcut
- **🎯 Centralized Registry**: Add features without modifying navigation code
- **🧪 Visual Feedback**: Clear indicators when secret mode is active
- **🔄 Dynamic Updates**: Feature list updates automatically from registry
- **✅ Type-Safe**: Full TypeScript support with interfaces and validation

### When to Use

Use the Secret Services Menu when you need to:

- Test work-in-progress features before public release
- Provide QA access to experimental functionality
- Develop new features without cluttering the main navigation
- Iterate on features without affecting production users
- Demonstrate experimental capabilities to stakeholders

---

## Quick Start

### Accessing the Secret Menu

1. **Activate Secret Mode**: Press and hold `Ctrl+Shift+Alt` simultaneously
2. **View Menu**: The "🔐 Secret Services" menu item appears in the navigation
3. **Select Feature**: Click the menu to see available experimental features
4. **Navigate**: Click any feature to view it
5. **Deactivate**: Release the keys (indicator persists on experimental pages)

### Visual Indicators


**Secret Mode Active** (keys held):
```
🔓 Secret Mode Active
```

**Experimental Feature** (viewing experimental page):
```
🧪 Experimental Feature ⚠️ Work in Progress
```

---

## Architecture

### System Components

The Secret Services Menu consists of four main components:

```
┌─────────────────────────────────────────────────────────────┐
│                     Application Root                         │
│  ┌───────────────────────────────────────────────────────┐  │
│  │         SecretModeProvider (Context)                  │  │
│  │  - Global keyboard listener                           │  │
│  │  - Secret mode state management                       │  │
│  └───────────────────────────────────────────────────────┘  │
│                           │                                  │
│                           ▼                                  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │         Navigation Component                          │  │
│  │  - SecretServicesMenu (conditional)                   │  │
│  │  - SecretModeIndicator (always visible)               │  │
│  └───────────────────────────────────────────────────────┘  │
│                           │                                  │
│                           ▼                                  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │      Feature Registry (Config)                        │  │
│  │  - experimentalFeatures.ts                            │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

1. **SecretModeProvider**: Global keyboard event handling and state management
2. **SecretServicesMenu**: Dropdown menu with experimental features
3. **SecretModeIndicator**: Visual feedback for secret mode status
4. **Feature Registry**: Centralized configuration for experimental features

---


## Adding New Experimental Features

### Step-by-Step Guide

Adding a new experimental feature requires three simple steps:

#### Step 1: Create Your Feature Component

Create a new React component for your experimental feature:

```typescript
// creative-studio-ui/src/pages/experimental/MyNewFeaturePage.tsx

import React from 'react';

export const MyNewFeaturePage: React.FC = () => {
  return (
    <div className="experimental-page">
      <h1>My New Feature</h1>
      <p>This is an experimental feature under development.</p>
      {/* Your feature implementation */}
    </div>
  );
};
```

#### Step 2: Register in Feature Registry

Add your feature to the experimental features registry:

```typescript
// creative-studio-ui/src/config/experimentalFeatures.ts

export const experimentalFeatures: ExperimentalFeature[] = [
  // ... existing features ...
  
  {
    id: 'my-new-feature',                    // Unique identifier
    name: 'My New Feature',                  // Display name in menu
    description: 'Brief description here',   // Shown in dropdown
    path: '/experimental/my-new-feature',    // Route path
    enabled: true,                           // Set to false to hide
    icon: '🚀',                              // Optional emoji icon
    category: 'development'                  // Optional category
  }
];
```

#### Step 3: Add Route Handling

Update your App component to handle the new experimental feature:

```typescript
// creative-studio-ui/src/App.tsx

import { MyNewFeaturePage } from '@/pages/experimental/MyNewFeaturePage';

// In your render logic:
if (currentExperimentalFeature === 'my-new-feature') {
  return <MyNewFeaturePage />;
}
```

That's it! Your feature is now accessible through the Secret Services Menu.

### Complete Example

Here's a complete example of adding a "Performance Monitor" feature:


**1. Create Component:**

```typescript
// creative-studio-ui/src/pages/experimental/PerformanceMonitorPage.tsx

import React, { useEffect, useState } from 'react';

export const PerformanceMonitorPage: React.FC = () => {
  const [fps, setFps] = useState(0);
  
  useEffect(() => {
    // Performance monitoring logic
    const interval = setInterval(() => {
      setFps(Math.round(performance.now() % 60));
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="experimental-page">
      <h1>Performance Monitor</h1>
      <div className="metric">
        <span>FPS:</span>
        <span>{fps}</span>
      </div>
    </div>
  );
};
```

**2. Register Feature:**

```typescript
// creative-studio-ui/src/config/experimentalFeatures.ts

{
  id: 'performance-monitor',
  name: 'Performance Monitor',
  description: 'Real-time performance metrics and monitoring',
  path: '/experimental/performance-monitor',
  enabled: true,
  icon: '📊',
  category: 'testing'
}
```

**3. Add Route:**

```typescript
// creative-studio-ui/src/App.tsx

import { PerformanceMonitorPage } from '@/pages/experimental/PerformanceMonitorPage';

// In render logic:
if (currentExperimentalFeature === 'performance-monitor') {
  return <PerformanceMonitorPage />;
}
```

---


## Configuration Options

### ExperimentalFeature Interface

Each experimental feature is configured using the `ExperimentalFeature` interface:

```typescript
interface ExperimentalFeature {
  id: string;           // Required: Unique identifier
  name: string;         // Required: Display name
  description: string;  // Required: Brief description
  path: string;         // Required: Route path
  enabled: boolean;     // Required: Visibility toggle
  icon?: string;        // Optional: Emoji or icon
  category?: string;    // Optional: Feature category
}
```

### Configuration Properties

#### `id` (required)
- **Type**: `string`
- **Purpose**: Unique identifier for the feature
- **Format**: kebab-case (e.g., `'my-feature'`)
- **Example**: `'advanced-grid-editor'`
- **Validation**: Must be unique across all features

#### `name` (required)
- **Type**: `string`
- **Purpose**: Display name shown in the menu
- **Format**: Human-readable title
- **Example**: `'Advanced Grid Editor'`
- **Best Practice**: Keep under 30 characters

#### `description` (required)
- **Type**: `string`
- **Purpose**: Brief explanation of the feature
- **Format**: One sentence description
- **Example**: `'Next-generation grid editing with enhanced controls'`
- **Best Practice**: Keep under 80 characters

#### `path` (required)
- **Type**: `string`
- **Purpose**: Route path for the feature
- **Format**: Must start with `/experimental/`
- **Example**: `'/experimental/advanced-grid-editor'`
- **Validation**: Warns if not using standard prefix

#### `enabled` (required)
- **Type**: `boolean`
- **Purpose**: Controls feature visibility
- **Values**: `true` (visible) or `false` (hidden)
- **Use Case**: Disable features not ready for testing

#### `icon` (optional)
- **Type**: `string`
- **Purpose**: Visual identifier in menu
- **Format**: Single emoji character
- **Example**: `'🎨'`, `'🤖'`, `'📊'`
- **Best Practice**: Choose relevant, recognizable emojis


#### `category` (optional)
- **Type**: `'development' | 'testing' | 'experimental'`
- **Purpose**: Groups features by purpose
- **Values**:
  - `'development'`: Features in active development
  - `'testing'`: Features ready for QA testing
  - `'experimental'`: Proof-of-concept features
- **Display**: Shows as colored badge in menu

### Feature Registry Validation

The registry includes automatic validation on application startup:

```typescript
// Automatically called when app starts
validateFeatureRegistry();
```

**Validation Checks:**
- ✅ Duplicate feature IDs
- ✅ Duplicate feature paths
- ⚠️ Non-standard path prefixes
- ℹ️ Logs validation summary

**Example Console Output:**

```
[Feature Registry] Validation successful. 3 features registered.
```

**Error Example:**

```
[Feature Registry] Duplicate feature ID detected: my-feature
[Feature Registry] Feature "test" path should start with /experimental/
```

### Helper Functions

#### `getEnabledExperimentalFeatures()`

Returns only enabled features from the registry:

```typescript
import { getEnabledExperimentalFeatures } from '@/config/experimentalFeatures';

const enabledFeatures = getEnabledExperimentalFeatures();
// Returns: ExperimentalFeature[] (only where enabled: true)
```

#### `validateFeatureRegistry()`

Validates the feature registry configuration:

```typescript
import { validateFeatureRegistry } from '@/config/experimentalFeatures';

// Call on app startup
validateFeatureRegistry();
// Logs errors/warnings to console
```

---


## Testing Experimental Features

### Testing Approach

The Secret Services Menu system uses a dual testing strategy:

1. **Unit Tests**: Test specific scenarios and edge cases
2. **Property-Based Tests**: Verify universal correctness properties

### Manual Testing Checklist

Before marking a feature as ready for QA, verify:

- [ ] Feature appears in Secret Services Menu when enabled
- [ ] Feature is hidden when `enabled: false`
- [ ] Navigation to feature works correctly
- [ ] Visual indicator shows "Experimental Feature" on feature page
- [ ] Feature doesn't appear in regular navigation
- [ ] Direct URL access works (if needed)
- [ ] Feature works across different browser sizes
- [ ] No console errors when accessing feature

### Testing Secret Mode Activation

**Test Case 1: Keyboard Activation**
```
1. Open the application
2. Press and hold Ctrl+Shift+Alt
3. Verify: "🔐 Secret Services" menu appears
4. Verify: "🔓 Secret Mode Active" indicator appears
5. Release any key
6. Verify: Menu and indicator disappear
```

**Test Case 2: Cross-Page Activation**
```
1. Navigate to different pages (Home, Projects, etc.)
2. On each page, press Ctrl+Shift+Alt
3. Verify: Secret menu appears on all pages
4. Verify: Keyboard detection works consistently
```

**Test Case 3: Feature Navigation**
```
1. Activate secret mode (Ctrl+Shift+Alt)
2. Click "Secret Services" menu
3. Select an experimental feature
4. Verify: Feature page loads
5. Verify: Indicator shows "🧪 Experimental Feature"
6. Release keys
7. Verify: Indicator persists on experimental page
```

### Automated Testing

#### Unit Test Example

```typescript
// creative-studio-ui/src/__tests__/SecretModeContext.test.tsx

import { render, screen, fireEvent } from '@testing-library/react';
import { SecretModeProvider, useSecretMode } from '@/contexts/SecretModeContext';

describe('SecretModeProvider', () => {
  it('activates secret mode when Ctrl+Shift+Alt pressed', () => {
    const TestComponent = () => {
      const { isSecretMode } = useSecretMode();
      return <div>{isSecretMode ? 'Active' : 'Inactive'}</div>;
    };
    
    render(
      <SecretModeProvider>
        <TestComponent />
      </SecretModeProvider>
    );
    
    expect(screen.getByText('Inactive')).toBeInTheDocument();
    
    // Simulate Ctrl+Shift+Alt
    fireEvent.keyDown(window, { 
      ctrlKey: true, 
      shiftKey: true, 
      altKey: true 
    });
    
    expect(screen.getByText('Active')).toBeInTheDocument();
  });
});
```


#### Property-Based Test Example

```typescript
// Using fast-check for property-based testing

import fc from 'fast-check';
import { experimentalFeatures } from '@/config/experimentalFeatures';

describe('Secret Services Menu - Property Tests', () => {
  it('Property: Registry changes always reflect in menu', () => {
    fc.assert(
      fc.property(
        fc.array(fc.boolean(), { minLength: 1, maxLength: 10 }),
        (enabledStates) => {
          // Create test registry with random enabled states
          const testFeatures = enabledStates.map((enabled, i) => ({
            id: `feature-${i}`,
            name: `Feature ${i}`,
            description: 'Test feature',
            path: `/experimental/feature-${i}`,
            enabled,
            icon: '🧪',
            category: 'testing' as const
          }));
          
          // Filter enabled features
          const enabled = testFeatures.filter(f => f.enabled);
          
          // Verify: Number of enabled features matches filter
          expect(enabled.length).toBe(
            enabledStates.filter(Boolean).length
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Testing Best Practices

1. **Test in Multiple Browsers**: Chrome, Firefox, Safari, Edge
2. **Test Keyboard Variations**: Test with different keyboard layouts
3. **Test Window Events**: Tab switching, window blur/focus
4. **Test State Persistence**: Navigate between pages while holding keys
5. **Test Edge Cases**: Rapid key presses, partial key combinations
6. **Test Accessibility**: Screen reader compatibility, keyboard navigation

---


## Troubleshooting

### Common Issues and Solutions

#### Issue: Secret Menu Not Appearing

**Symptoms:**
- Pressing Ctrl+Shift+Alt does nothing
- No menu or indicator appears

**Possible Causes & Solutions:**

1. **SecretModeProvider not wrapped around app**
   ```typescript
   // ❌ Wrong
   <App />
   
   // ✅ Correct
   <SecretModeProvider>
     <App />
   </SecretModeProvider>
   ```

2. **Browser keyboard shortcuts interfering**
   - Some browsers use Ctrl+Shift+Alt for their own shortcuts
   - Try in a different browser
   - Check browser console for errors

3. **Event listeners not attached**
   - Check browser console for errors
   - Verify SecretModeProvider is rendering
   - Check React DevTools for context provider

4. **Keys not detected properly**
   - Try pressing keys in different order
   - Ensure all three keys are held simultaneously
   - Test with external keyboard if using laptop

**Debug Steps:**
```typescript
// Add console logging to SecretModeProvider
const handleKeyDown = (e: KeyboardEvent) => {
  console.log('Keys:', {
    ctrl: e.ctrlKey,
    shift: e.shiftKey,
    alt: e.altKey
  });
  // ... rest of handler
};
```

#### Issue: Feature Not Appearing in Menu

**Symptoms:**
- Feature is registered but doesn't show in dropdown
- Menu is empty

**Possible Causes & Solutions:**

1. **Feature is disabled**
   ```typescript
   // Check enabled property
   {
     id: 'my-feature',
     enabled: false  // ❌ Change to true
   }
   ```

2. **Duplicate ID or path**
   - Check console for validation errors
   - Ensure unique IDs across all features
   - Ensure unique paths across all features

3. **Registry not imported correctly**
   ```typescript
   // Verify import in SecretServicesMenu
   import { getEnabledExperimentalFeatures } from '@/config/experimentalFeatures';
   ```

4. **Feature added but app not restarted**
   - Restart development server
   - Clear browser cache
   - Hard refresh (Ctrl+Shift+R)


#### Issue: Navigation Not Working

**Symptoms:**
- Clicking feature does nothing
- Feature page doesn't load

**Possible Causes & Solutions:**

1. **Route not configured in App**
   ```typescript
   // Add route handling in App.tsx
   if (currentExperimentalFeature === 'my-feature') {
     return <MyFeaturePage />;
   }
   ```

2. **Feature ID mismatch**
   ```typescript
   // Ensure IDs match exactly
   // Registry:
   { id: 'my-feature', ... }
   
   // App.tsx:
   if (currentExperimentalFeature === 'my-feature') { ... }
   ```

3. **Component import error**
   - Check component file exists
   - Verify import path is correct
   - Check for TypeScript errors

**Debug Steps:**
```typescript
// Add logging to handleFeatureClick
const handleFeatureClick = (feature: ExperimentalFeature) => {
  console.log('Navigating to:', feature.id);
  setCurrentExperimentalFeature(feature.id);
};
```

#### Issue: Indicator Not Showing

**Symptoms:**
- Secret mode activates but no visual indicator
- Indicator doesn't persist on experimental pages

**Possible Causes & Solutions:**

1. **SecretModeIndicator not added to navigation**
   ```typescript
   // Add to Navigation component
   <SecretModeIndicator />
   ```

2. **CSS not imported**
   ```typescript
   // Verify import in SecretModeIndicator.tsx
   import '@/styles/secret-mode-indicator.css';
   ```

3. **Indicator hidden by CSS**
   - Check z-index values
   - Verify positioning styles
   - Check for conflicting CSS

4. **Context not providing correct state**
   - Check useSecretMode() returns correct values
   - Verify isOnExperimentalPage logic
   - Add console logging to debug


#### Issue: Memory Leaks or Performance Issues

**Symptoms:**
- Browser becomes slow over time
- Memory usage increases
- Event listeners not cleaned up

**Possible Causes & Solutions:**

1. **Event listeners not removed**
   ```typescript
   // Ensure cleanup in useEffect
   useEffect(() => {
     window.addEventListener('keydown', handleKeyDown);
     
     return () => {
       window.removeEventListener('keydown', handleKeyDown);
     };
   }, []);
   ```

2. **Multiple providers mounted**
   - Ensure only one SecretModeProvider in app
   - Check for duplicate provider wrapping
   - Use React DevTools to inspect component tree

3. **State updates on unmounted components**
   - Add cleanup logic to experimental features
   - Cancel pending operations in useEffect cleanup
   - Use AbortController for async operations

**Debug Steps:**
```typescript
// Monitor event listeners
console.log('Event listeners:', 
  getEventListeners(window).keydown?.length
);
```

#### Issue: TypeScript Errors

**Symptoms:**
- Type errors when adding features
- Import errors
- Interface mismatch errors

**Possible Causes & Solutions:**

1. **Missing interface properties**
   ```typescript
   // ❌ Missing required properties
   {
     id: 'my-feature',
     name: 'My Feature'
     // Missing: description, path, enabled
   }
   
   // ✅ All required properties
   {
     id: 'my-feature',
     name: 'My Feature',
     description: 'Description here',
     path: '/experimental/my-feature',
     enabled: true
   }
   ```

2. **Invalid category value**
   ```typescript
   // ❌ Invalid category
   category: 'invalid'
   
   // ✅ Valid categories
   category: 'development' | 'testing' | 'experimental'
   ```

3. **Path alias not configured**
   - Verify `@/` alias in tsconfig.json
   - Check vite.config.ts or webpack config
   - Use relative imports if alias not working


### Debugging Tips

1. **Enable Verbose Logging**
   ```typescript
   // Add to SecretModeProvider
   useEffect(() => {
     const handleKeyDown = (e: KeyboardEvent) => {
       if (process.env.NODE_ENV === 'development') {
         console.log('[SecretMode] KeyDown:', {
           ctrl: e.ctrlKey,
           shift: e.shiftKey,
           alt: e.altKey,
           key: e.key
         });
       }
       // ... rest of handler
     };
   }, []);
   ```

2. **Use React DevTools**
   - Inspect SecretModeProvider context value
   - Check component re-render counts
   - Verify props and state values

3. **Check Browser Console**
   - Look for validation errors
   - Check for JavaScript errors
   - Monitor network requests

4. **Test in Isolation**
   - Create minimal test component
   - Test context provider separately
   - Test feature registry validation

5. **Verify File Structure**
   ```
   creative-studio-ui/
   ├── src/
   │   ├── config/
   │   │   └── experimentalFeatures.ts
   │   ├── contexts/
   │   │   └── SecretModeContext.tsx
   │   ├── components/
   │   │   ├── SecretServicesMenu.tsx
   │   │   └── SecretModeIndicator.tsx
   │   ├── pages/
   │   │   └── experimental/
   │   │       └── YourFeaturePage.tsx
   │   └── styles/
   │       ├── secret-services-menu.css
   │       └── secret-mode-indicator.css
   ```

---


## API Reference

### SecretModeProvider

Context provider that manages secret mode state and keyboard event handling.

**Props:**
```typescript
interface SecretModeProviderProps {
  children: React.ReactNode;
}
```

**Usage:**
```typescript
import { SecretModeProvider } from '@/contexts/SecretModeContext';

<SecretModeProvider>
  <App />
</SecretModeProvider>
```

**Context Value:**
```typescript
interface SecretModeContextValue {
  isSecretMode: boolean;
  isOnExperimentalPage: boolean;
  currentExperimentalFeature?: string;
  setCurrentExperimentalFeature: (featureId: string | undefined) => void;
}
```

### useSecretMode Hook

Custom hook to access secret mode context.

**Signature:**
```typescript
const useSecretMode = (): SecretModeContextValue
```

**Returns:**
- `isSecretMode`: `boolean` - True when Ctrl+Shift+Alt keys are held
- `isOnExperimentalPage`: `boolean` - True when viewing experimental feature
- `currentExperimentalFeature`: `string | undefined` - Current feature ID
- `setCurrentExperimentalFeature`: `function` - Set current experimental feature

**Usage:**
```typescript
import { useSecretMode } from '@/contexts/SecretModeContext';

const MyComponent = () => {
  const { isSecretMode, isOnExperimentalPage } = useSecretMode();
  
  return (
    <div>
      {isSecretMode && <p>Secret mode active!</p>}
      {isOnExperimentalPage && <p>Viewing experimental feature</p>}
    </div>
  );
};
```

**Throws:**
- Error if used outside of `SecretModeProvider`

### SecretServicesMenu Component

Dropdown menu component that displays experimental features.

**Props:** None

**Usage:**
```typescript
import { SecretServicesMenu } from '@/components/SecretServicesMenu';

<nav>
  {isSecretMode && <SecretServicesMenu />}
</nav>
```

**Behavior:**
- Returns `null` when secret mode is not active
- Displays dropdown with enabled experimental features
- Handles feature selection and navigation


### SecretModeIndicator Component

Visual indicator component that shows secret mode status.

**Props:** None

**Usage:**
```typescript
import { SecretModeIndicator } from '@/components/SecretModeIndicator';

<nav>
  <SecretModeIndicator />
</nav>
```

**Behavior:**
- Returns `null` when neither secret mode nor experimental page
- Shows "Secret Mode Active" when keys held
- Shows "Experimental Feature" when on experimental page
- Persists on experimental pages after keys released

### ExperimentalFeature Interface

TypeScript interface for feature configuration.

**Definition:**
```typescript
interface ExperimentalFeature {
  id: string;
  name: string;
  description: string;
  path: string;
  enabled: boolean;
  icon?: string;
  category?: 'development' | 'testing' | 'experimental';
}
```

**Example:**
```typescript
const feature: ExperimentalFeature = {
  id: 'my-feature',
  name: 'My Feature',
  description: 'A new experimental feature',
  path: '/experimental/my-feature',
  enabled: true,
  icon: '🚀',
  category: 'development'
};
```

### getEnabledExperimentalFeatures()

Helper function that returns only enabled features.

**Signature:**
```typescript
const getEnabledExperimentalFeatures = (): ExperimentalFeature[]
```

**Returns:**
- Array of `ExperimentalFeature` objects where `enabled: true`

**Usage:**
```typescript
import { getEnabledExperimentalFeatures } from '@/config/experimentalFeatures';

const enabledFeatures = getEnabledExperimentalFeatures();
console.log(`${enabledFeatures.length} features available`);
```

### validateFeatureRegistry()

Validation function that checks for configuration errors.

**Signature:**
```typescript
const validateFeatureRegistry = (): void
```

**Checks:**
- Duplicate feature IDs
- Duplicate feature paths
- Non-standard path prefixes

**Usage:**
```typescript
import { validateFeatureRegistry } from '@/config/experimentalFeatures';

// Call on app startup
validateFeatureRegistry();
```

**Console Output:**
- Errors for duplicate IDs/paths
- Warnings for non-standard paths
- Success message if validation passes


---

## Advanced Usage

### Custom Keyboard Shortcuts

While the default shortcut is `Ctrl+Shift+Alt`, you can customize it by modifying the `SecretModeProvider`:

```typescript
// Modify the key detection logic
const handleKeyDown = (e: KeyboardEvent) => {
  // Example: Use Ctrl+Shift+E instead
  const hasCtrl = e.ctrlKey || e.metaKey;
  const hasShift = e.shiftKey;
  const isEKey = e.key === 'e' || e.key === 'E';
  
  if (hasCtrl && hasShift && isEKey) {
    setIsSecretMode(true);
  }
};
```

### Feature Categories and Grouping

Organize features by category for better menu organization:

```typescript
// Group features by category
const featuresByCategory = enabledFeatures.reduce((acc, feature) => {
  const category = feature.category || 'uncategorized';
  if (!acc[category]) acc[category] = [];
  acc[category].push(feature);
  return acc;
}, {} as Record<string, ExperimentalFeature[]>);

// Render grouped menu
{Object.entries(featuresByCategory).map(([category, features]) => (
  <div key={category}>
    <h3>{category}</h3>
    {features.map(feature => (
      <MenuItem key={feature.id} feature={feature} />
    ))}
  </div>
))}
```

### Conditional Feature Enabling

Enable features based on environment or user role:

```typescript
export const experimentalFeatures: ExperimentalFeature[] = [
  {
    id: 'admin-panel',
    name: 'Admin Panel',
    description: 'Administrative controls',
    path: '/experimental/admin',
    // Only enable in development
    enabled: process.env.NODE_ENV === 'development',
    icon: '⚙️',
    category: 'development'
  }
];
```

### Feature Flags Integration

Integrate with feature flag services:

```typescript
import { useFeatureFlag } from '@/hooks/useFeatureFlag';

export const useExperimentalFeatures = () => {
  const isAdvancedEditorEnabled = useFeatureFlag('advanced-editor');
  
  return experimentalFeatures.map(feature => ({
    ...feature,
    enabled: feature.id === 'advanced-editor' 
      ? isAdvancedEditorEnabled 
      : feature.enabled
  }));
};
```


### Analytics and Tracking

Track experimental feature usage:

```typescript
const handleFeatureClick = (feature: ExperimentalFeature) => {
  // Track feature access
  analytics.track('experimental_feature_accessed', {
    featureId: feature.id,
    featureName: feature.name,
    category: feature.category,
    timestamp: new Date().toISOString()
  });
  
  setCurrentExperimentalFeature(feature.id);
  setIsDropdownOpen(false);
};
```

### Keyboard Navigation

Add keyboard navigation to the dropdown menu:

```typescript
const [selectedIndex, setSelectedIndex] = useState(0);

const handleKeyDown = (e: React.KeyboardEvent) => {
  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, enabledFeatures.length - 1));
      break;
    case 'ArrowUp':
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
      break;
    case 'Enter':
      e.preventDefault();
      handleFeatureClick(enabledFeatures[selectedIndex]);
      break;
    case 'Escape':
      e.preventDefault();
      setIsDropdownOpen(false);
      break;
  }
};
```

### Persistent State

Remember which features the user has accessed:

```typescript
const [accessedFeatures, setAccessedFeatures] = useState<Set<string>>(() => {
  const stored = localStorage.getItem('accessed-experimental-features');
  return new Set(stored ? JSON.parse(stored) : []);
});

const handleFeatureClick = (feature: ExperimentalFeature) => {
  // Mark as accessed
  const updated = new Set(accessedFeatures).add(feature.id);
  setAccessedFeatures(updated);
  localStorage.setItem(
    'accessed-experimental-features',
    JSON.stringify([...updated])
  );
  
  setCurrentExperimentalFeature(feature.id);
};

// Show indicator for new features
{!accessedFeatures.has(feature.id) && (
  <span className="new-badge">NEW</span>
)}
```

---


## Best Practices

### Feature Development Workflow

1. **Start Disabled**: Create features with `enabled: false` initially
2. **Incremental Enabling**: Enable when ready for internal testing
3. **Category Progression**: Move from `development` → `testing` → `experimental`
4. **Documentation**: Document each feature's purpose and status
5. **Cleanup**: Remove from registry when promoted to main navigation

### Naming Conventions

**Feature IDs:**
- Use kebab-case: `advanced-grid-editor`
- Be descriptive: `ai-assistant-v3` not `ai3`
- Include version if applicable: `character-system-v2`

**Feature Names:**
- Use title case: `Advanced Grid Editor`
- Keep concise: Under 30 characters
- Be user-friendly: Avoid technical jargon

**Paths:**
- Always use `/experimental/` prefix
- Match feature ID: `/experimental/advanced-grid-editor`
- Use kebab-case: No spaces or special characters

### Security Considerations

1. **No Authentication Required**: Secret menu is discoverable, not secure
2. **Don't Store Secrets**: Don't put sensitive data in experimental features
3. **Validate Inputs**: Experimental features should still validate user input
4. **Error Handling**: Handle errors gracefully, don't expose internals
5. **Production Builds**: Consider disabling in production builds

### Performance Optimization

1. **Lazy Loading**: Use `React.lazy()` for experimental feature components
2. **Code Splitting**: Keep experimental code in separate bundles
3. **Memoization**: Use `useMemo` for expensive computations
4. **Event Delegation**: Single keyboard listener at window level
5. **Cleanup**: Always remove event listeners in useEffect cleanup

### Accessibility

1. **Keyboard Navigation**: Ensure dropdown is keyboard accessible
2. **ARIA Labels**: Provide descriptive labels for screen readers
3. **Focus Management**: Manage focus when opening/closing dropdown
4. **Color Contrast**: Ensure sufficient contrast for indicators
5. **Semantic HTML**: Use proper HTML elements (nav, button, ul/li)


---

## FAQ

### Q: Can regular users discover the secret menu?

**A:** Yes, if they happen to press Ctrl+Shift+Alt. The secret menu is "hidden" but not "secure". It's designed to keep experimental features out of the way, not to prevent access. Don't use it for sensitive functionality.

### Q: Can I change the keyboard shortcut?

**A:** Yes, modify the key detection logic in `SecretModeProvider`. See the [Custom Keyboard Shortcuts](#custom-keyboard-shortcuts) section.

### Q: How do I disable all experimental features in production?

**A:** Set all features to `enabled: false` or add environment-based logic:

```typescript
export const experimentalFeatures: ExperimentalFeature[] = [
  {
    id: 'my-feature',
    // ... other properties
    enabled: process.env.NODE_ENV === 'development'
  }
];
```

### Q: Can I have multiple secret menus with different shortcuts?

**A:** Yes, create multiple context providers with different key combinations. However, this adds complexity and may confuse users.

### Q: Does the secret menu work on mobile devices?

**A:** No, the current implementation requires keyboard input. For mobile support, you'd need to add an alternative activation method (e.g., tap sequence, gesture).

### Q: How do I test experimental features in CI/CD?

**A:** Enable features programmatically in test environment:

```typescript
// In test setup
process.env.ENABLE_EXPERIMENTAL = 'true';

// In feature registry
enabled: process.env.ENABLE_EXPERIMENTAL === 'true'
```

### Q: Can I nest experimental features?

**A:** Yes, experimental features can contain their own sub-features. Just ensure proper routing and state management.

### Q: What happens if I navigate directly to an experimental URL?

**A:** The feature will load if the route is configured. The indicator will show "Experimental Feature" status.

### Q: How do I remove a feature from the registry?

**A:** Simply delete the feature object from the `experimentalFeatures` array. No other code changes needed.

### Q: Can I use the secret menu in a production build?

**A:** Yes, but consider the implications. Experimental features may not be production-ready. Use environment-based enabling for safety.

---


## Related Documentation

- **Requirements Document**: `.kiro/specs/secret-services-menu/requirements.md`
- **Design Document**: `.kiro/specs/secret-services-menu/design.md`
- **Implementation Tasks**: `.kiro/specs/secret-services-menu/tasks.md`
- **Test Documentation**: `creative-studio-ui/EXPERIMENTAL_FEATURES_TEST.md`

## Contributing

When contributing to the Secret Services Menu system:

1. **Follow TypeScript Standards**: Use proper types and interfaces
2. **Add Tests**: Include unit and property-based tests
3. **Update Documentation**: Keep this guide current with changes
4. **Validate Registry**: Run `validateFeatureRegistry()` after changes
5. **Test Cross-Browser**: Verify keyboard detection works in all browsers
6. **Consider Accessibility**: Ensure changes maintain accessibility standards

## Support

For issues or questions:

1. Check the [Troubleshooting](#troubleshooting) section
2. Review the [FAQ](#faq)
3. Check browser console for validation errors
4. Use React DevTools to inspect component state
5. Create an issue in the project repository

---

## Changelog

### Version 1.0.0 (Initial Release)

**Features:**
- ✅ Keyboard-activated secret menu (Ctrl+Shift+Alt)
- ✅ Centralized feature registry with validation
- ✅ Visual indicator for secret mode and experimental pages
- ✅ TypeScript support with full type safety
- ✅ Cross-page keyboard detection
- ✅ Automatic registry validation on startup
- ✅ Category-based feature organization
- ✅ Comprehensive test coverage

**Components:**
- `SecretModeProvider`: Context provider with keyboard handling
- `SecretServicesMenu`: Dropdown menu component
- `SecretModeIndicator`: Visual feedback component
- `experimentalFeatures.ts`: Feature registry configuration

**Requirements Validated:**
- Requirement 1: Keyboard-Activated Menu Visibility ✅
- Requirement 2: Experimental Feature Access ✅
- Requirement 3: Visual Feedback System ✅
- Requirement 4: Configuration Management ✅
- Requirement 5: Cross-Page Functionality ✅
- Requirement 6: React Integration ✅
- Requirement 7: Security and Access Control ✅

---

**Last Updated**: 2026
**Version**: 1.0.0
**Maintained By**: StoryCore-Engine Development Team

