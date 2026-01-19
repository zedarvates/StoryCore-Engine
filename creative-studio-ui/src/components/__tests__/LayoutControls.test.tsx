import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LayoutControls } from '../LayoutControls';
import { usePanelVisibility } from '@/hooks/usePanelVisibility';

// Mock the hook
vi.mock('@/hooks/usePanelVisibility');

describe('LayoutControls', () => {
  const mockToggleChat = vi.fn();
  const mockToggleAssetLibrary = vi.fn();
  const mockResetPanelSizes = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (usePanelVisibility as any).mockReturnValue({
      showChat: false,
      toggleChat: mockToggleChat,
      toggleAssetLibrary: mockToggleAssetLibrary,
      resetPanelSizes: mockResetPanelSizes,
      isAssetLibraryVisible: true,
      panelSizes: {
        assetLibrary: 20,
        canvas: 50,
        propertiesOrChat: 30,
      },
    });
  });

  describe('Rendering', () => {
    it('renders all control buttons', () => {
      render(<LayoutControls />);

      expect(screen.getByText('Assets')).toBeInTheDocument();
      expect(screen.getByText('Chat')).toBeInTheDocument();
      expect(screen.getByText('Reset')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(<LayoutControls className="custom-class" />);

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('Asset Library Toggle', () => {
    it('displays correct label when visible', () => {
      render(<LayoutControls />);

      const button = screen.getByRole('button', { name: 'Hide Asset Library' });
      expect(button).toBeInTheDocument();
    });

    it('displays correct label when hidden', () => {
      (usePanelVisibility as any).mockReturnValue({
        showChat: false,
        toggleChat: mockToggleChat,
        toggleAssetLibrary: mockToggleAssetLibrary,
        resetPanelSizes: mockResetPanelSizes,
        isAssetLibraryVisible: false,
        panelSizes: {
          assetLibrary: 0,
          canvas: 70,
          propertiesOrChat: 30,
        },
      });

      render(<LayoutControls />);

      const button = screen.getByRole('button', { name: 'Show Asset Library' });
      expect(button).toBeInTheDocument();
    });

    it('toggles asset library when clicked', () => {
      render(<LayoutControls />);

      const button = screen.getByRole('button', { name: 'Hide Asset Library' });
      fireEvent.click(button);

      expect(mockToggleAssetLibrary).toHaveBeenCalledWith(false);
    });

    it('has active styling when visible', () => {
      render(<LayoutControls />);

      const button = screen.getByRole('button', { name: 'Hide Asset Library' });
      expect(button).toHaveClass('bg-purple-100');
      expect(button).toHaveClass('text-purple-700');
    });

    it('has inactive styling when hidden', () => {
      (usePanelVisibility as any).mockReturnValue({
        showChat: false,
        toggleChat: mockToggleChat,
        toggleAssetLibrary: mockToggleAssetLibrary,
        resetPanelSizes: mockResetPanelSizes,
        isAssetLibraryVisible: false,
        panelSizes: {
          assetLibrary: 0,
          canvas: 70,
          propertiesOrChat: 30,
        },
      });

      render(<LayoutControls />);

      const button = screen.getByRole('button', { name: 'Show Asset Library' });
      expect(button).toHaveClass('bg-gray-100');
      expect(button).toHaveClass('text-gray-700');
    });
  });

  describe('Chat Toggle', () => {
    it('displays correct label when hidden', () => {
      render(<LayoutControls />);

      const button = screen.getByRole('button', { name: 'Show Chat' });
      expect(button).toBeInTheDocument();
    });

    it('displays correct label when visible', () => {
      (usePanelVisibility as any).mockReturnValue({
        showChat: true,
        toggleChat: mockToggleChat,
        toggleAssetLibrary: mockToggleAssetLibrary,
        resetPanelSizes: mockResetPanelSizes,
        isAssetLibraryVisible: true,
        panelSizes: {
          assetLibrary: 20,
          canvas: 40,
          propertiesOrChat: 40,
        },
      });

      render(<LayoutControls />);

      const button = screen.getByRole('button', { name: 'Hide Chat' });
      expect(button).toBeInTheDocument();
    });

    it('toggles chat when clicked', () => {
      render(<LayoutControls />);

      const button = screen.getByRole('button', { name: 'Show Chat' });
      fireEvent.click(button);

      expect(mockToggleChat).toHaveBeenCalled();
    });

    it('has active styling when visible', () => {
      (usePanelVisibility as any).mockReturnValue({
        showChat: true,
        toggleChat: mockToggleChat,
        toggleAssetLibrary: mockToggleAssetLibrary,
        resetPanelSizes: mockResetPanelSizes,
        isAssetLibraryVisible: true,
        panelSizes: {
          assetLibrary: 20,
          canvas: 40,
          propertiesOrChat: 40,
        },
      });

      render(<LayoutControls />);

      const button = screen.getByRole('button', { name: 'Hide Chat' });
      expect(button).toHaveClass('bg-purple-100');
      expect(button).toHaveClass('text-purple-700');
    });

    it('has inactive styling when hidden', () => {
      render(<LayoutControls />);

      const button = screen.getByRole('button', { name: 'Show Chat' });
      expect(button).toHaveClass('bg-gray-100');
      expect(button).toHaveClass('text-gray-700');
    });
  });

  describe('Reset Layout', () => {
    it('displays reset button', () => {
      render(<LayoutControls />);

      const button = screen.getByRole('button', { name: 'Reset Layout' });
      expect(button).toBeInTheDocument();
    });

    it('resets layout when clicked', () => {
      render(<LayoutControls />);

      const button = screen.getByRole('button', { name: 'Reset Layout' });
      fireEvent.click(button);

      expect(mockResetPanelSizes).toHaveBeenCalled();
    });

    it('has consistent styling', () => {
      render(<LayoutControls />);

      const button = screen.getByRole('button', { name: 'Reset Layout' });
      expect(button).toHaveClass('bg-gray-100');
      expect(button).toHaveClass('text-gray-700');
    });
  });

  describe('Button Icons', () => {
    it('displays correct icons', () => {
      const { container } = render(<LayoutControls />);

      const icons = container.querySelectorAll('svg');
      expect(icons.length).toBe(3); // Assets, Chat, Reset icons
    });
  });

  describe('Accessibility', () => {
    it('has aria-labels for all buttons', () => {
      render(<LayoutControls />);

      expect(screen.getByRole('button', { name: 'Hide Asset Library' })).toHaveAttribute(
        'aria-label'
      );
      expect(screen.getByRole('button', { name: 'Show Chat' })).toHaveAttribute('aria-label');
      expect(screen.getByRole('button', { name: 'Reset Layout' })).toHaveAttribute('aria-label');
    });

    it('has title attributes for tooltips', () => {
      render(<LayoutControls />);

      expect(screen.getByRole('button', { name: 'Hide Asset Library' })).toHaveAttribute('title');
      expect(screen.getByRole('button', { name: 'Show Chat' })).toHaveAttribute('title');
      expect(screen.getByRole('button', { name: 'Reset Layout' })).toHaveAttribute('title');
    });
  });

  describe('Hover Effects', () => {
    it('has hover classes on all buttons', () => {
      render(<LayoutControls />);

      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button.className).toContain('hover:');
      });
    });
  });
});
