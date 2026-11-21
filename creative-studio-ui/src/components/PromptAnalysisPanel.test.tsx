import { vi } from 'vitest';
import { render } from '@testing-library/react';
import { PromptAnalysisPanel } from './PromptAnalysisPanel';

// Mock heavy dependencies
vi.mock('../contexts/ProjectContext', () => ({
  useProject: () => ({
    project: null,
    updateShot: vi.fn(),
    selectShot: vi.fn(),
  }),
}));

describe('PromptAnalysisPanel', () => {
  it('renders without crashing', () => {
    const { container } = render(<PromptAnalysisPanel />);
    expect(container).toBeTruthy();
  });
});
