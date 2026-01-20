/**
 * DragDropManager - Enhanced Drag and Drop System
 * 
 * Manages drag and drop operations with:
 * - Visual feedback (semi-transparent preview, drop indicators)
 * - Snap-to-grid positioning
 * - Auto-scroll at edges
 * - Copy mode with Ctrl key
 * - Cancel with Escape key
 * 
 * Validates: Requirements 2.1, 2.2, 2.3, 2.7
 */

import type { Shot, ProductionShot } from '../../types/shot';
import type {
  DragDropConfig,
  Position,
  DropTarget,
  DragState,
  GridLayoutConfig,
} from '../../types/gridEditorAdvanced';

export class DragDropManager {
  private config: DragDropConfig;
  private state: DragState;
  private autoScrollInterval: number | null = null;
  private readonly AUTO_SCROLL_SPEED = 10; // pixels per interval
  private readonly AUTO_SCROLL_ZONE = 50; // pixels from edge
  private readonly AUTO_SCROLL_INTERVAL = 16; // ~60fps

  constructor(config: DragDropConfig) {
    this.config = config;
    this.state = {
      isDragging: false,
      draggedItems: [],
      dragPreview: null,
      dropTarget: null,
      isValidDrop: false,
      isCopyMode: false,
    };
  }

  /**
   * Start a drag operation
   * Validates: Requirement 2.1 - Display semi-transparent preview
   */
  startDrag(
    items: ProductionShot[],
    event: DragEvent | React.DragEvent,
    gridConfig?: GridLayoutConfig
  ): void {
    if (!this.config.allowMultiple && items.length > 1) {
      items = [items[0]];
    }

    this.state = {
      isDragging: true,
      draggedItems: items,
      dragPreview: null,
      dropTarget: null,
      isValidDrop: false,
      isCopyMode: event.ctrlKey || event.metaKey,
    };

    // Create ghost element for preview
    this.createGhostElement(items, event);

    // Add event listeners
    document.addEventListener('mousemove', this.handleMouseMove);
    document.addEventListener('mouseup', this.handleMouseUp);
    document.addEventListener('keydown', this.handleKeyDown);
    document.addEventListener('keyup', this.handleKeyUp);

    // Prevent default drag behavior
    event.preventDefault();
  }

  /**
   * Update drag position and state
   * Validates: Requirement 2.2, 2.3 - Show drop indicators
   */
  updateDrag(event: MouseEvent | React.MouseEvent, gridConfig?: GridLayoutConfig): void {
    if (!this.state.isDragging) return;

    const position: Position = {
      x: event.clientX,
      y: event.clientY,
    };

    // Apply snap-to-grid if enabled
    const finalPosition = this.config.snapToGrid && gridConfig
      ? this.snapToGrid(position, gridConfig)
      : position;

    // Update ghost element position
    this.updateGhostPosition(finalPosition);

    // Check for valid drop target
    const dropTarget = this.findDropTarget(finalPosition);
    const isValidDrop = this.canDropInZone(dropTarget);

    this.state = {
      ...this.state,
      dropTarget,
      isValidDrop,
    };

    // Update visual feedback
    this.updateDropIndicators(dropTarget, isValidDrop);

    // Handle auto-scroll at edges
    if (this.config.autoScroll) {
      this.handleAutoScroll(event);
    }
  }

  /**
   * End drag operation and execute drop
   * Validates: Requirement 2.4 - Animate transition to new position
   */
  endDrag(event: MouseEvent | React.MouseEvent): void {
    if (!this.state.isDragging) return;

    const { dropTarget, isValidDrop, draggedItems, isCopyMode } = this.state;

    if (dropTarget && isValidDrop) {
      this.executeDrop(dropTarget, draggedItems, isCopyMode);
    }

    this.cleanup();
  }

  /**
   * Cancel drag operation
   * Validates: Requirement 2.8 - Restore initial state with animation
   */
  cancelDrag(): void {
    if (!this.state.isDragging) return;

    // Animate ghost element back to original position
    this.animateGhostToOriginal();

    // Clean up after animation
    setTimeout(() => {
      this.cleanup();
    }, 300); // Match animation duration
  }

