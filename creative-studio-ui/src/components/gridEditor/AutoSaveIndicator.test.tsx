import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { versionControlService } from '../../services/gridEditor/VersionControlService';
import { useGridStore } from '../../stores/gridEditorStore';
import { AutoSaveIndicator } from './AutoSaveIndicator';

const projectId = 'auto-save-grid-test';

beforeEach(() => {
  useGridStore.getState().resetConfiguration(projectId);
  versionControlService.deleteAllVersions(projectId);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  versionControlService.deleteAllVersions(projectId);
});

describe('grid version auto-save', () => {
  it('saves the grid under its own project and retains the author', () => {
    render(<AutoSaveIndicator projectId={projectId} author="Alice" />);
    fireEvent.click(screen.getByRole('button', { name: /save now/i }));

    expect(versionControlService.getLatestVersion(projectId)?.metadata.author).toBe('Alice');
    expect(screen.getByText('Saved!')).toBeTruthy();
  });

  it('skips unchanged configurations and stops after unmount', () => {
    vi.useFakeTimers();
    const { unmount } = render(
      <AutoSaveIndicator projectId={projectId} initialInterval={1} defaultEnabled />,
    );
    act(() => vi.advanceTimersByTime(120_000));
    expect(versionControlService.listVersions(projectId)).toHaveLength(1);

    unmount();
    useGridStore.getState().resetConfiguration(projectId);
    act(() => vi.advanceTimersByTime(60_000));
    expect(versionControlService.listVersions(projectId)).toHaveLength(1);
  });

  it('does not write the loaded grid under a different project', () => {
    render(<AutoSaveIndicator projectId="another-grid" />);
    fireEvent.click(screen.getByRole('button', { name: /save now/i }));

    expect(versionControlService.listVersions(projectId)).toHaveLength(0);
    expect(screen.getByRole('alert').textContent).toContain('Open this project');
  });
});
