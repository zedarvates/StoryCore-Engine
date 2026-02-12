// ============================================================================
// Methodology Selector Component
// UI for selecting story creation methodology
// ============================================================================

import React, { useState } from 'react';
import { methodologyFactory } from '@/services/MethodologyFactory';
import type { MethodologyDescription, MethodologyOption, WritingStyle } from '@/types/storyMethodology';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { ChevronDown, ChevronUp, Settings2, Sparkles } from 'lucide-react';

// ============================================================================
// Writing Style Options
// ============================================================================

const WRITING_STYLE_OPTIONS: { value: WritingStyle; label: string; description: string }[] = [
  { value: 'descriptive', label: 'Descriptive', description: 'Rich, detailed prose with vivid imagery' },
  { value: 'minimalist', label: 'Minimalist', description: 'Clean, concise prose with essential details' },
  { value: 'dialog_heavy', label: 'Dialog-Heavy', description: 'Story told primarily through character dialogue' },
  { value: 'poetic', label: 'Poetic', description: 'Lyrical, figurative language with rhythm' },
  { value: 'technical', label: 'Technical', description: 'Precise, factual narrative style' },
];

// ============================================================================
// Full Settings Interface
// ============================================================================

export interface FullSettings {
  toneConsistencyCheck: boolean;
  characterVoiceConsistency: boolean;
  revisionHistory: boolean;
  writingStyle: WritingStyle;
}

// ============================================================================
// Methodology Selector Props
// ============================================================================

export interface MethodologySelectorProps {
  /** Currently selected methodology */
  selectedMethodology: string;
  /** Callback when methodology changes */
  onMethodologyChange: (methodology: string) => void;
  /** Selected options */
  options: Record<string, unknown>;
  /** Callback when options change */
  onOptionsChange: (options: Record<string, unknown>) => void;
  /** Selected writing style */
  writingStyle: WritingStyle;
  /** Callback when writing style changes */
  onWritingStyleChange: (style: WritingStyle) => void;
  /** Common settings */
  settings: FullSettings;
  /** Callback when settings change */
  onSettingsChange: (settings: FullSettings) => void;
  /** Whether the component is disabled */
  disabled?: boolean;
}

// ============================================================================
// Methodology Card Component
// ============================================================================

interface MethodologyCardProps {
  methodology: MethodologyDescription;
  isSelected: boolean;
  onSelect: () => void;
  disabled: boolean;
}

