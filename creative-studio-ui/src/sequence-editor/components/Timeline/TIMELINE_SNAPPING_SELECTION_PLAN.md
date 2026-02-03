# Timeline Snapping & Selection Implementation Plan

**Date:** Janvier 2026
**Priorité:** HAUTE

## Objectif
Implémenter le snapping behavior et selection handling pour améliorer l'expérience utilisateur de la Timeline.

## Fonctionnalités à Implémenter

### 1. Snapping Behavior
- [ ] Snapping des shots lors du drag
- [ ] Snapping des keyframes
- [ ] Visual feedback pendant le snapping
- [ ] Snap threshold configurable

### 2. Selection Handling
- [ ] Selection box (框选)
- [ ] Selection multiple avec Shift/Ctrl
- [ ] Visual feedback pour sélection
- [ ] Select all (Ctrl+A)
- [ ] Deselect all (Escape)

## Modifications à Effectuer

### Fichier: Timeline.tsx

#### 1. Ajouter states pour selection box
```typescript
const [selectionBox, setSelectionBox] = useState<{
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  active: boolean;
} | null>(null);
```

#### 2. Ajouter states pour drag des shots
```typescript
const [draggingShotId, setDraggingShotId] = useState<string | null>(null);
const [dragOffset, setDragOffset] = useState<number>(0);
const [snappedPosition, setSnappedPosition] = useState<number | null>(null);
```

#### 3. Implémenter snapping logic
```typescript
const calculateSnappedPosition = (position: number, threshold: number = PLAYHEAD_SNAP_THRESHOLD): number => {
  const frame = position / zoomLevel;
  const snappedFrame = Math.round(frame);
  
  // Vérifier proximité avec les autres shots
  // Retourner position snapée si applicable
  return snappedFrame * zoomLevel;
};
```

#### 4. Implémenter selection box
```typescript
const handleSelectionBoxMouseDown = (e: React.MouseEvent) => {
  const rect = contentAreaRef.current?.getBoundingClientRect();
  if (!rect) return;
  
  setSelectionBox({
    startX: e.clientX - rect.left,
    startY: e.clientY - rect.top,
    currentX: e.clientX - rect.left,
    currentY: e.clientY - rect.top,
    active: true,
  });
};

const handleSelectionBoxMouseMove = (e: React.MouseEvent) => {
  // Update selection box position
};

const handleSelectionBoxMouseUp = () => {
  // Sélectionner tous les shots dans la box
  setSelectionBox(null);
};
```

## Progression
- [ ] Plan créé
- [ ] Implémenter states
- [ ] Implémenter snapping logic
- [ ] Implémenter selection box
- [ ] Ajouter keyboard shortcuts
- [ ] Build et validation

