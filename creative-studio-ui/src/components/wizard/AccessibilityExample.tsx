/**
 * Accessibility Example Component
 * 
 * This file demonstrates how to use all the accessibility and UX enhancement
 * features implemented in task 9.
 * 
 * Features demonstrated:
 * 1. Keyboard navigation (Enter, Esc, Alt+Arrow keys)
 * 2. ARIA labels and screen reader support
 * 3. Validation error display (inline and summary)
 * 4. Loading states and progress indicators
 */

import React, { useState } from 'react';
import { WizardContainer } from './WizardContainer';
import { WizardFormLayout, FormField, FormSection, FormGrid } from './WizardFormLayout';
import { ValidationErrorSummary } from './ValidationDisplay';
import { LoadingOverlay, ProgressBar, IndeterminateProgress } from './LoadingStates';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { WizardProvider } from '@/contexts/WizardContext';

// ============================================================================
// Example Wizard Component
// ============================================================================

interface ExampleFormData {
  name: string;
  email: string;
  role: string;
  bio: string;
}

export function AccessibilityExampleWizard() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);

  const steps = [
    { number: 1, title: 'Basic Info', description: 'Name and email' },
    { number: 2, title: 'Details', description: 'Role and bio' },
    { number: 3, title: 'Review', description: 'Confirm details' },
  ];

  const handleSubmit = async (data: ExampleFormData) => {
    console.log('Submitting:', data);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
  };

  const handleValidateStep = async (step: number, data: Partial<ExampleFormData>) => {
    const errors: Record<string, string[]> = {};

    if (step === 1) {
      if (!data.name || data.name.trim().length === 0) {
        errors.name = ['Name is required'];
      }
      if (!data.email || !data.email.includes('@')) {
        errors.email = ['Please enter a valid email address'];
      }
    }

    if (step === 2) {
      if (!data.role) {
        errors.role = ['Please select a role'];
      }
      if (!data.bio || data.bio.length < 10) {
        errors.bio = ['Bio must be at least 10 characters long'];
      }
    }

    return errors;
  };

  const handleGenerateBio = async () => {
    setIsGenerating(true);
    setGenerationProgress(0);

    // Simulate LLM generation with progress
    const interval = setInterval(() => {
      setGenerationProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsGenerating(false);
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  return (
    <WizardProvider
      wizardType="character"
      totalSteps={3}
      onSubmit={handleSubmit}
      onValidateStep={handleValidateStep}
      autoSave={true}
    >
      <WizardContainer
        title="Accessibility Example Wizard"
        steps={steps}
        onCancel={() => console.log('Wizard cancelled')}
        onComplete={() => console.log('Wizard completed')}
        allowJumpToStep={true}
      >
        <ExampleWizardContent
          isGenerating={isGenerating}
          generationProgress={generationProgress}
          onGenerateBio={handleGenerateBio}
        />
      </WizardContainer>
    </WizardProvider>
  );
}

// ============================================================================
// Wizard Content Component
// ============================================================================

interface ExampleWizardContentProps {
  isGenerating: boolean;
  generationProgress: number;
  onGenerateBio: () => void;
}

function ExampleWizardContent({
  isGenerating,
  generationProgress,
  onGenerateBio,
}: ExampleWizardContentProps) {
  const { currentStep, formData, validationErrors, updateFormData } = useWizard<ExampleFormData>();

  // Step 1: Basic Information
  if (currentStep === 1) {
    return (
      <WizardFormLayout
        title="Basic Information"
        description="Enter your name and email address"
      >
        {/* Validation Error Summary */}
        <ValidationErrorSummary errors={validationErrors} />

        <FormSection title="Personal Details">
          <FormField
            label="Full Name"
            name="name"
            required
            error={validationErrors.name?.[0]}
            helpText="Enter your first and last name"
          >
            <Input
              value={formData.name || ''}
              onChange={(e) => updateFormData({ name: e.target.value })}
              placeholder="John Doe"
            />
          </FormField>

          <FormField
            label="Email Address"
            name="email"
            required
            error={validationErrors.email?.[0]}
            helpText="We'll never share your email"
          >
            <Input
              type="email"
              value={formData.email || ''}
              onChange={(e) => updateFormData({ email: e.target.value })}
              placeholder="john@example.com"
            />
          </FormField>
        </FormSection>
      </WizardFormLayout>
    );
  }

  // Step 2: Details
  if (currentStep === 2) {
    return (
      <WizardFormLayout
        title="Additional Details"
        description="Tell us about your role and background"
      >
        {/* Validation Error Summary */}
        <ValidationErrorSummary errors={validationErrors} />

        <FormSection title="Professional Information">
          <FormField
            label="Role"
            name="role"
            required
            error={validationErrors.role?.[0]}
            helpText="Select your primary role"
          >
            <Select
              value={formData.role || ''}
              onValueChange={(value) => updateFormData({ role: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="developer">Developer</SelectItem>
                <SelectItem value="designer">Designer</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </FormField>

          <FormField
            label="Bio"
            name="bio"
            required
            error={validationErrors.bio?.[0]}
            helpText="Write a brief bio (minimum 10 characters)"
          >
            <LoadingOverlay isLoading={isGenerating} message="Generating bio...">
              <Textarea
                value={formData.bio || ''}
                onChange={(e) => updateFormData({ bio: e.target.value })}
                placeholder="Tell us about yourself..."
                rows={4}
              />
            </LoadingOverlay>
          </FormField>

          {/* LLM Generation Example */}
          <div className="space-y-3">
            <Button
              type="button"
              onClick={onGenerateBio}
              disabled={isGenerating}
              variant="outline"
            >
              Generate Bio with AI
            </Button>

            {isGenerating && (
              <div className="space-y-2">
                <ProgressBar
                  value={generationProgress}
                  label="Generating..."
                  showPercentage
                />
                {generationProgress < 100 && (
                  <IndeterminateProgress label="Processing with LLM..." size="sm" />
                )}
              </div>
            )}
          </div>
        </FormSection>
      </WizardFormLayout>
    );
  }

  // Step 3: Review
  if (currentStep === 3) {
    return (
      <WizardFormLayout
        title="Review Your Information"
        description="Please review your details before submitting"
      >
        <FormSection title="Summary">
          <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <span className="font-semibold">Name:</span> {formData.name || 'Not provided'}
            </div>
            <div>
              <span className="font-semibold">Email:</span> {formData.email || 'Not provided'}
            </div>
            <div>
              <span className="font-semibold">Role:</span> {formData.role || 'Not provided'}
            </div>
            <div>
              <span className="font-semibold">Bio:</span> {formData.bio || 'Not provided'}
            </div>
          </div>
        </FormSection>
      </WizardFormLayout>
    );
  }

  return null;
}

// Import useWizard hook
import { useWizard } from '@/contexts/WizardContext';
