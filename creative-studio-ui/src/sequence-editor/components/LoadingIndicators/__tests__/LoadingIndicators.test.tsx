/**
 * Tests for Loading Indicator Components
 * 
 * Requirements: 20.6, 20.7
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoadingSpinner } from '../LoadingSpinner';
import { LoadingOverlay } from '../LoadingOverlay';
import { ProgressBar } from '../ProgressBar';
import { Skeleton } from '../Skeleton';

describe('Loading Indicator Components', () => {
  describe('LoadingSpinner', () => {
    it('should render spinner', () => {
      render(<LoadingSpinner />);
      
      const spinner = screen.getByRole('status');
      expect(spinner).toBeTruthy();
    });
    
    it('should render with label', () => {
      render(<LoadingSpinner label="Loading data..." />);
      
      expect(screen.getByText('Loading data...')).toBeTruthy();
    });
    
    it('should apply size classes', () => {
      const { container } = render(<LoadingSpinner size="large" />);
      
      const spinner = container.querySelector('.loading-spinner-large');
      expect(spinner).toBeTruthy();
    });
    
    it('should apply custom color', () => {
      const { container } = render(<LoadingSpinner color="#ff0000" />);
      
      const spinner = container.querySelector('.loading-spinner');
      expect(spinner).toBeTruthy();
    });
  });
  
  describe('LoadingOverlay', () => {
    it('should not render when not visible', () => {
      const { container } = render(<LoadingOverlay visible={false} />);
      
      expect(container.querySelector('.loading-overlay')).toBeFalsy();
    });
    
    it('should render when visible', () => {
      render(<LoadingOverlay visible={true} />);
      
      const overlay = screen.getByRole('alert');
      expect(overlay).toBeTruthy();
    });
    
    it('should render with message', () => {
      render(<LoadingOverlay visible={true} message="Processing..." />);
      
      expect(screen.getByText('Processing...')).toBeTruthy();
    });
    
    it('should apply fullscreen class', () => {
      const { container } = render(<LoadingOverlay visible={true} fullscreen={true} />);
      
      const overlay = container.querySelector('.loading-overlay-fullscreen');
      expect(overlay).toBeTruthy();
    });
  });
  
  describe('ProgressBar', () => {
    it('should render progress bar', () => {
      render(<ProgressBar value={50} />);
      
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toBeTruthy();
    });
    
    it('should display correct progress value', () => {
      render(<ProgressBar value={75} />);
      
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar.getAttribute('aria-valuenow')).toBe('75');
    });
    
    it('should clamp progress value between 0 and 100', () => {
      const { rerender } = render(<ProgressBar value={150} />);
      
      let progressBar = screen.getByRole('progressbar');
      expect(progressBar.getAttribute('aria-valuenow')).toBe('100');
      
      rerender(<ProgressBar value={-50} />);
      
      progressBar = screen.getByRole('progressbar');
      expect(progressBar.getAttribute('aria-valuenow')).toBe('0');
    });
    
    it('should render with label', () => {
      render(<ProgressBar value={50} label="Uploading..." />);
      
      expect(screen.getByText('Uploading...')).toBeTruthy();
    });
    
    it('should show percentage when enabled', () => {
      render(<ProgressBar value={65} showPercentage={true} />);
      
      expect(screen.getByText('65%')).toBeTruthy();
    });
    
    it('should render indeterminate progress', () => {
      const { container } = render(<ProgressBar indeterminate={true} />);
      
      const indeterminate = container.querySelector('.progress-bar-indeterminate');
      expect(indeterminate).toBeTruthy();
    });
    
    it('should not show percentage for indeterminate progress', () => {
      const { container } = render(
        <ProgressBar indeterminate={true} showPercentage={true} />
      );
      
      expect(container.textContent).not.toContain('%');
    });
  });
  
  describe('Skeleton', () => {
    it('should render skeleton', () => {
      const { container } = render(<Skeleton />);
      
      const skeleton = container.querySelector('.skeleton');
      expect(skeleton).toBeTruthy();
    });
    
    it('should apply variant classes', () => {
      const { container: textContainer } = render(<Skeleton variant="text" />);
      expect(textContainer.querySelector('.skeleton-text')).toBeTruthy();
      
      const { container: rectContainer } = render(<Skeleton variant="rectangular" />);
      expect(rectContainer.querySelector('.skeleton-rectangular')).toBeTruthy();
      
      const { container: circContainer } = render(<Skeleton variant="circular" />);
      expect(circContainer.querySelector('.skeleton-circular')).toBeTruthy();
    });
    
    it('should apply custom dimensions', () => {
      const { container } = render(<Skeleton width={200} height={100} />);
      
      const skeleton = container.querySelector('.skeleton') as HTMLElement;
      expect(skeleton.style.width).toBe('200px');
      expect(skeleton.style.height).toBe('100px');
    });
    
    it('should support string dimensions', () => {
      const { container } = render(<Skeleton width="50%" height="2rem" />);
      
      const skeleton = container.querySelector('.skeleton') as HTMLElement;
      expect(skeleton.style.width).toBe('50%');
      expect(skeleton.style.height).toBe('2rem');
    });
    
    it('should apply shimmer animation by default', () => {
      const { container } = render(<Skeleton />);
      
      const skeleton = container.querySelector('.loading-shimmer');
      expect(skeleton).toBeTruthy();
    });
    
    it('should not animate when disabled', () => {
      const { container } = render(<Skeleton animate={false} />);
      
      const skeleton = container.querySelector('.loading-shimmer');
      expect(skeleton).toBeFalsy();
    });
  });
});
