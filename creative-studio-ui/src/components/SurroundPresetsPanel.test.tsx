import React from 'react';
import { render } from '@testing-library/react';
import { SurroundPresetsPanel } from './SurroundPresetsPanel';

// Mock heavy dependencies if any
jest.mock('@/components/SomeHeavyComponent', () => () => <div data-testid="SomeHeavyComponent" />);

test('renders SurroundPresetsPanel without crashing', () => {
  const { container } = render(<SurroundPresetsPanel config={{ mode: '5.1', channels: { frontLeft: 0, frontRight: 0, center: 0, lfe: 0, surroundLeft: 0, surroundRight: 0 }, spatialPosition: { x: 0, y: 0, z: 0 } }} onApplyPreset={() => {}} />);
  expect(container).toBeTruthy();
});
