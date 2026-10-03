/**
 * Style Transfer Page
 * 
 * Main page for the Style Transfer Wizard
 */

import React from 'react';
import { StyleTransferWizard } from '../components/wizard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Sparkles, Info } from 'lucide-react';

export const StyleTransferPage: React.FC = () => {
  const handleComplete = (result: unknown) => {
    console.log('Style transfer completed:', result);
    // Could navigate to results page or show success message
  };

  const handleCancel = () => {
    console.log('Style transfer cancelled');
    // Could navigate back or show cancellation message
  };

  const handleError = (error: string) => {
    console.error('Style transfer error:', error);
    // Could show error toast or notification
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Sparkles className="w-8 h-8 text-primary" />
          Style Transfer Wizard
        </h1>
        <p className="text-muted-foreground mt-2">
          Transform your images with AI-powered style transfer using ComfyUI workflows
        </p>
      </div>

      {/* Info Card */}
      <Card className="mb-6 bg-blue-50 border-blue-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2 text-blue-900">
            <Info className="w-5 h-5" />
            About Style Transfer
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-blue-800 mb-2">
            This wizard allows you to apply artistic styles to your images using two methods:
          </p>
          <ul className="text-sm text-blue-800 space-y-1 ml-4 list-disc">
            <li>
              <strong>Workflow Mode:</strong> Use the Flux.2 Klein ComfyUI workflow with a style reference image
            </li>
            <li>
              <strong>Prompt Mode:</strong> Describe the desired style using text prompts with presets
            </li>
          </ul>
          <p className="text-sm text-blue-800 mt-3">
            Requires ComfyUI server running with Flux.2 Klein models installed.
          </p>
        </CardContent>
      </Card>

      {/* Wizard */}
      <StyleTransferWizard
        onComplete={handleComplete}
        onCancel={handleCancel}
        onError={handleError}
      />
    </div>
  );
};

export default StyleTransferPage;

