import { render } from '@testing-library/react';
import { Toast, ToastProvider, ToastTitle, ToastDescription, ToastClose } from './toast';

// Mock heavy dependencies if any (none for toast)

describe('Toast Component', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <ToastProvider>
        <Toast title="Test" description="Test description" variant="default" />
        <ToastTitle>Test</ToastTitle>
        <ToastDescription>Test description</ToastDescription>
        <ToastClose />
      </ToastProvider>
    );
    expect(container).toBeTruthy();
  });
});
