/**
 * StyleTransferWizard
 * Main wizard component for style transfer operations
 */

import React, { useState, useCallback } from 'react';
import {
  StyleTransferWizardProps,
  StyleTransferWizardState,
  StyleTransferResult,
  StyleTransferMode,
  MediaType,
  DEFAULT_WORKFLOW_CONFIG,
  DEFAULT_PROMPT_CONFIG,
  DEFAULT_VIDEO_CONFIG
} from '../../types/styleTransfer';
import { ModeSelector } from './StyleTransferModeSelector';
import { WorkflowStyleTransfer } from './WorkflowStyleTransfer';
import { PromptStyleTransfer } from './PromptStyleTransfer';
import { StylePreview } from './StylePreview';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Progress } from '../../components/ui/progress';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Loader2, CheckCircle2, XCircle, ArrowLeft, ArrowRight, RefreshCw } from 'lucide-react';

const TOTAL_STEPS = 4;

export const StyleTransferWizard: React.FC<StyleTransferWizardProps> = ({
  projectPath,
  initialMode = StyleTransferMode.WORKFLOW,
  onComplete,
  onCancel,
  onError
}) => {
  const [state, setState] = useState<StyleTransferWizardState>({
    currentStep: 1,
    totalSteps: TOTAL_STEPS,
    mode: initialMode,
    mediaType: MediaType.IMAGE,
    workflowConfig: { ...DEFAULT_WORKFLOW_CONFIG },
    promptConfig: { ...DEFAULT_PROMPT_CONFIG },
    videoConfig: { ...DEFAULT_VIDEO_CONFIG },
    isProcessing: false
  });

  const updateState = useCallback((updates: Partial<StyleTransferWizardState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const handleModeChange = useCallback((mode: StyleTransferMode) => {
    updateState({ mode, currentStep: 1 });
  }, [updateState]);

  const handleNext = useCallback(() => {
    if (state.currentStep < TOTAL_STEPS) {
      updateState({ currentStep: state.currentStep + 1 });
    }
  }, [state.currentStep, updateState]);

  const handlePrevious = useCallback(() => {
    if (state.currentStep > 1) {
      updateState({ currentStep: state.currentStep - 1 });
    }
  }, [state.currentStep, updateState]);

  const handleStartTransfer = useCallback(async () => {
    updateState({ isProcessing: true, error: undefined });
    
    try {
      // This would call the actual service
      // For now, simulate the process
      const mockResult: StyleTransferResult = {
        success: true,
        outputPath: '/mock/output.png',
        outputPaths: ['/mock/output.png'],
        generationTime: 5.2,
        metadata: {
          mode: state.mode,
          steps: state.mode === StyleTransferMode.WORKFLOW 
            ? state.workflowConfig?.steps 
            : state.promptConfig?.steps
        }
      };

      // Simulate progress
      for (let i = 0; i <= 100; i += 20) {
        await new Promise(resolve => setTimeout(resolve, 500));
        updateState({
          progress: {
            message: i < 100 ? 'Processing...' : 'Complete!',
            percentage: i
          }
        });
      }

      updateState({ 
        result: mockResult, 
        isProcessing: false,
        currentStep: TOTAL_STEPS 
      });
      
      onComplete?.(mockResult);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      updateState({ 
        error: errorMessage, 
        isProcessing: false 
      });
      onError?.(errorMessage);
    }
  }, [state.mode, state.workflowConfig, state.promptConfig, updateState, onComplete, onError]);

  const handleReset = useCallback(() => {
    updateState({
      currentStep: 1,
      result: undefined,
      error: undefined,
      progress: undefined,
      sourceFile: undefined,
      styleReferenceFile: undefined
    });
  }, [updateState]);

  const renderStep = () => {
    switch (state.currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-2">Choose Style Transfer Mode</h2>
              <p className="text-muted-foreground">
                Select how you want to transfer styles to your images or videos
              </p>
            </div>
            
            <ModeSelector
              selectedMode={state.mode}
              onModeChange={handleModeChange}
              disabled={state.isProcessing}
            />
            
            <div className="mt-6 p-4 bg-muted rounded-lg">
              <h3 className="font-semibold mb-2">Mode Description</h3>
              <p className="text-sm text-muted-foreground">
                {state.mode === StyleTransferMode.WORKFLOW && (
                  <>
                    <strong>Workflow Mode:</strong> Use the Flux.2 Klein ComfyUI workflow for advanced style transfer. 
                    Upload a source image and a style reference image to transfer the artistic style.
                  </>
                )}
                {state.mode === StyleTransferMode.PROMPT && (
                  <>
                    <strong>Prompt Mode:</strong> Use text prompts to describe the desired style. 
                    Choose from predefined style presets or write your own custom prompt.
                  </>
                )}
                {state.mode === StyleTransferMode.VIDEO && (
                  <>
                    <strong>Video Mode:</strong> Apply style transfer to video files. 
                    Upload a video and a reference style image to stylize the entire video.
                  </>
                )}
              </p>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-2">Configure Style Transfer</h2>
              <p className="text-muted-foreground">
                Set up your style transfer parameters
              </p>
            </div>

            {state.mode === StyleTransferMode.WORKFLOW && (
              <WorkflowStyleTransfer
                config={state.workflowConfig || DEFAULT_WORKFLOW_CONFIG}
                onConfigChange={(config) => updateState({ workflowConfig: config })}
                sourceFile={state.sourceFile}
                styleFile={state.styleReferenceFile}
                onSourceFileChange={(file) => updateState({ sourceFile: file })}
                onStyleFileChange={(file) => updateState({ styleReferenceFile: file })}
              />
            )}

            {state.mode === StyleTransferMode.PROMPT && (
              <PromptStyleTransfer
                config={state.promptConfig || DEFAULT_PROMPT_CONFIG}
                onConfigChange={(config) => updateState({ promptConfig: config })}
                sourceFile={state.sourceFile}
                onSourceFileChange={(file) => updateState({ sourceFile: file })}
                selectedPreset={state.selectedPreset}
                onPresetChange={(preset) => updateState({ selectedPreset: preset })}
                customPrompt={state.customPrompt}
                onCustomPromptChange={(prompt) => updateState({ customPrompt: prompt })}
              />
            )}

            {state.mode === StyleTransferMode.VIDEO && (
              <Card>
                <CardHeader>
                  <CardTitle>Video Style Transfer</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Video style transfer configuration will be implemented here.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-2">Preview & Generate</h2>
              <p className="text-muted-foreground">
                Review your configuration and start the style transfer
              </p>
            </div>

            <StylePreview
              sourceUrl={state.sourceFile ? URL.createObjectURL(state.sourceFile) : undefined}
              styleUrl={state.styleReferenceFile ? URL.createObjectURL(state.styleReferenceFile) : undefined}
              isProcessing={state.isProcessing}
              progress={state.progress}
            />

            {state.error && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>{state.error}</AlertDescription>
              </Alert>
            )}

            {state.isProcessing && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{state.progress?.message || 'Processing...'}</span>
                  <span>{state.progress?.percentage || 0}%</span>
                </div>
                <Progress value={state.progress?.percentage || 0} />
              </div>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-2">Result</h2>
              <p className="text-muted-foreground">
                Style transfer completed
              </p>
            </div>

            {state.result?.success ? (
              <div className="text-center space-y-4">
                <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
                <p className="text-lg font-medium">Style transfer completed successfully!</p>
                <div className="text-sm text-muted-foreground">
                  <p>Generation time: {state.result.generationTime.toFixed(2)}s</p>
                  <p>Output: {state.result.outputPath}</p>
                </div>
                <div className="flex justify-center gap-4 mt-6">
                  <Button onClick={handleReset} variant="outline">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Start New Transfer
                  </Button>
                  <Button onClick={() => onComplete?.(state.result!)}>
                    Done
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-4">
                <XCircle className="w-16 h-16 text-red-500 mx-auto" />
                <p className="text-lg font-medium">Style transfer failed</p>
                {state.result?.errorMessage && (
                  <p className="text-sm text-red-500">{state.result.errorMessage}</p>
                )}
                <Button onClick={handleReset} variant="outline">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Style Transfer Wizard</CardTitle>
          <div className="text-sm text-muted-foreground">
            Step {state.currentStep} of {TOTAL_STEPS}
          </div>
        </div>
        <Progress 
          value={(state.currentStep / TOTAL_STEPS) * 100} 
          className="mt-2"
        />
      </CardHeader>
      
      <CardContent className="p-6">
        {renderStep()}
        
        <div className="flex justify-between mt-8 pt-4 border-t">
          <div>
            {state.currentStep > 1 && state.currentStep < 4 && (
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={state.isProcessing}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>
            )}
          </div>
          
          <div className="flex gap-2">
            {onCancel && state.currentStep < 4 && (
              <Button
                variant="ghost"
                onClick={onCancel}
                disabled={state.isProcessing}
              >
                Cancel
              </Button>
            )}
            
            {state.currentStep < 3 && (
              <Button
                onClick={handleNext}
                disabled={state.isProcessing}
              >
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
            
            {state.currentStep === 3 && (
              <Button
                onClick={handleStartTransfer}
                disabled={state.isProcessing || !state.sourceFile}
              >
                {state.isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    Start Transfer
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StyleTransferWizard;
