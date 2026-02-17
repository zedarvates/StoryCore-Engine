/**
 * Lip Sync Wizard Component
 *
 * Modal wizard for generating lip-synced videos.
 * Synchronizes character face with audio dialogue.
 */

import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useLipSyncStore } from '@/stores/lipSyncStore';
import { LipSyncModel, LipSyncStyle } from '@/types/lipSync';

export interface LipSyncWizardProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  onComplete?: (videoUrl: string) => void;
  preSelectedCharacterImage?: string;
  preSelectedAudioFile?: string;
}

/**
 * Lip Sync Wizard Steps
 */
export enum LipSyncWizardStep {
  SELECT_ASSETS = 'select_assets',
  CONFIGURE = 'configure',
  GENERATE = 'generate',
  COMPLETE = 'complete'
}

export function LipSyncWizard({
  isOpen,
  onClose,
  projectId,
  onComplete,
  preSelectedCharacterImage,
  preSelectedAudioFile
}: LipSyncWizardProps) {
  const [currentStep, setCurrentStep] = useState<LipSyncWizardStep>(LipSyncWizardStep.SELECT_ASSETS);
  const [isRecording, setIsRecording] = useState(false);
  
  // Store state
  const {
    characterFaceImage,
    audioFile,
    options,
    isGenerating,
    progress,
    error,
    currentJob,
    setCharacterFaceImage,
    setAudioFile,
    setOptions,
    generateLipSync,
    clearError,
    reset
  } = useLipSyncStore();

  // Initialize with pre-selected values
  React.useEffect(() => {
    if (preSelectedCharacterImage) {
      setCharacterFaceImage(preSelectedCharacterImage);
    }
    if (preSelectedAudioFile) {
      setAudioFile(preSelectedAudioFile);
    }
  }, [preSelectedCharacterImage, preSelectedAudioFile]);

  const handleGenerate = useCallback(async () => {
    clearError();
    setCurrentStep(LipSyncWizardStep.GENERATE);
    
    try {
      await generateLipSync(projectId);
      
      if (currentJob?.status === 'completed' && currentJob.output_video) {
        setCurrentStep(LipSyncWizardStep.COMPLETE);
        onComplete?.(currentJob.output_video);
      }
    } catch (err) {
      // Error is handled by the store
    }
  }, [projectId, generateLipSync, currentJob, onComplete]);

  const handleClose = useCallback(() => {
    reset();
    setCurrentStep(LipSyncWizardStep.SELECT_ASSETS);
    onClose();
  }, [reset, onClose]);

  const canProceedToConfig = characterFaceImage && audioFile;
  const canGenerate = canProceedToConfig && !isGenerating;

  // Handle browse image button - uses file input (works in both Electron and browser)
  const handleBrowseImage = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/webp,image/gif';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        // Create object URL for preview
        const url = URL.createObjectURL(file);
        setCharacterFaceImage(url);
      }
    };
    input.click();
  }, [setCharacterFaceImage]);

  // Handle browse audio button
  const handleBrowseAudio = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'audio/mpeg,audio/wav,audio/ogg,audio/m4a,audio/aac';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const url = URL.createObjectURL(file);
        setAudioFile(url);
      }
    };
    input.click();
  }, [setAudioFile]);

  // Handle record audio button
  const handleRecord = useCallback(() => {
    if (isRecording) {
      setIsRecording(false);
      // Stop recording logic would go here
    } else {
      setIsRecording(true);
      // Start recording logic would go here
      console.log('Recording started...');
    }
  }, [isRecording]);

  // Handle download video
  const handleDownload = useCallback(() => {
    if (currentJob?.output_video) {
      const link = document.createElement('a');
      link.href = currentJob.output_video;
      link.download = `lipsync_video_${Date.now()}.mp4`;
      link.click();
    }
  }, [currentJob?.output_video]);

  // Handle add to timeline
  const handleAddToTimeline = useCallback(() => {
    if (currentJob?.output_video) {
      // Dispatch event to add video to timeline
      const event = new CustomEvent('add-to-timeline', {
        detail: { videoUrl: currentJob.output_video }
      });
      window.dispatchEvent(event);
      console.log('Video added to timeline:', currentJob.output_video);
    }
  }, [currentJob?.output_video]);

  /**
   * Render Step 1: Select Assets
   */
  const renderSelectAssets = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Select Assets</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Choose the character face image and audio file to synchronize.
        </p>
      </div>

      {/* Character Face Image */}
      <div className="space-y-2">
        <Label htmlFor="character-face">Character Face Image</Label>
        <div className="flex gap-2">
          <Input
            id="character-face"
            type="text"
            value={characterFaceImage || ''}
            onChange={(e) => setCharacterFaceImage(e.target.value)}
            placeholder="Enter image path or select from library"
            className="flex-1"
          />
          <Button variant="outline" onClick={handleBrowseImage}>
            Browse
          </Button>
        </div>
        {characterFaceImage && (
          <div className="mt-2 border rounded-md p-2 max-w-xs">
            <img 
              src={characterFaceImage} 
              alt="Character face preview" 
              className="w-full h-auto object-contain rounded"
            />
          </div>
        )}
      </div>

      {/* Audio File */}
      <div className="space-y-2">
        <Label htmlFor="audio-file">Audio File (Dialogue)</Label>
        <div className="flex gap-2">
          <Input
            id="audio-file"
            type="text"
            value={audioFile || ''}
            onChange={(e) => setAudioFile(e.target.value)}
            placeholder="Enter audio path or record new"
            className="flex-1"
          />
          <Button variant="outline" onClick={handleBrowseAudio}>
            Browse
          </Button>
          <Button variant="outline" onClick={handleRecord}>
            {isRecording ? 'Stop' : 'Record'}
          </Button>
        </div>
        {audioFile && (
          <div className="mt-2">
            <audio controls src={audioFile} className="w-full" />
          </div>
        )}
      </div>
    </div>
  );

  /**
   * Render Step 2: Configure Options
   */
  const renderConfigure = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Configure Lip Sync</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Adjust parameters for optimal lip synchronization.
        </p>
      </div>

      {/* Model Selection */}
      <div className="space-y-2">
        <Label>Lip Sync Model</Label>
        <Select
          value={options.model}
          onValueChange={(value) => setOptions({ model: value as LipSyncModel })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select model" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="wav2lip">Wav2Lip (Fast)</SelectItem>
            <SelectItem value="wav2lip_gan">Wav2Lip GAN (High Quality)</SelectItem>
            <SelectItem value="sadtalker">SadTalker (Expressive)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Style */}
      <div className="space-y-2">
        <Label>Expression Style</Label>
        <Select
          value={options.style}
          onValueChange={(value) => setOptions({ style: value as LipSyncStyle })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select style" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="neutral">Neutral</SelectItem>
            <SelectItem value="happy">Happy</SelectItem>
            <SelectItem value="sad">Sad</SelectItem>
            <SelectItem value="angry">Angry</SelectItem>
            <SelectItem value="surprised">Surprised</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Enhancer */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="enhancer"
          checked={options.enhancer}
          onCheckedChange={(checked) => setOptions({ enhancer: !!checked })}
        />
        <Label htmlFor="enhancer">Use Face Enhancer (GFPGAN)</Label>
      </div>

      {/* Padding */}
      <div className="space-y-2">
        <Label>Face Padding</Label>
        <Input
          value={options.pads}
          onChange={(e) => setOptions({ pads: e.target.value })}
          placeholder="0 0 0 0"
        />
        <p className="text-xs text-muted-foreground">
          Format: top right bottom left (in pixels)
        </p>
      </div>
    </div>
  );

  /**
   * Render Step 3: Generate
   */
  const renderGenerate = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Generating Lip Sync</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Please wait while your video is being generated.
        </p>
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Progress</span>
          <span>{progress}%</span>
        </div>
        <Progress value={progress} className="w-full" />
      </div>

      {/* Status */}
      {currentJob && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              {currentJob.status === 'processing' && 'Processing lip sync...'}
              {currentJob.status === 'enhancing' && 'Enhancing face quality...'}
              {currentJob.status === 'completed' && 'Generation complete!'}
              {currentJob.status === 'failed' && 'Generation failed'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );

  /**
   * Render Step 4: Complete
   */
  const renderComplete = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Lip Sync Complete!</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Your lip-synced video has been generated successfully.
        </p>
      </div>

      {/* Preview */}
      {currentJob?.output_video && (
        <div className="border rounded-md overflow-hidden">
          <video 
            src={currentJob.output_video} 
            controls 
            className="w-full"
            autoPlay
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <Button onClick={handleDownload}>
          Download Video
        </Button>
        <Button variant="outline" onClick={handleAddToTimeline}>
          Add to Timeline
        </Button>
      </div>
    </div>
  );

  /**
   * Render current step content
   */
  const renderStepContent = () => {
    switch (currentStep) {
      case LipSyncWizardStep.SELECT_ASSETS:
        return renderSelectAssets();
      case LipSyncWizardStep.CONFIGURE:
        return renderConfigure();
      case LipSyncWizardStep.GENERATE:
        return renderGenerate();
      case LipSyncWizardStep.COMPLETE:
        return renderComplete();
      default:
        return null;
    }
  };

  /**
   * Get step title
   */
  const getStepTitle = () => {
    switch (currentStep) {
      case LipSyncWizardStep.SELECT_ASSETS:
        return 'Select Assets';
      case LipSyncWizardStep.CONFIGURE:
        return 'Configure';
      case LipSyncWizardStep.GENERATE:
        return 'Generate';
      case LipSyncWizardStep.COMPLETE:
        return 'Complete';
      default:
        return '';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Lip Sync Wizard</DialogTitle>
          <DialogDescription>
            Step {Object.values(LipSyncWizardStep).indexOf(currentStep) + 1} of 4: {getStepTitle()}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          {/* Step Indicator */}
          <div className="flex items-center gap-2 mb-6">
            {Object.values(LipSyncWizardStep).map((step, index) => (
              <React.Fragment key={step}>
                <div
                  className={`w-3 h-3 rounded-full ${
                    step === currentStep
                      ? 'bg-primary'
                      : Object.values(LipSyncWizardStep).indexOf(step) < Object.values(LipSyncWizardStep).indexOf(currentStep)
                      ? 'bg-primary/50'
                      : 'bg-muted'
                  }`}
                />
                {index < Object.values(LipSyncWizardStep).length - 1 && (
                  <div className="flex-1 h-0.5 bg-muted" />
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Step Content */}
          {renderStepContent()}
        </div>

        {/* Navigation */}
        <DialogFooter className="mt-6">
          {currentStep !== LipSyncWizardStep.GENERATE && currentStep !== LipSyncWizardStep.COMPLETE && (
            <>
              {currentStep !== LipSyncWizardStep.SELECT_ASSETS && (
                <Button 
                  variant="outline" 
                  onClick={() => {
                    const currentIndex = Object.values(LipSyncWizardStep).indexOf(currentStep);
                    setCurrentStep(Object.values(LipSyncWizardStep)[currentIndex - 1]);
                  }}
                >
                  Back
                </Button>
              )}
              
              {currentStep === LipSyncWizardStep.SELECT_ASSETS ? (
                <Button 
                  onClick={() => setCurrentStep(LipSyncWizardStep.CONFIGURE)}
                  disabled={!canProceedToConfig}
                >
                  Next
                </Button>
              ) : (
                <Button 
                  onClick={handleGenerate}
                  disabled={!canGenerate}
                >
                  {isGenerating ? 'Generating...' : 'Generate Lip Sync'}
                </Button>
              )}
            </>
          )}
          
          {currentStep === LipSyncWizardStep.COMPLETE && (
            <Button onClick={handleClose}>
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default LipSyncWizard;

