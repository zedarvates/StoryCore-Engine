/**
 * Lazy Image Component Tests
 * 
 * Tests for lazy loading and caching functionality.
 * Requirements: 5.3
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { LazyImage } from '../LazyImage';
import * as thumbnailCache from '../../../utils/thumbnailCache';

// Mock the thumbnail cache
vi.mock('../../../utils/thumbnailCache', () => ({
  fetchAndCacheThumbnail: vi.fn((url: string) => Promise.resolve(url)),
  getCachedThumbnail: vi.fn(() => Promise.resolve(null)),
  cacheThumbnail: vi.fn(() => Promise.resolve()),
}));

// Mock IntersectionObserver
class MockIntersectionObserver {
  constructor(private callback: IntersectionObserverCallback) {}
  
  observe(target: Element) {
    // Immediately trigger intersection
    setTimeout(() => {
      this.callback(
        [{ isIntersecting: true, target } as IntersectionObserverEntry],
        this as any
      );
    }, 0);
  }
  
  unobserve() {}
  disconnect() {}
}

describe('LazyImage Component', () => {
  beforeEach(() => {
    // Setup IntersectionObserver mock
    global.IntersectionObserver = MockIntersectionObserver as any;
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Requirement 5.3: Lazy Loading', () => {
    it('should show loading placeholder initially', () => {
      render(<LazyImage src="test.jpg" alt="Test" />);
      
      const placeholder = document.querySelector('.lazy-image-placeholder');
      expect(placeholder).toBeInTheDocument();
    });

    it('should show spinner in placeholder', () => {
      render(<LazyImage src="test.jpg" alt="Test" />);
      
      const spinner = document.querySelector('.lazy-image-spinner');
      expect(spinner).toBeInTheDocument();
    });

    it('should load image when intersecting', async () => {
      render(<LazyImage src="test.jpg" alt="Test" />);
      
      await waitFor(() => {
        expect(thumbnailCache.fetchAndCacheThumbnail).toHaveBeenCalledWith('test.jpg');
      });
    });

    it('should display image after loading', async () => {
      render(<LazyImage src="test.jpg" alt="Test" />);
      
      await waitFor(() => {
        const img = screen.getByAlt('Test');
        expect(img).toBeInTheDocument();
      });
    });

    it('should hide placeholder after image loads', async () => {
      render(<LazyImage src="test.jpg" alt="Test" />);
      
      await waitFor(() => {
        const placeholder = document.querySelector('.lazy-image-placeholder');
        expect(placeholder).not.toBeInTheDocument();
      });
    });
  });

  describe('Requirement 5.3: Caching', () => {
    it('should fetch and cache thumbnail', async () => {
      render(<LazyImage src="test.jpg" alt="Test" />);
      
      await waitFor(() => {
        expect(thumbnailCache.fetchAndCacheThumbnail).toHaveBeenCalledWith('test.jpg');
      });
    });

    it('should use cached thumbnail if available', async () => {
      vi.mocked(thumbnailCache.fetchAndCacheThumbnail).mockResolvedValue('cached-url');
      
      render(<LazyImage src="test.jpg" alt="Test" />);
      
      await waitFor(() => {
        const img = screen.getByAlt('Test') as HTMLImageElement;
        expect(img.src).toContain('cached-url');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle fetch errors gracefully', async () => {
      vi.mocked(thumbnailCache.fetchAndCacheThumbnail).mockRejectedValue(
        new Error('Fetch failed')
      );
      
      render(<LazyImage src="test.jpg" alt="Test" />);
      
      await waitFor(() => {
        const img = screen.queryByAlt('Test');
        // Should still attempt to display image with fallback
        expect(img).toBeInTheDocument();
      });
    });

    it('should call custom error handler if provided', async () => {
      const onError = vi.fn();
      
      render(<LazyImage src="test.jpg" alt="Test" onError={onError} />);
      
      await waitFor(() => {
        const img = screen.getByAlt('Test');
        // Trigger error event
        img.dispatchEvent(new Event('error'));
      });
      
      expect(onError).toHaveBeenCalled();
    });

    it('should show fallback SVG on image error', async () => {
      render(<LazyImage src="invalid.jpg" alt="Test" />);
      
      await waitFor(() => {
        const img = screen.getByAlt('Test') as HTMLImageElement;
        img.dispatchEvent(new Event('error'));
        
        // Should have fallback SVG
        expect(img.src).toContain('data:image/svg+xml');
      });
    });
  });

  describe('Performance', () => {
    it('should use Intersection Observer for lazy loading', () => {
      const observeSpy = vi.spyOn(MockIntersectionObserver.prototype, 'observe');
      
      render(<LazyImage src="test.jpg" alt="Test" />);
      
      expect(observeSpy).toHaveBeenCalled();
    });

    it('should unobserve after loading', async () => {
      const unobserveSpy = vi.spyOn(MockIntersectionObserver.prototype, 'unobserve');
      
      render(<LazyImage src="test.jpg" alt="Test" />);
      
      await waitFor(() => {
        expect(unobserveSpy).toHaveBeenCalled();
      });
    });

    it('should disconnect observer on unmount', () => {
      const disconnectSpy = vi.spyOn(MockIntersectionObserver.prototype, 'disconnect');
      
      const { unmount } = render(<LazyImage src="test.jpg" alt="Test" />);
      unmount();
      
      expect(disconnectSpy).toHaveBeenCalled();
    });
  });

  describe('Visual States', () => {
    it('should apply loading class initially', async () => {
      render(<LazyImage src="test.jpg" alt="Test" />);
      
      await waitFor(() => {
        const img = screen.queryByAlt('Test');
        if (img) {
          expect(img).toHaveClass('loading');
        }
      });
    });

    it('should apply loaded class after loading', async () => {
      render(<LazyImage src="test.jpg" alt="Test" />);
      
      await waitFor(() => {
        const img = screen.getByAlt('Test');
        img.dispatchEvent(new Event('load'));
        
        expect(img).toHaveClass('loaded');
      });
    });

    it('should apply custom className', () => {
      render(<LazyImage src="test.jpg" alt="Test" className="custom-class" />);
      
      const container = document.querySelector('.lazy-image-container');
      expect(container).toHaveClass('custom-class');
    });
  });
});
