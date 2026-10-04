import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { AudioEffectsPanel } from '../AudioEffectsPanel';
import { AssetLibrary } from '../AssetLibrary';
import { CanvasArea } from '../CanvasArea';
import { KeyframeEditor } from '../editor/tools/KeyframeEditor';
import { useAppStore } from '@/stores/useAppStore';
import { useEditorStore } from '@/stores/editorStore';
import type { Asset } from '@/types';

vi.unmock('lucide-react');

// These graphics boundaries are outside the state/control behavior under test.
// Keep the actual React hooks, stores, Radix controls, DnD provider and icons.
vi.mock('@/components/gridEditor', () => ({ GridEditorCanvas: () => null }));
vi.mock('@/components/Timeline', () => ({ Timeline: () => null }));
vi.mock('@/components/editor/effects', () => ({ EffectPreviewRenderer: () => null }));

const initialApp = useAppStore.getInitialState();
const initialEditor = useEditorStore.getInitialState();

beforeEach(() => {
  useAppStore.setState(initialApp);
  useEditorStore.setState(initialEditor);
});

afterEach(() => {
  useAppStore.setState(initialApp);
  useEditorStore.setState(initialEditor);
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('audio effect controls', () => {
  it('selects, disables, previews, applies and removes the same effect', async () => {
    const user = userEvent.setup();
    const onApplyEffects = vi.fn();
    const onPreviewEffect = vi.fn();
    render(<AudioEffectsPanel onApplyEffects={onApplyEffects} onPreviewEffect={onPreviewEffect} />);

    expect(screen.getByRole('button', { name: 'Apply Effects (0)' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Gain', exact: true }));
    expect(screen.getByText('Gain Parameters')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Disable Gain' }));
    expect(screen.getByText('Off')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Preview Gain' }));
    expect(onPreviewEffect).toHaveBeenCalledWith(expect.objectContaining({
      type: 'gain', enabled: false, parameters: { gain_db: 0 },
    }));
    await user.click(screen.getByRole('button', { name: 'Apply Effects (0)' }));
    expect(onApplyEffects).toHaveBeenCalledWith([onPreviewEffect.mock.calls[0][0]]);
    await user.click(screen.getByRole('button', { name: 'Remove Gain' }));
    expect(screen.queryByText('Gain Parameters')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Apply Effects (0)' })).toBeDisabled();
  });
});

describe('keyframe controls', () => {
  const props = (): React.ComponentProps<typeof KeyframeEditor> => ({
    properties: [], duration: 10, currentTime: 2,
    onPropertyUpdate: vi.fn(), onKeyframeAdd: vi.fn(), onKeyframeUpdate: vi.fn(),
    onKeyframeRemove: vi.fn(), onPlayPause: vi.fn(), onSeek: vi.fn(),
  });

  it('calls the parent on play/pause and cancels its scheduled preview frame', async () => {
    const user = userEvent.setup();
    const requestFrame = vi.fn(() => 7);
    const cancelFrame = vi.fn();
    vi.stubGlobal('requestAnimationFrame', requestFrame);
    vi.stubGlobal('cancelAnimationFrame', cancelFrame);
    const callbacks = props();
    render(<KeyframeEditor {...callbacks} />);
    await user.click(screen.getByRole('button', { name: 'Play preview' }));
    expect(requestFrame).toHaveBeenCalledOnce();
    await user.click(screen.getByRole('button', { name: 'Pause preview' }));
    expect(callbacks.onPlayPause).toHaveBeenCalledTimes(2);
    expect(cancelFrame).toHaveBeenCalledWith(7);
    expect(screen.getByRole('button', { name: 'Play preview' })).toBeInTheDocument();
  });

  it('updates the displayed zoom through the real state hook', async () => {
    const user = userEvent.setup();
    render(<KeyframeEditor {...props()} />);
    expect(screen.getByText('100%')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Zoom in' }));
    expect(screen.getByText('150%')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Zoom out' }));
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('renders frozen keyframes without sorting the parent array and adds at the current time', async () => {
    const user = userEvent.setup();
    const callbacks = props();
    const keyframes: React.ComponentProps<typeof KeyframeEditor>['properties'][number]['keyframes'] = [
      { id: 'later', time: 4, value: 50, easing: 'linear' },
      { id: 'earlier', time: 1, value: 25, easing: 'linear' },
    ];
    Object.freeze(keyframes);
    callbacks.properties = [{
      id: 'opacity', name: 'Opacity', unit: '%', min: 0, max: 100,
      defaultValue: 100, color: '#000000', keyframes, enabled: true,
    }];
    render(<KeyframeEditor {...callbacks} />);
    expect(keyframes.map((frame) => frame.id)).toEqual(['later', 'earlier']);
    await user.click(screen.getByRole('button', { name: 'Add Keyframe' }));
    expect(callbacks.onKeyframeAdd).toHaveBeenCalledWith('opacity', {
      time: 2, value: 100, easing: 'linear',
    });
  });
});

describe('asset category and search state', () => {
  const assets: Asset[] = [
    { id: 'image', name: 'Forest frame', type: 'image', url: '/forest.png' },
    { id: 'audio', name: 'Dialogue track', type: 'audio', url: '/dialogue.wav' },
    { id: 'template', name: 'Blank layout', type: 'template', url: '/layout.json' },
    { id: 'transition', name: 'Fade preset', type: 'template', url: '/fade.json',
      metadata: { subcategory: 'transition' } },
  ];

  const openLibrary = () => render(
    <DndProvider backend={HTML5Backend}><AssetLibrary assets={assets} /></DndProvider>,
  );

  it('filters images and general templates without mixing transition presets', async () => {
    const user = userEvent.setup();
    openLibrary();
    await user.click(screen.getByRole('tab', { name: /Images/ }));
    expect(screen.getByText('Forest frame')).toBeInTheDocument();
    expect(screen.queryByText('Dialogue track')).not.toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: /^Templates/ }));
    expect(screen.getByText('Blank layout')).toBeInTheDocument();
    expect(screen.queryByText('Fade preset')).not.toBeInTheDocument();
    expect(screen.queryByText('Forest frame')).not.toBeInTheDocument();
  });

  it('applies the last rapid search value after debouncing', async () => {
    openLibrary();
    const search = screen.getByPlaceholderText('Search assets...');
    fireEvent.change(search, { target: { value: 'Forest' } });
    fireEvent.change(search, { target: { value: 'Dialogue' } });
    await waitFor(() => expect(screen.queryByText('Forest frame')).not.toBeInTheDocument());
    expect(screen.getByText('Dialogue track')).toBeInTheDocument();
    expect(screen.queryByText('Blank layout')).not.toBeInTheDocument();
  });
});

describe('canvas store bindings', () => {
  it('opens the existing shot wizard with the requested context', async () => {
    const user = userEvent.setup();
    render(<CanvasArea onBackToDashboard={vi.fn()} />);
    expect(screen.getByText('No shots yet')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Create shot with AI assistant' }));
    expect(useAppStore.getState().showShotWizard).toBe(true);
    expect(useAppStore.getState().shotWizardContext).toEqual({ mode: 'create', sourceLocation: 'storyboard' });
  });

  it('selects, duplicates, toggles and removes an effect in the canvas stack', async () => {
    const user = userEvent.setup();
    render(<CanvasArea onBackToDashboard={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Effects', exact: true }));
    await user.click(screen.getByRole('button', { name: 'Blur Effect' }));
    await user.click(screen.getByText('Blur', { exact: true }));
    await user.click(screen.getByRole('button', { name: 'Duplicate effect' }));
    expect(screen.getByText('Blur (Copie)')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Disable effect' }));
    expect(screen.getByRole('button', { name: 'Enable effect' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Delete effect' }));
    expect(screen.queryByText('Blur', { exact: true })).not.toBeInTheDocument();
    expect(screen.getByText('Blur (Copie)')).toBeInTheDocument();
  });
});
