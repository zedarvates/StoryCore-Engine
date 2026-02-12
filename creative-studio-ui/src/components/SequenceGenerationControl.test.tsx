import React from 'react';
import { render, screen } from '@testing-library/react';
import SequenceGenerationControl from './SequenceGenerationControl';

test('renders SequenceGenerationControl without crashing', () => {
  render(<SequenceGenerationControl />);
  const element = screen.getByTestId('sequence-generation-control');
  expect(element).toBeInTheDocument();
});
