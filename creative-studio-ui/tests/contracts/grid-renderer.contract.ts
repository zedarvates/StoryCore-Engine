import type { ComponentProps } from 'react';
import { GridRenderer } from '../../src/components/gridEditor/GridRenderer';
import { PanelRenderer } from '../../src/components/gridEditor/PanelRenderer';
import { createEmptyPanel } from '../../src/types/gridEditor.factories';
import { DEFAULT_VIEWPORT_STATE } from '../../src/types/gridEditor';
import type { CropRegion, DrawingElement, Transform } from '../../src/types/gridEditor';

const panel = createEmptyPanel(0, 0);
const grid: ComponentProps<typeof GridRenderer> = {
  panels: [panel], selectedPanelIds: [], viewport: DEFAULT_VIEWPORT_STATE,
  onPanelClick: (id, event) => { void id; void event.shiftKey; },
};
const individual: ComponentProps<typeof PanelRenderer> = { panel, width: 100, height: 100 };
void grid; void individual;

// @ts-expect-error Crop geometry remains numeric.
const badCrop: CropRegion = { x: 0, y: 0, width: 'half', height: 1 };
// @ts-expect-error Transform scale retains both numeric coordinates.
const badTransform: Transform = { ...panel.transform, scale: { x: 1, y: 'one' } };
// @ts-expect-error Annotation points use the existing geometry contract.
const badDrawing: DrawingElement = { id: 'line', type: 'line', points: ['0,0'], style: { strokeColor: '#000', strokeWidth: 1, opacity: 1 } };
void badCrop; void badTransform; void badDrawing;
