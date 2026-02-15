/**
 * Dialogue Writer Wizard Component
 *
 * Modal wizard for creating dialogue using the DialogueWriterForm
 * Provides a modal interface for dialogue generation
 */

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { DialogueWriterForm, DialogueWriterFormProps, DialogueInput } from './forms/DialogueWriterForm';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Copy, RefreshCw, Check, ArrowLeft, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedDialogue);
    toast({ title: "Copié !", description: "Le dialogue a été copié dans le presse-papier." });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Dialogue Writer</DialogTitle>
          <DialogDescription>
            {step === 'input'
              ? "Define the context and characters for your scene."
              : "Review and edit the generated dialogue."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden mt-4">
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
              <ScrollArea className="flex-1 border rounded-md p-4 bg-muted/30">
                <div className="whitespace-pre-wrap font-mono text-sm leading-relaxed">
                  {generatedDialogue}
                </div>
              </ScrollArea>

              <div className="flex justify-between items-center pt-2">
                <Button variant="outline" onClick={() => setStep('input')} className="gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Back to Edit
                </Button>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleCopy} title="Copy to clipboard">
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => formData && generateDialogue(formData)}
                    disabled={isGenerating}
                    className="gap-2"
                  >
                    {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    Regenerate
                  </Button>
                  <Button onClick={handleUse} className="gap-2">
                    <Check className="w-4 h-4" />
                    Use This Dialogue
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
