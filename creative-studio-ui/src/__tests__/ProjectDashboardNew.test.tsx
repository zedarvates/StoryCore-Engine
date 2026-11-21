import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DndProvider } from '@/components/DndProvider';
import { ProjectDashboardNew } from '@/components/workspace/ProjectDashboardNew';
import { createShotFixture } from '@/__tests__/helpers/shotFactory';
import { useStore } from '@/store';
import { useAppStore } from '@/stores/useAppStore';

vi.mock('@/components/workspace/StoryboardSection', () => ({ StoryboardSection: () => null }));
vi.mock('@/components/workspace/ProductionGuide', () => ({ ProductionGuide: () => null }));
vi.mock('@/components/workspace/NeuralProductionAssistant', () => ({ NeuralProductionAssistant: () => null }));
vi.mock('@/components/LLMAssistantSidebar', () => ({ LLMAssistantSidebar: () => null }));

describe('ProjectDashboardNew', () => {
  let previousAppState: ReturnType<typeof useAppStore.getState>;
  let previousSequencePlans: ReturnType<typeof useStore.getState>['sequencePlans'];

  beforeEach(() => {
    previousAppState = useAppStore.getState();
    previousSequencePlans = useStore.getState().sequencePlans;
    useAppStore.setState({ project: null, shots: [], showSequencePlanWizard: false, sequencePlanWizardContext: null });
    useStore.setState({ sequencePlans: [] });
  });

  afterEach(() => {
    useAppStore.setState(previousAppState);
    useStore.setState({ sequencePlans: previousSequencePlans });
  });

  it('shows a waiting state when no sequences are available', () => {
    render(<ProjectDashboardNew onOpenEditor={vi.fn()} />, { wrapper: DndProvider });
    expect(screen.getByText(/waiting for sequences/i)).toBeInTheDocument();
  });

  it('groups storyboard shots by sequence and opens the chosen sequence', async () => {
    const openEditor = vi.fn();
    useAppStore.setState({
      shots: [
        createShotFixture({ id: 'shot-1', sequence_id: 'seq-1', duration: 5, description: 'A sunset over the ocean' }),
        createShotFixture({ id: 'shot-2', sequence_id: 'seq-1', duration: 3 }),
        createShotFixture({ id: 'shot-3', sequence_id: 'seq-2', description: 'A ship arrives' }),
      ],
    });

    render(<ProjectDashboardNew onOpenEditor={openEditor} />, { wrapper: DndProvider });
    expect(await screen.findByRole('heading', { name: 'Sequence 1' })).toBeInTheDocument();
    expect(screen.getByText('A sunset over the ocean')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('heading', { name: 'Sequence 2' }));
    expect(openEditor).toHaveBeenCalledExactlyOnceWith('seq-2');
  });

  it('starts a new sequence plan from the first sequence in the dashboard', () => {
    useAppStore.setState({
      shots: [createShotFixture({ id: 'shot-1', sequence_id: 'seq-1' })],
    });
    render(<ProjectDashboardNew onOpenEditor={vi.fn()} />, { wrapper: DndProvider });

    fireEvent.click(screen.getByTitle('Create a new sequence plan'));

    expect(useAppStore.getState()).toMatchObject({
      showSequencePlanWizard: true,
      sequencePlanWizardContext: { mode: 'create', sequenceId: 'seq-1' },
    });
  });
});
