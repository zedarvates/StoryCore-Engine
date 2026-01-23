import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { Button } from './button';
import { cn } from '@/lib/utils';

// ============================================================================
// OnboardingTour Component
// Guide interactif pour les nouveaux utilisateurs
// ============================================================================

export interface TourStep {
  /**
   * Sélecteur CSS de l'élément à highlight
   */
  target: string;
  /**
   * Contenu du message
   */
  content: React.ReactNode;
  /**
   * Position du tooltip par rapport à l'élément
   */
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  /**
   * Action optionnelle au clic sur l'élément highlighté
   */
  action?: () => void;
}

interface OnboardingTourProps {
  /**
   * Étapes du tour
   */
  steps: TourStep[];
  /**
   * État ouvert/fermé
   */
  isOpen: boolean;
  /**
   * Callback de fermeture
   */
  onClose: () => void;
  /**
   * Callback quand le tour est terminé
   */
  onComplete?: () => void;
  /**
   * Classe CSS supplémentaire
   */
  className?: string;
  /**
   * Style de l'overlay (dimmed, blur, none)
   */
  overlayStyle?: 'dimmed' | 'blur' | 'none';
}

export function OnboardingTour({
  steps,
  isOpen,
  onClose,
  onComplete,
  className,
  overlayStyle = 'dimmed',
}: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const tourRef = useRef<HTMLDivElement>(null);

  // Calculer la position de l'élément cible
  const updateTargetRect = useCallback(() => {
    if (currentStep >= steps.length) return;
    
    const targetElement = document.querySelector(steps[currentStep].target);
    if (targetElement) {
      setTargetRect(targetElement.getBoundingClientRect());
    }
  }, [currentStep, steps]);

  // Mettre à jour la position quand l'étape change
  useEffect(() => {
    if (!isOpen) return;

    // Petit délai pour s'assurer que le DOM est prêt
    const timer = setTimeout(updateTargetRect, 50);
    
    // Mettre à jour au redimensionnement
    window.addEventListener('resize', updateTargetRect);
    window.addEventListener('scroll', updateTargetRect, true);
    
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateTargetRect);
      window.removeEventListener('scroll', updateTargetRect, true);
    };
  }, [isOpen, currentStep, updateTargetRect]);

  // Animation d'entrée
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => setIsVisible(true), 10);
    } else {
      setIsVisible(false);
    }
  }, [isOpen]);

  // Annuler si fermé
  useEffect(() => {
    if (!isOpen) {
      setCurrentStep(0);
      setTargetRect(null);
    }
  }, [isOpen]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    onComplete?.();
    onClose();
  };

  const handleSkip = () => {
    onClose();
  };

  // Calculer la position du tooltip
  const getTooltipPosition = () => {
    if (!targetRect) return {};
    
    const position = steps[currentStep].position || 'bottom';
    const gap = 16;
    const tooltipWidth = 320;
    const tooltipHeight = 200;
    
    let left = 0;
    let top = 0;
    
    switch (position) {
      case 'top':
        left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
        top = targetRect.top - tooltipHeight - gap;
        break;
      case 'bottom':
        left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
        top = targetRect.bottom + gap;
        break;
      case 'left':
        left = targetRect.left - tooltipWidth - gap;
        top = targetRect.top + targetRect.height / 2 - tooltipHeight / 2;
        break;
      case 'right':
        left = targetRect.right + gap;
        top = targetRect.top + targetRect.height / 2 - tooltipHeight / 2;
        break;
      case 'center':
        left = (window.innerWidth - tooltipWidth) / 2;
        top = (window.innerHeight - tooltipHeight) / 2;
        break;
    }
    
    // Ajuster pour rester dans l'écran
    left = Math.max(16, Math.min(left, window.innerWidth - tooltipWidth - 16));
    top = Math.max(16, Math.min(top, window.innerHeight - tooltipHeight - 16));
    
    return { left, top };
  };

  if (!isOpen) return null;

  const tooltipStyle = getTooltipPosition();
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div
      ref={tourRef}
      className={cn(
        'fixed inset-0 z-50 transition-opacity duration-300',
        isVisible ? 'opacity-100' : 'opacity-0',
        className
      )}
      role="dialog"
      aria-modal="true"
      aria-label="Tutoriel d'onboarding"
    >
      {/* Overlay */}
      <div
        className={cn(
          'absolute inset-0 transition-all duration-300',
          overlayStyle === 'dimmed' && 'bg-black/50',
          overlayStyle === 'blur' && 'backdrop-blur-sm bg-black/30',
          overlayStyle === 'none' && 'bg-transparent'
        )}
        onClick={handleSkip}
      />

      {/* Zone de highlight */}
      {targetRect && (
        <div
          className="absolute border-2 border-primary rounded-md transition-all duration-300"
          style={{
            left: targetRect.left - 4,
            top: targetRect.top - 4,
            width: targetRect.width + 8,
            height: targetRect.height + 8,
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
          }}
        />
      )}

      {/* Tooltip */}
      <div
        className={cn(
          'absolute bg-card border border-border rounded-lg shadow-xl p-4 w-[320px]',
          'transition-all duration-300 transform',
          isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        )}
        style={tooltipStyle}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
              {currentStep + 1}
            </div>
            <span className="text-sm text-muted-foreground">
              Étape {currentStep + 1} sur {steps.length}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSkip}
            className="h-8 w-8 p-0"
            aria-label="Passer le tutorirel"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Barre de progression */}
        <div className="h-1 bg-muted rounded-full mb-3 overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Contenu */}
        <div className="mb-4 text-foreground">
          {steps[currentStep].content}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSkip}
            className="text-muted-foreground"
          >
            Passer
          </Button>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className={cn(currentStep === 0 && 'opacity-50')}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Précédent
            </Button>
            
            <Button
              size="sm"
              onClick={handleNext}
            >
              {currentStep === steps.length - 1 ? (
                <>
                  <Check className="h-4 w-4 mr-1" />
                  Terminer
                </>
              ) : (
                <>
                  Suivant
                  <ChevronRight className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// TourContext - Gestion globale du tour
// ============================================================================

interface TourContextType {
  isOpen: boolean;
  currentStep: number;
  steps: TourStep[];
  startTour: (steps: TourStep[]) => void;
  nextStep: () => void;
  previousStep: () => void;
  endTour: () => void;
}

const TourContext = React.createContext<TourContextType | null>(null);

export function TourProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [steps, setSteps] = useState<TourStep[]>([]);
  const [currentStep, setCurrentStep] = useState(0);

  const startTour = (newSteps: TourStep[]) => {
    setSteps(newSteps);
    setCurrentStep(0);
    setIsOpen(true);
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setIsOpen(false);
    }
  };

  const previousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const endTour = () => {
    setIsOpen(false);
    setSteps([]);
    setCurrentStep(0);
  };

  return (
    <TourContext.Provider
      value={{
        isOpen,
        currentStep,
        steps,
        startTour,
        nextStep,
        previousStep,
        endTour,
      }}
    >
      {children}
      {isOpen && steps.length > 0 && (
        <OnboardingTour
          steps={steps}
          isOpen={isOpen}
          onClose={endTour}
          onComplete={() => {}}
        />
      )}
    </TourContext.Provider>
  );
}

export function useTour() {
  const context = React.useContext(TourContext);
  if (!context) {
    throw new Error('useTour must be used within a TourProvider');
  }
  return context;
}

export default OnboardingTour;

