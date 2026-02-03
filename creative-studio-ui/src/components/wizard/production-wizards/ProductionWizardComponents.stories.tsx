/**
 * Storybook stories for Production Wizard Components
 */

import type { Meta, StoryObj } from '@storybook/react';
import {
  ProductionWizardContainer,
  ProductionWizardNavigation,
  ProductionWizardStepIndicator,
  ValidationDisplay,
  FieldValidation,
  LoadingState,
  InlineLoading,
  ButtonLoading,
} from './index';
import { WizardStep } from '@/types';

// ============================================================================
// ProductionWizardContainer Stories
// ============================================================================

const meta: Meta = {
  title: 'Production Wizards/Components',
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

// Sample steps for stories
const sampleSteps: WizardStep[] = [
  { number: 1, title: 'Template Selection', description: 'Choose your sequence template' },
  { number: 2, title: 'Basic Information', description: 'Set up sequence details' },
  { number: 3, title: 'Narrative Structure', description: 'Define acts and scenes' },
  { number: 4, title: 'Scene Planning', description: 'Add detailed scenes' },
  { number: 5, title: 'Shot Overview', description: 'Review planned shots' },
  { number: 6, title: 'Review & Finalize', description: 'Complete your sequence plan' },
];

export const Container: StoryObj = {
  render: () => (
    <ProductionWizardContainer
      title="Sequence Plan Wizard"
      steps={sampleSteps}
      onCancel={() => console.log('Container cancelled')}
    >
      <div className="space-y-6">
        <h2 className="text-xl font-semibold">Wizard Step Content</h2>
        <p className="text-gray-600">
          This is where the current step content would be rendered.
        </p>
        <div className="bg-gray-100 p-4 rounded-lg">
          <p>Sample form fields and content go here...</p>
        </div>
      </div>
    </ProductionWizardContainer>
  ),
};

export const Navigation: StoryObj = {
  render: () => (
    <div className="p-6 bg-gray-50">
      <ProductionWizardNavigation
        currentStep={2}
        totalSteps={6}
        onPrevious={() => console.log('Previous')}
        onNext={() => console.log('Next')}
        onCancel={() => console.log('Cancel')}
        canGoNext={true}
        canGoPrevious={true}
      />
    </div>
  ),
  parameters: {
    layout: 'padded',
  },
};

export const StepIndicator: StoryObj = {
  render: () => (
    <div className="p-6 bg-white">
      <ProductionWizardStepIndicator
        steps={sampleSteps.slice(0, 4)}
        currentStep={1}
        allowJumpToStep={true}
        onStepClick={(step) => console.log('Step clicked:', step)}
      />
    </div>
  ),
  parameters: {
    layout: 'padded',
  },
};

export const ErrorDisplay: StoryObj = {
  render: () => (
    <div className="p-6 space-y-4">
      <ValidationDisplay
        errors={{
          name: 'Sequence name is required',
          duration: 'Duration must be greater than 0',
          worldId: 'Please select a world',
        }}
      />

      <div className="space-y-2">
        <div>
          <label className="block text-sm font-medium mb-1">Valid Field</label>
          <input className="border rounded px-3 py-2 w-full" placeholder="Valid input" />
          <FieldValidation success={true} />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Field with Error</label>
          <input className="border border-red-300 rounded px-3 py-2 w-full" placeholder="Invalid input" />
          <FieldValidation error="This field contains an error" />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Field with Warning</label>
          <input className="border border-yellow-300 rounded px-3 py-2 w-full" placeholder="Warning input" />
          <FieldValidation warning="This field has a warning" />
        </div>
      </div>
    </div>
  ),
  parameters: {
    layout: 'padded',
  },
};

export const LoadingStates: StoryObj = {
  render: () => (
    <div className="space-y-8 p-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="text-center">
          <h3 className="font-medium mb-4">Full Page Loading</h3>
          <LoadingState message="Generating shots..." />
        </div>

        <div className="text-center">
          <h3 className="font-medium mb-4">With Progress</h3>
          <LoadingState
            message="Processing templates..."
            showProgress={true}
            progress={65}
          />
        </div>

        <div className="text-center">
          <h3 className="font-medium mb-4">Saving State</h3>
          <LoadingState
            message="Saving draft..."
            variant="saving"
          />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-medium">Inline Loading</h3>
        <InlineLoading message="Loading templates..." />

        <h3 className="font-medium">Button Loading</h3>
        <div className="flex gap-4">
          <ButtonLoading isLoading={false}>
            <span>Save Changes</span>
          </ButtonLoading>
          <ButtonLoading isLoading={true} loadingText="Saving...">
            <span>Save Changes</span>
          </ButtonLoading>
        </div>
      </div>
    </div>
  ),
  parameters: {
    layout: 'padded',
  },
};
