import React from 'react';
import { render } from '@testing-library/react';
import MenuBarCompat from './MenuBarCompat';

test('renders MenuBarCompat without crashing', () => {
  const { container } = render(<MenuBarCompat />);
  expect(container).toBeTruthy();
});
