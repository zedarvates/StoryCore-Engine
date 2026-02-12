import { render } from '@testing-library/react';
import { PromptAnalysisPanel } from './PromptAnalysisPanel';

// Mock heavy dependencies
jest.mock('../contexts/ProjectContext', () => ({
  useProject: () => ({
    project: null,
    updateShot: jest.fn(),
    selectShot: jest.fn(),
  }),
}));

describe('PromptAnalysisPanel', () => {
  it('renders without crashing', () => {
    const { container } = render(<PromptAnalysisPanel />);
    expect(container).toBeTruthy();
  });
});
