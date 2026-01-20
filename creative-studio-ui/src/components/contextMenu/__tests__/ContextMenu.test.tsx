import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ContextMenu, { ContextMenuItem } from '../ContextMenu';

describe('ContextMenu', () => {
  const mockOnClose = vi.fn();
  
  const mockItems: ContextMenuItem[] = [
    {
      id: 'item-1',
      label: 'Test Item 1',
      action: vi.fn()
    },
    {
      id: 'item-2',
      label: 'Test Item 2',
      shortcut: 'Ctrl+T',
      action: vi.fn()
    },
    {
      id: 'separator',
      label: '',
      separator: true
    },
    {
      id: 'item-3',
      label: 'Danger Item',
      danger: true,
      action: vi.fn()
    },
    {
      id: 'item-4',
      label: 'Disabled Item',
      disabled: true,
      action: vi.fn()
    },
    {
      id: 'item-5',
      label: 'Item with Submenu',
      submenu: [
        {
          id: 'sub-1',
          label: 'Submenu Item 1',
          action: vi.fn()
        }
      ]
    }
  ];

  it('renders menu items correctly', () => {
    render(
      <ContextMenu
        items={mockItems}
        position={{ x: 100, y: 100 }}
        onClose={mockOnClose}
        visible={true}
      />
    );

    expect(screen.getByText('Test Item 1')).toBeInTheDocument();
    expect(screen.getByText('Test Item 2')).toBeInTheDocument();
    expect(screen.getByText('Danger Item')).toBeInTheDocument();
    expect(screen.getByText('Disabled Item')).toBeInTheDocument();
    expect(screen.getByText('Item with Submenu')).toBeInTheDocument();
  });

  it('displays keyboard shortcuts', () => {
    render(
      <ContextMenu
        items={mockItems}
        position={{ x: 100, y: 100 }}
        onClose={mockOnClose}
        visible={true}
      />
    );

    expect(screen.getByText('Ctrl+T')).toBeInTheDocument();
  });

  it('calls action when item is clicked', () => {
    const actionMock = vi.fn();
    const items: ContextMenuItem[] = [
      {
        id: 'test',
        label: 'Test',
        action: actionMock
      }
    ];

    render(
      <ContextMenu
        items={items}
        position={{ x: 100, y: 100 }}
        onClose={mockOnClose}
        visible={true}
      />
    );

    fireEvent.click(screen.getByText('Test'));
    expect(actionMock).toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('does not call action for disabled items', () => {
    const actionMock = vi.fn();
    const items: ContextMenuItem[] = [
      {
        id: 'test',
        label: 'Disabled Test',
        disabled: true,
        action: actionMock
      }
    ];

    render(
      <ContextMenu
        items={items}
        position={{ x: 100, y: 100 }}
        onClose={mockOnClose}
        visible={true}
      />
    );

    const button = screen.getByText('Disabled Test').closest('button');
    expect(button).toBeDisabled();
  });

  it('closes menu on Escape key', () => {
    render(
      <ContextMenu
        items={mockItems}
        position={{ x: 100, y: 100 }}
        onClose={mockOnClose}
        visible={true}
      />
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('applies danger styling to danger items', () => {
    render(
      <ContextMenu
        items={mockItems}
        position={{ x: 100, y: 100 }}
        onClose={mockOnClose}
        visible={true}
      />
    );

    const dangerButton = screen.getByText('Danger Item').closest('button');
    expect(dangerButton).toHaveClass('text-red-400');
  });

  it('renders separators', () => {
    render(
      <ContextMenu
        items={mockItems}
        position={{ x: 100, y: 100 }}
        onClose={mockOnClose}
        visible={true}
      />
    );

    const separators = document.querySelectorAll('.border-t.border-gray-600');
    expect(separators.length).toBeGreaterThan(0);
  });

  it('does not render when visible is false', () => {
    const { container } = render(
      <ContextMenu
        items={mockItems}
        position={{ x: 100, y: 100 }}
        onClose={mockOnClose}
        visible={false}
      />
    );

    expect(container.firstChild).toBeNull();
  });
});
