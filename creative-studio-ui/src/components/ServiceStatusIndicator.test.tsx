import React from 'react';
import { render } from '@testing-library/react';
import ServiceStatusIndicator from './ServiceStatusIndicator';

test('renders ServiceStatusIndicator without crashing', () => {
  render(<ServiceStatusIndicator />);
  expect(true).toBe(true);
});
