// ============================================================================
// Drag and Drop Item Types
// ============================================================================

export const DND_ITEM_TYPES = {
  ASSET: 'ASSET',
  SHOT: 'SHOT',
  TASK: 'TASK',
} as const;

export type DndItemType = typeof DND_ITEM_TYPES[keyof typeof DND_ITEM_TYPES];

// ============================================================================
// Drag Item Interfaces
// ============================================================================

export interface AssetDragItem {
  type: typeof DND_ITEM_TYPES.ASSET;
  asset: {
    id: string;
    name: string;
    type: 'image' | 'audio' | 'template';
    url: string;
    thumbnail?: string;
    metadata?: Record<string, any>;
  };
}

export interface ShotDragItem {
  type: typeof DND_ITEM_TYPES.SHOT;
  shotId: string;
  index: number;
}

export interface TaskDragItem {
  type: typeof DND_ITEM_TYPES.TASK;
  taskId: string;
  index: number;
}

export type DragItem = AssetDragItem | ShotDragItem | TaskDragItem;
