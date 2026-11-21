import { render, screen } from '@testing-library/react';
import { LoadingOverlay, ProgressBar } from './LoadingStates';

test('shows the current loading operation', () => {
  render(<LoadingOverlay message="Loading project" />);
  expect(screen.getByText('Loading project')).toBeInTheDocument();
});

test('clamps displayed progress to 100 percent', () => {
  render(<ProgressBar progress={120} label="Rendering" />);
  expect(screen.getByText('Rendering')).toBeInTheDocument();
  expect(screen.getByText('100%')).toBeInTheDocument();
});
