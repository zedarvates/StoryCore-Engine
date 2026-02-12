import React from 'react';
import { render, screen } from '@testing-library/react';
import SequencePlanManager from './SequencePlanManager';

test('renders SequencePlanManager without crashing', () => {
  render(<SequencePlanManager />);
  const element = screen.getByTestId('sequence-plan-manager');
  expect(element).toBeInTheDocument();
});
