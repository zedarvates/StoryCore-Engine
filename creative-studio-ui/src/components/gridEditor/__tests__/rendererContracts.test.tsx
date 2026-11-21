import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, waitFor } from '@testing-library/react';
import { GridRenderer } from '../GridRenderer';
import { PanelRenderer } from '../PanelRenderer';
import { createEmptyPanel, createImageLayer } from '@/types/gridEditor.factories';
import { DEFAULT_VIEWPORT_STATE } from '@/types/gridEditor';
import type { AnnotationContent, DrawingElement, Layer, Panel } from '@/types/gridEditor';

// Replace only native graphics/image-loading boundaries. Hooks, component
// effects, prop updates and pointer handlers are the real implementations.
function canvasRecorder() {
  const state = { alpha: 1, blend: 'source-over' as GlobalCompositeOperation };
  const stack: typeof state[] = [];
  const strokes: typeof state[] = [];
  const context = {
    get globalAlpha() { return state.alpha; },
    set globalAlpha(value: number) { state.alpha = value; },
    get globalCompositeOperation() { return state.blend; },
    set globalCompositeOperation(value: GlobalCompositeOperation) { state.blend = value; },
    save: vi.fn(() => stack.push({ ...state })),
    restore: vi.fn(() => Object.assign(state, stack.pop())),
    scale: vi.fn(), clearRect: vi.fn(), fillRect: vi.fn(), strokeRect: vi.fn(),
    fillText: vi.fn(), measureText: vi.fn(() => ({ width: 100 })),
    translate: vi.fn(), rotate: vi.fn(), drawImage: vi.fn(),
    beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(),
    stroke: vi.fn(() => strokes.push({ ...state })),
    fill: vi.fn(), ellipse: vi.fn(), setLineDash: vi.fn(),
  };
  return { context, strokes };
}

const rendererNames = ['grid', 'panel'] as const;
type RendererName = typeof rendererNames[number];
let graphics: ReturnType<typeof canvasRecorder>;
let images: HTMLImageElement[];