function MethodologyCard({ methodology, isSelected, onSelect, disabled }: MethodologyCardProps) {
  return (
    <Card
      className={`cursor-pointer transition-all duration-200 ${
        isSelected
          ? 'ring-2 ring-primary border-primary bg-primary/5'
          : 'hover:border-primary/50 hover:bg-muted/50'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      onClick={disabled ? undefined : onSelect}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
            style={{ backgroundColor: methodology.color }}
          >
            {methodology.icon === 'list-ordered' && '1'}
            {methodology.icon === 'layout-template' && '2'}
            {methodology.icon === 'trending-up' && '3'}
            {methodology.icon === 'book-open' && '4'}
          </div>
          {isSelected && (
            <Sparkles className="w-5 h-5 text-primary animate-pulse" />
          )}
        </div>
        <CardTitle className="text-lg mt-3">{methodology.name}</CardTitle>
        <CardDescription>{methodology.shortDescription}</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="text-sm text-muted-foreground space-y-2">
          {methodology.phases.slice(0, 3).map((phase, index) => (
            <div key={phase.phase} className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-muted text-xs flex items-center justify-center">
                {index + 1}
              </span>
              <span>{phase.name}</span>
            </div>
          ))}
          {methodology.phases.length > 3 && (
            <div className="flex items-center gap-2 text-primary">
              <span className="text-xs">+{methodology.phases.length - 3} more phases</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Options Panel Component
// ============================================================================

interface OptionsPanelProps {
  methodology: MethodologyDescription;
  options: Record<string, unknown>;
  onOptionsChange: (options: Record<string, unknown>) => void;
}

function OptionsPanel({ methodology, options, onOptionsChange }: OptionsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const handleOptionChange = (optionId: string, value: unknown) => {
    onOptionsChange({
      ...options,
      [optionId]: value,
    });
  };
  
  const renderOption = (option: MethodologyOption) => {
    const value = options[option.id];
    
    switch (option.valueType) {
      case 'boolean':
        return (
          <div key={option.id} className="flex items-center justify-between">
            <Label htmlFor={option.id} className="flex flex-col">
              <span>{option.name}</span>
              <span className="text-xs text-muted-foreground font-normal">
                {option.description}
              </span>
            </Label>
            <Checkbox
              id={option.id}
              checked={(value ?? option.defaultValue) as boolean}
              onCheckedChange={(checked) => handleOptionChange(option.id, checked)}
            />
          </div>
        );
        
      case 'number':
        return (
          <div key={option.id} className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor={option.id}>{option.name}</Label>
              <span className="text-sm font-medium">
                {String(value ?? option.defaultValue)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">{option.description}</p>
            <Slider
              id={option.id}
              min={option.min ?? 1}
              max={option.max ?? 10}
              step={1}
              value={[(value ?? option.defaultValue) as number]}
              onValueChange={(vals) => handleOptionChange(option.id, vals[0])}
            />
          </div>
        );
        
      case 'select':
        return (
          <div key={option.id} className="space-y-2">
            <Label>{option.name}</Label>
            <p className="text-xs text-muted-foreground">{option.description}</p>
            <RadioGroup
              value={(value ?? option.defaultValue) as string}
              onValueChange={(val) => handleOptionChange(option.id, val)}
              className="flex flex-col space-y-1"
            >
              {option.options?.map((opt) => (
                <div key={opt.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={opt.value} id={`${option.id}-${opt.value}`} />
                  <Label htmlFor={`${option.id}-${opt.value}`}>{opt.label}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        );
        
      default:
        return null;
    }
  };
  
  if (methodology.options.length === 0) {
    return null;
  }
  
  return (
    <div className="border rounded-lg p-4 space-y-4">
      <Button
        variant="ghost"
        size="sm"
        className="w-full flex items-center justify-between"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className="flex items-center gap-2">
          <Settings2 className="w-4 h-4" />
          Methodology Options
        </span>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4" />
        ) : (
          <ChevronDown className="w-4 h-4" />
        )}
      </Button>
      
      {isExpanded && (
        <div className="space-y-4 pt-2">
          {methodology.options.map(renderOption)}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Settings Panel Component
// ============================================================================

interface SettingsPanelProps {
  settings: FullSettings;
  onSettingsChange: (settings: FullSettings) => void;
}

function SettingsPanel({ settings, onSettingsChange }: SettingsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  return (
    <div className="border rounded-lg p-4 space-y-4">
      <Button
        variant="ghost"
        size="sm"
        className="w-full flex items-center justify-between"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className="flex items-center gap-2">
          <Settings2 className="w-4 h-4" />
          Writing Settings
        </span>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4" />
        ) : (
          <ChevronDown className="w-4 h-4" />
        )}
      </Button>
      
      {isExpanded && (
        <div className="space-y-4 pt-2">
          {/* Writing Style */}
          <div className="space-y-2">
            <Label>Writing Style</Label>
            <p className="text-xs text-muted-foreground">
              Choose how the story will be written
            </p>
            <RadioGroup
              value={settings.writingStyle}
              onValueChange={(val) => onSettingsChange({ ...settings, writingStyle: val as WritingStyle })}
              className="grid grid-cols-1 gap-2"
            >
              {WRITING_STYLE_OPTIONS.map((option) => (
                <div
                  key={option.value}
                  className="flex items-center space-x-2 p-2 rounded-md hover:bg-muted"
                >
                  <RadioGroupItem value={option.value} id={`style-${option.value}`} />
                  <Label
                    htmlFor={`style-${option.value}`}
                    className="flex-1 cursor-pointer"
                  >
                    <div className="font-medium">{option.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {option.description}
                    </div>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
          
          {/* Consistency Checks */}
          <div className="space-y-3 pt-2 border-t">
            <Label>Consistency Checks</Label>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="toneCheck" className="flex flex-col">
                <span>Tone Consistency</span>
                <span className="text-xs text-muted-foreground font-normal">
                  Verify tone matches throughout
                </span>
              </Label>
              <Checkbox
                id="toneCheck"
                checked={settings.toneConsistencyCheck}
                onCheckedChange={(checked) =>
                  onSettingsChange({ ...settings, toneConsistencyCheck: !!checked })
                }
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="voiceCheck" className="flex flex-col">
                <span>Character Voice</span>
                <span className="text-xs text-muted-foreground font-normal">
                  Ensure dialogue consistency
                </span>
              </Label>
              <Checkbox
                id="voiceCheck"
                checked={settings.characterVoiceConsistency}
                onCheckedChange={(checked) =>
                  onSettingsChange({ ...settings, characterVoiceConsistency: !!checked })
                }
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="revisionCheck" className="flex flex-col">
                <span>Revision History</span>
                <span className="text-xs text-muted-foreground font-normal">
                  Track all changes with revert ability
                </span>
              </Label>
              <Checkbox
                id="revisionCheck"
                checked={settings.revisionHistory}
                onCheckedChange={(checked) =>
                  onSettingsChange({ ...settings, revisionHistory: !!checked })
                }
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main Methodology Selector Component
// ============================================================================

export function MethodologySelector({
  selectedMethodology,
  onMethodologyChange,
  options,
  onOptionsChange,
  writingStyle,
  onWritingStyleChange,
  settings,
  onSettingsChange,
  disabled = false,
}: MethodologySelectorProps) {
  const methodologies = methodologyFactory.getAvailableMethodologies();
  const selectedDesc = methodologies.find(m => m.type === selectedMethodology);
  
  const handleMethodologySelect = (type: string) => {
    if (disabled) return;
    onMethodologyChange(type);
    // Reset options to defaults for new methodology
    const defaults = methodologyFactory.getDefaultOptions(type as any);
    onOptionsChange(defaults);
  };
  
  return (
    <div className="space-y-6">
      {/* Methodology Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {methodologies.map((methodology) => (
          <MethodologyCard
            key={methodology.type}
            methodology={methodology}
            isSelected={selectedMethodology === methodology.type}
            onSelect={() => handleMethodologySelect(methodology.type)}
            disabled={disabled}
          />
        ))}
      </div>
      
      {/* Selected Methodology Description */}
      {selectedDesc && (
        <div className="bg-muted/50 rounded-lg p-4">
          <h4 className="font-semibold mb-2">{selectedDesc.name}</h4>
          <div
            className="text-sm text-muted-foreground whitespace-pre-wrap"
            dangerouslySetInnerHTML={{
              __html: selectedDesc.description.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'),
            }}
          />
        </div>
      )}
      
      {/* Methodology Options */}
      {selectedDesc && (
        <OptionsPanel
          methodology={selectedDesc}
          options={options}
          onOptionsChange={onOptionsChange}
        />
      )}
      
      {/* Writing Settings */}
      <SettingsPanel
        settings={settings}
        onSettingsChange={onSettingsChange}
      />
      
      {/* Info Box */}
      <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-md">
        <p className="text-sm text-blue-900 dark:text-blue-100">
          💡 <strong>Tip:</strong> You can change the methodology at any time before starting
          generation. Each methodology offers different levels of control and review
          opportunities.
        </p>
      </div>
    </div>
  );
}
