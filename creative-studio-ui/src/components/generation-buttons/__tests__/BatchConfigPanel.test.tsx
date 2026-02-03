/**
 * Batch Config Panel Tests
 * 
 * Tests for the batch configuration panel component.
 * Requirements: 11.1, 11.2
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BatchConfigPanel } from '../BatchConfigPanel';
import { useGenerationStore } from '../../../stores/generationStore';

describe('BatchConfigPanel', () => {
  beforeEach(() => {
    // Reset store
    useGenerationStore.setState({
      batchConfig: {
        enabled: false,
        batchSize: 4,
        variationParams: {
          varySeeds: true,
          varyPrompts: false,
          varyParameters: false,
        },
      },
    });
  });

  it('should render batch configuration panel', () => {
    render(<BatchConfigPanel />);
    
    expect(screen.getByText('Batch Generation Settings')).toBeInTheDocument();
    expect(screen.getByText('Enable Batch Generation')).toBeInTheDocument();
  });

  it('should toggle batch mode', () => {
    render(<BatchConfigPanel />);
    
    const toggle = screen.getByRole('switch', { name: /enable batch generation/i });
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    
    fireEvent.click(toggle);
    
    const config = useGenerationStore.getState().batchConfig;
    expect(config.enabled).toBe(true);
  });

  it('should show batch controls when enabled', () => {
    useGenerationStore.setState({
      batchConfig: {
        enabled: true,
        batchSize: 4,
        variationParams: {
          varySeeds: true,
          varyPrompts: false,
          varyParameters: false,
        },
      },
    });
    
    render(<BatchConfigPanel />);
    
    expect(screen.getByLabelText(/batch size/i)).toBeInTheDocument();
    expect(screen.getByText('Variation Parameters')).toBeInTheDocument();
  });

  it('should update batch size', () => {
    useGenerationStore.setState({
      batchConfig: {
        enabled: true,
        batchSize: 4,
        variationParams: {
          varySeeds: true,
          varyPrompts: false,
          varyParameters: false,
        },
      },
    });
    
    render(<BatchConfigPanel />);
    
    const slider = screen.getByLabelText(/batch size/i) as HTMLInputElement;
    fireEvent.change(slider, { target: { value: '8' } });
    
    const config = useGenerationStore.getState().batchConfig;
    expect(config.batchSize).toBe(8);
  });

  it('should toggle seed variation', () => {
    useGenerationStore.setState({
      batchConfig: {
        enabled: true,
        batchSize: 4,
        variationParams: {
          varySeeds: false,
          varyPrompts: false,
          varyParameters: false,
        },
      },
    });
    
    render(<BatchConfigPanel />);
    
    const toggle = screen.getByRole('switch', { name: /vary seeds/i });
    fireEvent.click(toggle);
    
    const config = useGenerationStore.getState().batchConfig;
    expect(config.variationParams.varySeeds).toBe(true);
  });

  it('should show seed range controls when vary seeds is enabled', () => {
    useGenerationStore.setState({
      batchConfig: {
        enabled: true,
        batchSize: 4,
        variationParams: {
          varySeeds: true,
          seedRange: [0, 999999],
          varyPrompts: false,
          varyParameters: false,
        },
      },
    });
    
    render(<BatchConfigPanel />);
    
    expect(screen.getByLabelText(/min/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/max/i)).toBeInTheDocument();
  });

  it('should update seed range', () => {
    useGenerationStore.setState({
      batchConfig: {
        enabled: true,
        batchSize: 4,
        variationParams: {
          varySeeds: true,
          seedRange: [0, 999999],
          varyPrompts: false,
          varyParameters: false,
        },
      },
    });
    
    render(<BatchConfigPanel />);
    
    const minInput = screen.getByLabelText(/min/i) as HTMLInputElement;
    const maxInput = screen.getByLabelText(/max/i) as HTMLInputElement;
    
    fireEvent.change(minInput, { target: { value: '100' } });
    fireEvent.change(maxInput, { target: { value: '200' } });
    
    const config = useGenerationStore.getState().batchConfig;
    expect(config.variationParams.seedRange).toEqual([100, 200]);
  });

  it('should call onClose when close button clicked', () => {
    const onClose = vi.fn();
    render(<BatchConfigPanel onClose={onClose} />);
    
    const closeButton = screen.getByLabelText('Close batch configuration');
    fireEvent.click(closeButton);
    
    expect(onClose).toHaveBeenCalled();
  });

  it('should display info message when batch is enabled', () => {
    useGenerationStore.setState({
      batchConfig: {
        enabled: true,
        batchSize: 5,
        variationParams: {
          varySeeds: true,
          varyPrompts: false,
          varyParameters: false,
        },
      },
    });
    
    render(<BatchConfigPanel />);
    
    expect(screen.getByText(/batch generation will create 5 variations/i)).toBeInTheDocument();
  });
});
