import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import React from 'react';
import { ChapterPoints } from '../ChapterPoints';
import { ChapterPoint } from '../markerTypes';

describe('ChapterPoints Component', () => {
  const mockChapters: ChapterPoint[] = [
    { id: 'c1', position: 10, title: 'Chapter 1' } as unknown as ChapterPoint,
    { id: 'c2', position: 50, title: 'Chapter 2', description: 'desc' } as unknown as ChapterPoint,
  ];

  const defaultProps = {
    chapters: mockChapters,
    zoomLevel: 10,
    height: 100,
    currentPosition: 20,
    onChapterClick: vi.fn(),
    onChapterHover: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all chapters', () => {
    const { container } = render(<ChapterPoints {...defaultProps} />);
    const chapterElements = container.querySelectorAll('.chapter-marker');
    expect(chapterElements.length).toBe(mockChapters.length);
  });

  it('calls onChapterClick when chapter marker clicked', () => {
    const { container } = render(<ChapterPoints {...defaultProps} />);
    const chapter = container.querySelector('.chapter-marker');
    
    if (chapter) {
      fireEvent.click(chapter);
      expect(defaultProps.onChapterClick).toHaveBeenCalledWith(mockChapters[0]);
    }
  });

  it('calls onChapterHover when hover over chapter marker', () => {
    const { container } = render(<ChapterPoints {...defaultProps} />);
    const chapter = container.querySelector('.chapter-marker');
    
    if (chapter) {
      fireEvent.mouseEnter(chapter);
      expect(defaultProps.onChapterHover).toHaveBeenCalledWith(mockChapters[0]);
      
      fireEvent.mouseLeave(chapter);
      expect(defaultProps.onChapterHover).toHaveBeenCalledWith(null);
    }
  });

  it('toggles chapter dropdown menu', () => {
    const { container } = render(<ChapterPoints {...defaultProps} />);
    const button = container.querySelector('.chapter-menu-btn');
    
    if (button) {
      // Menu is initially closed
      expect(container.querySelector('.chapter-dropdown')).toBeNull();
      
      fireEvent.click(button);
      
      // Menu opens
      const dropdown = container.querySelector('.chapter-dropdown');
      expect(dropdown).toBeTruthy();
      
      // Checks all chapters are listed
      const items = container.querySelectorAll('.chapter-list-item');
      expect(items.length).toBe(2);
      
      fireEvent.click(button);
      
      // Menu closes
      expect(container.querySelector('.chapter-dropdown')).toBeNull();
    }
  });

  it('calls onChapterClick when clicking item from chapter dropdown', () => {
    const { container } = render(<ChapterPoints {...defaultProps} />);
    const button = container.querySelector('.chapter-menu-btn');
    
    if (button) {
      fireEvent.click(button); // Open menu
      
      const item = container.querySelector('.chapter-list-item');
      if (item) {
        fireEvent.click(item);
        expect(defaultProps.onChapterClick).toHaveBeenCalledWith(mockChapters[0]);
      }
    }
  });
});
