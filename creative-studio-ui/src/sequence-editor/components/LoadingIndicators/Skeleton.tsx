/**
 * Skeleton Loading Component
 * 
 * Displays a skeleton placeholder for loading content.
 * 
 * Requirement 20.6: Display spinners for operations exceeding 500ms
 */

import React from 'react';
import './loadingIndicators.css';

export interface SkeletonProps {
  /** Width of the skeleton */
  width?: string | number;
  /** Height of the skeleton */
  height?: string | number;
  /** Shape of the skeleton */
  variant?: 'text' | 'rectangular' | 'circular';
  /** Whether to animate */
  animate?: boolean;
  /** Additional CSS class */
  className?: string;
}

/**
 * Skeleton loading component
 */
export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = '1rem',
  variant = 'text',
  animate = true,
  className = '',
}) => {
  const style: React.CSSProperties = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
  };
  
  const variantClass = {
    text: 'skeleton-text',
    rectangular: 'skeleton-rectangular',
    circular: 'skeleton-circular',
  }[variant];
  
  return (
    <div 
      className={`skeleton ${variantClass} ${animate ? 'loading-shimmer' : ''} ${className}`}
      style={style}
      role="status"
      aria-label="Loading"
    />
  );
};

export default Skeleton;
