import { useEffect } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { useToast } from '@/hooks/use-toast';

/**
 * Global Keyboard Shortcuts Hook
 * 
 * Provides global keyboard shortcuts for wizard access:
 * - Ctrl/Cmd + Shift + P: Open Sequence Plan Wizard
 * - Ctrl/Cmd + Shift + S: Open Shot Wizard
 * - Ctrl/Cmd + Shift + Q: Open Quick Shot Wizard
 * 
 * Features:
 * - Visual toast feedback when shortcuts are triggered
 * - Ignores shortcuts when user is typing in input fields
 */
export function useGlobalKeyboardShortcuts() {
  const openSequencePlanWizard = useAppStore((state) => state.openSequencePlanWizard);
  const openShotWizard = useAppStore((state) => state.openShotWizard);
  const { toast } = useToast();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for Ctrl (Windows/Linux) or Cmd (Mac)
      const isModifierPressed = event.ctrlKey || event.metaKey;
      
      // Ignore if user is typing in an input field
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement ||
        (event.target as HTMLElement).isContentEditable
      ) {
        return;
      }

      // Ctrl/Cmd + Shift + P: Open Sequence Plan Wizard
      if (isModifierPressed && event.shiftKey && event.key === 'P') {
        event.preventDefault();
        openSequencePlanWizard({ mode: 'create', sourceLocation: 'editor' });
        
        // Visual feedback
        toast({
          title: 'Sequence Plan Wizard',
          description: 'Opening sequence plan wizard...',
          duration: 2000,
        });
        return;
      }

      // Ctrl/Cmd + Shift + S: Open Shot Wizard
      if (isModifierPressed && event.shiftKey && event.key === 'S') {
        event.preventDefault();
        openShotWizard({ mode: 'create', sourceLocation: 'storyboard' });
        
        // Visual feedback
        toast({
          title: 'Shot Wizard',
          description: 'Opening shot wizard...',
          duration: 2000,
        });
        return;
      }

      // Ctrl/Cmd + Shift + Q: Open Quick Shot Wizard
      if (isModifierPressed && event.shiftKey && event.key === 'Q') {
        event.preventDefault();
        openShotWizard({ mode: 'create', quickMode: true, sourceLocation: 'storyboard' });
        
        // Visual feedback
        toast({
          title: 'Quick Shot Wizard',
          description: 'Opening quick shot wizard...',
          duration: 2000,
        });
        return;
      }
    };

    // Add event listener
    window.addEventListener('keydown', handleKeyDown);

    // Cleanup on unmount
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [openSequencePlanWizard, openShotWizard, toast]);
}
