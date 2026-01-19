import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Toaster } from '../toaster';
import { useToast } from '@/hooks/use-toast';

// Test component that uses the toast hook
function ToastTestComponent() {
  const { toast } = useToast();

  return (
    <div>
      <button
        onClick={() =>
          toast({
            title: 'Test Toast',
            description: 'This is a test toast',
            variant: 'default',
          })
        }
      >
        Show Toast
      </button>
      <button
        onClick={() =>
          toast({
            title: 'Success',
            description: 'Operation successful',
            variant: 'success',
          })
        }
      >
        Show Success
      </button>
      <button
        onClick={() =>
          toast({
            title: 'Error',
            description: 'Something went wrong',
            variant: 'destructive',
          })
        }
      >
        Show Error
      </button>
      <button
        onClick={() =>
          toast({
            title: 'Warning',
            description: 'Please be careful',
            variant: 'warning',
          })
        }
      >
        Show Warning
      </button>
      <button
        onClick={() =>
          toast({
            title: 'Info',
            description: 'Here is some information',
            variant: 'info',
          })
        }
      >
        Show Info
      </button>
    </div>
  );
}

describe('Toast Component', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('should render toaster component', () => {
    render(<Toaster />);
    // Toaster should render without errors
    expect(document.body).toBeTruthy();
  });

  it('should display toast when triggered', async () => {
    const user = userEvent.setup({ delay: null });
    
    render(
      <>
        <ToastTestComponent />
        <Toaster />
      </>
    );

    const button = screen.getByText('Show Toast');
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText('Test Toast')).toBeInTheDocument();
      expect(screen.getByText('This is a test toast')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('should display success toast variant', async () => {
    const user = userEvent.setup({ delay: null });
    
    render(
      <>
        <ToastTestComponent />
        <Toaster />
      </>
    );

    const button = screen.getByText('Show Success');
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText('Success')).toBeInTheDocument();
      expect(screen.getByText('Operation successful')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('should display error toast variant', async () => {
    const user = userEvent.setup({ delay: null });
    
    render(
      <>
        <ToastTestComponent />
        <Toaster />
      </>
    );

    const button = screen.getByText('Show Error');
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('should display warning toast variant', async () => {
    const user = userEvent.setup({ delay: null });
    
    render(
      <>
        <ToastTestComponent />
        <Toaster />
      </>
    );

    const button = screen.getByText('Show Warning');
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText('Warning')).toBeInTheDocument();
      expect(screen.getByText('Please be careful')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('should display info toast variant', async () => {
    const user = userEvent.setup({ delay: null });
    
    render(
      <>
        <ToastTestComponent />
        <Toaster />
      </>
    );

    const button = screen.getByText('Show Info');
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText('Info')).toBeInTheDocument();
      expect(screen.getByText('Here is some information')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('should auto-dismiss toast after duration', async () => {
    const user = userEvent.setup({ delay: null, advanceTimers: vi.advanceTimersByTime });
    
    render(
      <>
        <ToastTestComponent />
        <Toaster />
      </>
    );

    const button = screen.getByText('Show Toast');
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText('Test Toast')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Fast-forward time by 5 seconds (default duration)
    vi.advanceTimersByTime(5000);

    await waitFor(() => {
      expect(screen.queryByText('Test Toast')).not.toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('should display multiple toasts simultaneously', async () => {
    const user = userEvent.setup({ delay: null });
    
    render(
      <>
        <ToastTestComponent />
        <Toaster />
      </>
    );

    const showToastButton = screen.getByText('Show Toast');
    const showSuccessButton = screen.getByText('Show Success');
    
    await user.click(showToastButton);
    await user.click(showSuccessButton);

    await waitFor(() => {
      expect(screen.getByText('Test Toast')).toBeInTheDocument();
      expect(screen.getByText('Success')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('should have close button on toast', async () => {
    const user = userEvent.setup({ delay: null });
    
    render(
      <>
        <ToastTestComponent />
        <Toaster />
      </>
    );

    const button = screen.getByText('Show Toast');
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText('Test Toast')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Check for close button (X icon)
    const closeButton = document.querySelector('[toast-close]');
    expect(closeButton).toBeInTheDocument();
  });
});
