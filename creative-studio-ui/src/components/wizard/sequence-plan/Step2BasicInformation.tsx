import React, { useState, useEffect } from 'react';
import { Clock, Monitor, Film, Tag } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { SequencePlan } from '@/types/sequencePlan';
import { GenreSelector, VisualStyleSelector, ColorPaletteSelector } from '@/components/assets/AssetSelector';

interface Step2BasicInformationProps {
  formData: Partial<SequencePlan>;
  onChange: (updates: Partial<SequencePlan>) => void;
  validationErrors: Record<string, string>;
}

export function Step2BasicInformation({
  formData,
  onChange,
  validationErrors,
}: Step2BasicInformationProps) {
  const [tagInput, setTagInput] = useState('');
  const [worlds, setWorlds] = useState<Array<{ id: string; name: string; description?: string }>>([]);

  // Mock worlds data - in real implementation, this would come from a service
  useEffect(() => {
    // Simulate loading worlds from a service
    const mockWorlds = [
      { id: 'world-1', name: 'Modern City', description: 'Contemporary urban setting' },
      { id: 'world-2', name: 'Medieval Fantasy', description: 'Magical medieval kingdom' },
      { id: 'world-3', name: 'Sci-Fi Future', description: 'Advanced technological society' },
      { id: 'world-4', name: 'Post-Apocalyptic', description: 'Dystopian wasteland' },
      { id: 'world-5', name: 'Historical 1920s', description: 'Roaring twenties era' },
    ];
    setWorlds(mockWorlds);
  }, []);

  const handleInputChange = (field: keyof SequencePlan, value: any) => {
    onChange({ [field]: value });
  };

  const handleDurationChange = (durationStr: string) => {
    // Parse duration string (supports both MM:SS and seconds)
    const parsed = parseDurationString(durationStr);
    if (parsed !== null) {
      handleInputChange('targetDuration', parsed);
    }
  };

  const formatDuration = (seconds: number = 0): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const parseDurationString = (durationStr: string): number | null => {
    // Try MM:SS format first
    const mmssMatch = durationStr.match(/^(\d{1,3}):(\d{2})$/);
    if (mmssMatch) {
      const minutes = parseInt(mmssMatch[1], 10);
      const seconds = parseInt(mmssMatch[2], 10);
      if (seconds < 60) {
        return minutes * 60 + seconds;
      }
    }

    // Try plain seconds
    const secondsMatch = durationStr.match(/^(\d+)$/);
    if (secondsMatch) {
      return parseInt(secondsMatch[1], 10);
    }

    return null;
  };

  const addTag = () => {
    const trimmedTag = tagInput.trim().toLowerCase();
    if (trimmedTag && !(formData.tags || []).includes(trimmedTag)) {
      const newTags = [...(formData.tags || []), trimmedTag];
      handleInputChange('tags', newTags);
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    const newTags = (formData.tags || []).filter(tag => tag !== tagToRemove);
    handleInputChange('tags', newTags);
  };

  const handleTagInputKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  const frameRateOptions = [
    { value: 24, label: '24 fps (Film)', description: 'Traditional cinematic frame rate' },
    { value: 25, label: '25 fps (PAL)', description: 'European broadcast standard' },
    { value: 30, label: '30 fps (NTSC)', description: 'North American broadcast standard' },
    { value: 60, label: '60 fps (High Speed)', description: 'Smooth motion, larger files' },
  ];

  const resolutionOptions = [
    { value: { width: 1920, height: 1080 }, label: '1920x1080 (FHD)', description: 'Full HD, most common' },
    { value: { width: 3840, height: 2160 }, label: '3840x2160 (4K)', description: 'Ultra HD, high quality' },
    { value: { width: 1280, height: 720 }, label: '1280x720 (HD)', description: 'HD, smaller files' },
    { value: { width: 2560, height: 1440 }, label: '2560x1440 (QHD)', description: 'Quad HD, good balance' },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-gray-900">Basic Information</h2>
        <p className="text-gray-600">
          Set the foundation for your sequence plan with essential details and technical specifications.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column - Sequence Details */}
        <div className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Film className="h-5 w-5" />
              Sequence Details
            </h3>

            {/* Sequence Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium">
                Sequence Name *
              </Label>
              <Input
                id="name"
                value={formData.name || ''}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter sequence name..."
                className={cn(
                  validationErrors.name && 'border-red-500 focus:ring-red-500'
                )}
              />
              {validationErrors.name && (
                <p className="text-sm text-red-600">{validationErrors.name}</p>
              )}
              <p className="text-xs text-gray-500">
                Choose a descriptive name for your sequence plan
              </p>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium">
                Description
              </Label>
              <Textarea
                id="description"
                value={formData.description || ''}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Describe your sequence plan..."
                rows={3}
                className="resize-none"
              />
              <p className="text-xs text-gray-500">
                {formData.description?.length || 0}/500 characters
              </p>
            </div>

            {/* World Selection */}
            <div className="space-y-2">
              <Label htmlFor="world" className="text-sm font-medium">
                World *
              </Label>
              <Select
                value={formData.worldId || ''}
                onValueChange={(value) => handleInputChange('worldId', value)}
              >
                <SelectTrigger className={cn(
                  validationErrors.worldId && 'border-red-500 focus:ring-red-500'
                )}>
                  <SelectValue placeholder="Select a world..." />
                </SelectTrigger>
                <SelectContent>
                  {worlds.map((world) => (
                    <SelectItem key={world.id} value={world.id}>
                      <div>
                        <div className="font-medium">{world.name}</div>
                        {world.description && (
                          <div className="text-xs text-gray-500">{world.description}</div>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {validationErrors.worldId && (
                <p className="text-sm text-red-600">{validationErrors.worldId}</p>
              )}
              <p className="text-xs text-gray-500">
                The world provides context, locations, and character data
              </p>
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Tags</Label>
              <div className="flex gap-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={handleTagInputKeyPress}
                  placeholder="Add a tag..."
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addTag}
                  disabled={!tagInput.trim()}
                >
                  <Tag className="h-4 w-4" />
                </Button>
              </div>
              {(formData.tags || []).length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {(formData.tags || []).map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="cursor-pointer hover:bg-red-100 hover:text-red-800"
                      onClick={() => removeTag(tag)}
                    >
                      {tag} ×
                    </Badge>
                  ))}
                </div>
              )}
              <p className="text-xs text-gray-500">
                Tags help organize and search your sequence plans
              </p>
            </div>

            {/* Genre Selection */}
            <GenreSelector
              selectedAssetId={(formData as any).genre}
              onSelect={(asset) => handleInputChange('genre' as any, asset.id)}
            />

            {/* Visual Style Selection */}
            <VisualStyleSelector
              selectedAssetId={(formData as any).visualStyle}
              onSelect={(asset) => handleInputChange('visualStyle' as any, asset.id)}
            />

            {/* Color Palette Selection */}
            <ColorPaletteSelector
              selectedAssetId={(formData as any).colorPalette}
              onSelect={(asset) => handleInputChange('colorPalette' as any, asset.id)}
            />
          </div>
        </div>

        {/* Right Column - Technical Specifications */}
        <div className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Monitor className="h-5 w-5" />
              Technical Specifications
            </h3>

            {/* Target Duration */}
            <div className="space-y-2">
              <Label htmlFor="duration" className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Target Duration *
              </Label>
              <Input
                id="duration"
                value={formatDuration(formData.targetDuration)}
                onChange={(e) => handleDurationChange(e.target.value)}
                placeholder="MM:SS or seconds"
                className={cn(
                  validationErrors.targetDuration && 'border-red-500 focus:ring-red-500'
                )}
              />
              {validationErrors.targetDuration && (
                <p className="text-sm text-red-600">{validationErrors.targetDuration}</p>
              )}
              <p className="text-xs text-gray-500">
                Total length in MM:SS format (e.g., 05:30 for 5 minutes 30 seconds)
              </p>
            </div>

            {/* Frame Rate */}
            <div className="space-y-2">
              <Label htmlFor="frameRate" className="text-sm font-medium">
                Frame Rate
              </Label>
              <Select
                value={formData.frameRate?.toString() || '24'}
                onValueChange={(value) => handleInputChange('frameRate', parseInt(value, 10))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {frameRateOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value.toString()}>
                      <div>
                        <div className="font-medium">{option.label}</div>
                        <div className="text-xs text-gray-500">{option.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                Frames per second - affects motion smoothness and file size
              </p>
            </div>

            {/* Resolution */}
            <div className="space-y-2">
              <Label htmlFor="resolution" className="text-sm font-medium">
                Resolution
              </Label>
              <Select
                value={formData.resolution ? `${formData.resolution.width}x${formData.resolution.height}` : '1920x1080'}
                onValueChange={(value) => {
                  const [width, height] = value.split('x').map(Number);
                  handleInputChange('resolution', { width, height });
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {resolutionOptions.map((option) => (
                    <SelectItem
                      key={`${option.value.width}x${option.value.height}`}
                      value={`${option.value.width}x${option.value.height}`}
                    >
                      <div>
                        <div className="font-medium">{option.label}</div>
                        <div className="text-xs text-gray-500">{option.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                Output resolution - higher resolutions produce better quality but larger files
              </p>
            </div>
          </div>

          {/* Summary Card */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h4 className="font-medium text-blue-900 mb-2">Sequence Summary</h4>
            <div className="space-y-1 text-sm text-blue-800">
              <div>Name: <span className="font-medium">{formData.name || 'Not set'}</span></div>
              <div>World: <span className="font-medium">
                {worlds.find(w => w.id === formData.worldId)?.name || 'Not selected'}
              </span></div>
              <div>Duration: <span className="font-medium">{formatDuration(formData.targetDuration)}</span></div>
              <div>Resolution: <span className="font-medium">
                {formData.resolution ? `${formData.resolution.width}x${formData.resolution.height}` : '1920x1080'}
              </span></div>
              <div>Frame Rate: <span className="font-medium">{formData.frameRate || 24} fps</span></div>
              <div>Tags: <span className="font-medium">{(formData.tags || []).length} tags</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}