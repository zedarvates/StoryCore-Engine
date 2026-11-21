import { afterEach, describe, expect, it, vi } from 'vitest';
import { WorkerPool } from './WorkerPool';

class TestWorker {
  static instances: TestWorker[] = [];
  onmessage?: (event: { data: unknown }) => void;
  onerror?: (event: { message: string }) => void;
  postMessage = vi.fn<(message: { id: string; type: string; data?: unknown }) => void>();
  terminate = vi.fn();

  constructor() {
    TestWorker.instances.push(this);
  }

  complete(result: unknown) {
    const request = this.postMessage.mock.calls.at(-1)?.[0];
    this.onmessage?.({ data: { id: request?.id, status: 'completed', result } });
  }
}

afterEach(() => {
  vi.unstubAllGlobals();
  TestWorker.instances = [];
});

describe('batch processing worker pool', () => {
  it('dispatches a queued task to the replacement worker after an error', async () => {
    vi.stubGlobal('Worker', TestWorker);
    const pool = new WorkerPool({ size: 1 });
    const active = pool.execute('processBatch', []);
    const queued = pool.execute('processBatch', []);
    const failure = expect(active).rejects.toThrow('worker failed');

    TestWorker.instances[0].onerror?.({ message: 'worker failed' });
    const replacement = TestWorker.instances[1];
    expect(replacement.postMessage).toHaveBeenCalledTimes(1);
    replacement.complete([{ success: true }]);

    await failure;
    await expect(queued).resolves.toEqual([{ success: true }]);
    expect(pool.getAvailableWorkers()).toBe(1);
    pool.terminate();
  });
});
