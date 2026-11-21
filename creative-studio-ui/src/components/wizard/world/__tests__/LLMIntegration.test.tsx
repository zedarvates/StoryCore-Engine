import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useWizard } from '@/contexts/WizardContext';
import type { UseLLMGenerationOptions } from '@/hooks/useLLMGeneration';
import type { LLMRequest, LLMResponse } from '@/services/llmService';
import { WizardProvider } from '@/contexts/WizardContext';
import type { World } from '@/types/world';
import { Step2OntologicalGovernance } from '../Step2OntologicalGovernance';
import { Step3TopographicCartography } from '../Step3TopographicCartography';
import { Step5SocietalMatrix } from '../Step5SocietalMatrix';

const generateResponse = vi.fn<(request: LLMRequest) => Promise<LLMResponse>>();

vi.mock('@/hooks/useLLMGeneration', () => ({
  useLLMGeneration: ({ onSuccess }: UseLLMGenerationOptions) => ({
    isLoading: false,
    error: null,
    clearError: vi.fn(),
    generate: async (request: LLMRequest) => {
      const response = await generateResponse(request);
      onSuccess?.(response);
      return response;
    },
  }),
}));

vi.mock('@/components/ui/service-warning', () => ({
  useServiceStatus: () => ({ llmConfigured: true, llmChecking: false }),
  ServiceWarning: () => null,
}));

const world: Partial<World> = {
  name: 'Eldoria',
  genre: ['fantasy'],
  timePeriod: 'Age of the Ferry',
  tone: ['epic'],
};

function WorldSnapshot() {
  const { formData } = useWizard<World>();
  return <output aria-label="World data">{JSON.stringify(formData)}</output>;
}

function renderStep(component: React.ReactNode, overrides: Partial<World> = {}) {
  render(
    <WizardProvider<World>
      wizardType="world"
      totalSteps={5}
      onSubmit={async () => {}}
      initialData={{ ...world, ...overrides }}
      autoSave={false}
    >
      {component}
      <WorldSnapshot />
    </WizardProvider>,
  );
}

function expectWorld(update: Partial<World>) {
  return waitFor(() => {
    const output = screen.getByLabelText('World data');
    expect(JSON.parse(output.textContent ?? '{}')).toMatchObject(update);
  });
}

describe('World wizard generation', () => {
  beforeEach(() => generateResponse.mockReset());

  it('preserves manually entered rules while appending generated protocols', async () => {
    generateResponse.mockResolvedValue({
      content: JSON.stringify([{ category: 'magical', rule: 'Light requires salt', implications: 'Ports regulate salt.' }]),
    });
    renderStep(<Step2OntologicalGovernance />, {
      rules: [{ id: 'manual', category: 'physical', rule: 'Ebb at noon', implications: 'Ferries leave early.' }],
    });

    fireEvent.click(screen.getByRole('button', { name: 'Initialize Protocols' }));

    expect(generateResponse).toHaveBeenCalledWith(expect.objectContaining({ prompt: expect.stringContaining('fantasy') }));
    await expectWorld({
      rules: [
        { id: 'manual', category: 'physical', rule: 'Ebb at noon', implications: 'Ferries leave early.' },
        { id: expect.any(String), category: 'magical', rule: 'Light requires salt', implications: 'Ports regulate salt.' },
      ],
    });
  });

  it('uses the world name and saves generated locations with their significance', async () => {
    const location = { name: 'Ferry Pier', description: 'Stone docks', significance: 'The crossing', atmosphere: 'Salt haze' };
    generateResponse.mockResolvedValue({ content: JSON.stringify([location]) });
    renderStep(<Step3TopographicCartography />);

    fireEvent.click(screen.getByRole('button', { name: 'Synthesize Terrain' }));

    expect(generateResponse).toHaveBeenCalledWith(expect.objectContaining({ prompt: expect.stringContaining('Eldoria') }));
    await expectWorld({ locations: [{ id: expect.any(String), ...location }] });
  });

  it('appends generated culture and includes the world setting in the request', async () => {
    const generated = {
      languages: ['Common Tongue'],
      religions: ['Keeper of the Gates'],
      traditions: ['Annual crossing'],
      historicalEvents: ['Long winter'],
      culturalConflicts: ['Guild rivalry'],
    };
    generateResponse.mockResolvedValue({ content: JSON.stringify(generated) });
    renderStep(<Step5SocietalMatrix />, {
      culturalElements: { languages: ['Pier Cant'], religions: [], traditions: [], historicalEvents: [], culturalConflicts: [] },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Synthesize Culture' }));

    expect(generateResponse).toHaveBeenCalledWith(expect.objectContaining({ prompt: expect.stringContaining('Age of the Ferry') }));
    await expectWorld({ culturalElements: { ...generated, languages: ['Pier Cant', 'Common Tongue'] } });
  });
});
