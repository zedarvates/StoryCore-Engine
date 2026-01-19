/**
 * Error Handling Components and Utilities
 * 
 * Centralized exports for error handling system.
 */

// Components
export { WizardErrorBoundary } from './WizardErrorBoundary';
export type { WizardErrorBoundaryProps } from './WizardErrorBoundary';

export { ErrorDisplay } from './ErrorDisplay';
export type { ErrorDisplayProps } from './ErrorDisplay';

export {
  ErrorNotification,
  ErrorNotificationContainer,
} from './ErrorNotification';
export type {
  ErrorNotificationProps,
  ErrorNotificationContainerProps,
} from './ErrorNotification';

export {
  DataExport,
  DataImport,
  DataExportImportPanel,
} from './DataExportImport';
export type {
  DataExportProps,
  DataImportProps,
  DataExportImportPanelProps,
} from './DataExportImport';

export { StateRecoveryDialog } from './StateRecoveryDialog';
export type { StateRecoveryDialogProps } from './StateRecoveryDialog';

// Services
export {
  getErrorLoggingService,
  ErrorLoggingService,
} from '../../services/wizard/errorLoggingService';
export type {
  ErrorLogEntry,
  ErrorLogFilter,
} from '../../services/wizard/errorLoggingService';

export {
  getStateValidationService,
  StateValidationService,
} from '../../services/wizard/stateValidationService';
export type {
  ValidationResult,
  StateVersion,
} from '../../services/wizard/stateValidationService';

// Hooks
export { useStateRecovery } from '../../hooks/useStateRecovery';
export type {
  UseStateRecoveryOptions,
  UseStateRecoveryReturn,
} from '../../hooks/useStateRecovery';

// Utilities
export {
  emergencyExportWizardState,
  enableAutoExportOnError,
  disableAutoExportOnError,
  loadWizardStateWithValidation,
} from '../../utils/wizardStorage';
export type { LoadStateResult } from '../../utils/wizardStorage';