beforeEach(() => {
  graphics = canvasRecorder();
  images = [];
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext')
    .mockReturnValue(graphics.context as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    x: 10, y: 20, left: 10, top: 20, right: 310, bottom: 320,
    width: 300, height: 300, toJSON: () => ({}),
  });
  vi.stubGlobal('Image', vi.fn(function () {
    const image = document.createElement('img');
    Object.defineProperties(image, {
      naturalWidth: { value: 400 }, naturalHeight: { value: 200 },
    });
    images.push(image);
    return image;
  }));
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function subject(name: RendererName, panel: Panel, onLoad?: () => void) {
  return name === 'grid'
    ? <GridRenderer panels={[panel]} selectedPanelIds={[]} viewport={DEFAULT_VIEWPORT_STATE} onPanelClick={vi.fn()} />
    : <PanelRenderer panel={panel} width={100} height={100} onLoad={onLoad} />;
}

function annotationPanel(content: Partial<AnnotationContent> = {}, overrides: Partial<Layer> = {}) {
  const panel = createEmptyPanel(0, 0);
  panel.layers = [{
    id: 'annotation', name: 'Caption', type: 'annotation', visible: true,
    locked: false, opacity: 1, blendMode: 'normal',
    content: {
      type: 'annotation', drawings: [],
      textAnnotations: [{ id: 'caption', text: 'Current caption', position: { x: 0.1, y: 0.2 },
        style: { fontSize: 16, fontFamily: 'sans-serif', color: '#000000' } }],
      ...content,
    },
    ...overrides,
  }];
  return panel;
}

const drawingStyle: DrawingElement['style'] = {
  strokeColor: '#000000', strokeWidth: 2, opacity: 1,
};

describe.each(rendererNames)('%s renderer layer contract', (name) => {
  it('renders a visible locked caption while hiding an invisible layer', async () => {
    const panel = annotationPanel({}, { locked: true });
    const hidden = annotationPanel({ textAnnotations: [{
      id: 'hidden', text: 'Hidden caption', position: { x: 0, y: 0 },
      style: { fontSize: 16, fontFamily: 'sans-serif', color: '#000000' },
    }] }).layers[0];
    panel.layers.push({ ...hidden, id: 'hidden', visible: false });
    render(subject(name, panel));
    await waitFor(() => expect(graphics.context.fillText).toHaveBeenCalledWith('Current caption', 10, 20));
    expect(graphics.context.fillText.mock.calls.some(([text]) => text === 'Hidden caption')).toBe(false);
  });

  it('uses the normalized crop and cropped aspect ratio after image load', async () => {
    const panel = createEmptyPanel(0, 0);
    panel.layers = [createImageLayer('/fixture.png', 400, 200)];
    panel.crop = { x: 0.25, y: 0, width: 0.5, height: 1 };
    render(subject(name, panel));
    expect(graphics.context.drawImage).not.toHaveBeenCalled();
    expect(images).toHaveLength(1);
    await act(async () => { images[0].dispatchEvent(new Event('load')); });
    expect(graphics.context.drawImage).toHaveBeenCalledWith(images[0], 100, 0, 200, 200, 0, 0, 100, 100);
  });

  it.each([0, 0.25])('composes drawing opacity %s with the layer opacity', async (opacity) => {
    const panel = annotationPanel({ drawings: [{
      id: 'path', type: 'path', points: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
      style: { ...drawingStyle, opacity },
    }] }, { opacity: 0.5, blendMode: 'multiply' });
    render(subject(name, panel));
    await waitFor(() => expect(graphics.strokes.length).toBeGreaterThan(0));
    expect(graphics.strokes).toContainEqual({ alpha: opacity * 0.5, blend: 'multiply' });
  });

  it('skips incomplete shapes and continues drawing a valid line and caption', async () => {
    const panel = annotationPanel({ drawings: [
      { id: 'rectangle', type: 'rectangle', points: [], style: drawingStyle },
      { id: 'ellipse', type: 'ellipse', points: [{ x: 0, y: 0 }], style: drawingStyle },
      { id: 'line', type: 'line', points: [{ x: 0.2, y: 0.3 }, { x: 0.8, y: 0.9 }], style: drawingStyle },
    ] });
    render(subject(name, panel));
    await waitFor(() => expect(graphics.context.lineTo).toHaveBeenCalledWith(80, 90));
    expect(graphics.context.moveTo).toHaveBeenCalledWith(20, 30);
    expect(graphics.context.ellipse).not.toHaveBeenCalled();
    expect(graphics.context.fillText).toHaveBeenCalledWith('Current caption', 10, 20);
  });

  it('does not repaint an obsolete panel or notify its load after props change', async () => {
    const previous = createEmptyPanel(0, 0);
    previous.layers = [createImageLayer('/previous.png', 400, 200)];
    const onLoad = vi.fn();
    const view = render(subject(name, previous, onLoad));
    expect(images).toHaveLength(1);
    view.rerender(subject(name, annotationPanel(), onLoad));
    await waitFor(() => expect(graphics.context.fillText).toHaveBeenCalledWith('Current caption', 10, 20));
    const notifications = onLoad.mock.calls.length;
    await act(async () => { images[0].dispatchEvent(new Event('load')); });
    expect(graphics.context.drawImage).not.toHaveBeenCalled();
    expect(onLoad).toHaveBeenCalledTimes(notifications);
  });

  it('reports a native draw failure after loading without notifying panel load', async () => {
    const panel = createEmptyPanel(0, 0);
    panel.layers = [createImageLayer('/fixture.png', 400, 200)];
    const onLoad = vi.fn();
    const error = new Error('Canvas fixture failure');
    const report = vi.spyOn(console, 'error').mockImplementation(() => {});
    graphics.context.drawImage.mockImplementation(() => { throw error; });
    render(subject(name, panel, onLoad));
    await act(async () => { images[0].dispatchEvent(new Event('load')); });
    expect(report).toHaveBeenCalledWith(name === 'grid' ? 'Grid rendering failed' : 'Panel rendering failed', error);
    expect(onLoad).not.toHaveBeenCalled();
  });
});

describe('grid interactions', () => {
  it('resizes with current panels instead of repainting the initial props', async () => {
    const initial = createEmptyPanel(0, 0);
    const view = render(subject('grid', initial));
    await waitFor(() => expect(graphics.context.fillText).toHaveBeenCalledWith('Panel 1', 50, 50));
    view.rerender(subject('grid', annotationPanel()));
    await waitFor(() => expect(graphics.context.fillText).toHaveBeenCalledWith('Current caption', 10, 20));
    graphics.context.fillText.mockClear();
    fireEvent(window, new Event('resize'));
    expect(graphics.context.fillText).toHaveBeenCalledWith('Current caption', 10, 20);
    expect(graphics.context.fillText.mock.calls.some(([text]) => text === 'Panel 1')).toBe(false);
  });

  it('dispatches click and focus callbacks for the cell at CSS coordinates', () => {
    const panel = createEmptyPanel(2, 1);
    const onPanelClick = vi.fn();
    const onPanelDoubleClick = vi.fn();
    const view = render(<GridRenderer panels={[panel]} selectedPanelIds={[]}
      viewport={DEFAULT_VIEWPORT_STATE} onPanelClick={onPanelClick} onPanelDoubleClick={onPanelDoubleClick} />);
    const canvas = view.container.querySelector('canvas');
    if (!canvas) throw new Error('Grid canvas missing');
    fireEvent.click(canvas, { clientX: 160, clientY: 270, shiftKey: true });
    fireEvent.doubleClick(canvas, { clientX: 160, clientY: 270 });
    expect(onPanelClick).toHaveBeenCalledWith(panel.id, expect.objectContaining({ shiftKey: true }));
    expect(onPanelDoubleClick).toHaveBeenCalledWith(panel.id, expect.anything());
    fireEvent.click(canvas, { clientX: 310, clientY: 270 });
    expect(onPanelClick).toHaveBeenCalledOnce();
  });
});
