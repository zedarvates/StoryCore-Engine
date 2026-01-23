import React, { useEffect, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';

// ============================================================================
// Accessibility Utilities & Components
// Conformité WCAG 2.2 AA
// ============================================================================

// ============================================================================
// Focus Management
// ============================================================================

interface FocusTrapProps {
  children: React.ReactNode;
  active?: boolean;
  className?: string;
}

/**
 * Focus Trap - Empêche la navigation clavier de sortir du composant
 */
export function FocusTrap({ children, active = true, className }: FocusTrapProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!active) return;

    const container = containerRef.current;
    if (!container) return;

    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable?.focus();
        }
      } else {
        if (document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable?.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    firstFocusable?.focus();

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, [active]);

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  );
}

// ============================================================================
// Skip Link Component
// ============================================================================

interface SkipLinkProps {
  target: string;
  children?: React.ReactNode;
  className?: string;
}

export function SkipLink({ target, children, className }: SkipLinkProps) {
  return (
    <a
      href={`#${target}`}
      className={cn(
        'sr-only focus:not-sr-only',
        'focus:absolute focus:top-4 focus:left-4 focus:z-50',
        'focus:bg-primary focus:text-primary-foreground focus:px-4 focus:py-2',
        'focus:rounded-md focus:outline-none focus:ring-2 focus:ring-primary',
        className
      )}
    >
      {children || 'Aller au contenu principal'}
    </a>
  );
}

// ============================================================================
// Live Region Announcer
// ============================================================================

interface LiveRegionProps {
  message: string;
  politeness?: 'polite' | 'assertive';
  atomic?: boolean;
  className?: string;
}

/**
 * Region ARIA live pour les annonces aux screen readers
 */
export function LiveRegion({
  message,
  politeness = 'polite',
  atomic = true,
  className,
}: LiveRegionProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic={atomic ? 'true' : 'false'}
      className={cn('sr-only', className)}
    >
      {message}
    </div>
  );
}

/**
 * Annonce urgente (erreur, avertissement)
 */
export function AlertRegion({ message, className }: { message: string; className?: string }) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn('sr-only', className)}
    >
      {message}
    </div>
  );
}

// ============================================================================
// Announcement Provider
// ============================================================================

interface AnnouncementContextType {
  announce: (message: string, priority?: 'polite' | 'assertive') => void;
}

const AnnouncementContext = React.createContext<AnnouncementContextType | null>(null);

export function useAnnouncements() {
  const context = React.useContext(AnnouncementContext);
  if (!context) {
    throw new Error('useAnnouncements must be used within AnnouncementProvider');
  }
  return context;
}

interface AnnouncementProviderProps {
  children: React.ReactNode;
}

export function AnnouncementProvider({ children }: AnnouncementProviderProps) {
  const [announcement, setAnnouncement] = React.useState<string>('');

  const announce = React.useCallback((message: string, _priority: 'polite' | 'assertive' = 'polite') => {
    setAnnouncement('');
    // Timeout pour s'assurer que le message est annoncé
    setTimeout(() => setAnnouncement(message), 100);
  }, []);

  return (
    <AnnouncementContext.Provider value={{ announce }}>
      {children}
      <LiveRegion
        message={announcement}
        politeness="assertive"
        className="fixed top-0 left-0"
      />
    </AnnouncementContext.Provider>
  );
}

// ============================================================================
// Keyboard Shortcuts Display
// ============================================================================

interface KeyboardShortcut {
  key: string;
  modifier?: 'ctrl' | 'alt' | 'shift' | 'meta';
  description: string;
}

interface KeyboardShortcutsProps {
  shortcuts: KeyboardShortcut[];
  className?: string;
}

