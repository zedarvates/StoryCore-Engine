/**
 * MenuItem Component Tests
 * 
 * Tests for the MenuItem component including rendering, states, and interactions.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MenuItem } from '../MenuItem';
import { Check, ChevronRight } from 'lucide-react';

describe('MenuItem', () => {
  describe('Basic Rendering', () => {
    it('should render with label', () => {
      render(<MenuItem id="test" label="Test Item" />);
      expect(screen.getByRole('menuitem')).toHaveTextContent('Test Item');
    });

    it('should have proper ARIA attributes', () => {
      render(<MenuItem id="test" label="Test Item" />);
      const item = screen.getByRole('menuitem');
      
      expect(item).toHaveAttribute('aria-label', 'Test Item');
      expect(item).toHaveAttribute('role', 'menuitem');
    });

    it('should render with keyboard shortcut', () => {
      render(<MenuItem id="test" label="Test Item" shortcut="Ctrl+S" />);
      expect(screen.getByText('Ctrl+S')).toBeInTheDocument();
    });
  });

  describe('Enabled/Disabled States', () => {
    it('should be enabled by default', () => {
      render(<MenuItem id="test" label="Test Item" />);
      const item = screen.getByRole('menuitem');
      
      expect(item).not.toHaveAttribute('aria-disabled', 'true');
      expect(item).not.toBeDisabled();
    });

    it('should render disabled state', () => {
      render(<MenuItem id="test" label="Test Item" enabled={false} />);
      const item = screen.getByRole('menuitem');
      
      expect(item).toHaveAttribute('aria-disabled', 'true');
      expect(item).toBeDisabled();
    });

    it('should not call onClick when disabled', () => {
      const onClick = vi.fn();
      render(<MenuItem id="test" label="Test Item" enabled={false} onClick={onClick} />);
      
      const item = screen.getByRole('menuitem');
      fireEvent.click(item);
      
      expect(onClick).not.toHaveBeenCalled();
    });
  });

  describe('Checked States', () => {
    it('should render checked state with checkmark', () => {
      render(<MenuItem id="test" label="Test Item" checked={true} />);
      
      const item = screen.getByRole('menuitem');
      expect(item).toHaveAttribute('aria-checked', 'true');
    });

    it('should render unchecked state without checkmark', () => {
      render(<MenuItem id="test" label="Test Item" checked={false} />);
      
      const item = screen.getByRole('menuitem');
      expect(item).toHaveAttribute('aria-checked', 'false');
    });
  });

  describe('Submenu Indicator', () => {
    it('should show submenu indicator when hasSubmenu is true', () => {
      render(<MenuItem id="test" label="Test Item" hasSubmenu={true} />);
      
      const item = screen.getByRole('menuitem');
      expect(item).toHaveAttribute('aria-haspopup', 'true');
    });

    it('should not show submenu indicator by default', () => {
      render(<MenuItem id="test" label="Test Item" />);
      
      const item = screen.getByRole('menuitem');
      expect(item).not.toHaveAttribute('aria-haspopup');
    });
  });

  describe('Click Handling', () => {
    it('should call onClick when clicked', () => {
      const onClick = vi.fn();
      render(<MenuItem id="test" label="Test Item" onClick={onClick} />);
      
      const item = screen.getByRole('menuitem');
      fireEvent.click(item);
      
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('should call onClick on Enter key', () => {
      const onClick = vi.fn();
      render(<MenuItem id="test" label="Test Item" onClick={onClick} />);
      
      const item = screen.getByRole('menuitem');
      fireEvent.keyDown(item, { key: 'Enter' });
      
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('should call onClick on Space key', () => {
      const onClick = vi.fn();
      render(<MenuItem id="test" label="Test Item" onClick={onClick} />);
      
      const item = screen.getByRole('menuitem');
      fireEvent.keyDown(item, { key: ' ' });
      
      expect(onClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('Focus Management', () => {
    it('should call onFocus when focused', () => {
      const onFocus = vi.fn();
      render(<MenuItem id="test" label="Test Item" onFocus={onFocus} />);
      
      const item = screen.getByRole('menuitem');
      fireEvent.focus(item);
      
      expect(onFocus).toHaveBeenCalledTimes(1);
    });

    it('should call onMouseEnter when mouse enters', () => {
      const onMouseEnter = vi.fn();
      render(<MenuItem id="test" label="Test Item" onMouseEnter={onMouseEnter} />);
      
      const item = screen.getByRole('menuitem');
      fireEvent.mouseEnter(item);
      
      expect(onMouseEnter).toHaveBeenCalledTimes(1);
    });

    it('should apply focused styles when focused prop is true', () => {
      const { container } = render(
        <MenuItem id="test" label="Test Item" focused={true} />
      );
      
      const item = screen.getByRole('menuitem');
      expect(item.className).toContain('bg-accent');
      expect(item.className).toContain('text-accent-foreground');
    });
  });

  describe('TabIndex', () => {
    it('should have tabIndex -1 by default', () => {
      render(<MenuItem id="test" label="Test Item" />);
      const item = screen.getByRole('menuitem');
      
      expect(item).toHaveAttribute('tabIndex', '-1');
    });

    it('should accept custom tabIndex', () => {
      render(<MenuItem id="test" label="Test Item" tabIndex={0} />);
      const item = screen.getByRole('menuitem');
      
      expect(item).toHaveAttribute('tabIndex', '0');
    });
  });
});
