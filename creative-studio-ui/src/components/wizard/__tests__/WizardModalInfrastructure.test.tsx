import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAppStore } from '@/stores/useAppStore';
import type { SequencePlanWizardContext, ShotWizardContext } from '@/types/wizard';

// ============================================================================
// Type Tests - Verify Context Types
// ============================================================================

describe('Wizard Context Types', () => {
  describe('SequencePlanWizardContext', () => {
    it('should allow create mode context', () => {
      const context: SequencePlanWizardContext = {
        mode: 'create',
        initialTemplateId: 'template-1',
        sourceLocation: 'dashboard',
      };
      
      expect(context.mode).toBe('create');
      expect(context.initialTemplateId).toBe('template-1');
      expect(context.sourceLocation).toBe('dashboard');
    });

    it('should allow edit mode context', () => {
      const context: SequencePlanWizardContext = {
        mode: 'edit',
        sequenceId: 'seq-123',
        existingSequencePlan: { id: 'plan-1', name: 'My Plan' },
      };
      
      expect(context.mode).toBe('edit');
      expect(context.sequenceId).toBe('seq-123');
      expect(context.existingSequencePlan).toEqual({ id: 'plan-1', name: 'My Plan' });
    });

    it('should allow minimal create mode context', () => {
      const context: SequencePlanWizardContext = {
        mode: 'create',
      };
      
      expect(context.mode).toBe('create');
      expect(context.sequenceId).toBeUndefined();
      expect(context.initialTemplateId).toBeUndefined();
    });
  });

  describe('ShotWizardContext', () => {
    it('should allow create mode context with all props', () => {
      const context: ShotWizardContext = {
        mode: 'create',
        sequenceId: 'seq-1',
        sceneId: 'scene-1',
        shotNumber: 5,
        initialTemplateId: 'template-1',
        quickMode: true,
        sourceLocation: 'timeline',
        timelinePosition: 120.5,
      };
      
      expect(context.mode).toBe('create');
      expect(context.sequenceId).toBe('seq-1');
      expect(context.sceneId).toBe('scene-1');
      expect(context.shotNumber).toBe(5);
      expect(context.quickMode).toBe(true);
    });

    it('should allow edit mode context', () => {
      const context: ShotWizardContext = {
        mode: 'edit',
        shotId: 'shot-123',
        existingShot: { id: 'shot-1', number: 3 },
      };
      
      expect(context.mode).toBe('edit');
      expect(context.shotId).toBe('shot-123');
      expect(context.existingShot).toEqual({ id: 'shot-1', number: 3 });
    });

    it('should allow quick mode context', () => {
      const context: ShotWizardContext = {
        mode: 'create',
        quickMode: true,
      };
      
      expect(context.mode).toBe('create');
      expect(context.quickMode).toBe(true);
    });
  });
});

// ============================================================================
// Store Integration Tests
// ============================================================================

describe('Wizard Store Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('SequencePlanWizard Store Actions', () => {
    it('should have openSequencePlanWizard action', () => {
      const store = useAppStore.getState();
      
      expect(typeof store.openSequencePlanWizard).toBe('function');
      expect(typeof store.closeSequencePlanWizard).toBe('function');
    });

    it('should have showSequencePlanWizard state', () => {
      const showWizard = useAppStore.getState().showSequencePlanWizard;
      const context = useAppStore.getState().sequencePlanWizardContext;
      
      expect(typeof showWizard).toBe('boolean');
      expect(context).toBeDefined();
    });
  });

  describe('ShotWizard Store Actions', () => {
    it('should have openShotWizard action', () => {
      const store = useAppStore.getState();
      
      expect(typeof store.openShotWizard).toBe('function');
      expect(typeof store.closeShotWizard).toBe('function');
    });

    it('should have showShotWizard state', () => {
      const showWizard = useAppStore.getState().showShotWizard;
      const context = useAppStore.getState().shotWizardContext;
      
      expect(typeof showWizard).toBe('boolean');
      expect(context).toBeDefined();
    });
  });

  describe('Store Action Behavior', () => {
    it('openSequencePlanWizard should update state', () => {
      const { openSequencePlanWizard } = useAppStore.getState();
      
      openSequencePlanWizard({ mode: 'create', initialTemplateId: 'test-template' });
      
      expect(useAppStore.getState().showSequencePlanWizard).toBe(true);
      expect(useAppStore.getState().sequencePlanWizardContext?.mode).toBe('create');
      expect(useAppStore.getState().sequencePlanWizardContext?.initialTemplateId).toBe('test-template');
    });

    it('closeSequencePlanWizard should update state', () => {
      const { closeSequencePlanWizard } = useAppStore.getState();
      
      useAppStore.setState({ showSequencePlanWizard: true });
      closeSequencePlanWizard();
      
      expect(useAppStore.getState().showSequencePlanWizard).toBe(false);
      expect(useAppStore.getState().sequencePlanWizardContext).toBeNull();
    });

    it('openShotWizard should update state with all context props', () => {
      const { openShotWizard } = useAppStore.getState();
      
      const context: ShotWizardContext = {
        mode: 'create',
        sequenceId: 'seq-1',
        sceneId: 'scene-1',
        shotNumber: 5,
        quickMode: true,
      };
      
      openShotWizard(context);
      
      expect(useAppStore.getState().showShotWizard).toBe(true);
      expect(useAppStore.getState().shotWizardContext).toEqual(context);
    });

    it('closeShotWizard should update state', () => {
      const { closeShotWizard } = useAppStore.getState();
      
      useAppStore.setState({ showShotWizard: true, shotWizardContext: { mode: 'create' } });
      closeShotWizard();
      
      expect(useAppStore.getState().showShotWizard).toBe(false);
      expect(useAppStore.getState().shotWizardContext).toBeNull();
    });

    it('openSequencePlanWizard with edit mode should set existingSequencePlan', () => {
      const { openSequencePlanWizard } = useAppStore.getState();
      
      const existingPlan = { id: 'plan-1', name: 'My Plan', description: 'Test' };
      openSequencePlanWizard({ mode: 'edit', sequenceId: 'seq-1', existingSequencePlan: existingPlan });
      
      expect(useAppStore.getState().sequencePlanWizardContext?.mode).toBe('edit');
      expect(useAppStore.getState().sequencePlanWizardContext?.existingSequencePlan).toEqual(existingPlan);
    });

    it('openShotWizard with edit mode should set existingShot', () => {
      const { openShotWizard } = useAppStore.getState();
      
      const existingShot = { id: 'shot-1', number: 3, type: 'wide' };
      openShotWizard({ mode: 'edit', shotId: 'shot-1', existingShot });
      
      expect(useAppStore.getState().shotWizardContext?.mode).toBe('edit');
      expect(useAppStore.getState().shotWizardContext?.existingShot).toEqual(existingShot);
    });

    it('default context should be create mode', () => {
      const { openSequencePlanWizard, openShotWizard } = useAppStore.getState();
      
      openSequencePlanWizard();
      expect(useAppStore.getState().sequencePlanWizardContext?.mode).toBe('create');
      
      openShotWizard();
      expect(useAppStore.getState().shotWizardContext?.mode).toBe('create');
    });
  });
});