export function KeyboardShortcuts({ shortcuts, className }: KeyboardShortcutsProps) {
  return (
    <div className={cn('space-y-2', className)} role="list" aria-label="Raccourcis clavier">
      {shortcuts.map((shortcut, index) => (
        <div
          key={index}
          className="flex items-center justify-between text-sm"
          role="listitem"
        >
          <span>{shortcut.description}</span>
          <kbd className="inline-flex items-center gap-1 px-2 py-1 bg-muted rounded text-xs font-mono">
            {shortcut.modifier && (
              <>
                <span className="text-xs">{shortcut.modifier}</span>
                <span>+</span>
              </>
            )}
            <span>{shortcut.key}</span>
          </kbd>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Accessible Dialog
// ============================================================================

interface AccessibleDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

export function AccessibleDialog({
  isOpen,
  onClose,
  title,
  description,
  children,
  className,
  size = 'md',
}: AccessibleDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-[90vw]',
  };

  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      document.body.style.overflow = 'hidden';

      // Focus sur le dialog
      dialogRef.current?.focus();
    } else {
      document.body.style.overflow = '';
      // Restaurer le focus
      previousFocusRef.current?.focus();
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Gestion Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
      aria-describedby={description ? 'dialog-description' : undefined}
    >
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        tabIndex={-1}
        className={cn(
          'relative bg-background rounded-lg shadow-lg w-full mx-4',
          sizeClasses[size],
          'focus:outline-none',
          className
        )}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b">
          <h2 id="dialog-title" className="text-lg font-semibold">
            {title}
          </h2>
        </div>

        {/* Description */}
        {description && (
          <p id="dialog-description" className="px-6 py-2 text-sm text-muted-foreground">
            {description}
          </p>
        )}

        {/* Content */}
        <div className="px-6 py-4">{children}</div>
      </div>
    </div>
  );
}

// ============================================================================
// Accessible Tabs
// ============================================================================

interface AccessibleTabsProps {
  tabs: { id: string; label: string; content: React.ReactNode; disabled?: boolean }[];
  defaultTab?: string;
  onTabChange?: (tabId: string) => void;
  className?: string;
}

export function AccessibleTabs({
  tabs,
  defaultTab,
  onTabChange,
  className,
}: AccessibleTabsProps) {
  const [activeTab, setActiveTab] = React.useState(defaultTab || tabs[0]?.id);
  const tabListRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, index: number) => {
      let newIndex = index;

      switch (e.key) {
        case 'ArrowRight':
          newIndex = (index + 1) % tabs.length;
          break;
        case 'ArrowLeft':
          newIndex = (index - 1 + tabs.length) % tabs.length;
          break;
        case 'Home':
          newIndex = 0;
          break;
        case 'End':
          newIndex = tabs.length - 1;
          break;
        default:
          return;
      }

      e.preventDefault();
      const newTab = tabs[newIndex];
      if (!newTab.disabled) {
        setActiveTab(newTab.id);
        onTabChange?.(newTab.id);
        tabListRef.current
          ?.querySelectorAll<HTMLElement>('[role="tab"]')
          [newIndex]?.focus();
      }
    },
    [tabs, onTabChange]
  );

  return (
    <div className={className}>
      {/* Tab List */}
      <div
        ref={tabListRef}
        role="tablist"
        aria-label="Onglets"
        className="flex border-b"
      >
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={activeTab === tab.id ? 'true' : 'false'}
            aria-controls={`panel-${tab.id}`}
            aria-disabled={tab.disabled ? 'true' : 'false'}
            tabIndex={activeTab === tab.id ? 0 : -1}
            onClick={() => {
              if (!tab.disabled) {
                setActiveTab(tab.id);
                onTabChange?.(tab.id);
              }
            }}
            onKeyDown={(e) => handleKeyDown(e, index)}
            disabled={tab.disabled}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary',
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground',
              tab.disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      {tabs.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`panel-${tab.id}`}
          aria-labelledby={`tab-${tab.id}`}
          hidden={activeTab !== tab.id}
          tabIndex={0}
          className="pt-4"
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Accessible Tooltip
// ============================================================================

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  className?: string;
}

export function Tooltip({
  content,
  children,
  side = 'top',
  align = 'center',
  className,
}: TooltipProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const handleMouseEnter = () => {
    clearTimeout(timeoutRef.current);
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => setIsOpen(false), 150);
  };

  const handleFocus = () => setIsOpen(true);
  const handleBlur = () => setIsOpen(false);

  const sideClasses = {
    top: '-top-2 left-1/2 -translate-x-1/2 bottom-full mb-2',
    bottom: 'top-2 left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  const alignClasses = {
    start: 'left-0',
    center: 'left-1/2 -translate-x-1/2',
    end: 'right-0',
  };

  return (
    <div
      className={cn('relative inline-block', className)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div
        onFocus={handleFocus}
        onBlur={handleBlur}
      >
        {children}
      </div>

      {isOpen && (
        <div
          role="tooltip"
          aria-hidden="false"
          className={cn(
            'absolute z-50 px-2 py-1 text-xs text-white bg-gray-900 rounded shadow-lg',
            'animate-in fade-in zoom-in duration-200',
            sideClasses[side],
            alignClasses[align]
          )}
        >
          {content}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// High Contrast Mode Support
// ============================================================================

interface HighContrastProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Composant qui applique des styles pour le mode contraste élevé
 */
export function HighContrastMode({ children, className }: HighContrastProps) {
  const [isHighContrast, setIsHighContrast] = React.useState(false);

  useEffect(() => {
    const checkContrast = () => {
      if (window.matchMedia) {
        setIsHighContrast(window.matchMedia('(prefers-contrast: more)').matches);
      }
    };

    checkContrast();
    const mediaQuery = window.matchMedia('(prefers-contrast: more)');
    mediaQuery.addEventListener('change', checkContrast);

    return () => mediaQuery.removeEventListener('change', checkContrast);
  }, []);

  if (!isHighContrast) return <>{children}</>;

  return (
    <div
      className={cn(
        'high-contrast',
        'border-2 border-black',
        '[&_*]:border-black [&_*]:text-black',
        className
      )}
    >
      {children}
    </div>
  );
}

// ============================================================================
// Reduced Motion Support
// ============================================================================

interface ReducedMotionProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Composant qui applique des styles pour réduire les animations
 */
export function ReducedMotion({ children, className }: ReducedMotionProps) {
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false);

  useEffect(() => {
    if (window.matchMedia) {
      setPrefersReducedMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    }
  }, []);

  return (
    <div
      className={cn(
        prefersReducedMotion && 'reduced-motion',
        className
      )}
    >
      {children}
      <style>{`
        .reduced-motion * {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
        }
      `}</style>
    </div>
  );
}

export default {
  FocusTrap,
  SkipLink,
  LiveRegion,
  AlertRegion,
  AnnouncementProvider,
  useAnnouncements,
  KeyboardShortcuts,
  AccessibleDialog,
  AccessibleTabs,
  Tooltip,
  HighContrastMode,
  ReducedMotion,
};

