import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import timelineReducer, { addShot, selectShot } from '../../store/slices/timelineSlice';
import ShotConfigPanel from '../ShotConfigPanel';

// Mock the toast hook to capture toast calls
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
});

// Helper to create a store with a selected shot
const createTestStore = () => {
  const store = configureStore({
    reducer: { timeline: timelineReducer },
  });
  // Add a shot and select it
  const shot = {
    id: 'shot-1',
    name: 'Test Shot',
    prompt: '',
    referenceImages: [],
    parameters: { seed: 0, denoising: 0.75, steps: 30, guidance: 7.5 },
    sheet: {},
  };
  store.dispatch(addShot(shot as any));
  // Assume selectedElements is managed elsewhere; for simplicity we set it via a direct state mutation
  // In real code you would have a selector for selectedShot; here we mock the selector via useAppSelector
  // We'll mock the selector later in the test using jest.spyOn
  return { store, shot };
};

// Mock useAppSelector to return the selected shot from our test store
jest.mock('../../store', () => {
  const actual = jest.requireActual('../../store');
  return {
    ...actual,
    useAppSelector: jest.fn((selector) => {
      // Simple implementation: if selector accesses state.timeline.selectedElements, return ['shot-1']
      // and state.timeline.shots, return [shot]
      const state = {
        timeline: {
          shots: [
            {
              id: 'shot-1',
              name: 'Test Shot',
              prompt: '',
              referenceImages: [],
              parameters: { seed: 0, denoising: 0.75, steps: 30, guidance: 7.5 },
              sheet: {},
            },
          ],
          selectedElements: ['shot-1'],
          sequences: [],
          currentSequenceId: null,
        },
      };
      return selector(state);
    }),
    useAppDispatch: () => jest.fn(),
  };
});

describe('ShotConfigPanel integration - conversion flow', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  test('shows success toast on successful conversion', async () => {
    const mockResponse = {
      rigPath: 'path/to/rig',
      boneCount: 10,
      hash: 'abc',
    };
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    } as any);

    const { getByText } = render(
      <Provider store={createTestStore().store}>
        <ShotConfigPanel />
      </Provider>
    );

    const button = getByText('Convertir en marionnette');
    fireEvent.click(button);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    // Verify toast was called with success message
    const { useToast } = require('@/hooks/use-toast');
    const toastMock = useToast().toast;
    expect(toastMock).toHaveBeenCalledWith({
      title: 'Rig generated',
      description: 'Rig successfully created and loaded.',
      variant: 'default',
    });
  });

  test('shows error toast on conversion failure', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      text: async () => 'Server error',
    } as any);

    const { getByText } = render(
      <Provider store={createTestStore().store}>
        <ShotConfigPanel />
      </Provider>
    );

    const button = getByText('Convertir en marionnette');
    fireEvent.click(button);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    const { useToast } = require('@/hooks/use-toast');
    const toastMock = useToast().toast;
    expect(toastMock).toHaveBeenCalledWith({
      title: 'Conversion error',
      description: expect.any(String),
      variant: 'destructive',
    });
  });
});
