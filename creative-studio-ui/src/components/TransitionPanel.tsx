import { useStore, useSelectedShot } from '../store';
import type { Transition } from '../types';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Separator } from './ui/separator';
import { Badge } from './ui/badge';
import {
  ArrowRightIcon,
  ArrowLeftIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ZapIcon,
  XIcon,
  PlusIcon,
  SparklesIcon,
  PlayIcon,
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

// ============================================================================
// TransitionPanel Component
// ============================================================================

export function TransitionPanel() {
  const selectedShot = useSelectedShot();
  const shots = useStore((state) => state.shots);
  const setTransition = useStore((state) => state.setTransition);

  if (!selectedShot) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <ZapIcon className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium mb-1">No Shot Selected</h3>
        <p className="text-sm text-muted-foreground">
          Select a shot to manage transitions
        </p>
      </div>
    );
  }

  // Find the next shot
  const currentIndex = shots.findIndex((s) => s.id === selectedShot.id);
  const nextShot = currentIndex < shots.length - 1 ? shots[currentIndex + 1] : null;

  // Check if this is the last shot
  if (!nextShot) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <ZapIcon className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium mb-1">Last Shot</h3>
        <p className="text-sm text-muted-foreground">
          Transitions can only be added between shots
        </p>
      </div>
    );
  }

  const currentTransition = selectedShot.transitionOut;

  const handleAddTransition = () => {
    const newTransition: Transition = {
      id: `transition-${Date.now()}`,
      type: 'fade',
      duration: 1.0,
      easing: 'ease-in-out',
    };
    setTransition(selectedShot.id, newTransition);
  };

  const handleRemoveTransition = () => {
    setTransition(selectedShot.id, undefined);
  };

  const handleTransitionUpdate = (updates: Partial<Transition>) => {
    if (!currentTransition) return;
    setTransition(selectedShot.id, { ...currentTransition, ...updates });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <ZapIcon className="h-4 w-4" />
            Transition Settings
          </h3>
          {currentTransition && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <SparklesIcon className="h-3 w-3" />
              Active
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Transition from "{selectedShot.title}" to "{nextShot.title}"
        </p>
      </div>

      <Separator />

      {/* Transition Content */}
      {currentTransition ? (
        <TransitionEditor
          transition={currentTransition}
          onUpdate={handleTransitionUpdate}
          onRemove={handleRemoveTransition}
        />
      ) : (
        <NoTransition onAdd={handleAddTransition} />
      )}
    </div>
  );
}

// ============================================================================
// No Transition State
// ============================================================================

interface NoTransitionProps {
  onAdd: () => void;
}

