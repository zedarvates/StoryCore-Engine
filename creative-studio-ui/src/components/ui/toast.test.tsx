import { render } from '@testing-library/react';
import { Toast, ToastProvider, ToastTitle, ToastDescription, ToastClose, ToastViewport } from './toast';

// Mock heavy dependencies if any (none for toast)

describe('Toast Component', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <ToastProvider>
        <Toast variant="default">
          <ToastTitle>Test</ToastTitle>
          <ToastDescription>Test description</ToastDescription>
          <ToastClose />
        </Toast>
        <ToastViewport />
      </ToastProvider>
    );
    expect(container).toBeTruthy();
  });
});
