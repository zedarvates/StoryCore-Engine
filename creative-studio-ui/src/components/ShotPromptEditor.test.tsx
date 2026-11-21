import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { createShotFixture } from '@/__tests__/helpers/shotFactory';
import { ShotPromptEditor } from './ShotPromptEditor';

describe('ShotPromptEditor', () => {
  it('renders without crashing', () => {
    const shot = createShotFixture({ prompt: 'A ship on the horizon' });
    render(<ShotPromptEditor shot={shot} prompt={shot.prompt} onPromptChange={vi.fn()} />);
    expect(screen.getByDisplayValue(shot.prompt)).toBeInTheDocument();
  });
});
