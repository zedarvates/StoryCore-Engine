/**
 * Test Suite: Production Wizard Components
 * Tests all UI components for Production Wizards
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  ProductionWizardContainer,
  ProductionWizardNavigation,
  ProductionWizardStepIndicator,
  ProductionWizardErrorBoundary,
  ValidationDisplay,
  FieldValidation,
  LoadingState,
  InlineLoading,
  ButtonLoading,
} from '../index';
import { WizardStep } from '@/types';

// Mock console methods
const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

// ============================================================================
// ProductionWizardContainer Tests
// ============================================================================

describe('ProductionWizardContainer', () => {
  const mockSteps: WizardStep[] = [
    { number: 1, title: 'Step 1', description: 'First step' },
    { number: 2, title: 'Step 2', description: 'Second step' },
    { number: 3, title: 'Step 3', description: 'Final step' },
  ];

  it('should render with title and children', () => {
    render(
      <ProductionWizardContainer
        title="Test Wizard"
        steps={mockSteps}
        onCancel={vi.fn()}
      >
        <div>Wizard Content</div>
      </ProductionWizardContainer>
    );

    expect(screen.getByText('Test Wizard')).toBeInTheDocument();
    expect(screen.getByText('Wizard Content')).toBeInTheDocument();
  });

  it('should render step indicator', () => {
    render(
      <ProductionWizardContainer
        title="Test Wizard"
        steps={mockSteps}
        onCancel={vi.fn()}
      >
        <div>Content</div>
      </ProductionWizardContainer>
    );

    expect(screen.getByText('Step 1')).toBeInTheDocument();
    expect(screen.getByText('Step 2')).toBeInTheDocument();
    expect(screen.getByText('Step 3')).toBeInTheDocument();
  });

  it('should call onCancel when cancel button is clicked', async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();

    render(
      <ProductionWizardContainer
        title="Test Wizard"
        steps={mockSteps}
        onCancel={onCancel}
      >
        <div>Content</div>
      </ProductionWizardContainer>
    );

    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});

// ============================================================================
// ProductionWizardNavigation Tests
// ============================================================================

describe('ProductionWizardNavigation', () => {
  it('should render navigation buttons', () => {
    const onPrevious = vi.fn();
    const onNext = vi.fn();
    const onCancel = vi.fn();

    render(
      <ProductionWizardNavigation
        currentStep={1}
        totalSteps={3}
        onPrevious={onPrevious}
        onNext={onNext}
        onCancel={onCancel}
      />
    );

    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument();
  });

  it('should show step progress', () => {
    render(
      <ProductionWizardNavigation
        currentStep={2}
        totalSteps={5}
        onPrevious={vi.fn()}
        onNext={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByText('Step 3 of 5')).toBeInTheDocument();
  });

  it('should call onNext when continue button is clicked', async () => {
    const onNext = vi.fn();
    const user = userEvent.setup();

    render(
      <ProductionWizardNavigation
        currentStep={1}
        totalSteps={3}
        onPrevious={vi.fn()}
        onNext={onNext}
        onCancel={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: /continue/i }));
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('should disable previous button on first step', () => {
    render(
      <ProductionWizardNavigation
        currentStep={0}
        totalSteps={3}
        onPrevious={vi.fn()}
        onNext={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    const previousButton = screen.getByRole('button', { name: /back/i });
    expect(previousButton).toBeDisabled();
  });

  it('should show complete button on last step', () => {
    render(
      <ProductionWizardNavigation
        currentStep={2}
        totalSteps={3}
        onPrevious={vi.fn()}
        onNext={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: /complete/i })).toBeInTheDocument();
  });
});

// ============================================================================
// ProductionWizardStepIndicator Tests
// ============================================================================

describe('ProductionWizardStepIndicator', () => {
  const mockSteps: WizardStep[] = [
    { number: 1, title: 'Step 1' },
    { number: 2, title: 'Step 2' },
    { number: 3, title: 'Step 3' },
  ];

  it('should render step indicators', () => {
    render(
      <ProductionWizardStepIndicator
        steps={mockSteps}
        currentStep={1}
      />
    );

    expect(screen.getByText('Step 1')).toBeInTheDocument();
    expect(screen.getByText('Step 2')).toBeInTheDocument();
    expect(screen.getByText('Step 3')).toBeInTheDocument();
  });

  it('should highlight current step', () => {
    render(
      <ProductionWizardStepIndicator
        steps={mockSteps}
        currentStep={1}
      />
    );

    const currentStepIndicator = screen.getByRole('tab', { name: /step 2.*current/i });
    expect(currentStepIndicator).toBeInTheDocument();
  });

  it('should allow step clicking when allowJumpToStep is true', async () => {
    const onStepClick = vi.fn();
    const user = userEvent.setup();

    render(
      <ProductionWizardStepIndicator
        steps={mockSteps}
        currentStep={0}
        onStepClick={onStepClick}
        allowJumpToStep={true}
      />
    );

    const stepButton = screen.getByRole('button', { name: /step 1/i });
    await user.click(stepButton);

    expect(onStepClick).toHaveBeenCalledWith(0);
  });
});

// ============================================================================
// ValidationDisplay Tests
// ============================================================================

describe('ValidationDisplay', () => {
  it('should render validation errors', () => {
    const errors = {
      name: 'Name is required',
      email: 'Invalid email format',
    };

    render(<ValidationDisplay errors={errors} />);

    expect(screen.getByText('Name is required')).toBeInTheDocument();
    expect(screen.getByText('Invalid email format')).toBeInTheDocument();
  });

  it('should not render when no errors', () => {
    const { container } = render(<ValidationDisplay errors={{}} />);
    expect(container.firstChild).toBeNull();
  });
});

describe('FieldValidation', () => {
  it('should render error message', () => {
    render(<FieldValidation error="This field is required" />);

    expect(screen.getByText('This field is required')).toBeInTheDocument();
  });

  it('should render warning message', () => {
    render(<FieldValidation warning="This might cause issues" />);

    expect(screen.getByText('This might cause issues')).toBeInTheDocument();
  });

  it('should not render when no error or warning', () => {
    const { container } = render(<FieldValidation />);
    expect(container.firstChild).toBeNull();
  });
});

// ============================================================================
// LoadingState Tests
// ============================================================================

describe('LoadingState', () => {
  it('should render loading message', () => {
    render(<LoadingState message="Processing..." />);

    expect(screen.getByText('Processing...')).toBeInTheDocument();
  });

  it('should show progress bar when showProgress is true', () => {
    render(<LoadingState showProgress={true} progress={75} />);

    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toBeInTheDocument();
    expect(progressBar).toHaveAttribute('aria-valuenow', '75');
  });
});

describe('InlineLoading', () => {
  it('should render inline loading indicator', () => {
    render(<InlineLoading message="Saving..." />);

    expect(screen.getByText('Saving...')).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});

describe('ButtonLoading', () => {
  it('should show loading state', () => {
    render(
      <ButtonLoading isLoading={true} loadingText="Saving...">
        <span>Save</span>
      </ButtonLoading>
    );

    expect(screen.getByText('Saving...')).toBeInTheDocument();
    expect(screen.queryByText('Save')).not.toBeInTheDocument();
  });

  it('should show children when not loading', () => {
    render(
      <ButtonLoading isLoading={false}>
        <span>Save</span>
      </ButtonLoading>
    );

    expect(screen.getByText('Save')).toBeInTheDocument();
  });
});

// ============================================================================
// ProductionWizardErrorBoundary Tests
// ============================================================================

describe('ProductionWizardErrorBoundary', () => {
  const ErrorComponent = () => {
    throw new Error('Test error');
  };

  it('should render error UI when error occurs', () => {
    render(
      <ProductionWizardErrorBoundary>
        <ErrorComponent />
      </ProductionWizardErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('should render children when no error', () => {
    render(
      <ProductionWizardErrorBoundary>
        <div>No error here</div>
      </ProductionWizardErrorBoundary>
    );

    expect(screen.getByText('No error here')).toBeInTheDocument();
  });
});
