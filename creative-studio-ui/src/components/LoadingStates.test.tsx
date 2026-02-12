import React from 'react';
import { render, screen } from '@testing-library/react';
import LoadingStates from './LoadingStates';

test('renders LoadingStates without crashing', () => {
  render(<LoadingStates />);
  const container = screen.getByTestId('loading-states');
  expect(container).toBeInTheDocument();
});
