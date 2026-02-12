import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MenuBar } from '../MenuBar';

// Mock heavy dependencies
vi.mock('../../utils/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));
vi.mock('../../utils/iconMapper', () => ({
  getIconElement: () => null,
}));
vi.mock('../../config/menuBarConfig', () => ({
  menuBarConfig: [
    {
      id: 'file',
      label: 'menu.file',
      items: [
        { id: 'new', label: 'menu.new', type: 'button', action: vi.fn(), enabled: true, visible: true },
      ],
    },
    // Minimal config for other menus to satisfy rendering
    { id: 'edit', label: 'menu.edit', items: [] },
    { id: 'view', label: 'menu.view', items: [] },
    { id: 'project', label: 'menu.project', items: [] },
    { id: 'tools', label: 'menu.tools', items: [] },
    { id: 'help', label: 'menu.help', items: [] },
  ],
}));

vi.mock('../../contexts/NavigationContext', () => ({
  useNavigation: () => ({ navigateToDashboard: vi.fn(), canNavigateBack: false }),
}));

vi.mock('../../services/projectExportService', () => ({
  projectExportService: {},
}));

const defaultProps = {
  project: null,
  hasUnsavedChanges: false,
  onProjectChange: vi.fn(),
  onViewStateChange: vi.fn(),
  viewState: {},
  undoStack: [],
  clipboard: {},
  isProcessing: false,
  className: '',
};

describe('MenuBar UI component', () => {
  it('renders without crashing', () => {
    render(<MenuBar {...defaultProps} />);
    // The nav element has aria-label "Main menu"
    const nav = screen.getByLabelText('Main menu');
    expect(nav).toBeInTheDocument();
  });

  it('displays a menu button (File) and opens the dropdown on click', async () => {
    render(<MenuBar {...defaultProps} />);
    const fileButton = screen.getByText('menu.file');
    expect(fileButton).toBeInTheDocument();
    // Click to open the menu
    fireEvent.click(fileButton);
    // After opening, the submenu items should be rendered
    const newItem = await screen.findByText('menu.new');
    expect(newItem).toBeInTheDocument();
  });
});
