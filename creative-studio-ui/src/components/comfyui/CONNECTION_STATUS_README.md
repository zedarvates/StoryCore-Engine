# ComfyUI Connection Status Components

This directory contains components for displaying and managing ComfyUI connection status in the UI.

## Components

### 1. ConnectionStatusDisplay

A compact status indicator component that displays the current connection state with color coding.

**Features:**
- Color-coded status indicator (green=Connected, amber=Connecting, gray=Disconnected, red=Error)
- Animated pulsing effect for "Connecting" state
- Status message and optional details
- Action button (Retry, Configure, View Logs)
- Clickable to show detailed information

**Props:**
```typescript
interface ConnectionStatusDisplayProps {
  status: 'Connected' | 'Connecting' | 'Disconnected' | 'Error';
  message: string;
  details?: string;
  onAction?: () => void;
  actionLabel?: string;
  onClick?: () => void;
}
```

**Usage:**
```tsx
<ConnectionStatusDisplay
  status="Connected"
  message="ComfyUI v1.0.0 - 3 items in queue"
  details="Connected to http://localhost:8000"
  onAction={() => console.log('Action clicked')}
  onClick={() => setModalOpen(true)}
/>
```

### 2. ConnectionInfoModal

A detailed modal dialog that shows comprehensive connection information.

**Features:**
- Shows ComfyUI version and queue depth when connected
- Displays disconnection reason and suggested actions when disconnected
- Shows CORS status, model readiness, and workflow readiness
- Action buttons for Retry, Configure, and View Logs
- Responsive design with mobile support

**Props:**
```typescript
interface ConnectionInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  connectionInfo: ConnectionInfo;
  onRetry?: () => void;
  onConfigure?: () => void;
  onViewLogs?: () => void;
}

interface ConnectionInfo {
  status: 'Connected' | 'Connecting' | 'Disconnected' | 'Error';
  url: string;
  version?: string;
  queueDepth?: number;
  corsEnabled?: boolean;
  modelsReady?: boolean;
  workflowsReady?: boolean;
  errorMessage?: string;
  disconnectionReason?: string;
  suggestedActions?: string[];
  lastCheck?: Date;
}
```

**Usage:**
```tsx
<ConnectionInfoModal
  isOpen={isModalOpen}
  onClose={() => setIsModalOpen(false)}
  connectionInfo={{
    status: 'Connected',
    url: 'http://localhost:8000',
    version: '1.0.0',
    queueDepth: 3,
    corsEnabled: true,
    modelsReady: true,
    workflowsReady: true,
  }}
  onRetry={() => checkConnection()}
  onConfigure={() => openSettings()}
  onViewLogs={() => openLogs()}
/>
```

### 3. ComfyUIConnectionStatus

An integrated component that combines ConnectionStatusDisplay and ConnectionInfoModal with automatic status updates.

**Features:**
- Automatic status checking every 5 seconds (configurable)
- Integrates with useConnectionStatus hook
- Handles status transitions smoothly
- Provides callbacks for all actions
- Click status to open detailed modal

**Props:**
```typescript
interface ComfyUIConnectionStatusProps {
  backendUrl?: string;              // Default: 'http://localhost:8000'
  updateInterval?: number;          // Default: 5000ms
  autoUpdate?: boolean;             // Default: true
  onStatusChange?: (status) => void;
  onRetry?: () => void;
  onConfigure?: () => void;
  onViewLogs?: () => void;
}
```

**Usage:**
```tsx
<ComfyUIConnectionStatus
  backendUrl="http://localhost:8000"
  autoUpdate={true}
  updateInterval={5000}
  onStatusChange={(status) => {
    console.log('Status changed:', status);
  }}
  onRetry={() => {
    console.log('Retrying connection...');
  }}
  onConfigure={() => {
    navigate('/settings');
  }}
  onViewLogs={() => {
    openLogsPanel();
  }}
/>
```

## Hooks

### useConnectionStatus

A React hook that manages connection status with automatic updates.

**Features:**
- Checks ComfyUI /system_stats endpoint
- Updates status every 5 seconds (configurable)
- Handles connection errors gracefully
- Provides manual check function
- Can start/stop automatic updates

**Usage:**
```typescript
const {
  status,              // Current status
  connectionInfo,      // Full connection info
  isChecking,          // Whether currently checking
  checkStatus,         // Manual check function
  startAutoUpdate,     // Start automatic updates
  stopAutoUpdate,      // Stop automatic updates
} = useConnectionStatus({
  backendUrl: 'http://localhost:8000',
  updateInterval: 5000,
  autoUpdate: true,
  onStatusChange: (status) => {
    console.log('Status changed:', status);
  },
});
```

## Status States

### Connected
- **Color:** Green (#10b981)
- **Icon:** ✓
- **Message:** "ComfyUI v{version} - {queue} items in queue"
- **Details:** "Connected to {url}"
- **Action:** "View Details"

### Connecting
- **Color:** Amber (#f59e0b)
- **Icon:** ⟳ (animated)
- **Message:** "Connecting to ComfyUI Desktop..."
- **Action:** "Cancel"

### Disconnected
- **Color:** Gray (#6b7280)
- **Icon:** ○
- **Message:** "Not connected to ComfyUI Desktop"
- **Details:** "Start ComfyUI Desktop to enable real generation"
- **Action:** "Retry"

### Error
- **Color:** Red (#ef4444)
- **Icon:** ✕
- **Message:** "Connection error"
- **Details:** Error message
- **Action:** "Retry"

## Integration Example

```tsx
import React from 'react';
import { ComfyUIConnectionStatus } from './components/comfyui';

function App() {
  return (
    <div className="app">
      <header>
        <h1>StoryCore Engine</h1>
        <ComfyUIConnectionStatus
          backendUrl="http://localhost:8000"
          onStatusChange={(status) => {
            if (status === 'Connected') {
              console.log('Backend ready for generation');
            } else {
              console.log('Falling back to mock mode');
            }
          }}
          onConfigure={() => {
            // Open settings dialog
          }}
        />
      </header>
      {/* Rest of app */}
    </div>
  );
}
```

## Styling

All components use CSS modules for styling. The styles are designed to work with dark themes and include:

- Smooth transitions and animations
- Responsive design for mobile devices
- Accessible focus states
- Color-coded status indicators
- Hover effects

## Accessibility

All components follow accessibility best practices:

- Proper ARIA labels and roles
- Keyboard navigation support
- Focus management
- Screen reader friendly
- Color contrast compliance

## Requirements Validation

These components validate the following requirements:

- **Requirement 6.1:** Display ComfyUI connection status prominently
- **Requirement 6.2:** Show status as Connected, Connecting, Disconnected, or Error
- **Requirement 6.3:** Display ComfyUI version and queue depth when connected
- **Requirement 6.4:** Display disconnection reason and suggested actions when disconnected
- **Requirement 6.5:** Update connection status automatically every 5 seconds
- **Requirement 6.6:** Show detailed connection information on status indicator click

## Testing

See `ComfyUIConnectionStatus.example.tsx` for comprehensive examples and test scenarios.

## Future Enhancements

- WebSocket support for real-time status updates
- Connection quality indicators (latency, packet loss)
- Historical connection logs
- Automatic reconnection with exponential backoff
- Connection health metrics and analytics
