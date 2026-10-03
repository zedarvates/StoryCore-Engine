import { useMemo } from 'react';
import { bindActionCreators } from '@reduxjs/toolkit';
import { useAppDispatch, useAppSelector } from '..';
import { panelsActions } from '../slices/panelsSlice';
import { toolsActions } from '../slices/toolsSlice';
import { chatActions } from '../slices/chatSlice';

/** Use the registered Redux slices shared by the editor, toolbar and assistant. */
export function usePanelsControls() {
  const state = useAppSelector((root) => root.panels);
  const dispatch = useAppDispatch();
  const actions = useMemo(() => bindActionCreators(panelsActions, dispatch), [dispatch]);
  return { ...state, ...actions };
}

export function useToolsControls() {
  const state = useAppSelector((root) => root.tools);
  const dispatch = useAppDispatch();
  const actions = useMemo(() => bindActionCreators(toolsActions, dispatch), [dispatch]);
  return { ...state, ...actions };
}

export function useChatControls() {
  const state = useAppSelector((root) => root.chat);
  const dispatch = useAppDispatch();
  const actions = useMemo(() => bindActionCreators(chatActions, dispatch), [dispatch]);
  return { ...state, ...actions };
}
