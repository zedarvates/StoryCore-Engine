import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { ImagePreviewPanel } from '../ImagePreviewPanel';

it('displays seed zero and skips metadata values of the wrong type', () => {
  render(<ImagePreviewPanel asset={{
    id: 'image-1',
    type: 'image',
    url: '',
    metadata: {
      generationParams: { seed: 0, steps: {}, prompt: { old: 'invalid' }, scheduler: 'normal' },
      fileSize: 0,
      format: 'png',
    },
    relatedAssets: [],
    timestamp: 1,
  }} />);

  expect(screen.getByText('0', { exact: true })).toBeInTheDocument();
  expect(screen.getByText('normal', { exact: true })).toBeInTheDocument();
  expect(screen.queryByText('Steps', { exact: true })).not.toBeInTheDocument();
});
