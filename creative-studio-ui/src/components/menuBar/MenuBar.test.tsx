import { vi } from 'vitest';
import { render } from '@testing-library/react';
import { DEFAULT_VIEW_STATE } from '@/types/menuBarState';
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
        selectedShotId={null}
        hasUnsavedChanges={false}
        onProjectChange={() => {}}
        onViewStateChange={() => {}}
        viewState={DEFAULT_VIEW_STATE}
        undoStack={{ canUndo: false, canRedo: false, undo: vi.fn(), redo: vi.fn() }}
        clipboard={{ hasContent: false, contentType: null, cut: vi.fn(), copy: vi.fn(), paste: vi.fn() }}
      />
    );
    expect(container).toBeTruthy();
  });
});
