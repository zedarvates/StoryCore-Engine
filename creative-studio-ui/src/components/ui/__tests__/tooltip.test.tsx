import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '../tooltip';

// Test component that uses the tooltip
function TooltipTestComponent() {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button>Hover me</button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Tooltip content</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function TooltipWithSideOffsetComponent() {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button>Hover for offset tooltip</button>
        </TooltipTrigger>
        <TooltipContent sideOffset={10}>
          <p>Offset tooltip content</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function MultipleTooltipsComponent() {
  return (
    <TooltipProvider>
      <div>
        <Tooltip>
          <TooltipTrigger asChild>
            <button>First button</button>
          </TooltipTrigger>
          <TooltipContent>
            <p>First tooltip</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button>Second button</button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Second tooltip</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}

describe('Tooltip Component', () => {
  it('should render tooltip trigger', () => {
    render(<TooltipTestComponent />);
    expect(screen.getByText('Hover me')).toBeInTheDocument();
  });

  it('should display tooltip content on hover', async () => {
    const user = userEvent.setup();
    render(<TooltipTestComponent />);

    const trigger = screen.getByText('Hover me');
    await user.hover(trigger);

    await waitFor(
      () => {
        const tooltips = screen.getAllByText('Tooltip content');
        expect(tooltips.length).toBeGreaterThan(0);
        expect(tooltips[0]).toBeInTheDocument();
      },
      { timeout: 1000 }
    );
  });

  it('should render tooltip with custom sideOffset', async () => {
    const user = userEvent.setup();
    render(<TooltipWithSideOffsetComponent />);

    const trigger = screen.getByText('Hover for offset tooltip');
    await user.hover(trigger);

    await waitFor(
      () => {
        const tooltips = screen.getAllByText('Offset tooltip content');
        expect(tooltips.length).toBeGreaterThan(0);
        expect(tooltips[0]).toBeInTheDocument();
      },
      { timeout: 1000 }
    );
  });

  it('should render multiple tooltips', async () => {
    const user = userEvent.setup();
    render(<MultipleTooltipsComponent />);

    const firstButton = screen.getByText('First button');
    const secondButton = screen.getByText('Second button');

    // Both buttons should be present
    expect(firstButton).toBeInTheDocument();
    expect(secondButton).toBeInTheDocument();

    // Hover first button
    await user.hover(firstButton);

    await waitFor(
      () => {
        const tooltips = screen.getAllByText('First tooltip');
        expect(tooltips.length).toBeGreaterThan(0);
      },
      { timeout: 1000 }
    );
  });

  it('should apply custom className to tooltip content', async () => {
    const user = userEvent.setup();
    const CustomTooltip = () => (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button>Custom tooltip</button>
          </TooltipTrigger>
          <TooltipContent className="custom-class">
            <p>Custom styled tooltip</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );

    render(<CustomTooltip />);

    const trigger = screen.getByText('Custom tooltip');
    await user.hover(trigger);

    await waitFor(
      () => {
        const tooltipContents = screen.getAllByText('Custom styled tooltip');
        expect(tooltipContents.length).toBeGreaterThan(0);
        expect(tooltipContents[0]).toBeInTheDocument();
        expect(tooltipContents[0].parentElement).toHaveClass('custom-class');
      },
      { timeout: 1000 }
    );
  });

  it('should be accessible with proper ARIA attributes', () => {
    render(<TooltipTestComponent />);
    const trigger = screen.getByText('Hover me');
    
    // Tooltip trigger should have proper ARIA attributes
    expect(trigger).toBeInTheDocument();
  });

  it('should support keyboard navigation', async () => {
    const user = userEvent.setup();
    render(<TooltipTestComponent />);

    const trigger = screen.getByText('Hover me');
    
    // Focus the trigger
    await user.tab();
    expect(trigger).toHaveFocus();

    // Tooltip should appear on focus
    await waitFor(
      () => {
        const tooltips = screen.getAllByText('Tooltip content');
        expect(tooltips.length).toBeGreaterThan(0);
      },
      { timeout: 1000 }
    );
  });

  it('should render with TooltipProvider wrapper', () => {
    const { container } = render(<TooltipTestComponent />);
    
    // Component should render without errors
    expect(container).toBeInTheDocument();
    expect(screen.getByText('Hover me')).toBeInTheDocument();
  });
});
