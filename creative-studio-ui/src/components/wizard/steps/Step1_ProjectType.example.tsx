/**
 * Example usage of Step1_ProjectType component with wizard store
 * This demonstrates how the component integrates with the wizard workflow
 */

import { Step1_ProjectType } from './Step1_ProjectType';
import { useWizardStore } from '@/stores/wizard/wizardStore';

export function Step1Example() {
  const projectType = useWizardStore((state) => state.projectType);
  const updateStepData = useWizardStore((state) => state.updateStepData);
  const validationErrors = useWizardStore((state) => state.validationErrors);

  // Get errors for step 1
  const stepErrors = validationErrors.get(1) || [];
  const errorMap = stepErrors.reduce((acc, error) => {
    acc[error.field] = error.message;
    return acc;
  }, {} as Record<string, string>);

  return (
    <Step1_ProjectType
      data={projectType}
      onUpdate={(data) => updateStepData(1, data)}
      errors={errorMap}
    />
  );
}
