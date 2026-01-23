/**
 * Types for the Generic Modal Framework
 *
 * Defines strict interfaces for modal schema configuration, state management,
 * validation, persistence, and connection testing.
 */

// =============================================================================
// SCHEMA CONFIGURATION TYPES
// =============================================================================

/**
 * Field validation rule
 */
export interface ValidationRule {
  /** Rule type identifier */
  type: 'required' | 'minLength' | 'maxLength' | 'pattern' | 'email' | 'url' | 'custom';
  /** Rule value (string for pattern, number for length, function for custom) */
  value?: string | number | ((value: unknown) => boolean);
  /** Error message when validation fails */
  message: string;
}

/**
 * Field configuration in modal schema
 */
export interface ModalField {
  /** Field unique identifier */
  id: string;
  /** Display label */
  label: string;
  /** Field type */
  type: 'text' | 'password' | 'email' | 'url' | 'number' | 'textarea' | 'select' | 'checkbox' | 'radio';
  /** Whether field is required */
  required?: boolean;
  /** Placeholder text */
  placeholder?: string;
  /** Default value */
  defaultValue?: unknown;
  /** Validation rules */
  validation?: ValidationRule[];
  /** Options for select/radio fields */
  options?: Array<{ value: string; label: string }>;
  /** Field layout properties */
  layout?: {
    /** Grid column span (1-12) */
    span?: number;
    /** Field group identifier */
    group?: string;
  };
}

/**
 * Modal schema configuration
 */
export interface ModalSchema {
  /** Schema unique identifier */
  id: string;
  /** Modal title */
  title: string;
  /** Modal description */
  description?: string;
  /** Form fields configuration */
  fields: ModalField[];
  /** Submit button label */
  submitLabel?: string;
  /** Cancel button label */
  cancelLabel?: string;
  /** Modal size variant */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Whether to show connection test button */
  enableConnectionTest?: boolean;
  /** Connection test configuration */
  connectionTest?: {
    /** Test endpoint or function */
    endpoint: string | ((data: Record<string, unknown>) => Promise<boolean>);
    /** Success message */
    successMessage: string;
    /** Error message */
    errorMessage: string;
  };
}

// =============================================================================
// STATE MANAGEMENT TYPES
// =============================================================================

/**
 * Modal state interface
 */
export interface ModalState {
  /** Whether modal is open */
  isOpen: boolean;
  /** Form data */
  data: Record<string, unknown>;
  /** Validation errors */
  errors: Record<string, string>;
  /** Loading states */
  loading: {
    submit: boolean;
    connectionTest: boolean;
  };
  /** Connection test result */
  connectionStatus: 'idle' | 'testing' | 'success' | 'error';
}

/**
 * Modal actions
 */
export interface ModalActions {
  /** Open modal with optional initial data */
  open: (data?: Record<string, unknown>) => void;
  /** Close modal */
  close: () => void;
  /** Update form field value */
  updateField: (fieldId: string, value: unknown) => void;
  /** Update multiple fields at once */
  updateFields: (updates: Record<string, unknown>) => void;
  /** Validate entire form */
  validate: () => boolean;
  /** Submit form */
  submit: () => Promise<void>;
  /** Test connection */
  testConnection: () => Promise<void>;
  /** Reset form to initial state */
  reset: () => void;
  /** Save draft to persistence */
  saveDraft: () => Promise<void>;
  /** Load draft from persistence */
  loadDraft: () => Promise<void>;
}

// =============================================================================
// VALIDATION TYPES
// =============================================================================

/**
 * Validation result
 */
export interface ValidationResult {
  /** Whether validation passed */
  isValid: boolean;
  /** Validation errors by field */
  errors: Record<string, string>;
}

/**
 * Validation context
 */
export interface ValidationContext {
  /** Current form data */
  data: Record<string, unknown>;
  /** Field being validated */
  field?: ModalField;
  /** All schema fields */
  schema: ModalSchema;
}

// =============================================================================
// PERSISTENCE TYPES
// =============================================================================

/**
 * Draft data structure
 */
export interface ModalDraft {
  /** Schema ID */
  schemaId: string;
  /** Draft data */
  data: Record<string, unknown>;
  /** Timestamp */
  timestamp: number;
  /** Draft identifier */
  id: string;
}

/**
 * Persistence operations
 */
export interface ModalPersistence {
  /** Save draft */
  save: (schemaId: string, data: Record<string, unknown>) => Promise<string>;
  /** Load draft */
  load: (schemaId: string, draftId: string) => Promise<Record<string, unknown>>;
  /** List drafts */
  list: (schemaId?: string) => Promise<ModalDraft[]>;
  /** Delete draft */
  delete: (schemaId: string, draftId: string) => Promise<void>;
}

// =============================================================================
// CONNECTION TEST TYPES
// =============================================================================

/**
 * Connection test result
 */
export interface ConnectionTestResult {
  /** Test success status */
  success: boolean;
  /** Response time in milliseconds */
  responseTime?: number;
  /** Error message if failed */
  error?: string;
  /** Additional test data */
  metadata?: Record<string, unknown>;
}

// =============================================================================
// COMPONENT PROPS TYPES
// =============================================================================

/**
 * Generic modal props
 */
export interface GenericModalProps {
  /** Modal schema configuration */
  schema: ModalSchema;
  /** Whether modal is open */
  isOpen: boolean;
  /** Callback when modal should close */
  onClose: () => void;
  /** Callback when form is submitted successfully */
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  /** Optional initial data */
  initialData?: Record<string, unknown>;
  /** Custom persistence implementation */
  persistence?: ModalPersistence;
}

/**
 * Modal overlay props
 */
export interface ModalOverlayProps {
  /** Whether overlay is visible */
  isOpen: boolean;
  /** Click handler for overlay */
  onClose: () => void;
  /** Child content */
  children: React.ReactNode;
  /** Custom overlay className */
  className?: string;
}

/**
 * Form field props
 */
export interface FormFieldProps {
  /** Field configuration */
  field: ModalField;
  /** Current field value */
  value: unknown;
  /** Field error message */
  error?: string;
  /** Change handler */
  onChange: (value: unknown) => void;
  /** Disabled state */
  disabled?: boolean;
}
