/**
 * StyleTransferModeSelector
 * Component for selecting between workflow and prompt modes
 */

import React from 'react';
import { ModeSelectorProps, StyleTransferMode } from '../../types/styleTransfer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Workflow, Type, Film, Check } from 'lucide-react';
import { cn } from '../../lib/utils';

const modes = [
  {
    id: StyleTransferMode.WORKFLOW,
    title: 'Workflow Mode',
    description: 'Use Flux.2 Klein ComfyUI workflow for advanced style transfer with image references',
    icon: Workflow,
    features: [
      'Image-to-image style transfer',
      'Uses Flux.2 Klein 9B model',
      'Reference style image required',
      'High quality results'
    ]
  },
  {
    id: StyleTransferMode.PROMPT,
    title: 'Prompt Mode',
    description: 'Use text prompts to describe and apply styles to your images',
    icon: Type,
    features: [
      'Text-based style description',
      'Predefined style presets',
      'Custom prompt support',
      'Quick iteration'
    ]
  },
  {
    id: StyleTransferMode.VIDEO,
    title: 'Video Mode',
    description: 'Apply style transfer to entire video files (coming soon)',
    icon: Film,
    features: [
      'Video-to-video style transfer',
      'Frame-by-frame processing',
      'Temporal consistency',
      'Reference image based'
    ],
    disabled: true
  }
];

export const ModeSelector: React.FC<ModeSelectorProps> = ({
  selectedMode,
  onModeChange,
  disabled = false
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {modes.map((mode) => {
        const Icon = mode.icon;
        const isSelected = selectedMode === mode.id;
        const isDisabled = disabled || mode.disabled;

        return (
          <Card
            key={mode.id}
            className={cn(
              'cursor-pointer transition-all duration-200 relative overflow-hidden',
              isSelected && 'ring-2 ring-primary border-primary',
              isDisabled && 'opacity-50 cursor-not-allowed',
              !isDisabled && !isSelected && 'hover:border-primary/50 hover:shadow-md'
            )}
            onClick={() => !isDisabled && onModeChange(mode.id)}
          >
            {isSelected && (
              <div className="absolute top-2 right-2">
                <div className="bg-primary text-primary-foreground rounded-full p-1">
                  <Check className="w-4 h-4" />
                </div>
              </div>
            )}
            
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className={cn(
                  'p-2 rounded-lg',
                  isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'
                )}>
                  <Icon className="w-5 h-5" />
                </div>
                <CardTitle className="text-lg">{mode.title}</CardTitle>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <CardDescription className="text-sm leading-relaxed">
                {mode.description}
              </CardDescription>
              
              <ul className="space-y-1">
                {mode.features.map((feature, index) => (
                  <li 
                    key={index}
                    className="text-xs text-muted-foreground flex items-center gap-2"
                  >
                    <div className="w-1 h-1 rounded-full bg-primary/60" />
                    {feature}
                  </li>
                ))}
              </ul>
              
              {mode.disabled && (
                <div className="text-xs text-amber-600 font-medium">
                  Coming soon
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default ModeSelector;
