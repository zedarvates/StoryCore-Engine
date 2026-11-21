import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { mediaSearchService, type SearchResult } from '../../../services/mediaSearchService';
import { MediaSearchPanel } from './MediaSearchPanel';

vi.mock('../../../services/mediaSearchService', () => ({
  mediaSearchService: { search: vi.fn() },
}));

it('displays and selects array results while rendering highlights as text', async () => {
  const result: SearchResult = {
    assetId: 'pier',
    assetType: 'image',
    filePath: 'pier.png',
    fileName: 'Ferry Pier',
    similarityScore: 0.8,
    matchType: 'hybrid',
    highlightedText: '**Pier** near <b>the orchard</b>',
    metadata: {},
  };
  vi.mocked(mediaSearchService.search).mockResolvedValueOnce([result]);
  const onAssetSelect = vi.fn();
  const { container } = render(<MediaSearchPanel projectId="harbour" onAssetSelect={onAssetSelect} />);
  const query = screen.getByRole('textbox');
  fireEvent.change(query, { target: { value: 'pier' } });
  fireEvent.keyDown(query, { key: 'Enter' });

  fireEvent.click(await screen.findByText('Ferry Pier'));
  expect(onAssetSelect).toHaveBeenCalledWith(result);
  expect(mediaSearchService.search).toHaveBeenCalledWith(expect.objectContaining({
    query: 'pier', projectId: 'harbour',
  }));
  expect(container.querySelector('mark')).toHaveTextContent('Pier');
  expect(container).toHaveTextContent('<b>the orchard</b>');
  expect(container.querySelector('b')).toBeNull();
});
