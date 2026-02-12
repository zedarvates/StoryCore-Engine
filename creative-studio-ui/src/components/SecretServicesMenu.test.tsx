import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import SecretServicesMenu from './SecretServicesMenu';

// Mock heavy dependencies if any
jest.mock('../someHeavyDependency', () => ({
  HeavyComponent: () => <div data-testid="heavy-mock">Mocked</div>,
}));

test('renders SecretServicesMenu without crashing and displays key element', () => {
  render(<SecretServicesMenu />);
  const menu = screen.getByTestId('secret-services-menu');
  expect(menu).toBeInTheDocument();
});

test('handles click interaction', () => {
  const onToggle = jest.fn();
  render(<SecretServicesMenu onToggle={onToggle} />);
  const button = screen.getByRole('button');
  fireEvent.click(button);
  expect(onToggle).toHaveBeenCalled();
});
