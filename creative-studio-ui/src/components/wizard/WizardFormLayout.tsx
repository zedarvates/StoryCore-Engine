import React, { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { InlineFieldError, FieldRequirement } from './ValidationDisplay';
import { Cpu, Layers } from 'lucide-react';

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
    <Card className={cn('w-full border-2 border-primary/20 bg-black/40 backdrop-blur-xl shadow-[0_0_30px_rgba(var(--primary-rgb),0.05)] overflow-hidden rounded-none relative', className)}>
      {/* Background grid effect */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none z-0"
        style={{ backgroundImage: 'radial-gradient(circle, hsl(var(--primary)) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

      <CardHeader className="border-b border-primary/10 bg-primary/5 px-8 py-6 relative z-10">
        <div className="flex items-center gap-3 mb-1">
          <Cpu className="w-4 h-4 text-primary opacity-60" />
          <div className="h-px flex-1 bg-primary/10" />
        </div>
        <CardTitle className="text-xl font-black text-white uppercase tracking-[0.2em] drop-shadow-[0_0_8px_rgba(var(--primary-rgb),0.3)]">{title}</CardTitle>
        {description && <CardDescription className="text-primary/60 font-mono text-[10px] uppercase tracking-widest mt-2">{description}</CardDescription>}
      </CardHeader>

      <CardContent className="space-y-10 p-8 relative z-10">
        {children}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Form Field Component
// ============================================================================

interface FormFieldProps {
  label: ReactNode;
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
    <div className={cn('space-y-3 group', className)}>
      <div className="flex items-center justify-between border-l-2 border-primary/20 pl-3 group-hover:border-primary transition-colors">
        <Label
          htmlFor={name}
          className={cn(
            'text-[11px] font-black uppercase tracking-[0.15em] font-mono transition-colors',
            hasError ? 'text-red-400' : 'text-primary/80 group-focus-within:text-primary'
          )}
        >
          {label}
        </Label>
        <FieldRequirement required={required} optional={!required} />
      </div>

      <div className="relative">
        <div className={cn(
          'transition-all duration-300',
          hasError && 'shadow-[0_0_15px_rgba(239,68,68,0.2)]'
        )}>
          {React.Children.map(children, (child) => {
            if (React.isValidElement(child)) {
              const childElement = child as React.ReactElement<{
                className?: string;
                id?: string;
                'aria-describedby'?: string;
                'aria-invalid'?: string;
                'aria-required'?: string;
                props?: { className?: string };
              }>;
              return React.cloneElement(childElement, {
                id: name,
                'aria-describedby': error ? errorId : (helpText ? helpTextId : undefined),
                'aria-invalid': error ? 'true' : undefined,
                'aria-required': required ? 'true' : undefined,
                className: cn(
                  childElement.props.className,
                  'bg-primary/5 border-primary/20 text-white rounded-none focus:bg-primary/10 focus:border-primary transition-all font-mono text-xs placeholder:text-primary/20',
                  hasError && 'border-red-500/50 bg-red-500/5 focus:border-red-500'
                ),
              });
            }
            return child;
          })}
        </div>
      </div>

      {helpText && !error && (
        <p className="text-[9px] text-primary/30 font-mono uppercase tracking-widest pl-3 border-l-2 border-transparent" id={helpTextId}>
          // {helpText}
        </p>
      )}

      {error && (
        <div className="pl-3">
          <InlineFieldError error={error} fieldName={name} />
        </div>
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
    <section className={cn('space-y-6', className)} aria-labelledby={`${sectionId}-title`}>
      <div className="border-b border-primary/10 pb-4 relative">
        <div className="flex items-center gap-3">
          <Layers className="h-3 w-3 text-primary/40" />
          <h3 id={`${sectionId}-title`} className="text-xs font-black text-primary uppercase tracking-[0.25em] font-mono">
            {title}
          </h3>
          <div className="h-px flex-1 bg-primary/10" />
        </div>
        {description && (
          <p className="text-[9px] text-primary/40 font-mono uppercase tracking-widest mt-2 ml-6" id={`${sectionId}-description`}>
            {description}
          </p>
        )}
      </div>
      <div className="space-y-6 ml-0 md:ml-6" role="group" aria-labelledby={`${sectionId}-title`}>
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
        'grid gap-8',
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

export { ValidationErrorSummary } from './ValidationDisplay';
