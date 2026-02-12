import React from 'react';
import { render } from '@testing-library/react';
import AISurroundAssistant from './AISurroundAssistant';

test('renders AISurroundAssistant without crashing', () => {
  const { container } = render(<AISurroundAssistant />);
  expect(container).toBeTruthy();
});
