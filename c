/**
 * VideoHoverPreview Component Styles
 * 
 * @module components/video/VideoHoverPreview.css
 */

/* Container */
.video-hover-preview {
  position: fixed;
  z-index: 10000;
  pointer-events: auto;
  transform: translateX(-50%) translateY(0);
  opacity: 0;
  visibility: hidden;
  transition: opacity var(--animation-duration, 150ms) ease,
              visibility var(--animation-duration, 150ms) ease,
              transform var(--animation-duration, 150ms) ease;
}

.video-hover-preview-visible {
  opacity: 1;
  visibility: visible;
}

.video-hover-preview-hovered {
  transform: translateX(-50%) translateY(4px);
}

/* Position variants */
.video-hover-preview-bottom {
  transform: translateX(-50%) translateY(0);
}

.video-hover-preview-bottom.video-hover-preview-visible {
  transform: translateX(-50%) translateY(-4px);
}

.video-hover-preview-bottom.video-hover-preview-hovered {
  transform: translateX(-50%) translateY(-8px);
}

/* Arrow pointer */
.video-hover-preview-arrow {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 8px solid transparent;
  border-right: 8px solid transparent;
  border-bottom: 8px solid #2a2a2a;
}

.video-hover-preview:not(.video-hover-preview-bottom) .video-hover-preview-arrow {
  top: 100%;
}

.video-hover-preview-bottom .video-hover-preview-arrow {
  bottom: 100%;
  border-bottom: none;
  border-top: 8px solid #2a2a2a;
}

/* Main content */
.video-hover-preview-content {
  background-color: #2a2a2a;
  border-radius: 8px;
  padding: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: 200px;
}

/* Thumbnail */
.video-hover-preview-thumbnail {
  position: relative;
  width: 160px;
  height: 90px;
  background-color: #1a1a1a;
  border-radius: 4px;
  overflow: hidden;
}

.video-hover-preview-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

/* Placeholder */
.video-hover-preview-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
}

.video-hover-preview-placeholder svg {
  width: 32px;
  height: 32px;
}

/* Frame overlay */
.video-hover-preview-frame-overlay {
  position: absolute;
  bottom: 4px;
  right: 4px;
  background-color: rgba(0, 0, 0, 0.7);
  padding: 2px 6px;
  border-radius: 3px;
}

.video-hover-preview-frame-number {
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
  font-size: 11px;
  color: #ffffff;
  font-weight: 500;
}

/* Info section */
.video-hover-preview-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

/* Shot info */
.video-hover-preview-shot {
  display: flex;
  align-items: center;
  gap: 6px;
}

.video-hover-preview-shot-number {
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
  font-size: 11px;
  color: #6366f1;
  font-weight: 600;
}

.video-hover-preview-shot-name {
  font-size: 12px;
  color: #ffffff;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Timestamp */
.video-hover-preview-timestamp {
  display: flex;
  align-items: center;
  gap: 4px;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
  font-size: 11px;
}

.video-hover-preview-time {
  color: #aaaaaa;
}

.video-hover-preview-frame-count {
  color: #666666;
}

/* High contrast mode */
@media (prefers-contrast: high) {
  .video-hover-preview-content {
    background-color: #000000;
    border: 1px solid #ffffff;
  }
  
  .video-hover-preview-arrow {
    border-bottom-color: #ffffff;
  }
  
  .video-hover-preview-bottom .video-hover-preview-arrow {
    border-top-color: #ffffff;
  }
  
  .video-hover-preview-frame-number,
  .video-hover-preview-time {
    color: #ffffff;
  }
  
  .video-hover-preview-shot-name {
    color: #ffffff;
  }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .video-hover-preview,
  .video-hover-preview-visible,
  .video-hover-preview-hovered {
    transition: none;
    transform: none;
    opacity: 1;
    visibility: visible;
  }
}

/* Mobile */
@media (max-width: 640px) {
  .video-hover-preview-content {
    max-width: 160px;
    padding: 6px;
  }
  
  .video-hover-preview-thumbnail {
    width: 120px;
    height: 68px;
  }
  
  .video-hover-preview-arrow {
    border-left-width: 6px;
    border-right-width: 6px;
    border-bottom-width: 6px;
  }
  
  .video-hover-preview-bottom .video-hover-preview-arrow {
    border-top-width: 6px;
  }
}

/* Focus styles */
.video-hover-preview:focus {
  outline: 2px solid #6366f1;
  outline-offset: 2px;
}

/* Animation keyframes */
@keyframes video-hover-preview-fade-in {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

.video-hover-preview:not(.video-hover-preview-bottom).video-hover-preview-visible {
  animation: video-hover-preview-fade-in var(--animation-duration, 150ms) ease-out;
}

@keyframes video-hover-preview-fade-in-bottom {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

.video-hover-preview.video-hover-preview-bottom.video-hover-preview-visible {
  animation: video-hover-preview-fade-in-bottom var(--animation-duration, 150ms) ease-out;
}
