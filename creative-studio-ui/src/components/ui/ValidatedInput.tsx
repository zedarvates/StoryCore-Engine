import React, { useState, useCallback } from 'react';
import { AlertCircle, CheckCircle2, Info, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// ValidatedInput Component
// Composant de saisie avec validation en temps réel et feedback visuel
// ============================================================================

interface ValidatedInputProps {
  label: string;
  name: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  errorMessage?: string;
  customValidator?: (value: string) => string | null;
  helpText?: string;
  isValidating?: boolean;
  isValid?: boolean;
  className?: string;
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url';
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  placeholder?: string;
}

export const ValidatedInput = React.forwardRef<HTMLInputElement, ValidatedInputProps>(
  ({
    label,
    name,
    required = false,
    minLength,
    maxLength,
    pattern,
    errorMessage,
    customValidator,
    helpText,
    isValidating = false,
    isValid,
    className,
    type = 'text',
    value = '',
    onChange,
    onBlur,
    disabled = false,
    placeholder,
  }, ref) => {
    const [inputValue, setInputValue] = useState(String(value || ''));
    const [touched, setTouched] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const validate = useCallback((val: string): string | null => {
      if (required && !val.trim()) {
        return errorMessage || `${label} est obligatoire`;
      }
      if (minLength && val.length < minLength) {
        return `Minimum ${minLength} caractères requis`;
      }
      if (maxLength && val.length > maxLength) {
        return `Maximum ${maxLength} caractères autorisés`;
      }
      if (pattern && !pattern.test(val)) {
        return errorMessage || `Format invalide`;
      }
      if (customValidator) {
        const customError = customValidator(val);
        if (customError) return customError;
      }
      return null;
    }, [required, minLength, maxLength, pattern, errorMessage, label, customValidator]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setInputValue(newValue);
      if (touched) {
        setError(validate(newValue));
      }
      if (onChange) onChange(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setTouched(true);
      setError(validate(inputValue));
      if (onBlur) onBlur(e);
    };

    const showError = touched && error !== null;
    const showSuccess = touched && !error && inputValue.length > 0 && isValid !== false;
    const showHelpText = helpText && !showError;

    const describedBy = showError ? `${name}-error` : showHelpText ? `${name}-help` : undefined;

    return (
      <div className={cn('space-y-1', className)}>
        <label htmlFor={name} className="block text-sm font-medium text-foreground">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>

        <div className="relative">
          <input
            ref={ref}
            id={name}
            name={name}
            type={type}
            value={inputValue}
            onChange={handleChange}
            onBlur={handleBlur}
            disabled={disabled}
            placeholder={placeholder}
            className={cn(
              'w-full px-3 py-2 pr-10 rounded-lg border transition-all duration-200',
              'bg-background text-foreground placeholder:text-muted-foreground',
              'focus:outline-none focus:ring-2 focus:ring-ring',
              showError && 'border-red-500 focus:ring-red-500',
              showSuccess && 'border-green-500 focus:ring-green-500',
              !touched && 'border-input',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
            aria-invalid={showError ? 'true' : 'false'}
            aria-describedby={describedBy}
          />

          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {isValidating && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
            {showError && !isValidating && (
              <AlertCircle className="h-4 w-4 text-red-500" />
            )}
            {showSuccess && !isValidating && (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            )}
          </div>
        </div>

        {showError && (
          <p 
            id={`${name}-error`} 
            className="text-sm text-red-600 flex items-center gap-1"
            role="alert"
          >
            <AlertCircle className="h-3 w-3" />
            {error}
          </p>
        )}

        {showHelpText && (
          <p 
            id={`${name}-help`} 
            className="text-sm text-muted-foreground flex items-center gap-1"
          >
            <Info className="h-3 w-3" />
            {helpText}
          </p>
        )}

        {maxLength && (
          <p className={cn(
            'text-xs text-right',
            inputValue.length > maxLength ? 'text-red-500' : 'text-muted-foreground'
          )}>
            {inputValue.length}/{maxLength}
          </p>
        )}
      </div>
    );
  }
);

ValidatedInput.displayName = 'ValidatedInput';

// ============================================================================
// ValidatedTextarea Component
// ============================================================================

interface ValidatedTextareaProps {
  label: string;
  name: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  errorMessage?: string;
  customValidator?: (value: string) => string | null;
  helpText?: string;
  isValidating?: boolean;
  isValid?: boolean;
  showCount?: boolean;
  className?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLTextAreaElement>) => void;
  disabled?: boolean;
  placeholder?: string;
  rows?: number;
}

export const ValidatedTextarea = React.forwardRef<HTMLTextAreaElement, ValidatedTextareaProps>(
  ({
    label,
    name,
    required = false,
    minLength,
    maxLength,
    errorMessage,
    customValidator,
    helpText,
    isValidating = false,
    isValid,
    showCount = true,
    className,
    value = '',
    onChange,
    onBlur,
    disabled = false,
    placeholder,
    rows = 3,
  }, ref) => {
    const [inputValue, setInputValue] = useState(String(value || ''));
    const [touched, setTouched] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const validate = useCallback((val: string): string | null => {
      if (required && !val.trim()) {
        return errorMessage || `${label} est obligatoire`;
      }
      if (minLength && val.length < minLength) {
        return `Minimum ${minLength} caractères requis`;
      }
      if (maxLength && val.length > maxLength) {
        return `Maximum ${maxLength} caractères autorisés`;
      }
      if (customValidator) {
        const customError = customValidator(val);
        if (customError) return customError;
      }
      return null;
    }, [required, minLength, maxLength, errorMessage, label, customValidator]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      setInputValue(newValue);
      if (touched) {
        setError(validate(newValue));
      }
      if (onChange) onChange(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
      setTouched(true);
      setError(validate(inputValue));
      if (onBlur) onBlur(e);
    };

    const showError = touched && error !== null;
    const showSuccess = touched && !error && inputValue.length > 0 && isValid !== false;
    const showHelpText = helpText && !showError;
    const describedBy = showError ? `${name}-error` : showHelpText ? `${name}-help` : undefined;

    return (
      <div className={cn('space-y-1', className)}>
        <label htmlFor={name} className="block text-sm font-medium text-foreground">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>

        <div className="relative">
          <textarea
            ref={ref}
            id={name}
            name={name}
            value={inputValue}
            onChange={handleChange}
            onBlur={handleBlur}
            disabled={disabled}
            placeholder={placeholder}
            rows={rows}
            className={cn(
              'w-full px-3 py-2 rounded-lg border transition-all duration-200 resize-none',
              'bg-background text-foreground placeholder:text-muted-foreground',
              'focus:outline-none focus:ring-2 focus:ring-ring',
              showError && 'border-red-500 focus:ring-red-500',
              showSuccess && 'border-green-500 focus:ring-green-500',
              !touched && 'border-input',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
            aria-invalid={showError ? 'true' : 'false'}
            aria-describedby={describedBy}
          />

          {isValidating && (
            <div className="absolute right-3 top-3">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>

        {showError && (
          <p id={`${name}-error`} className="text-sm text-red-600 flex items-center gap-1" role="alert">
            <AlertCircle className="h-3 w-3" />
            {error}
          </p>
        )}

        {showHelpText && (
          <p id={`${name}-help`} className="text-sm text-muted-foreground flex items-center gap-1">
            <Info className="h-3 w-3" />
            {helpText}
          </p>
        )}

        {showCount && maxLength && (
          <p className={cn(
            'text-xs text-right',
            inputValue.length > maxLength ? 'text-red-500' : 'text-muted-foreground'
          )}>
            {inputValue.length}/{maxLength}
          </p>
        )}
      </div>
    );
  }
);

ValidatedTextarea.displayName = 'ValidatedTextarea';

export default ValidatedInput;

