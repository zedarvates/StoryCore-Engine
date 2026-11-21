import { render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { LazyAnimationPanel } from './LazyComponents';

vi.mock('./AnimationPanel', () => ({
  AnimationPanel: ({ shotId }: { shotId: string }) => <p>Animation for {shotId}</p>,
}));

it('loads the named component and forwards its props', async () => {
  render(<LazyAnimationPanel shotId="shot-42" />);
  expect(await screen.findByText('Animation for shot-42')).toBeInTheDocument();
});
