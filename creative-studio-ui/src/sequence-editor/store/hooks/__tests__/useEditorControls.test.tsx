import { act, renderHook } from '@testing-library/react';
import { Provider } from 'react-redux';
import type { ReactNode } from 'react';
import { configureStore } from '@reduxjs/toolkit';
import { describe, expect, it } from 'vitest';
import panels from '../../slices/panelsSlice';
import tools from '../../slices/toolsSlice';
import chat from '../../slices/chatSlice';
import { store as registeredStore } from '../..';
import { usePanelsControls, useToolsControls, useChatControls } from '../useEditorControls';

function setup() {
  const store = configureStore({ reducer: { panels, tools, chat } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );
  return { store, wrapper };
}

describe('shared editor controls', () => {
  it('registers chat in the application store', () => {
    expect(registeredStore.getState().chat.messages[0].role).toBe('assistant');
  });

  it('keeps panel changes visible to independent toolbar/editor consumers', () => {
    const { store, wrapper } = setup();
    const toolbar = renderHook(() => usePanelsControls(), { wrapper });
    const editor = renderHook(() => usePanelsControls(), { wrapper });
    act(() => toolbar.result.current.toggleLibrary());
    expect(editor.result.current.libraryVisible).toBe(false);
    expect(store.getState().panels.libraryVisible).toBe(false);
    act(() => editor.result.current.toggleInspector());
    expect(toolbar.result.current.inspectorVisible).toBe(false);
  });

  it('uses the existing production-layout reducer for both consumers', () => {
    const { wrapper } = setup();
    const toolbar = renderHook(() => usePanelsControls(), { wrapper });
    const editor = renderHook(() => usePanelsControls(), { wrapper });
    act(() => toolbar.result.current.toggleProductionStudioMode());
    expect(editor.result.current.productionStudioMode).toBe(true);
    expect(editor.result.current.libraryVisible).toBe(false);
    expect(editor.result.current.inspectorVisible).toBe(false);
    act(() => toolbar.result.current.toggleProductionStudioMode());
    expect(editor.result.current.libraryVisible).toBe(true);
    expect(editor.result.current.inspectorVisible).toBe(true);
  });

  it('shares tool selection with the timeline Redux state', () => {
    const { store, wrapper } = setup();
    const toolbar = renderHook(() => useToolsControls(), { wrapper });
    act(() => toolbar.result.current.setActiveTool('cut'));
    expect(store.getState().tools.activeTool).toBe('cut');
    expect(toolbar.result.current.activeTool).toBe('cut');
  });

  it('shares messages and visibility between editor and compact assistant', () => {
    const { store, wrapper } = setup();
    const editor = renderHook(() => useChatControls(), { wrapper });
    const assistant = renderHook(() => useChatControls(), { wrapper });
    act(() => {
      editor.result.current.addMessage({ role: 'user', content: 'Préparer la scène' });
      editor.result.current.setIsOpen(false);
    });
    expect(assistant.result.current.messages.at(-1)?.content).toBe('Préparer la scène');
    expect(assistant.result.current.isOpen).toBe(false);
    expect(store.getState().chat.messages).toHaveLength(2);
    act(() => assistant.result.current.setIsMinimized(true));
    expect(editor.result.current.isMinimized).toBe(true);
  });

  it('keeps action identities stable across state updates', () => {
    const { wrapper } = setup();
    const controls = renderHook(() => usePanelsControls(), { wrapper });
    const toggle = controls.result.current.toggleGrid;
    act(() => toggle());
    expect(controls.result.current.toggleGrid).toBe(toggle);
    expect(controls.result.current.gridVisible).toBe(false);
  });
});
