/**
 * Wizard Components - Exports
 */

// Sequence Plan Wizard Modal
export { SequencePlanWizardModal } from './SequencePlanWizardModal';

// Shot Wizard Modal
export { ShotWizardModal } from './ShotWizardModal';

// Re-export common wizard types
export type { WizardStep } from '@/types/wizard';

export { DialogueWriterWizard } from './DialogueWriterWizard';
export { DialogueWriterWizardModal } from './DialogueWriterWizardModal';

// ============================================================================
// Production Wizards - Les 5 wizards demandés
// ============================================================================

// Shot Planning Wizard
export { ShotWizardModal as ShotPlanningWizardModal } from './ShotWizardModal';
export { ShotWizard } from './shot/ShotWizard';

// Audio Production Wizard
export { AudioProductionWizard } from './production/AudioProductionWizard';
export { AudioProductionWizardModal } from './production/AudioProductionWizardModal';

// Video Editor Wizard
export { VideoEditorWizard } from './production/VideoEditorWizard';

// Marketing Wizard
export { MarketingWizard } from './marketing/MarketingWizard';

// Comic-to-Sequence Wizard
export { ComicToSequenceWizard } from './production/ComicToSequenceWizard';

