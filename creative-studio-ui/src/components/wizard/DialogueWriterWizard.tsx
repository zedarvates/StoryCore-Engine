/**
 * Dialogue Writer Wizard Component
 *
 * Modal wizard for creating dialogue using the DialogueWriterForm
 * Provides a modal interface for dialogue generation
 */

import React, { useState, useEffect, useCallback } from 'react';
import { X, Copy, RefreshCw, Check, ArrowLeft, Loader2, Video } from 'lucide-react';
import { DialogueWriterForm, DialogueWriterFormProps, DialogueInput } from './forms/DialogueWriterForm';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useAppStore } from '@/stores/useAppStore';
import './WizardModal.css';

export interface DialogueWriterWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (data: DialogueInput, result?: string) => void;
  characters: DialogueWriterFormProps['characters'];
  initialData?: Partial<DialogueInput>;
}

export function DialogueWriterWizard({
  isOpen,
  onClose,
  onComplete,
  characters,
  initialData,
}: DialogueWriterWizardProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<'input' | 'result'>('input');
  const [formData, setFormData] = useState<DialogueInput | null>(null);
  const [generatedDialogue, setGeneratedDialogue] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const setShowLipSyncWizard = useAppStore(state => state.setShowLipSyncWizard);

  // Handle Escape key
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
      setStep('input');
      setGeneratedDialogue('');
    } else {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, handleKeyDown]);

  const generateDialogue = async (data: DialogueInput) => {
    setIsGenerating(true);
    setFormData(data);

    try {
      const { llmConfigService } = await import('@/services/llmConfigService');
      const service = llmConfigService.getService();

      if (!service) {
        toast({ title: "Service non disponible", description: "Configurez le LLM dans les paramètres", variant: "destructive" });
        setIsGenerating(false);
        return;
      }

      const charNames = data.characters
        .map(id => characters.find(c => c.id === id)?.name || id)
        .join(', ');

      const prompt = `Write a dialogue scene based on the following context:\n\nContext: ${data.sceneContext}\n\nCharacters: ${charNames}\n\nTone: ${data.tone}\n\nFormat the dialogue as a standard screenplay script.`;

      const response = await service.generateCompletion({
        prompt,
        systemPrompt: "You are an expert screenwriter and dialogue writer.",
        temperature: 0.7
      });

      if (response.success && response.data) {
        setGeneratedDialogue(response.data.content);
        setStep('result');
      } else {
        throw new Error(response.error || 'Unknown error');
      }
    } catch (error) {
      console.error("Dialogue generation failed:", error);
      toast({ title: "Erreur de génération", description: "Impossible de générer le dialogue.", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUse = () => {
    if (formData) {
      onComplete(formData, generatedDialogue);
      onClose();
    }
  };

  const handleLipSync = () => {
    if (formData) {
      onComplete(formData, generatedDialogue);
      setShowLipSyncWizard(true, {
        characterImage: undefined, // Will be selected in wizard
      });
      onClose();
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedDialogue);
    toast({ title: "Copié !", description: "Le dialogue a été copié dans le presse-papier." });
  };

  if (!isOpen) return null;

  return (
    <div className="wizard-modal-overlay" onClick={onClose}>
      <div className="wizard-modal-container max-w-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="wizard-modal-header">
          <div className="flex flex-col">
            <h2 className="wizard-modal-title">Dialogue Writer</h2>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">
              {step === 'input'
                ? "Define the context and characters for your scene."
                : "Review and edit the generated dialogue."}
            </p>
          </div>
          <button
            className="wizard-modal-close"
            onClick={onClose}
            aria-label="Fermer"
          >
            <X size={20} />
          </button>
        </div>

        <div className="wizard-modal-content p-6">
          {step === 'input' ? (
            <DialogueWriterForm
              initialData={initialData}
              characters={characters}
              onSubmit={generateDialogue}
              onCancel={onClose}
              isGenerating={isGenerating}
            />
          ) : (
            <div className="flex flex-col h-full space-y-4">
              <ScrollArea className="flex-1 border border-primary/20 rounded-md p-4 bg-black/40">
                <div className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-slate-300">
                  {generatedDialogue}
                </div>
              </ScrollArea>

              <div className="flex justify-between items-center pt-2">
                <Button variant="outline" onClick={() => setStep('input')} className="gap-2 border-primary/20 text-slate-400 hover:text-white">
                  <ArrowLeft className="w-4 h-4" />
                  Back to Edit
                </Button>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleCopy} title="Copy to clipboard" className="border-primary/20">
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => formData && generateDialogue(formData)}
                    disabled={isGenerating}
                    className="gap-2 border-primary/20"
                  >
                    {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    Regenerate
                  </Button>
                  <Button variant="secondary" onClick={handleLipSync} className="gap-2 bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-600/30">
                    <Video className="w-4 h-4" />
                    Lip Sync
                  </Button>
                  <Button onClick={handleUse} className="gap-2 bg-primary text-primary-foreground font-bold">
                    <Check className="w-4 h-4" />
                    Use Dialogue
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
