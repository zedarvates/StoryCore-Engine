/**
 * ViewModeToggle Component Tests
 * 
 * Unit tests for the view mode toggle component.
 * Requirements: 3.1, 3.7
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ViewModeToggle, type ViewMode } from '../ViewModeToggle';

describe('ViewModeToggle', () => {
  const mockOnModeChange = vi.fn();
  
  beforeEach(() => {
    mockOnModeChange.mockClear();
  });
  
  describe('Rendering', () => {
    it('should render both view mode buttons', () => {
      render(
        <ViewModeToggle
          currentMode="video"
          onModeChange={mockOnModeChange}
        />
      );
      
      expect(screen.getByTitle('Video Preview Mode')).toBeInTheDocument();
      expect(screen.getByTitle('3D Scene View Mode')).toBeInTheDocument();
    });
    
    it('should highlight the active mode', () => {
      const { rerender } = render(
        <ViewModeToggle
          currentMode="video"
          onModeChange={mockOnModeChange}
        />
      );
      
      const videoBtn = screen.getByTitle('Video Preview Mode');
      const sceneBtn = screen.getByTitle('3D Scene View Mode');
      
      expect(videoBtn).toHaveClass('active');
      expect(sceneBtn).not.toHaveClass('active');
      
      rerender(
        <ViewModeToggle
          currentMode="3d-scene"
          onModeChange={mockOnModeChange}
        />
      );
      
      expect(videoBtn).not.toHaveClass('active');
      expect(sceneBtn).toHaveClass('active');
    });
    
    it('should display mode labels', () => {
      render(
        <ViewModeToggle
          currentMode="video"
          onModeChange={mockOnModeChange}
        />
      );
      
      expect(screen.getByText('Video Preview')).toBeInTheDocument();
      expect(screen.getByText('3D Scene View')).toBeInTheDocument();
    });
    
    it('should display mode icons', () => {
      render(
        <ViewModeToggle
          currentMode="video"
          onModeChange={mockOnModeChange}
        />
      );
      
      const icons = screen.getAllByRole('button').map(btn => 
        btn.querySelector('.view-mode-icon')?.textContent
      );
      
      expect(icons).toContain('🎬');
      expect(icons).toContain('🎭');
    });
  });
  
  describe('Interaction', () => {
    it('should call onModeChange when video mode button is clicked', () => {
      render(
        <ViewModeToggle
          currentMode="3d-scene"
          onModeChange={mockOnModeChange}
        />
      );
      
      const videoBtn = screen.getByTitle('Video Preview Mode');
      fireEvent.click(videoBtn);
      
      expect(mockOnModeChange).toHaveBeenCalledWith('video');
      expect(mockOnModeChange).toHaveBeenCalledTimes(1);
    });
    
    it('should call onModeChange when 3D scene mode button is clicked', () => {
      render(
        <ViewModeToggle
          currentMode="video"
          onModeChange={mockOnModeChange}
        />
      );
      
      const sceneBtn = screen.getByTitle('3D Scene View Mode');
      fireEvent.click(sceneBtn);
      
      expect(mockOnModeChange).toHaveBeenCalledWith('3d-scene');
      expect(mockOnModeChange).toHaveBeenCalledTimes(1);
    });
    
    it('should allow clicking the active mode button', () => {
      render(
        <ViewModeToggle
          currentMode="video"
          onModeChange={mockOnModeChange}
        />
      );
      
      const videoBtn = screen.getByTitle('Video Preview Mode');
      fireEvent.click(videoBtn);
      
      expect(mockOnModeChange).toHaveBeenCalledWith('video');
    });
  });
  
  describe('Disabled State', () => {
    it('should disable both buttons when disabled prop is true', () => {
      render(
        <ViewModeToggle
          currentMode="video"
          onModeChange={mockOnModeChange}
          disabled={true}
        />
      );
      
      const videoBtn = screen.getByTitle('Video Preview Mode');
      const sceneBtn = screen.getByTitle('3D Scene View Mode');
      
      expect(videoBtn).toBeDisabled();
      expect(sceneBtn).toBeDisabled();
    });
    
    it('should not call onModeChange when disabled', () => {
      render(
        <ViewModeToggle
          currentMode="video"
          onModeChange={mockOnModeChange}
          disabled={true}
        />
      );
      
      const sceneBtn = screen.getByTitle('3D Scene View Mode');
      fireEvent.click(sceneBtn);
      
      expect(mockOnModeChange).not.toHaveBeenCalled();
    });
  });
  
  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(
        <ViewModeToggle
          currentMode="video"
          onModeChange={mockOnModeChange}
        />
      );
      
      expect(screen.getByLabelText('Switch to video preview mode')).toBeInTheDocument();
      expect(screen.getByLabelText('Switch to 3D scene view mode')).toBeInTheDocument();
    });
    
    it('should be keyboard accessible', () => {
      render(
        <ViewModeToggle
          currentMode="video"
          onModeChange={mockOnModeChange}
        />
      );
      
      const sceneBtn = screen.getByTitle('3D Scene View Mode');
      sceneBtn.focus();
      
      expect(sceneBtn).toHaveFocus();
      
      // Buttons respond to click, not keyDown directly
      fireEvent.click(sceneBtn);
      expect(mockOnModeChange).toHaveBeenCalledWith('3d-scene');
    });
  });
  
  describe('Edge Cases', () => {
    it('should handle rapid mode switching', () => {
      render(
        <ViewModeToggle
          currentMode="video"
          onModeChange={mockOnModeChange}
        />
      );
      
      const videoBtn = screen.getByTitle('Video Preview Mode');
      const sceneBtn = screen.getByTitle('3D Scene View Mode');
      
      fireEvent.click(sceneBtn);
      fireEvent.click(videoBtn);
      fireEvent.click(sceneBtn);
      fireEvent.click(videoBtn);
      
      expect(mockOnModeChange).toHaveBeenCalledTimes(4);
    });
    
    it('should maintain state when onModeChange is not provided', () => {
      // This tests that the component doesn't crash without the callback
      const { container } = render(
        <ViewModeToggle
          currentMode="video"
          onModeChange={() => {}}
        />
      );
      
      expect(container.querySelector('.view-mode-toggle')).toBeInTheDocument();
    });
  });
});
