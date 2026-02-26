import { RogerWizardModal as RogerWizardModalComponent } from './RogerWizardModal';
import { useAppStore } from '@/stores/useAppStore';
import { WIZARD_DEFINITIONS } from '@/data/wizardDefinitions';

export function RogerWizardModal() {
  const showRogerWizard = useAppStore((state) => state.showRogerWizard);
  const setShowRogerWizard = useAppStore((state) => state.setShowRogerWizard);

  if (!showRogerWizard) return null;

  const rogerWizard = WIZARD_DEFINITIONS.find(w => w.id === 'roger-wizard');

  if (!rogerWizard) return null;

  return (
    <RogerWizardModalComponent
      isOpen={showRogerWizard}
      wizard={rogerWizard}
      onClose={() => setShowRogerWizard(false)}
    />
  );
}
