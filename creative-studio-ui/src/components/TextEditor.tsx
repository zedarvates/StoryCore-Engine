import { useStore, useSelectedShot } from '../store';
import type { TextLayer, TextAnimation } from '../types';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { Separator } from './ui/separator';
import { Badge } from './ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  TypeIcon,
  AlignLeftIcon,
  AlignCenterIcon,
  AlignRightIcon,
  BoldIcon,
  ItalicIcon,
  UnderlineIcon,
  SparklesIcon,
  XIcon,
} from 'lucide-react';

// ============================================================================
// TextEditor Component
// ============================================================================

export function TextEditor() {
  const selectedShot = useSelectedShot();
  const selectedTextLayerId = useStore((state) => state.selectedTextLayerId);
  const updateTextLayer = useStore((state) => state.updateTextLayer);

  if (!selectedShot || !selectedTextLayerId) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <TypeIcon className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium mb-1">No Text Layer Selected</h3>
        <p className="text-sm text-muted-foreground">
          Select a text layer to edit its properties
        </p>
      </div>
    );
  }

  const textLayer = selectedShot.textLayers.find((layer) => layer.id === selectedTextLayerId);

  if (!textLayer) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <TypeIcon className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium mb-1">Text Layer Not Found</h3>
        <p className="text-sm text-muted-foreground">
          The selected text layer could not be found
        </p>
      </div>
    );
  }

  const handleUpdate = (updates: Partial<TextLayer>) => {
    updateTextLayer(selectedShot.id, textLayer.id, updates);
  };

  const handleStyleUpdate = (styleUpdates: Partial<TextLayer['style']>) => {
    handleUpdate({
      style: {
        ...textLayer.style,
        ...styleUpdates,
      },
    });
  };

  const handlePositionUpdate = (axis: 'x' | 'y', value: number) => {
    handleUpdate({
      position: {
        ...textLayer.position,
        [axis]: value,
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <TypeIcon className="h-4 w-4" />
            Text Editor
          </h3>
          <Badge variant="secondary">Editing</Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Edit properties for the selected text layer
        </p>
      </div>

      <Separator />

      {/* Text Content */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Text Content</Label>
        <Input
          value={textLayer.content}
          onChange={(e) => handleUpdate({ content: e.target.value })}
          placeholder="Enter text..."
          className="font-medium"
        />
      </div>

      <Separator />

      {/* Font Settings */}
      <div className="space-y-4">
        <Label className="text-sm font-medium">Font Settings</Label>

        {/* Font Family */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Font Family</Label>
          <Select
            value={textLayer.font}
            onValueChange={(value) => handleUpdate({ font: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Arial">Arial</SelectItem>
              <SelectItem value="Helvetica">Helvetica</SelectItem>
              <SelectItem value="Times New Roman">Times New Roman</SelectItem>
              <SelectItem value="Georgia">Georgia</SelectItem>
              <SelectItem value="Courier New">Courier New</SelectItem>
              <SelectItem value="Verdana">Verdana</SelectItem>
              <SelectItem value="Impact">Impact</SelectItem>
              <SelectItem value="Comic Sans MS">Comic Sans MS</SelectItem>
              <SelectItem value="Trebuchet MS">Trebuchet MS</SelectItem>
              <SelectItem value="Palatino">Palatino</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Font Size */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Font Size</Label>
            <Badge variant="outline" className="font-mono">
              {textLayer.fontSize}px
            </Badge>
          </div>
          <Slider
            value={[textLayer.fontSize]}
            onValueChange={(value) => handleUpdate({ fontSize: value[0] })}
            min={12}
            max={200}
            step={1}
            className="w-full"
          />
        </div>

        {/* Text Style Toggles */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Text Style</Label>
          <div className="flex items-center gap-2">
            <Button
              variant={textLayer.style.bold ? 'default' : 'outline'}
              size="sm"
              className="flex-1"
              onClick={() => handleStyleUpdate({ bold: !textLayer.style.bold })}
            >
              <BoldIcon className="h-4 w-4 mr-2" />
              Bold
            </Button>
            <Button
              variant={textLayer.style.italic ? 'default' : 'outline'}
              size="sm"
              className="flex-1"
              onClick={() => handleStyleUpdate({ italic: !textLayer.style.italic })}
            >
              <ItalicIcon className="h-4 w-4 mr-2" />
              Italic
            </Button>
            <Button
              variant={textLayer.style.underline ? 'default' : 'outline'}
              size="sm"
              className="flex-1"
              onClick={() => handleStyleUpdate({ underline: !textLayer.style.underline })}
            >
              <UnderlineIcon className="h-4 w-4 mr-2" />
              Underline
            </Button>
          </div>
        </div>
      </div>

      <Separator />

      {/* Color Settings */}
      <div className="space-y-4">
        <Label className="text-sm font-medium">Colors</Label>

        {/* Text Color */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Text Color</Label>
          <div className="flex items-center gap-2">
            <Input
              type="color"
              value={textLayer.color}
              onChange={(e) => handleUpdate({ color: e.target.value })}
              className="w-16 h-10 p-1 cursor-pointer"
            />
            <Input
              type="text"
              value={textLayer.color}
              onChange={(e) => handleUpdate({ color: e.target.value })}
              placeholder="#ffffff"
              className="flex-1 font-mono"
            />
          </div>
        </div>

        {/* Background Color */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Background Color (Optional)</Label>
          <div className="flex items-center gap-2">
            <Input
              type="color"
              value={textLayer.backgroundColor || '#000000'}
              onChange={(e) => handleUpdate({ backgroundColor: e.target.value })}
              className="w-16 h-10 p-1 cursor-pointer"
            />
            <Input
              type="text"
              value={textLayer.backgroundColor || ''}
              onChange={(e) => handleUpdate({ backgroundColor: e.target.value || undefined })}
              placeholder="None"
              className="flex-1 font-mono"
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Alignment */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Text Alignment</Label>
        <div className="flex items-center gap-2">
          <Button
            variant={textLayer.alignment === 'left' ? 'default' : 'outline'}
            size="sm"
            className="flex-1"
            onClick={() => handleUpdate({ alignment: 'left' })}
          >
            <AlignLeftIcon className="h-4 w-4 mr-2" />
            Left
          </Button>
          <Button
            variant={textLayer.alignment === 'center' ? 'default' : 'outline'}
            size="sm"
            className="flex-1"
            onClick={() => handleUpdate({ alignment: 'center' })}
          >
            <AlignCenterIcon className="h-4 w-4 mr-2" />
            Center
          </Button>
          <Button
            variant={textLayer.alignment === 'right' ? 'default' : 'outline'}
            size="sm"
            className="flex-1"
            onClick={() => handleUpdate({ alignment: 'right' })}
          >
            <AlignRightIcon className="h-4 w-4 mr-2" />
            Right
          </Button>
        </div>
      </div>

      <Separator />

      {/* Position Controls */}
      <div className="space-y-4">
        <Label className="text-sm font-medium">Position</Label>

        {/* X Position */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Horizontal (X)</Label>
            <Badge variant="outline" className="font-mono">
              {textLayer.position.x.toFixed(0)}%
            </Badge>
          </div>
          <Slider
            value={[textLayer.position.x]}
            onValueChange={(value) => handlePositionUpdate('x', value[0])}
            min={0}
            max={100}
            step={1}
            className="w-full"
          />
        </div>

        {/* Y Position */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Vertical (Y)</Label>
            <Badge variant="outline" className="font-mono">
              {textLayer.position.y.toFixed(0)}%
            </Badge>
          </div>
          <Slider
            value={[textLayer.position.y]}
            onValueChange={(value) => handlePositionUpdate('y', value[0])}
            min={0}
            max={100}
            step={1}
            className="w-full"
          />
        </div>
      </div>

      <Separator />

      {/* Timing Controls */}
      <div className="space-y-4">
        <Label className="text-sm font-medium">Timing</Label>

        {/* Start Time */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Start Time</Label>
            <Badge variant="outline" className="font-mono">
              {textLayer.startTime.toFixed(1)}s
            </Badge>
          </div>
          <Slider
            value={[textLayer.startTime]}
            onValueChange={(value) => handleUpdate({ startTime: value[0] })}
            min={0}
            max={selectedShot.duration}
            step={0.1}
            className="w-full"
          />
        </div>

        {/* Duration */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Duration</Label>
            <Badge variant="outline" className="font-mono">
              {textLayer.duration.toFixed(1)}s
            </Badge>
          </div>
          <Slider
            value={[textLayer.duration]}
            onValueChange={(value) => handleUpdate({ duration: value[0] })}
            min={0.1}
            max={selectedShot.duration - textLayer.startTime}
            step={0.1}
            className="w-full"
          />
        </div>
      </div>

      <Separator />

      {/* Animation Controls */}
      <TextAnimationControls
        textLayer={textLayer}
        onUpdate={handleUpdate}
      />
    </div>
  );
}

// ============================================================================
// TextAnimationControls Component
// ============================================================================

interface TextAnimationControlsProps {
  textLayer: TextLayer;
  onUpdate: (updates: Partial<TextLayer>) => void;
}

function TextAnimationControls({ textLayer, onUpdate }: TextAnimationControlsProps) {
  const hasAnimation = !!textLayer.animation;

  const handleAddAnimation = () => {
    onUpdate({
      animation: {
        type: 'fade-in',
        duration: 1.0,
        delay: 0,
        easing: 'ease-in-out',
      },
    });
  };

  const handleRemoveAnimation = () => {
    onUpdate({ animation: undefined });
  };

  const handleAnimationUpdate = (updates: Partial<TextLayer['animation']>) => {
    if (!textLayer.animation) return;
    onUpdate({
      animation: {
        ...textLayer.animation,
        ...updates,
      },
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Animation</Label>
        {hasAnimation && (
          <Badge variant="secondary" className="flex items-center gap-1">
            <SparklesIcon className="h-3 w-3" />
            Active
          </Badge>
        )}
      </div>

      {hasAnimation ? (
        <>
          {/* Animation Type */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Animation Type</Label>
            <Select
              value={textLayer.animation!.type}
              onValueChange={(value) => handleAnimationUpdate({ type: value as TextAnimation['type'] })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fade-in">
                  <div className="flex items-center gap-2">
                    <SparklesIcon className="h-4 w-4" />
                    <div className="flex flex-col items-start">
                      <span className="font-medium">Fade In</span>
                      <span className="text-xs text-muted-foreground">
                        Gradually appear
                      </span>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="fade-out">
                  <div className="flex items-center gap-2">
                    <SparklesIcon className="h-4 w-4" />
                    <div className="flex flex-col items-start">
                      <span className="font-medium">Fade Out</span>
                      <span className="text-xs text-muted-foreground">
                        Gradually disappear
                      </span>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="slide-in">
                  <div className="flex items-center gap-2">
                    <SparklesIcon className="h-4 w-4" />
                    <div className="flex flex-col items-start">
                      <span className="font-medium">Slide In</span>
                      <span className="text-xs text-muted-foreground">
                        Slide from edge
                      </span>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="slide-out">
                  <div className="flex items-center gap-2">
                    <SparklesIcon className="h-4 w-4" />
                    <div className="flex flex-col items-start">
                      <span className="font-medium">Slide Out</span>
                      <span className="text-xs text-muted-foreground">
                        Slide to edge
                      </span>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="typewriter">
                  <div className="flex items-center gap-2">
                    <SparklesIcon className="h-4 w-4" />
                    <div className="flex flex-col items-start">
                      <span className="font-medium">Typewriter</span>
                      <span className="text-xs text-muted-foreground">
                        Type character by character
                      </span>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="bounce">
                  <div className="flex items-center gap-2">
                    <SparklesIcon className="h-4 w-4" />
                    <div className="flex flex-col items-start">
                      <span className="font-medium">Bounce</span>
                      <span className="text-xs text-muted-foreground">
                        Bounce into view
                      </span>
                    </div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Animation Duration */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Animation Duration</Label>
              <Badge variant="outline" className="font-mono">
                {textLayer.animation!.duration.toFixed(1)}s
              </Badge>
            </div>
            <Slider
              value={[textLayer.animation!.duration]}
              onValueChange={(value) => handleAnimationUpdate({ duration: value[0] })}
              min={0.1}
              max={5.0}
              step={0.1}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              How long the animation takes to complete
            </p>
          </div>

          {/* Animation Delay */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Animation Delay</Label>
              <Badge variant="outline" className="font-mono">
                {textLayer.animation!.delay.toFixed(1)}s
              </Badge>
            </div>
            <Slider
              value={[textLayer.animation!.delay]}
              onValueChange={(value) => handleAnimationUpdate({ delay: value[0] })}
              min={0}
              max={5.0}
              step={0.1}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Delay before animation starts
            </p>
          </div>

          {/* Animation Easing */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Easing</Label>
            <Select
              value={textLayer.animation!.easing}
              onValueChange={(value) => handleAnimationUpdate({ easing: value as TextAnimation['easing'] })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="linear">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Linear</span>
                    <span className="text-xs text-muted-foreground">
                      Constant speed
                    </span>
                  </div>
                </SelectItem>
                <SelectItem value="ease-in">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Ease In</span>
                    <span className="text-xs text-muted-foreground">
                      Starts slow
                    </span>
                  </div>
                </SelectItem>
                <SelectItem value="ease-out">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Ease Out</span>
                    <span className="text-xs text-muted-foreground">
                      Ends slow
                    </span>
                  </div>
                </SelectItem>
                <SelectItem value="ease-in-out">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Ease In-Out</span>
                    <span className="text-xs text-muted-foreground">
                      Slow start and end
                    </span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Remove Animation Button */}
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={handleRemoveAnimation}
          >
            <XIcon className="h-4 w-4 mr-2" />
            Remove Animation
          </Button>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg bg-muted/50">
          <div className="rounded-full bg-primary/10 p-3 mb-3">
            <SparklesIcon className="h-6 w-6 text-primary" />
          </div>
          <p className="text-sm font-medium mb-1">No Animation</p>
          <p className="text-xs text-muted-foreground text-center mb-4">
            Add an animation to make your text more dynamic
          </p>
          <Button onClick={handleAddAnimation} size="sm">
            <SparklesIcon className="h-4 w-4 mr-2" />
            Add Animation
          </Button>
        </div>
      )}
    </div>
  );
}
