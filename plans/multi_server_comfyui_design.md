# Multi-Server ComfyUI Configuration Design Document

## Overview

This design document outlines the architecture for extending the ComfyUI configuration interface to support multiple ComfyUI servers, including localhost, local network, and remote configurations. The design maintains backward compatibility with existing single-server configurations while providing a flexible multi-server management system.

## Requirements

- Support configuration of multiple ComfyUI servers
- Provide UI for adding, editing, and removing servers
- Allow assignment of servers to specific workflows
- Support setting a default server
- Maintain backward compatibility with single-server configs
- Persist configurations in JSON format using ConfigurationStore

## Data Models

### ComfyUIServer Interface

```typescript
interface ComfyUIServer {
  id: string; // Unique identifier (UUID)
  name: string; // Display name (e.g., "Localhost", "GPU Server")
  serverUrl: string; // ComfyUI server URL
  apiKey?: string; // Optional API key for authentication
  timeout: number; // Connection timeout in milliseconds
  enableQueueMonitoring: boolean; // Enable queue status monitoring
  availableWorkflows?: string[]; // Workflows fetched from server
  lastTested?: Date; // Last connection test timestamp
  status?: 'connected' | 'disconnected' | 'unknown'; // Connection status
}
```

### Updated ComfyUIConfiguration Interface

```typescript
interface ComfyUIConfiguration {
  servers: ComfyUIServer[]; // Array of configured servers
  defaultServerId: string; // ID of the default server
  workflowAssignments: {
    [taskType: string]: string; // taskType -> serverId mapping
  };
}
```

## Backward Compatibility

### Migration Strategy

When loading configurations from JSON:

1. Check if the loaded `comfyui` object contains a `servers` property
2. If `servers` exists, treat as new multi-server format
3. If `servers` does not exist, assume legacy single-server format and migrate:

```typescript
// Migration logic
if (!config.servers) {
  const legacyServer: ComfyUIServer = {
    id: 'legacy-default',
    name: 'Default Server',
    serverUrl: config.serverUrl,
    apiKey: config.apiKey,
    timeout: config.timeout,
    enableQueueMonitoring: config.enableQueueMonitoring,
    availableWorkflows: [], // Will be populated on connection test
  };

  config = {
    servers: [legacyServer],
    defaultServerId: 'legacy-default',
    workflowAssignments: config.defaultWorkflows || {},
  };
}
```

### Default Values

```typescript
const DEFAULT_COMFYUI_CONFIG: ComfyUIConfiguration = {
  servers: [{
    id: 'default-localhost',
    name: 'Localhost',
    serverUrl: 'http://localhost:8188',
    timeout: 60000,
    enableQueueMonitoring: true,
  }],
  defaultServerId: 'default-localhost',
  workflowAssignments: {},
};
```

## UI Design

### Wireframes

#### Main Configuration Window

```
┌─────────────────────────────────────────────────────────┐
│ Multi-Server ComfyUI Configuration              [×]     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Server List:                                            │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Name       │ URL              │ Status │ Default │ Actions │ │
│ ├────────────┼──────────────────┼────────┼─────────┼─────────┤ │
│ │ Localhost  │ localhost:8188   │ ●      │ ★       │ ▶ ✏ ×   │ │
│ │ GPU Server │ 192.168.1.100    │ ○      │         │ ▶ ✏ ×   │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ [+ Add Server]                                          │
│                                                         │
│ Workflow Assignments:                                   │
│ Text to Image: [Localhost ▼]                            │
│ Image to Image: [Use Default ▼]                         │
│ Upscaling: [GPU Server ▼]                               │
│ Inpainting: [Use Default ▼]                             │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                [Cancel]                  [Save Settings] │
└─────────────────────────────────────────────────────────┘
```

#### Add/Edit Server Form

```
┌─────────────────────────────────────────────────────────┐
│ Add ComfyUI Server                               [×]     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Server Name: [                    ]                     │
│ Server URL:  [http://               ]                  │
│ API Key:     [••••••••••••••••••••] (optional)          │
│ Timeout:     [60000                ] ms                 │
│ [ ] Enable queue monitoring                           │
│                                                         │
│ [Test Connection]                                       │
│ Status: Connected successfully                          │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                [Cancel]                     [Save]      │
└─────────────────────────────────────────────────────────┘
```

### UI Components

#### ServerList Component

- Displays servers in a tabular format
- Columns: Name, URL, Status indicator, Default marker, Action buttons
- Action buttons: Test Connection (▶), Edit (✏), Delete (×), Set as Default (★)
- Supports sorting by name or status

#### ServerForm Component

- Modal form for adding/editing servers
- Fields: Name, URL, API Key, Timeout, Queue Monitoring checkbox
- Validation: URL format, timeout range
- Test Connection button to verify server availability

#### WorkflowAssignmentPanel Component

- Dropdown selectors for each workflow type
- Options: All configured servers + "Use Default"
- Updates workflowAssignments mapping

## Component Structure

### Main Component: ComfyUIMultiServerConfigurationWindow

```typescript
interface ComfyUIMultiServerConfigurationWindowProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: ComfyUIConfiguration) => Promise<void>;
}

export function ComfyUIMultiServerConfigurationWindow({
  isOpen,
  onClose,
  onSave,
}: ComfyUIMultiServerConfigurationWindowProps) {
  // State management for servers, assignments, editing state
  // Render server list, assignment panel, and form modals
}
```

### Subcomponents

- **ServerList**: Table component for displaying servers
- **ServerForm**: Form component for server configuration
- **WorkflowAssignmentPanel**: Panel for workflow-to-server mapping
- **ConnectionStatusIndicator**: Visual status component

## Persistence Mechanism

### ConfigurationStore Integration

The existing ConfigurationStore handles JSON serialization/deserialization of `ProjectConfiguration` objects. The `comfyui` property will now use the new `ComfyUIConfiguration` structure.

### Migration Handling

Configuration loading will include automatic migration:

1. Load JSON configuration
2. Check `comfyui` object structure
3. Apply migration if legacy format detected
4. Return migrated configuration

### Saving

Saving always uses the new multi-server format, ensuring forward compatibility.

## Implementation Considerations

### Validation

- Server URLs must be valid HTTP/HTTPS URLs
- Timeout values must be positive numbers
- Server names must be unique and non-empty
- At least one server must be configured
- Default server ID must reference an existing server

### Error Handling

- Connection test failures display user-friendly messages
- Validation errors highlight problematic fields
- Migration errors fallback to default configuration

### Performance

- Connection tests run asynchronously
- Workflow fetching cached per server
- UI updates debounced for form inputs

## Workflow Integration

### Server Selection Logic

1. Check if specific server assigned to workflow type
2. If assigned, use that server
3. If "Use Default" or no assignment, use default server
4. Fallback to first available server if default unavailable

### Dynamic Workflow Loading

- Workflows fetched when testing server connections
- Available workflows cached per server
- UI updates workflow dropdowns when new workflows discovered

## Security Considerations

- API keys stored encrypted in configuration
- Connection tests validate server authenticity
- Remote server URLs validated for security
- No sensitive data logged in connection status messages

## Future Extensions

- Server health monitoring dashboard
- Automatic failover between servers
- Load balancing across multiple servers
- Server grouping and tagging
- Import/export server configurations