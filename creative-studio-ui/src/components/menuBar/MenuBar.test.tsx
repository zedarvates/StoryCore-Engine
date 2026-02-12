import { render } from '@testing-library/react';
import { MenuBar } from './MenuBar';

// Mock heavy dependencies
jest.mock('../../config/menuBarConfig', () => ({
  menuBarConfig: [],
}));
jest.mock('../../utils/i18n', () => ({
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
