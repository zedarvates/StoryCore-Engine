import React from 'react';
import { render, screen } from '@testing-library/react';
import { SequencePlanManager } from './SequencePlanManager';

test('renders SequencePlanManager without crashing', () => {
  render(<SequencePlanManager plans={[]} currentPlanId={null} onSelectPlan={() => {}} onCreatePlan={() => {}} onDuplicatePlan={() => {}} onDeletePlan={() => {}} onExportPlan={() => {}} />);
  const element = screen.getByText('No sequence plans yet');
  expect(element).toBeInTheDocument();
});
