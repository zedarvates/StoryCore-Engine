/**
 * StylePreview
 * Component for previewing source, style, and result images
 */

import React from 'react';
import { StylePreviewProps } from '../../types/styleTransfer';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Loader2, Image as ImageIcon, ArrowRight, Sparkles } from 'lucide-react';
import { cn } from '../../lib/utils';

export const StylePreview: React.FC<StylePreviewProps> = ({
  sourceUrl,
  styleUrl,
  resultUrl,
  isProcessing,
  progress
}) => {
  return (
    <div className="space-y-6">
      {/* Input Images Preview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Source Image */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              Source Image
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sourceUrl ? (
              <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                <img 
                  src={sourceUrl} 
                  alt="Source" 
                  className="w-full h-full object-contain"
                />
              </div>
            ) : (
              <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No source image selected</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Style Reference */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Style Reference
            </CardTitle>
          </CardHeader>
          <CardContent>
            {styleUrl ? (
              <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                <img 
                  src={styleUrl} 
                  alt="Style" 
                  className="w-full h-full object-contain"
                />
              </div>
            ) : (
              <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No style reference selected</p>
                  <p className="text-xs mt-1">(Optional for prompt mode)</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Arrow Indicator */}
      <div className="flex justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <div className="h-px w-16 bg-border" />
          <ArrowRight className="w-5 h-5" />
          <div className="h-px w-16 bg-border" />
        </div>
      </div>

      {/* Result Preview */}
      <Card className={cn(
        "border-2",
        isProcessing ? "border-primary/50" : "border-border",
        resultUrl && "border-green-500/50"
      )}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : resultUrl ? (
              <Sparkles className="w-4 h-4 text-green-500" />
            ) : (
              <ImageIcon className="w-4 h-4" />
            )}
            {isProcessing ? 'Generating...' : resultUrl ? 'Result' : 'Output Preview'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isProcessing ? (
            <div className="aspect-video bg-muted rounded-lg flex flex-col items-center justify-center space-y-4">
              <Loader2 className="w-12 h-12 animate-spin text-primary" />
              <div className="text-center">
                <p className="font-medium">{progress?.message || 'Processing...'}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {progress?.percentage || 0}% complete
                </p>
              </div>
              {progress && progress.percentage > 0 && (
                <div className="w-48 h-2 bg-muted-foreground/20 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${progress.percentage}%` }}
                  />
                </div>
              )}
            </div>
          ) : resultUrl ? (
            <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
              <img 
                src={resultUrl} 
                alt="Result" 
                className="w-full h-full object-contain"
              />
              <div className="absolute bottom-2 right-2">
                <span className="px-2 py-1 bg-green-500 text-white text-xs rounded-full">
                  Complete
                </span>
              </div>
            </div>
          ) : (
            <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>Result will appear here</p>
                <p className="text-sm mt-1">Click "Start Transfer" to begin</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Processing Details */}
      {isProcessing && progress && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Status:</span>
              <span className="font-medium">{progress.message}</span>
            </div>
            <div className="flex items-center justify-between text-sm mt-2">
              <span className="text-muted-foreground">Progress:</span>
              <span className="font-medium">{progress.percentage}%</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default StylePreview;
