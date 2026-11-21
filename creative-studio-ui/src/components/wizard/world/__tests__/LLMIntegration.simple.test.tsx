import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { WizardProvider } from '@/contexts/WizardContext';
import type { World } from '@/types/world';
import { Step2OntologicalGovernance } from '../Step2OntologicalGovernance';
import { Step3TopographicCartography } from '../Step3TopographicCartography';
import { Step5SocietalMatrix } from '../Step5SocietalMatrix';

const providerSettings = vi.hoisted(() => ({ llmConfigured: true, llmChecking: false }));
vi.mock('@/components/ui/service-warning', () => ({
  useServiceStatus: () => providerSettings,
  ServiceWarning: () => null,
}));
vi.mock('@/hooks/useLLMGeneration', () => ({
  useLLMGeneration: () => ({ isLoading: false, error: null, clearError: vi.fn(), generate: vi.fn() }),
}));

function renderStep(component: React.ReactNode, initialData: Partial<World>) {
  render(
    <WizardProvider<World> wizardType="world" totalSteps={5} onSubmit={async () => {}} initialData={initialData} autoSave={false}>
      {component}
    </WizardProvider>,
  );
}

describe('World wizard generation availability', () => {
  const steps = [
    { label: 'Initialize Protocols', Step: Step2OntologicalGovernance },
    { label: 'Synthesize Terrain', Step: Step3TopographicCartography },
    { label: 'Synthesize Culture', Step: Step5SocietalMatrix },
  ];
  it.each(steps)('disables $label until the world context is available', ({ label, Step }) => {
    providerSettings.llmConfigured = true;
    renderStep(<Step />, {});
    expect(screen.getByRole('button', { name: label })).toBeDisabled();
  });

  it.each(steps)('enables $label when the world and provider are configured', ({ label, Step }) => {
    providerSettings.llmConfigured = true;
    renderStep(<Step />, { name: 'Eldoria', genre: ['fantasy'] });
    expect(screen.getByRole('button', { name: label })).toBeEnabled();
  });

  it.each(steps)('disables $label when a provider has yet to be configured', ({ label, Step }) => {
    providerSettings.llmConfigured = false;
    renderStep(<Step />, { name: 'Eldoria', genre: ['fantasy'] });
    expect(screen.getByRole('button', { name: label })).toBeDisabled();
  });
});
