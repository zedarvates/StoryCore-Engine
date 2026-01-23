import { createContext, useContext, useState, useEffect, useRef, isValidElement, cloneElement } from 'react';
import type { ReactNode, HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

// ============================================================================
// Dropdown Menu Components (Simplified shadcn/ui style)
// ============================================================================

interface DropdownMenuProps {
  children: ReactNode;
}

interface DropdownMenuContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const DropdownMenuContext = createContext<DropdownMenuContextValue | undefined>(undefined);

export function DropdownMenu({ children }: DropdownMenuProps) {
  const [open, setOpen] = useState(false);

  return (
    <DropdownMenuContext.Provider value={{ open, setOpen }}>
      <div className="relative inline-block">{children}</div>
    </DropdownMenuContext.Provider>
  );
}

interface DropdownMenuTriggerProps {
  children: ReactNode;
  asChild?: boolean;
}

export function DropdownMenuTrigger({ children, asChild }: DropdownMenuTriggerProps) {
  const context = useContext(DropdownMenuContext);
  if (!context) throw new Error('DropdownMenuTrigger must be used within DropdownMenu');

  const { open, setOpen } = context;

  const handleClick = () => {
    setOpen(!open);
  };

  if (asChild && isValidElement(children)) {
    return cloneElement(children, {
      onClick: handleClick,
    } as HTMLAttributes<HTMLElement>);
  }

  return (
    <button
      onClick={handleClick}
      className="inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
    >
      {children}
    </button>
  );
}

interface DropdownMenuContentProps {
  children: ReactNode;
  align?: 'start' | 'center' | 'end';
  className?: string;
}

export function DropdownMenuContent({ children, align = 'start', className }: DropdownMenuContentProps) {
  const context = useContext(DropdownMenuContext);
  if (!context) throw new Error('DropdownMenuContent must be used within DropdownMenu');

  const { open, setOpen } = context;
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (contentRef.current && !contentRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open, setOpen]);

  if (!open) return null;

  const alignmentClasses = {
    start: 'left-0',
    center: 'left-1/2 -translate-x-1/2',
    end: 'right-0',
  };

  return (
    <div
      ref={contentRef}
      className={cn(
        'absolute z-50 mt-1 min-w-[12rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md',
        alignmentClasses[align],
        className
      )}
    >
      {children}
    </div>
  );
}

interface DropdownMenuItemProps {
  children: ReactNode;
  onSelect?: () => void;
  disabled?: boolean;
  className?: string;
  shortcut?: string;
}

export function DropdownMenuItem({ children, onSelect, disabled, className, shortcut }: DropdownMenuItemProps) {
  const context = useContext(DropdownMenuContext);
  if (!context) throw new Error('DropdownMenuItem must be used within DropdownMenu');

  const { setOpen } = context;

  const handleClick = () => {
    if (disabled) return;
    onSelect?.();
    setOpen(false);
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        'relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors',
        disabled
          ? 'pointer-events-none opacity-50'
          : 'hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground',
        className
      )}
    >
      <span className="flex-1">{children}</span>
      {shortcut && <span className="ml-auto text-xs tracking-widest opacity-60">{shortcut}</span>}
    </div>
  );
}

interface DropdownMenuSeparatorProps {
  className?: string;
}

export function DropdownMenuSeparator({ className }: DropdownMenuSeparatorProps) {
  return <div className={cn('-mx-1 my-1 h-px bg-muted', className)} />;
}

interface DropdownMenuLabelProps {
  children: ReactNode;
  className?: string;
}

export function DropdownMenuLabel({ children, className }: DropdownMenuLabelProps) {
  return <div className={cn('px-2 py-1.5 text-sm font-semibold', className)}>{children}</div>;
}

// ============================================================================
// Submenu Components
// ============================================================================

interface DropdownMenuSubProps {
  children: ReactNode;
}

interface DropdownMenuSubContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const DropdownMenuSubContext = createContext<DropdownMenuSubContextValue | undefined>(undefined);

export function DropdownMenuSub({ children }: DropdownMenuSubProps) {
  const [open, setOpen] = useState(false);

  return (
    <DropdownMenuSubContext.Provider value={{ open, setOpen }}>
      <div className="relative">{children}</div>
    </DropdownMenuSubContext.Provider>
  );
}

interface DropdownMenuSubTriggerProps {
  children: ReactNode;
  className?: string;
}

export function DropdownMenuSubTrigger({ children, className }: DropdownMenuSubTriggerProps) {
  const context = useContext(DropdownMenuSubContext);
  if (!context) throw new Error('DropdownMenuSubTrigger must be used within DropdownMenuSub');

  const { open, setOpen } = context;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setOpen(!open);
  };

  return (
    <div
      className={cn(
        'flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground',
        className
      )}
      onClick={handleClick}
    >
      <span className="flex-1">{children}</span>
      <div className="ml-auto">
        <svg
          className={cn('h-4 w-4 transition-transform', open && 'rotate-90')}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </div>
  );
}

interface DropdownMenuSubContentProps {
  children: ReactNode;
  className?: string;
  alignOffset?: number;
}

export function DropdownMenuSubContent({ children, className, alignOffset = 0 }: DropdownMenuSubContentProps) {
  const context = useContext(DropdownMenuSubContext);
  if (!context) throw new Error('DropdownMenuSubContent must be used within DropdownMenuSub');

  const { open } = context;
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (contentRef.current && !contentRef.current.contains(event.target as Node)) {
        // Close submenu when clicking outside
        // This will be handled by the parent context
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  if (!open) return null;

  return (
    <div
      ref={contentRef}
      className={cn(
        'absolute left-full top-0 z-50 min-w-[12rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md',
        className
      )}
      style={{ marginLeft: alignOffset }}
    >
      {children}
    </div>
  );
}
