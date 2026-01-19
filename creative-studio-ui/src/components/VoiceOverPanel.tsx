import React, { useState } from 'react';
import { VoiceOverGenerator } from './VoiceOverGenerator';
import { VoiceLibrary } from './VoiceLibrary';
import { useVoiceOverGenerator } from '../hooks/useVoiceOverGenerator';
import type { VoiceOver } from '../types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Alert, AlertDescription } from './ui/alert';
import { AlertCircle } from 'lucide-react';

interface VoiceOverPanelProps {
  shotId: string;
  onClose?: () => void;
}

export const VoiceOverPanel: React.FC<VoiceOverPanelProps> = ({ shotId, onClose }) => {
  const { isGenerating, error, generateVoiceOver, clearError } = useVoiceOverGenerator();
  const [selectedVoice, setSelectedVoice] = useState<string>('female');

  const handleGenerate = async (voiceOver: VoiceOver) => {
    try {
      await generateVoiceOver(voiceOver, shotId);
      // Optionally close panel after successful generation
      if (onClose) {
        onClose();
      }
    } catch (err) {
      // Error is handled by the hook
      console.error('Failed to generate voiceover:', err);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="generator" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="generator">Generate</TabsTrigger>
          <TabsTrigger value="library">Voice Library</TabsTrigger>
        </TabsList>

        <TabsContent value="generator" className="space-y-4">
          <VoiceOverGenerator
            onGenerate={handleGenerate}
            onCancel={onClose}
            isGenerating={isGenerating}
          />
        </TabsContent>

        <TabsContent value="library" className="space-y-4">
          <VoiceLibrary
            selectedVoice={selectedVoice}
            onSelectVoice={setSelectedVoice}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};
