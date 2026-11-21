/** Mock implementation of the ComfyUI connection and generation hook. */
import { vi } from 'vitest';
import type { UseComfyUIResult } from '../useComfyUI';

export const useComfyUI = vi.fn((): UseComfyUIResult => ({
  isConnected: true,
  isGenerating: false,
  error: null,
  connect: vi.fn().mockResolvedValue(undefined),
  disconnect: vi.fn(),
  generate: vi.fn().mockResolvedValue(undefined),
}));
