# NotificationService

## Overview

The `NotificationService` manages notifications for menu bar actions with auto-dismiss timers and queue management. It implements Requirements 15.1-15.6 from the comprehensive menu bar restoration specification.

## Features

- **Show notifications**: Display success, error, warning, and info notifications
- **Auto-dismiss**: Automatically dismiss notifications after a specified duration
- **Manual dismiss**: Dismiss specific notifications or all notifications
- **Queue management**: Manage multiple active notifications
- **Event subscription**: Subscribe to notification show and dismiss events
- **Console logging**: Log all notifications to console for debugging (Requirement 15.6)

## Usage

### Basic Usage

```typescript
import { notificationService } from '@/services/menuBar';

// Show a success notification (auto-dismiss after 3 seconds)
const id = notificationService.show({
  type: 'success',
  message: 'Project saved successfully!',
  duration: 3000,
});

// Show an error notification (manual dismiss)
notificationService.show({
  type: 'error',
  message: 'Failed to save project. Please try again.',
  duration: null, // or undefined - requires manual dismiss
});

// Show a notification with an action button
notificationService.show({
  type: 'warning',
  message: 'You have unsaved changes.',
  duration: 5000,
  action: {
    label: 'Save Now',
    callback: () => {
      // Handle save action
      console.log('Save action triggered');
    },
  },
});
```

### Dismissing Notifications

```typescript
// Dismiss a specific notification
notificationService.dismiss(notificationId);

// Dismiss all notifications
notificationService.dismissAll();
```

### Subscribing to Events

```typescript
// Subscribe to notification show events
const unsubscribe = notificationService.subscribe((notification) => {
  console.log('Notification shown:', notification);
});

// Subscribe to notification dismiss events
const unsubscribeDismiss = notificationService.onDismiss((id) => {
  console.log('Notification dismissed:', id);
});

// Unsubscribe when done
unsubscribe();
unsubscribeDismiss();
```

### Querying Notifications

```typescript
// Get all active notifications
const notifications = notificationService.getNotifications();

// Get a specific notification
const notification = notificationService.getNotification(id);

// Check if a notification exists
const exists = notificationService.has(id);

// Get count of active notifications
const count = notificationService.count();
```

## API Reference

### Types

#### `NotificationType`
```typescript
type NotificationType = 'success' | 'error' | 'warning' | 'info';
```

#### `Notification`
```typescript
interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  duration?: number; // Auto-dismiss after ms (null/undefined = manual dismiss)
  action?: {
    label: string;
    callback: () => void;
  };
}
```

### Methods

#### `show(notification: Omit<Notification, 'id'>): string`
Show a notification and return its generated id.

**Parameters:**
- `notification`: Notification data without id

**Returns:** Generated notification id

**Example:**
```typescript
const id = notificationService.show({
  type: 'success',
  message: 'Operation completed',
  duration: 3000,
});
```

#### `dismiss(id: string): void`
Dismiss a specific notification by id.

**Parameters:**
- `id`: Notification id to dismiss

**Example:**
```typescript
notificationService.dismiss(notificationId);
```

#### `dismissAll(): void`
Dismiss all active notifications.

**Example:**
```typescript
notificationService.dismissAll();
```

#### `getNotifications(): Notification[]`
Get all active notifications.

**Returns:** Array of active notifications

**Example:**
```typescript
const notifications = notificationService.getNotifications();
console.log(`Active notifications: ${notifications.length}`);
```

#### `getNotification(id: string): Notification | undefined`
Get a specific notification by id.

**Parameters:**
- `id`: Notification id

**Returns:** The notification or undefined if not found

**Example:**
```typescript
const notification = notificationService.getNotification(id);
if (notification) {
  console.log(notification.message);
}
```

#### `subscribe(listener: NotificationListener): () => void`
Subscribe to notification show events.

**Parameters:**
- `listener`: Callback to invoke when a notification is shown

**Returns:** Unsubscribe function

**Example:**
```typescript
const unsubscribe = notificationService.subscribe((notification) => {
  console.log('New notification:', notification.message);
});

// Later...
unsubscribe();
```

#### `onDismiss(listener: NotificationDismissListener): () => void`
Subscribe to notification dismiss events.

**Parameters:**
- `listener`: Callback to invoke when a notification is dismissed

**Returns:** Unsubscribe function

**Example:**
```typescript
const unsubscribe = notificationService.onDismiss((id) => {
  console.log('Notification dismissed:', id);
});

// Later...
unsubscribe();
```

#### `has(id: string): boolean`
Check if a notification exists.

**Parameters:**
- `id`: Notification id

**Returns:** True if notification exists

**Example:**
```typescript
if (notificationService.has(id)) {
  console.log('Notification is still active');
}
```

#### `count(): number`
Get the count of active notifications.

**Returns:** Number of active notifications

**Example:**
```typescript
const count = notificationService.count();
console.log(`${count} active notifications`);
```

#### `clearListeners(): void`
Clear all listeners (useful for cleanup).

**Example:**
```typescript
notificationService.clearListeners();
```

## Integration with Menu Bar

The NotificationService is designed to integrate seamlessly with menu bar actions:

```typescript
// In menu action handler
async function handleSaveProject() {
  try {
    await projectPersistenceService.saveProject(project);
    
    // Show success notification (Requirement 15.1)
    notificationService.show({
      type: 'success',
      message: 'Project saved successfully!',
      duration: 3000,
    });
  } catch (error) {
    // Show error notification (Requirement 15.2)
    notificationService.show({
      type: 'error',
      message: `Failed to save project: ${error.message}`,
      duration: null, // Manual dismiss for errors
    });
    
    // Log error to console (Requirement 15.6)
    console.error('Save project failed:', error);
  }
}
```

## Auto-Dismiss Behavior

- **duration > 0**: Notification auto-dismisses after the specified milliseconds
- **duration = null or undefined**: Notification requires manual dismiss
- **Recommended durations**:
  - Success: 3000ms (3 seconds)
  - Info: 5000ms (5 seconds)
  - Warning: 5000ms (5 seconds)
  - Error: null (manual dismiss) or 7000ms (7 seconds)

## Console Logging

All notifications are automatically logged to the browser console for debugging purposes (Requirement 15.6):

```
[Notification] SUCCESS: Project saved successfully!
[Notification] ERROR: Failed to save project: Network error
[Notification] Dismissed: abc-123-def-456
[Notification] Dismissed all notifications
```

## Requirements Coverage

This implementation satisfies the following requirements:

- **15.1**: Display non-intrusive success notifications
- **15.2**: Display error notifications with clear explanations
- **15.6**: Log all menu actions and errors to browser console

The notification system provides the foundation for user feedback throughout the menu bar implementation.

## Testing

See `NotificationService.test.ts` for comprehensive unit tests covering:
- Notification creation and display
- Auto-dismiss timer functionality
- Manual dismiss operations
- Queue management
- Event subscription and notification
- Console logging verification
