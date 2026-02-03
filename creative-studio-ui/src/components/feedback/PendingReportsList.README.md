# PendingReportsList Component

## Overview

The `PendingReportsList` component displays a list of feedback reports that failed to submit automatically to GitHub. It provides functionality to retry submission or delete reports from local storage.

**Requirements:** 8.2 - Local storage on failure with retry capability  
**Task:** 20.1 - Create pending reports list component

## Features

- ✅ Display list of unsent reports with metadata (filename, timestamp, size)
- ✅ "Retry" button for each report to attempt resubmission
- ✅ "Delete" button for each report to remove from storage
- ✅ Show retry status (idle, retrying, success, error)
- ✅ Display error messages when retry fails
- ✅ Refresh functionality to reload the list
- ✅ Responsive modal design with scrollable content
- ✅ Loading states and error handling

## Usage

### Basic Usage

```tsx
import React, { useState } from 'react';
import { PendingReportsList } from './components/feedback';

function App() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div>
      <button onClick={() => setIsOpen(true)}>
        View Pending Reports
      </button>

      <PendingReportsList
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </div>
  );
}
```

### Integration with Main Menu

```tsx
import React, { useState } from 'react';
import { PendingReportsList } from './components/feedback';

function MainMenu() {
  const [isPendingReportsOpen, setIsPendingReportsOpen] = useState(false);

  return (
    <>
      <nav>
        <button onClick={() => setIsPendingReportsOpen(true)}>
          Pending Reports
        </button>
      </nav>

      <PendingReportsList
        isOpen={isPendingReportsOpen}
        onClose={() => setIsPendingReportsOpen(false)}
      />
    </>
  );
}
```

### Integration with FeedbackPanel

```tsx
import React, { useState } from 'react';
import { FeedbackPanel, PendingReportsList } from './components/feedback';

function FeedbackSystem() {
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [isPendingReportsOpen, setIsPendingReportsOpen] = useState(false);

  return (
    <>
      <FeedbackPanel
        isOpen={isFeedbackOpen}
        onClose={() => setIsFeedbackOpen(false)}
      />

      {/* Add a link in the feedback panel to view pending reports */}
      <button
        onClick={() => {
          setIsFeedbackOpen(false);
          setIsPendingReportsOpen(true);
        }}
      >
        View pending reports
      </button>

      <PendingReportsList
        isOpen={isPendingReportsOpen}
        onClose={() => setIsPendingReportsOpen(false)}
      />
    </>
  );
}
```

## Props

### PendingReportsListProps

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `isOpen` | `boolean` | Yes | Controls whether the modal is visible |
| `onClose` | `() => void` | Yes | Callback function when the modal is closed |

## API Endpoints

The component expects the following backend API endpoints to be available:

### GET /api/feedback/pending

Returns a list of pending reports.

**Response:**
```json
[
  {
    "report_id": "report_20240115_143022_a1b2c3d4",
    "filename": "report_20240115_143022_a1b2c3d4.json",
    "filepath": "/home/user/.storycore/feedback/pending/report_20240115_143022_a1b2c3d4.json",
    "timestamp": "20240115_143022",
    "size_bytes": 4567
  }
]
```

### POST /api/feedback/retry/{report_id}

Attempts to retry submitting a specific report.

**Response (Success):**
```json
{
  "success": true,
  "issue_url": "https://github.com/zedarvates/StoryCore-Engine/issues/123",
  "issue_number": 123
}
```

**Response (Failure):**
```json
{
  "success": false,
  "error": "Backend proxy unavailable"
}
```

### DELETE /api/feedback/delete/{report_id}

Deletes a specific report from local storage.

**Response:**
```json
{
  "success": true
}
```

## Component States

### Retry Status

Each report can have one of the following retry statuses:

- **idle**: Report is pending, no retry in progress
- **retrying**: Retry is currently in progress
- **success**: Retry was successful, report will be removed
- **error**: Retry failed, error message is displayed

### Visual States

- **Loading**: Spinner displayed while fetching reports
- **Empty**: Message displayed when no pending reports exist
- **Error**: Error banner displayed when loading fails
- **List**: Reports displayed with metadata and action buttons

## Styling

The component uses Tailwind CSS classes for styling. Key design elements:

- **Modal**: Fixed overlay with centered content
- **Header**: Title and close button
- **Content**: Scrollable list of reports
- **Footer**: Report count, refresh button, and close button
- **Status Badges**: Color-coded badges for retry status
- **Action Buttons**: Retry (blue) and Delete (red) buttons

## Error Handling

The component handles the following error scenarios:

1. **Failed to load reports**: Displays error banner with message
2. **Failed to retry**: Updates status to error and shows error message
3. **Failed to delete**: Displays error banner with message
4. **Network errors**: Caught and displayed to user

## Accessibility

- Close button has `aria-label="Close"`
- Buttons have descriptive titles
- Loading states are announced
- Keyboard navigation supported
- Confirmation dialog for delete action

## Integration with FeedbackStorage

The component integrates with the Python `FeedbackStorage` class through API endpoints. The backend should implement:

```python
from src.feedback_storage import FeedbackStorage

storage = FeedbackStorage()

# List pending reports
@app.get('/api/feedback/pending')
def list_pending():
    return storage.list_pending_reports()

# Retry a report
@app.post('/api/feedback/retry/{report_id}')
def retry_report(report_id: str):
    success = storage.retry_report(report_id)
    return {'success': success}

# Delete a report
@app.delete('/api/feedback/delete/{report_id}')
def delete_report(report_id: str):
    success = storage.delete_report(report_id)
    return {'success': success}
```

## Testing

See `PendingReportsList.test.tsx` for unit tests covering:

- Component rendering
- Loading states
- Retry functionality
- Delete functionality
- Error handling
- Empty state display

## Future Enhancements

Potential improvements for future versions:

- Batch retry all pending reports
- Export reports as JSON
- View report details before retry
- Filter/search reports
- Sort by timestamp, size, or status
- Pagination for large lists
- Automatic retry on interval
- Desktop notifications for retry results

## Related Components

- `FeedbackPanel`: Main feedback submission interface
- `FeedbackStorage`: Python backend for local storage management
- `PrivacyNotice`: Privacy consent component

## Requirements Validation

This component validates the following requirements:

- **Requirement 8.2**: Local storage on failure with retry capability
  - ✅ Displays list of unsent reports
  - ✅ Provides retry functionality
  - ✅ Provides delete functionality
  - ✅ Shows retry status and errors

## License

Part of the StoryCore-Engine Feedback & Diagnostics Module.
