import { vi } from 'vitest';
import { render } from '@testing-library/react';
import { MenuBar } from './MenuBar';

// Mock heavy dependencies
vi.mock('../../config/menuBarConfig', () => ({
  menuBarConfig: [],
}));
vi.mock('../../utils/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));


describe('MenuBar', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <MenuBar
        project={null}
        hasUnsavedChanges={false}
        onProjectChange={() => {}}
        onViewStateChange={() => {}}
        viewState={{}}
        undoStack={{}}
        clipboard={{}}
      />
    );
    expect(container).toBeTruthy();
  });
});
