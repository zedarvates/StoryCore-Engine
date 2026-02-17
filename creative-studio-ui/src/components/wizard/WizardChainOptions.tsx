import React, { useState, useCallback } from 'react';
import { ChevronDown, ChevronUp, UserPlus, MapPin, Sparkles, ArrowRight, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export interface WizardChainOption {
  wizardType: string;
  label: string;
  description?: string;
  icon?: string;
  autoTrigger?: boolean;
}

export interface WizardChainOptionsProps {
  isChained: boolean;
  triggeredWizards: WizardChainOption[];
  currentChainIndex: number;
  onLaunchNext?: (wizard: WizardChainOption) => void;
  onSkipChain?: () => void;
  onContinue?: () => void;
  isLoading?: boolean;
}

const IconMap: Record<string, React.ElementType> = {
  'UserPlus': UserPlus,
  'MapPin': MapPin,
  'Sparkles': Sparkles,
  'default': Sparkles
};

export const WizardChainOptions: React.FC<WizardChainOptionsProps> = ({
  isChained,
  triggeredWizards,
  currentChainIndex,
  onLaunchNext,
  onSkipChain,
  onContinue,
  isLoading = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  // Respect the chain index to only show remaining steps
  const remainingWizards = triggeredWizards.slice(currentChainIndex);

  if (!isChained || remainingWizards.length === 0) {
    return null;
  }

  const handleLaunch = useCallback((wizard: WizardChainOption) => {
    if (onLaunchNext) {
      onLaunchNext(wizard);
    }
  }, [onLaunchNext]);

  return (
    <Card className="w-full border-2 border-primary/10 shadow-lg">
      <CardHeader className="pb-3 cursor-pointer select-none" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">What would you like to do next?</CardTitle>
          </div>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
        <CardDescription>
          continue building your story with these recommended steps
        </CardDescription>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-4 pt-0">
          <div className="grid gap-3 md:grid-cols-2">
            {remainingWizards.map((wizard) => {
              const iconKey = wizard.icon || 'default';
              const Icon = (IconMap as any)[iconKey] || (IconMap as any)['default'];
              return (
                <button
                  key={wizard.wizardType}
                  onClick={() => handleLaunch(wizard)}
                  disabled={isLoading}
                  className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <div className="p-2 bg-primary/10 rounded-md shrink-0">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      {wizard.label}
                      <ArrowRight className="w-3 h-3 opacity-50" />
                    </div>
                    {wizard.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {wizard.description}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-4 border-t mt-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={onSkipChain}
              disabled={isLoading}
              className="text-muted-foreground hover:text-foreground"
            >
              Skip for now
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={onContinue}
              disabled={isLoading}
              className="gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              Finish
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default WizardChainOptions;
