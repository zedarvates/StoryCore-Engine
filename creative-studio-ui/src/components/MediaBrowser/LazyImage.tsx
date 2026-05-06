/**
 * Lazy Loading for Media Browser Images
 * 
 * Requirements: 86
 * Performance Level: 🟡 HAUTE
 * 
 * Implements lazy loading for images in the Media Browser
 * to improve initial load time and reduce memory usage.
 */

import { useEffect, useRef, useState, useCallback } from 'react';

interface LazyImageOptions {
  rootMargin?: string;
  threshold?: number;
  placeholder?: string;
  onError?: (error: Error) => void;
  onLoad?: () => void;
}

/**
 * Hook for lazy loading images with IntersectionObserver
 */
export function useLazyImage(
  src: string | undefined,
  options: LazyImageOptions = {}
) {
  const { rootMargin = '50px', threshold = 0.1, placeholder } = options;
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const loadImage = useCallback(() => {
    if (!src || !imgRef.current) {
      setError(new Error('No image source or element'));
      return;
    }

    const img = imgRef.current;
    
    // Set loading state
    setIsLoaded(false);
    
    // Create new image to preload
    const image = new Image();
    
    image.onload = () => {
      img.src = src;
      setIsLoaded(true);
      options.onLoad?.();
    };
    
    image.onerror = (event) => {
      const error = new Error(`Failed to load image: ${src}`);
      setError(error);
      setIsLoaded(false);
      options.onError?.(error);
    };
    
    image.src = src;
  }, [src, options]);

  useEffect(() => {
    if (!src || !imgRef.current) {
      return;
    }

    // Check if IntersectionObserver is supported
    if (!('IntersectionObserver' in window)) {
      // Fallback: load immediately
      loadImage();
      return;
    }

    // Create observer
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            loadImage();
            // Stop observing once loaded
            if (observerRef.current) {
              observerRef.current.unobserve(entry.target);
            }
          }
        });
      },
      {
        rootMargin,
        threshold,
      }
    );

    // Start observing
    if (imgRef.current) {
      observerRef.current.observe(imgRef.current);
    }

    return () => {
      if (observerRef.current && imgRef.current) {
        observerRef.current.unobserve(imgRef.current);
      }
    };
  }, [src, rootMargin, threshold, loadImage]);

  return {
    imgRef,
    isLoaded,
    isInView,
    error,
    placeholder,
  };
}

/**
 * LazyImage Component
 */
export interface LazyImageProps {
  src?: string;
  alt: string;
  className?: string;
  placeholder?: string;
  width?: number;
  height?: number;
  onError?: (error: Error) => void;
  onLoad?: () => void;
}

export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  className = '',
  placeholder,
  width,
  height,
  onError,
  onLoad,
}) => {
  const { imgRef, isLoaded, error, isInView } = useLazyImage(src, {
    placeholder,
    onError,
    onLoad,
  });

  if (error) {
    return (
      <div className={`lazy-image error ${className}`}>
        <div className="error-placeholder">
          <span>Failed to load image</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`lazy-image ${className}`}>
      {/* Placeholder while loading */}
      {!isLoaded && (
        <div 
          className="image-placeholder"
          style={{
            width: width || '100%',
            height: height || '200px',
            background: placeholder || '#f3f4f6',
          }}
        >
          {placeholder && (
            <div className="placeholder-content">
              {placeholder}
            </div>
          )}
        </div>
      )}
      
      {/* Actual image */}
      <img
        ref={imgRef}
        src={isLoaded ? src : ''}
        alt={alt}
        className={`lazy-image-element ${isLoaded ? 'loaded' : 'loading'}`}
        style={{
          display: isLoaded ? 'block' : 'none',
          width: width || '100%',
          height: height || 'auto',
        }}
        loading="lazy"
        decoding="async"
      />
    </div>
  );
};

/**
 * Virtualized Image Grid for Media Browser
 */
export interface ImageGridProps {
  images: Array<{
    src: string;
    alt: string;
    width?: number;
    height?: number;
  }>;
  columns?: number;
  gap?: number;
}

export const VirtualImageGrid: React.FC<ImageGridProps> = ({
  images,
  columns = 4,
  gap = 16,
}) => {
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 20 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      const containerHeight = container.clientHeight;
      const itemHeight = 200 + gap; // Approximate
      
      const start = Math.max(0, Math.floor(scrollTop / itemHeight) - 2);
      const end = Math.min(
        images.length,
        start + Math.ceil(containerHeight / itemHeight) + 4
      );
      
      setVisibleRange({ start, end });
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial calculation

    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [images.length, gap]);

  const visibleImages = images.slice(visibleRange.start, visibleRange.end);

  return (
    <div 
      ref={containerRef}
      className="virtual-image-grid"
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: `${gap}px`,
        height: '600px',
        overflowY: 'auto',
      }}
    >
      <div
        style={{
          gridColumn: '1 / -1',
          height: `${visibleRange.start * (200 + gap)}px`,
        }}
      />
      
      {visibleImages.map((image, index) => (
        <LazyImage
          key={`${image.src}-${visibleRange.start + index}`}
          src={image.src}
          alt={image.alt}
          width={200}
          height={200}
        />
      ))}
      
      <div
        style={{
          gridColumn: '1 / -1',
          height: `${(images.length - visibleRange.end) * (200 + gap)}px`,
        }}
      />
    </div>
  );
};

// CSS Styles
const lazyImageStyles = `
.lazy-image {
  position: relative;
  overflow: hidden;
}

.lazy-image .image-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f3f4f6;
  border-radius: 8px;
  animation: pulse 1.5s ease-in-out infinite;
}

.lazy-image .image-placeholder .placeholder-content {
  color: #9ca3af;
  font-size: 14px;
}

.lazy-image .lazy-image-element {
  border-radius: 8px;
  transition: opacity 0.3s ease;
}

.lazy-image .lazy-image-element.loaded {
  opacity: 1;
}

.lazy-image .lazy-image-element.loading {
  opacity: 0;
}

.lazy-image.error .error-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fee;
  border: 2px dashed #f88;
  border-radius: 8px;
  color: #c00;
  font-size: 14px;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.virtual-image-grid {
  scrollbar-width: thin;
  scrollbar-color: #d1d5db transparent;
}

.virtual-image-grid::-webkit-scrollbar {
  width: 6px;
}

.virtual-image-grid::-webkit-scrollbar-track {
  background: transparent;
}

.virtual-image-grid::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 3px;
}

.virtual-image-grid::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleId = 'lazy-image-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = lazyImageStyles;
    document.head.appendChild(style);
  }
}
