# Feedback & Diagnostics Module

This directory contains the React components and TypeScript interfaces for the Feedback & Diagnostics system.

## Structure

```
feedback/
├── README.md                 # This file
├── index.ts                  # Module exports
├── types.ts                  # TypeScript interfaces
├── FeedbackPanel.tsx         # Main feedback panel component (Phase 1)
├── PrivacyNotice.tsx         # Privacy consent component (Phase 2)
├── PendingReportsList.tsx    # Retry functionality UI (Phase 4)
└── utils/
    ├── validation.ts         # Form validation logic
    ├── diagnosticBridge.ts   # Python bridge for diagnostic collection
    └── clipboard.ts          # Clipboard utilities
```

## TypeScript Interfaces

### Core Types

- **`ReportPayload`**: Complete report structure matching Python backend schema
- **`FeedbackState`**: React component state for the feedback panel
- **`FeedbackPanelProps`**: Props for the main FeedbackPanel component
- **`FeedbackInitialContext`**: Optional initial context (error messages, stacktraces)

### Supporting Types

- **`SystemInfo`**: OS, Python, and StoryCore version information
- **`ModuleContext`**: Active module and state information
- **`UserInput`**: User-provided description and reproduction steps
- **`Diagnostics`**: Automatically collected diagnostic data
- **`FormValidationErrors`**: Validation error messages
- **`SubmissionResult`**: Result of feedback submission

## Implementation Phases

### Phase 1: MVP (Manual Mode)
- [x] TypeScript interfaces defined
- [x] FeedbackPanel component
- [x] Form validation
- [x] Manual Mode URL generation
- [x] Clipboard integration
- [x] Unit tests for FeedbackPanel
- [x] Usage examples

### Phase 2: Advanced Diagnostics
- [ ] Privacy consent UI
- [ ] Screenshot upload
- [ ] Log collection integration
- [ ] Automatic error reporting

### Phase 3: Automatic Mode
- [ ] Backend proxy integration
- [ ] Automatic submission flow
- [ ] Fallback mechanism

### Phase 4: Recovery & Resilience
- [ ] Pending reports list
- [ ] Retry functionality
- [ ] Local storage integration

## Usage

```typescript
import { FeedbackPanel } from '@/components/feedback';

function App() {
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

  return (
    <>
      <button onClick={() => setIsFeedbackOpen(true)}>
        Report Issue
      </button>
      
      <FeedbackPanel
        isOpen={isFeedbackOpen}
        onClose={() => setIsFeedbackOpen(false)}
        initialContext={{
          errorMessage: 'Optional error message',
          stackTrace: 'Optional stack trace',
          activeModule: 'promotion-engine'
        }}
      />
    </>
  );
}
```

## Requirements Mapping

This module implements requirements from the Feedback & Diagnostics specification:

- **Requirement 1**: Feedback Submission Modes (Manual & Automatic)
- **Requirement 2**: User Interface Components
- **Requirement 3**: Diagnostic Information Collection
- **Requirement 4**: Log Anonymization
- **Requirement 7**: Security and Privacy
- **Requirement 8**: Error Handling and Recovery