function NoTransition({ onAdd }: NoTransitionProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg bg-muted/50">
        <div className="rounded-full bg-primary/10 p-3 mb-3">
          <ZapIcon className="h-6 w-6 text-primary" />
        </div>
        <p className="text-sm font-medium mb-1">No Transition</p>
        <p className="text-xs text-muted-foreground text-center mb-4">
          Add a transition to smoothly connect this shot to the next
        </p>
        <Button onClick={onAdd} size="sm">
          <PlusIcon className="h-4 w-4 mr-2" />
          Add Transition
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// Transition Editor
// ============================================================================

interface TransitionEditorProps {
  transition: Transition;
  onUpdate: (updates: Partial<Transition>) => void;
  onRemove: () => void;
}

function TransitionEditor({ transition, onUpdate, onRemove }: TransitionEditorProps) {
  // Check if the transition type supports direction
  const supportsDirection = ['wipe', 'slide'].includes(transition.type);

  const handleTypeChange = (type: Transition['type']) => {
    const updates: Partial<Transition> = { type };
    
    // Reset direction if the new type doesn't support it
    if (!['wipe', 'slide'].includes(type)) {
      updates.direction = undefined;
    } else if (!transition.direction) {
      // Set default direction if the new type supports it
      updates.direction = 'right';
    }
    
    onUpdate(updates);
  };

  const handleDurationChange = (value: number[]) => {
    onUpdate({ duration: value[0] });
  };

  const handleDirectionChange = (direction: string) => {
    onUpdate({ direction: direction as Transition['direction'] });
  };

  const handleEasingChange = (easing: string) => {
    onUpdate({ easing: easing as Transition['easing'] });
  };

  return (
    <div className="space-y-6">
      {/* Transition Preview */}
      <TransitionPreview transition={transition} />

      <Separator />

      {/* Transition Type */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Transition Type</Label>
        <Select value={transition.type} onValueChange={handleTypeChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="fade">
              <div className="flex items-center gap-2">
                <SparklesIcon className="h-4 w-4" />
                <span>Fade</span>
              </div>
            </SelectItem>
            <SelectItem value="dissolve">
              <div className="flex items-center gap-2">
                <SparklesIcon className="h-4 w-4" />
                <span>Dissolve</span>
              </div>
            </SelectItem>
            <SelectItem value="wipe">
              <div className="flex items-center gap-2">
                <ArrowRightIcon className="h-4 w-4" />
                <span>Wipe</span>
              </div>
            </SelectItem>
            <SelectItem value="slide">
              <div className="flex items-center gap-2">
                <ArrowRightIcon className="h-4 w-4" />
                <span>Slide</span>
              </div>
            </SelectItem>
            <SelectItem value="zoom">
              <div className="flex items-center gap-2">
                <ZapIcon className="h-4 w-4" />
                <span>Zoom</span>
              </div>
            </SelectItem>
            <SelectItem value="custom">
              <div className="flex items-center gap-2">
                <SparklesIcon className="h-4 w-4" />
                <span>Custom</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          {getTransitionDescription(transition.type)}
        </p>
      </div>

      <Separator />

      {/* Duration Slider */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Duration</Label>
          <Badge variant="outline" className="font-mono">
            {transition.duration.toFixed(1)}s
          </Badge>
        </div>
        <Slider
          value={[transition.duration]}
          onValueChange={handleDurationChange}
          min={0.1}
          max={5.0}
          step={0.1}
          className="w-full"
        />
        <p className="text-xs text-muted-foreground">
          How long the transition takes to complete
        </p>
      </div>

      <Separator />

      {/* Direction Controls (only for directional transitions) */}
      {supportsDirection && (
        <>
          <div className="space-y-3">
            <Label className="text-sm font-medium">Direction</Label>
            <RadioGroup
              value={transition.direction || 'right'}
              onValueChange={handleDirectionChange}
              className="grid grid-cols-2 gap-3"
            >
              <div className="flex items-center space-x-2 p-3 rounded-lg border bg-muted/50 hover:bg-muted cursor-pointer">
                <RadioGroupItem value="left" id="direction-left" />
                <Label
                  htmlFor="direction-left"
                  className="flex items-center gap-2 cursor-pointer flex-1"
                >
                  <ArrowLeftIcon className="h-4 w-4" />
                  <span className="text-sm">Left</span>
                </Label>
              </div>

              <div className="flex items-center space-x-2 p-3 rounded-lg border bg-muted/50 hover:bg-muted cursor-pointer">
                <RadioGroupItem value="right" id="direction-right" />
                <Label
                  htmlFor="direction-right"
                  className="flex items-center gap-2 cursor-pointer flex-1"
                >
                  <ArrowRightIcon className="h-4 w-4" />
                  <span className="text-sm">Right</span>
                </Label>
              </div>

              <div className="flex items-center space-x-2 p-3 rounded-lg border bg-muted/50 hover:bg-muted cursor-pointer">
                <RadioGroupItem value="up" id="direction-up" />
                <Label
                  htmlFor="direction-up"
                  className="flex items-center gap-2 cursor-pointer flex-1"
                >
                  <ArrowUpIcon className="h-4 w-4" />
                  <span className="text-sm">Up</span>
                </Label>
              </div>

              <div className="flex items-center space-x-2 p-3 rounded-lg border bg-muted/50 hover:bg-muted cursor-pointer">
                <RadioGroupItem value="down" id="direction-down" />
                <Label
                  htmlFor="direction-down"
                  className="flex items-center gap-2 cursor-pointer flex-1"
                >
                  <ArrowDownIcon className="h-4 w-4" />
                  <span className="text-sm">Down</span>
                </Label>
              </div>
            </RadioGroup>
            <p className="text-xs text-muted-foreground">
              Direction of the {transition.type} transition
            </p>
          </div>

          <Separator />
        </>
      )}

      {/* Easing Curve Selector */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Easing Curve</Label>
        <Select
          value={transition.easing || 'ease-in-out'}
          onValueChange={handleEasingChange}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="linear">
              <div className="flex flex-col items-start">
                <span className="font-medium">Linear</span>
                <span className="text-xs text-muted-foreground">
                  Constant speed throughout
                </span>
              </div>
            </SelectItem>
            <SelectItem value="ease-in">
              <div className="flex flex-col items-start">
                <span className="font-medium">Ease In</span>
                <span className="text-xs text-muted-foreground">
                  Starts slow, ends fast
                </span>
              </div>
            </SelectItem>
            <SelectItem value="ease-out">
              <div className="flex flex-col items-start">
                <span className="font-medium">Ease Out</span>
                <span className="text-xs text-muted-foreground">
                  Starts fast, ends slow
                </span>
              </div>
            </SelectItem>
            <SelectItem value="ease-in-out">
              <div className="flex flex-col items-start">
                <span className="font-medium">Ease In-Out</span>
                <span className="text-xs text-muted-foreground">
                  Slow start and end, fast middle
                </span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          How the transition accelerates over time
        </p>
      </div>

      <Separator />

      {/* Remove Transition Button */}
      <Button
        variant="destructive"
        size="sm"
        className="w-full"
        onClick={onRemove}
      >
        <XIcon className="h-4 w-4 mr-2" />
        Remove Transition
      </Button>
    </div>
  );
}

// ============================================================================
// Transition Preview Component
// ============================================================================

interface TransitionPreviewProps {
  transition: Transition;
}

function TransitionPreview({ transition }: TransitionPreviewProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  // Apply easing function to progress
  const applyEasing = (t: number, easing: Transition['easing']): number => {
    switch (easing) {
      case 'linear':
        return t;
      case 'ease-in':
        return t * t;
      case 'ease-out':
        return t * (2 - t);
      case 'ease-in-out':
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      default:
        return t;
    }
  };

  // Animation loop
  useEffect(() => {
    if (!isPlaying) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp;
      }

      const elapsed = timestamp - startTimeRef.current;
      const rawProgress = Math.min(elapsed / (transition.duration * 1000), 1);
      const easedProgress = applyEasing(rawProgress, transition.easing || 'ease-in-out');

      setProgress(easedProgress);

      if (rawProgress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setIsPlaying(false);
        startTimeRef.current = null;
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, transition.duration, transition.easing]);

  const handlePlay = () => {
    setProgress(0);
    startTimeRef.current = null;
    setIsPlaying(true);
  };

  // Calculate transform styles based on transition type
  const getTransformStyles = () => {
    const direction = transition.direction || 'right';

    switch (transition.type) {
      case 'fade':
        return {
          shot1: { opacity: 1 - progress },
          shot2: { opacity: progress },
        };

      case 'dissolve':
        return {
          shot1: { opacity: 1 - progress },
          shot2: { opacity: progress },
        };

      case 'wipe':
        const clipPath = (() => {
          switch (direction) {
            case 'left':
              return `inset(0 ${(1 - progress) * 100}% 0 0)`;
            case 'right':
              return `inset(0 0 0 ${progress * 100}%)`;
            case 'up':
              return `inset(${progress * 100}% 0 0 0)`;
            case 'down':
              return `inset(0 0 ${(1 - progress) * 100}% 0)`;
            default:
              return `inset(0 0 0 ${progress * 100}%)`;
          }
        })();
        return {
          shot1: {},
          shot2: { clipPath },
        };

      case 'slide':
        const transform = (() => {
          switch (direction) {
            case 'left':
              return `translateX(${(1 - progress) * 100}%)`;
            case 'right':
              return `translateX(${(progress - 1) * 100}%)`;
            case 'up':
              return `translateY(${(1 - progress) * 100}%)`;
            case 'down':
              return `translateY(${(progress - 1) * 100}%)`;
            default:
              return `translateX(${(progress - 1) * 100}%)`;
          }
        })();
        return {
          shot1: {},
          shot2: { transform },
        };

      case 'zoom':
        return {
          shot1: { transform: `scale(${1 + progress * 0.5})`, opacity: 1 - progress },
          shot2: { transform: `scale(${0.5 + progress * 0.5})`, opacity: progress },
        };

      case 'custom':
        return {
          shot1: { opacity: 1 - progress },
          shot2: { opacity: progress },
        };

      default:
        return {
          shot1: { opacity: 1 - progress },
          shot2: { opacity: progress },
        };
    }
  };

  const styles = getTransformStyles();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Preview</Label>
        <Button
          size="sm"
          variant="outline"
          onClick={handlePlay}
          disabled={isPlaying}
        >
          <PlayIcon className="h-3 w-3 mr-1" />
          {isPlaying ? 'Playing...' : 'Play Preview'}
        </Button>
      </div>

      {/* Preview Container */}
      <div className="relative w-full aspect-video bg-muted rounded-lg overflow-hidden border">
        {/* Shot 1 (Current) */}
        <div
          className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-500 to-blue-700 text-white font-semibold text-lg transition-all"
          style={styles.shot1}
        >
          Shot 1
        </div>

        {/* Shot 2 (Next) */}
        <div
          className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-purple-500 to-purple-700 text-white font-semibold text-lg transition-all"
          style={styles.shot2}
        >
          Shot 2
        </div>

        {/* Progress Indicator */}
        {isPlaying && (
          <div className="absolute bottom-2 left-2 right-2">
            <div className="h-1 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Click "Play Preview" to see how the transition will look
      </p>
    </div>
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

function getTransitionDescription(type: Transition['type']): string {
  switch (type) {
    case 'fade':
      return 'Gradually fade from one shot to another';
    case 'dissolve':
      return 'Blend shots together with a cross-dissolve';
    case 'wipe':
      return 'Wipe across the screen in a direction';
    case 'slide':
      return 'Slide the next shot in from a direction';
    case 'zoom':
      return 'Zoom in or out between shots';
    case 'custom':
      return 'Custom transition with advanced parameters';
    default:
      return 'Select a transition type';
  }
}