  /**
   * Calculate snap-to-grid position
   * Validates: Requirement 2.7 - Snap-to-grid positioning
   */
  private snapToGrid(position: Position, gridConfig: GridLayoutConfig): Position {
    if (!gridConfig.snapEnabled) {
      return position;
    }

    const { cellSize, gap } = gridConfig;
    const cellWidth = cellSize.width + gap;
    const cellHeight = cellSize.height + gap;

    const col = Math.round(position.x / cellWidth);
    const row = Math.round(position.y / cellHeight);

    const snappedX = col * cellWidth;
    const snappedY = row * cellHeight;

    // Check if within snap threshold
    const distance = Math.sqrt(
      Math.pow(position.x - snappedX, 2) + Math.pow(position.y - snappedY, 2)
    );

    if (distance <= gridConfig.snapThreshold) {
      return { x: snappedX, y: snappedY };
    }

    return position;
  }

  /**
   * Handle auto-scroll at screen edges
   * Validates: Requirement 2.7 - Auto-scroll at edges
   */
  private handleAutoScroll(event: MouseEvent | React.MouseEvent): void {
    const { clientX, clientY } = event;
    const { innerWidth, innerHeight } = window;

    let scrollX = 0;
    let scrollY = 0;

    // Check left edge
    if (clientX < this.AUTO_SCROLL_ZONE) {
      scrollX = -this.AUTO_SCROLL_SPEED;
    }
    // Check right edge
    else if (clientX > innerWidth - this.AUTO_SCROLL_ZONE) {
      scrollX = this.AUTO_SCROLL_SPEED;
    }

    // Check top edge
    if (clientY < this.AUTO_SCROLL_ZONE) {
      scrollY = -this.AUTO_SCROLL_SPEED;
    }
    // Check bottom edge
    else if (clientY > innerHeight - this.AUTO_SCROLL_ZONE) {
      scrollY = this.AUTO_SCROLL_SPEED;
    }

    // Start or update auto-scroll
    if (scrollX !== 0 || scrollY !== 0) {
      if (!this.autoScrollInterval) {
        this.autoScrollInterval = window.setInterval(() => {
          window.scrollBy(scrollX, scrollY);
        }, this.AUTO_SCROLL_INTERVAL);
      }
    } else {
      this.stopAutoScroll();
    }
  }

  private stopAutoScroll(): void {
    if (this.autoScrollInterval) {
      clearInterval(this.autoScrollInterval);
      this.autoScrollInterval = null;
    }
  }

  /**
   * Create ghost element for drag preview
   */
  private createGhostElement(items: ProductionShot[], event: DragEvent | React.DragEvent): void {
    const ghost = document.createElement('div');
    ghost.id = 'drag-ghost';
    ghost.style.position = 'fixed';
    ghost.style.pointerEvents = 'none';
    ghost.style.zIndex = '9999';
    ghost.style.opacity = '0.6';
    ghost.style.transform = 'translate(-50%, -50%)';
    ghost.style.transition = 'none';

    // Create preview content
    if (items.length === 1) {
      ghost.innerHTML = `
        <div style="
          background: white;
          border: 2px solid #3b82f6;
          border-radius: 8px;
          padding: 12px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          min-width: 150px;
        ">
          <div style="font-weight: 600; color: #1f2937;">Shot ${items[0].number}</div>
          <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">
            ${items[0].type}
          </div>
        </div>
      `;
    } else {
      ghost.innerHTML = `
        <div style="
          background: white;
          border: 2px solid #3b82f6;
          border-radius: 8px;
          padding: 12px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          min-width: 100px;
          text-align: center;
        ">
          <div style="font-weight: 600; color: #1f2937; font-size: 18px;">
            ${items.length}
          </div>
          <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">
            items
          </div>
        </div>
      `;
    }

    ghost.style.left = `${event.clientX}px`;
    ghost.style.top = `${event.clientY}px`;

    document.body.appendChild(ghost);
  }

  private updateGhostPosition(position: Position): void {
    const ghost = document.getElementById('drag-ghost');
    if (ghost) {
      ghost.style.left = `${position.x}px`;
      ghost.style.top = `${position.y}px`;
    }
  }

  private animateGhostToOriginal(): void {
    const ghost = document.getElementById('drag-ghost');
    if (ghost) {
      ghost.style.transition = 'all 0.3s ease-out';
      ghost.style.opacity = '0';
      ghost.style.transform = 'translate(-50%, -50%) scale(0.8)';
    }
  }

  /**
   * Find drop target at position
   */
  private findDropTarget(position: Position): DropTarget | null {
    const elements = document.elementsFromPoint(position.x, position.y);
    
    for (const element of elements) {
      if (element.hasAttribute('data-drop-target')) {
        return {
          id: element.getAttribute('data-drop-target-id') || '',
          type: element.getAttribute('data-drop-target-type') || '',
          position,
        };
      }
    }

    return null;
  }

