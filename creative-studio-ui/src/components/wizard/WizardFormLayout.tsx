import React, { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { InlineFieldError, FieldRequirement } from './ValidationDisplay';

// ============================================================================
// Wizard Form Layout Component
// ============================================================================

interface WizardFormLayoutProps {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export function WizardFormLayout({
  title,
  description,
  children,
  className,
}: WizardFormLayoutProps) {
  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-6">
        {children}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Form Field Component
// ============================================================================

interface FormFieldProps {
  label: string;
  name: string;
  required?: boolean;
  error?: string;
  helpText?: string;
  children: ReactNode;
  className?: string;
}

export function FormField({
  label,
  name,
  required = false,
  error,
  helpText,
  children,
  className,
}: FormFieldProps) {
  const helpTextId = `${name}-help`;
  const errorId = `${name}-error`;
  const hasError = !!error;
  
  return (
    <div className={cn('space-y-2', className)}>
      <Label 
        htmlFor={name} 
        className={cn(
          'flex items-center gap-2',
          hasError && 'text-red-600'
        )}
      >
        <span>{label}</span>
        <FieldRequirement required={required} optional={!required} />
      </Label>
      
      {/* Clone children to add ARIA attributes and error styling */}
      <div className={cn(hasError && 'ring-2 ring-red-500 rounded-md')}>
        {React.Children.map(children, (child) => {
          if (React.isValidElement(child)) {
            const childElement = child as React.ReactElement<any>;
            return React.cloneElement(childElement, {
              id: name,
              'aria-describedby': error ? errorId : (helpText ? helpTextId : undefined),
              'aria-invalid': error ? 'true' : undefined,
              'aria-required': required ? 'true' : undefined,
              className: cn(
                childElement.props.className,
                hasError && 'border-red-500 focus:ring-red-500'
              ),
            });
          }
          return child;
        })}
      </div>
      
      {/* Help Text */}
      {helpText && !error && (
        <p className="text-sm text-gray-500" id={helpTextId}>
          {helpText}
        </p>
      )}
      
      {/* Error Message */}
      {error && (
        <InlineFieldError error={error} fieldName={name} />
      )}
    </div>
  );
}

// ============================================================================
// Form Section Component
// ============================================================================

interface FormSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export function FormSection({
  title,
  description,
  children,
  className,
}: FormSectionProps) {
  const sectionId = title.toLowerCase().replace(/\s+/g, '-');
  
  return (
    <section className={cn('space-y-4', className)} aria-labelledby={`${sectionId}-title`}>
      <div className="border-b pb-2">
        <h3 id={`${sectionId}-title`} className="text-lg font-semibold">
          {title}
        </h3>
        {description && (
          <p className="text-sm text-gray-500 mt-1" id={`${sectionId}-description`}>
            {description}
          </p>
        )}
      </div>
      <div className="space-y-4" role="group" aria-labelledby={`${sectionId}-title`}>
        {children}
      </div>
    </section>
  );
}

// ============================================================================
// Form Grid Component (for multi-column layouts)
// ============================================================================

interface FormGridProps {
  columns?: 1 | 2 | 3;
  children: ReactNode;
  className?: string;
}

export function FormGrid({
  columns = 2,
  children,
  className,
}: FormGridProps) {
  return (
    <div
      className={cn(
        'grid gap-4',
        columns === 1 && 'grid-cols-1',
        columns === 2 && 'grid-cols-1 md:grid-cols-2',
        columns === 3 && 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
        className
      )}
    >
      {children}
    </div>
  );
}

// Export the enhanced ValidationErrorSummary from ValidationDisplay
export { ValidationErrorSummary } from './ValidationDisplay';
