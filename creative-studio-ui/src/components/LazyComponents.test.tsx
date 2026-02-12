import React from 'react';
import { render, screen } from '@testing-library/react';
import LazyComponents from './LazyComponents';

// Mock any heavy child components if needed
jest.mock('@/components/SomeHeavyComponent', () => () => <div data-testid="SomeHeavyComponent" />);

it('renders LazyComponents without crashing', () => {
  render(<LazyComponents />);
  // Expect the container to be in the document
  const container = screen.getByTestId('lazy-components-container');
  expect(container).toBeInTheDocument();
});