  /**
   * Check if drop is valid in target zone
   */
  private canDropInZone(dropTarget: DropTarget | null): boolean {
    if (!dropTarget) return false;

    // Add custom validation logic here
    // For now, accept all drop targets
    return true;
  }

  /**
   * Update visual drop indicators
   * Validates: Requirement 2.2, 2.3 - Show valid/invalid indicators
   */
  private updateDropIndicators(dropTarget: DropTarget | null, isValid: boolean): void {
    // Remove previous indicators
    document.querySelectorAll('.drop-indicator').forEach(el => el.remove());

    if (!dropTarget) return;

    const elements = document.elementsFromPoint(dropTarget.position.x, dropTarget.position.y);
    const targetElement = elements.find(el => el.hasAttribute('data-drop-target'));

    if (targetElement) {
      const indicator = document.createElement('div');
      indicator.className = 'drop-indicator';
      indicator.style.position = 'absolute';
      indicator.style.pointerEvents = 'none';
      indicator.style.zIndex = '9998';
      indicator.style.border = `2px ${isValid ? 'solid' : 'dashed'} ${isValid ? '#10b981' : '#ef4444'}`;
      indicator.style.borderRadius = '4px';
      indicator.style.backgroundColor = isValid ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)';

      const rect = targetElement.getBoundingClientRect();
      indicator.style.left = `${rect.left}px`;
      indicator.style.top = `${rect.top}px`;
      indicator.style.width = `${rect.width}px`;
      indicator.style.height = `${rect.height}px`;

      document.body.appendChild(indicator);
    }
  }

  /**
   * Execute the drop operation
   */
  private executeDrop(
    dropTarget: DropTarget,
    items: ProductionShot[],
    isCopyMode: boolean
  ): void {
    // Dispatch custom event with drop data
    const event = new CustomEvent('dragdrop:complete', {
      detail: {
        dropTarget,
        items,
        isCopyMode,
        position: dropTarget.position,
      },
    });

    document.dispatchEvent(event);
  }

  /**
   * Clean up drag operation
   */
  private cleanup(): void {
    // Remove ghost element
    const ghost = document.getElementById('drag-ghost');
    if (ghost) {
      ghost.remove();
    }

    // Remove drop indicators
    document.querySelectorAll('.drop-indicator').forEach(el => el.remove());

    // Stop auto-scroll
    this.stopAutoScroll();

    // Remove event listeners
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('mouseup', this.handleMouseUp);
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('keyup', this.handleKeyUp);

    // Reset state
    this.state = {
      isDragging: false,
      draggedItems: [],
      dragPreview: null,
      dropTarget: null,
      isValidDrop: false,
      isCopyMode: false,
    };
  }

  /**
   * Event handlers (bound to instance)
   */
  private handleMouseMove = (event: MouseEvent) => {
    this.updateDrag(event);
  };

  private handleMouseUp = (event: MouseEvent) => {
    this.endDrag(event);
  };

  private handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      this.cancelDrag();
    } else if (event.key === 'Control' || event.key === 'Meta') {
      this.state.isCopyMode = true;
      this.updateCopyIndicator(true);
    }
  };

  private handleKeyUp = (event: KeyboardEvent) => {
    if (event.key === 'Control' || event.key === 'Meta') {
      this.state.isCopyMode = false;
      this.updateCopyIndicator(false);
    }
  };

  /**
   * Update copy mode indicator
   */
  private updateCopyIndicator(isCopyMode: boolean): void {
    const ghost = document.getElementById('drag-ghost');
    if (ghost) {
      if (isCopyMode) {
        ghost.style.border = '2px dashed #3b82f6';
        // Add copy icon indicator
        let copyIcon = ghost.querySelector('.copy-icon');
        if (!copyIcon) {
          copyIcon = document.createElement('div');
          copyIcon.className = 'copy-icon';
          copyIcon.innerHTML = '📋';
          copyIcon.setAttribute('style', `
            position: absolute;
            top: -10px;
            right: -10px;
            background: #3b82f6;
            color: white;
            border-radius: 50%;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
          `);
          ghost.appendChild(copyIcon);
        }
      } else {
        ghost.style.border = 'none';
        const copyIcon = ghost.querySelector('.copy-icon');
        if (copyIcon) {
          copyIcon.remove();
        }
      }
    }
  }

  /**
   * Get current drag state
   */
  getState(): DragState {
    return { ...this.state };
  }

  /**
   * Check if currently dragging
   */
  isDragging(): boolean {
    return this.state.isDragging;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<DragDropConfig>): void {
    this.config = { ...this.config, ...config };
  }
}
