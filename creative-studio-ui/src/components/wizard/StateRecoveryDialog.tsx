/**
 * StateRecoveryDialog Component
 * 
 * Dialog for handling state corruption and recovery options.
 * 
 * Requirements: 5.6
 */

import { useState } from 'react';
import { AlertTriangle, RefreshCw, Trash2, Download, X } from 'lucide-react';
import type { ValidationResult } from '../../services/wizard/stateValidationService';
import { emergencyExportWizardState, clearWizardState } from '../../utils/wizardStorage';

export interface StateRecoveryDialogProps {
  /**
   * Wizard type
   */
  wizardType: 'world' | 'character' | 'sequence-plan';

  /**
   * Validation result
   */
  validationResult: ValidationResult;

  /**
   * Callback when user chooses to reset
   */
  onReset: () => void;

  /**
   * Callback when user chooses to recover
   */
  onRecover?: () => void;

  /**
   * Callback when user dismisses dialog
   */
  onDismiss?: () => void;

  /**
   * Show dialog
   */
  isOpen: boolean;
}

export function StateRecoveryDialog({
  wizardType,
  validationResult,
  onReset,
  onRecover,
  onDismiss,
  isOpen,
}: StateRecoveryDialogProps): React.ReactElement | null {
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen) {
    return null;
  }

  const handleExport = () => {
    setIsExporting(true);
    try {
      emergencyExportWizardState(wizardType);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleReset = () => {
    clearWizardState(wizardType);
    onReset();
  };

  const handleRecover = () => {
    if (onRecover) {
      onRecover();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-md transition-all duration-300"
      role="dialog"
      aria-modal="true"
      aria-labelledby="recovery-dialog-title"
    >
      <div className="max-w-xl w-full mx-4 bg-card border border-primary/30 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
        {/* Header with gradient strip */}
        <div className="h-1.5 w-full bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500" />

        <div className="p-8 border-b border-border/50">
          <div className="flex items-start gap-6">
            <div className="flex-shrink-0">
              <div className="w-14 h-14 bg-yellow-500/10 rounded-2xl flex items-center justify-center border border-yellow-500/20 shadow-inner">
                <AlertTriangle className="w-8 h-8 text-yellow-500" />
              </div>
            </div>
            <div className="flex-1">
              <h2
                id="recovery-dialog-title"
                className="text-2xl font-bold text-foreground mb-1 tracking-tight"
              >
                Inconsistance de données
              </h2>
              <p className="text-muted-foreground">
                Des données corrompues ou incompatibles ont été détectées.
              </p>
            </div>
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="flex-shrink-0 p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-xl transition-all"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-8 space-y-6 max-h-[50vh] overflow-y-auto">
          {/* Errors section */}
          {validationResult.errors.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-destructive/80">Erreurs critiques :</h3>
              <div className="space-y-2">
                {validationResult.errors.map((error, index) => (
                  <div key={index} className="text-sm text-destructive bg-destructive/5 p-3 rounded-lg border border-destructive/10 flex items-start gap-3">
                    <span className="mt-1 w-1.5 h-1.5 rounded-full bg-destructive flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Strategy Recommendation */}
          <div className="p-5 bg-primary/5 rounded-xl border border-primary/10 shadow-inner">
            <h3 className="text-sm font-semibold text-primary mb-2 flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              Action recommandée :
            </h3>
            <p className="text-sm text-foreground/80 leading-relaxed">
              {validationResult.recoveryStrategy === 'reset' && (
                "L'état est trop corrompu pour être récupéré automatiquement. Nous recommandons d'exporter vos données pour une sauvegarde manuelle, puis de réinitialiser le wizard."
              )}
              {validationResult.recoveryStrategy === 'partial' && (
                "Certaines données peuvent être récupérées. Nous allons tenter de préserver un maximum de votre travail."
              )}
              {validationResult.recoveryStrategy === 'migrate' && (
                "Vos données proviennent d'une version antérieure. Nous allons tenter de les migrer vers le format actuel."
              )}
              {!validationResult.recoveryStrategy && (
                "Vos données semblent plus ou moins valides mais présentent des anomalies mineures. Vous pouvez continuer ou réinitialiser proprement."
              )}
            </p>
          </div>

          <p className="text-xs text-muted-foreground italic bg-accent/30 p-3 rounded-lg">
            <strong>Conseil :</strong> Avant toute action radicale, exportez vos données. Cela vous permettra de ne rien perdre en cas d'échec de la récupération automatique.
          </p>
        </div>

        {/* Actions bar */}
        <div className="p-8 bg-accent/20 border-t border-border/50 flex flex-col gap-4">
          <div className="flex gap-4">
            {validationResult.canRecover && onRecover && (
              <button
                onClick={handleRecover}
                className="flex-[2] flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-primary/20"
              >
                <RefreshCw className="w-5 h-5" />
                Tenter la récupération
              </button>
            )}
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-background border border-border text-foreground rounded-xl font-medium hover:bg-accent active:scale-[0.98] transition-all"
            >
              <Download className="w-5 h-5" />
              {isExporting ? 'Export...' : 'Exporter'}
            </button>
          </div>

          <button
            onClick={handleReset}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 text-destructive/70 hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all text-sm font-medium border border-transparent hover:border-destructive/20"
          >
            <Trash2 className="w-4 h-4" />
            Réinitialiser complètement (Sûr)
          </button>
        </div>
      </div>
    </div>
  );
}
