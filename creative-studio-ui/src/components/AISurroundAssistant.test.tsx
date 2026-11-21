import React from 'react';
import { render, screen } from '@testing-library/react';
import { createShotFixture } from '@/__tests__/helpers/shotFactory';
import { AISurroundAssistant } from './AISurroundAssistant';

test('renders AISurroundAssistant without crashing', () => {
  render(<AISurroundAssistant shot={createShotFixture({})} currentConfig={{ mode: 'stereo', channels: {} }} onApplyPreset={() => {}} />);
  expect(screen.getByRole('button', { name: 'Ask AI' })).toBeInTheDocument();
});
