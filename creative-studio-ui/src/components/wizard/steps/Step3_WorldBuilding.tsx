/**
 * Step 3: World Building
 * Allows users to define the world and setting of their story
 */

import { useState, useEffect } from 'react';
import { MapPin, Plus, Edit2, Trash2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WizardFormLayout, FormField, FormSection, FormGrid } from '../WizardFormLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { WorldBuildingData, Location, UniverseType, Mood } from '@/types/wizard';

// ============================================================================
// Universe Type Options
// ============================================================================

const UNIVERSE_TYPE_OPTIONS: {
  value: UniverseType;
  label: string;
  description: string;
  icon: string;
}[] = [
  {
    value: 'realistic',
    label: 'Realistic',
    description: 'Contemporary real-world setting',
    icon: '🌍',
  },
  {
    value: 'fantasy',
    label: 'Fantasy',
    description: 'Magical and mythical world',
    icon: '🧙',
  },
  {
    value: 'sci-fi',
    label: 'Sci-Fi',
    description: 'Futuristic or space setting',
    icon: '🚀',
  },
  {
    value: 'historical',
    label: 'Historical',
    description: 'Past time period',
    icon: '📜',
  },
  {
    value: 'alternate',
    label: 'Alternate',
    description: 'Alternate reality or timeline',
    icon: '🌀',
  },
];

// ============================================================================
// Mood Options (for locations)
// ============================================================================

const MOOD_OPTIONS: { value: Mood; label: string }[] = [
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
  { value: 'serious', label: 'Serious' },
  { value: 'playful', label: 'Playful' },
  { value: 'tense', label: 'Tense' },
  { value: 'calm', label: 'Calm' },
  { value: 'energetic', label: 'Energetic' },
  { value: 'melancholic', label: 'Melancholic' },
  { value: 'hopeful', label: 'Hopeful' },
  { value: 'mysterious', label: 'Mysterious' },
];

// ============================================================================
// Component Props
// ============================================================================

interface Step3_WorldBuildingProps {
  data: WorldBuildingData | null;
  onUpdate: (data: WorldBuildingData) => void;
  errors?: Record<string, string>;
}

// ============================================================================
// Component
// ============================================================================

export function Step3_WorldBuilding({ data, onUpdate, errors = {} }: Step3_WorldBuildingProps) {
  // State
  const [timePeriod, setTimePeriod] = useState<string>(data?.timePeriod || '');
  const [primaryLocation, setPrimaryLocation] = useState<string>(data?.primaryLocation || '');
  const [universeType, setUniverseType] = useState<UniverseType>(data?.universeType || 'realistic');
  const [worldRules, setWorldRules] = useState<string>(data?.worldRules || '');
  const [locations, setLocations] = useState<Location[]>(data?.locations || []);
  const [culturalContext, setCulturalContext] = useState<string>(data?.culturalContext || '');
  const [technologyLevel, setTechnologyLevel] = useState<number>(data?.technologyLevel || 5);

  // Location dialog state
  const [isLocationDialogOpen, setIsLocationDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [locationForm, setLocationForm] = useState<Partial<Location>>({
    name: '',
    description: '',
    visualCharacteristics: '',
    mood: 'calm',
  });

  // Update parent when data changes
  useEffect(() => {
    if (timePeriod && primaryLocation && locations.length > 0) {
      onUpdate({
        timePeriod,
        primaryLocation,
        universeType,
        worldRules,
        locations,
        culturalContext,
        technologyLevel,
      });
    }
  }, [
    timePeriod,
    primaryLocation,
    universeType,
    worldRules,
    locations,
    culturalContext,
    technologyLevel,
    onUpdate,
  ]);

  // Handle location dialog open
  const handleAddLocation = () => {
    setEditingLocation(null);
    setLocationForm({
      name: '',
      description: '',
      visualCharacteristics: '',
      mood: 'calm',
    });
    setIsLocationDialogOpen(true);
  };

  // Handle location edit
  const handleEditLocation = (location: Location) => {
    setEditingLocation(location);
    setLocationForm(location);
    setIsLocationDialogOpen(true);
  };

  // Handle location save
  const handleSaveLocation = () => {
    if (!locationForm.name || !locationForm.description) {
      return;
    }

    const newLocation: Location = {
      id: editingLocation?.id || `loc-${Date.now()}`,
      name: locationForm.name,
      description: locationForm.description || '',
      visualCharacteristics: locationForm.visualCharacteristics || '',
      mood: locationForm.mood || 'calm',
      referenceImages: locationForm.referenceImages || [],
    };

    if (editingLocation) {
      // Update existing location
      setLocations((prev) =>
        prev.map((loc) => (loc.id === editingLocation.id ? newLocation : loc))
      );
    } else {
      // Add new location
      setLocations((prev) => [...prev, newLocation]);
    }

    setIsLocationDialogOpen(false);
    setLocationForm({
      name: '',
      description: '',
      visualCharacteristics: '',
      mood: 'calm',
    });
  };

  // Handle location delete
  const handleDeleteLocation = (locationId: string) => {
    setLocations((prev) => prev.filter((loc) => loc.id !== locationId));
  };

  return (
    <WizardFormLayout
      title="World Building"
      description="Define the world and setting of your story"
    >
      {/* Error Summary */}
      {(errors.timePeriod || errors.primaryLocation || errors.locations) && (
        <div
          className="rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950 p-4"
          role="alert"
        >
          <p className="text-sm text-red-800 dark:text-red-200">
            {errors.timePeriod || errors.primaryLocation || errors.locations}
          </p>
        </div>
      )}

      {/* Basic World Information */}
      <FormSection
        title="Basic World Information"
        description="Define the fundamental aspects of your story's world"
      >
        <FormGrid columns={2}>
          <FormField
            label="Time Period"
            name="timePeriod"
            required
            error={errors.timePeriod}
            helpText="e.g., Modern Day, Medieval, 2150, Victorian Era"
          >
            <Input
              id="timePeriod"
              value={timePeriod}
              onChange={(e) => setTimePeriod(e.target.value)}
              placeholder="Enter time period"
              aria-describedby="timePeriod-help"
            />
          </FormField>

          <FormField
            label="Primary Location"
            name="primaryLocation"
            required
            error={errors.primaryLocation}
            helpText="Main setting where most of the story takes place"
          >
            <Input
              id="primaryLocation"
              value={primaryLocation}
              onChange={(e) => setPrimaryLocation(e.target.value)}
              placeholder="e.g., New York City, Fantasy Kingdom"
              aria-describedby="primaryLocation-help"
            />
          </FormField>
        </FormGrid>

        <FormField
          label="Universe Type"
          name="universeType"
          helpText="Select the type of world your story takes place in"
        >
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {UNIVERSE_TYPE_OPTIONS.map((option) => (
              <Card
                key={option.value}
                className={cn(
                  'cursor-pointer transition-all hover:shadow-md',
                  universeType === option.value
                    ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                )}
                onClick={() => setUniverseType(option.value)}
                role="radio"
                aria-checked={universeType === option.value}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setUniverseType(option.value);
                  }
                }}
              >
                <CardContent className="p-3">
                  <div className="text-center">
                    <div className="text-3xl mb-1">{option.icon}</div>
                    <h4 className="font-semibold text-sm mb-1">{option.label}</h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {option.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </FormField>
      </FormSection>

      {/* World Rules */}
      <FormSection
        title="World Rules & Constraints"
        description="Define the rules that govern your story's world"
      >
        <FormField
          label="World Rules"
          name="worldRules"
          helpText="Describe the physical laws, magic systems, technology limitations, or social rules"
        >
          <Textarea
            id="worldRules"
            value={worldRules}
            onChange={(e) => setWorldRules(e.target.value)}
            placeholder="e.g., Magic requires verbal incantations and drains user's energy. Technology is limited to steam-powered devices."
            rows={4}
            aria-describedby="worldRules-help"
          />
        </FormField>
      </FormSection>

      {/* Key Locations */}
      <FormSection
        title="Key Locations"
        description="Add important locations where scenes will take place"
      >
        {/* Location List */}
        {locations.length > 0 && (
          <div className="space-y-3">
            {locations.map((location) => (
              <Card key={location.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                        <MapPin className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <h4 className="font-semibold text-base">{location.name}</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {location.description}
                          </p>
                          {location.visualCharacteristics && (
                            <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                              <span className="font-medium">Visual:</span>{' '}
                              {location.visualCharacteristics}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                              Mood: {location.mood}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditLocation(location)}
                            aria-label={`Edit ${location.name}`}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteLocation(location.id)}
                            aria-label={`Delete ${location.name}`}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Add Location Button */}
        <Button
          onClick={handleAddLocation}
          variant="outline"
          className="w-full"
          type="button"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Location
        </Button>

        {/* Validation Message */}
        {locations.length === 0 && errors.locations && (
          <p className="text-sm text-red-600 dark:text-red-400">
            {errors.locations}
          </p>
        )}
      </FormSection>

      {/* Cultural Context & Technology */}
      <FormSection
        title="Cultural Context & Technology"
        description="Define the social and technological aspects of your world"
      >
        <FormField
          label="Cultural/Social Context"
          name="culturalContext"
          helpText="Describe the society, customs, beliefs, and social structures"
        >
          <Textarea
            id="culturalContext"
            value={culturalContext}
            onChange={(e) => setCulturalContext(e.target.value)}
            placeholder="e.g., Hierarchical society with strict class divisions. Honor and duty are highly valued."
            rows={3}
            aria-describedby="culturalContext-help"
          />
        </FormField>

        <FormField
          label="Technology Level"
          name="technologyLevel"
          helpText="0 = Stone Age, 5 = Modern Day, 10 = Far Future"
        >
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <Input
                type="range"
                id="technologyLevel"
                min="0"
                max="10"
                step="1"
                value={technologyLevel}
                onChange={(e) => setTechnologyLevel(Number(e.target.value))}
                className="flex-1"
                aria-describedby="technologyLevel-help"
              />
              <div className="w-12 text-center">
                <span className="text-lg font-semibold">{technologyLevel}</span>
              </div>
            </div>
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>Stone Age</span>
              <span>Modern</span>
              <span>Far Future</span>
            </div>
          </div>
        </FormField>
      </FormSection>

      {/* Summary */}
      {timePeriod && primaryLocation && locations.length > 0 && (
        <div className="rounded-lg bg-blue-50 dark:bg-blue-950 p-4 border border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div>
              <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                World Configuration
              </h4>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Your story takes place in a <strong>{universeType}</strong> world during{' '}
                <strong>{timePeriod}</strong>, primarily in <strong>{primaryLocation}</strong>.
                You have defined <strong>{locations.length}</strong> key location
                {locations.length > 1 ? 's' : ''} for your scenes.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Location Dialog */}
      <Dialog open={isLocationDialogOpen} onOpenChange={setIsLocationDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingLocation ? 'Edit Location' : 'Add New Location'}
            </DialogTitle>
            <DialogDescription>
              Define a key location where scenes will take place
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <FormField
              label="Location Name"
              name="locationName"
              required
              helpText="A short, memorable name for this location"
            >
              <Input
                id="locationName"
                value={locationForm.name || ''}
                onChange={(e) =>
                  setLocationForm((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="e.g., The Grand Library, Dark Forest, Space Station Alpha"
              />
            </FormField>

            <FormField
              label="Description"
              name="locationDescription"
              required
              helpText="Describe the location's purpose and significance"
            >
              <Textarea
                id="locationDescription"
                value={locationForm.description || ''}
                onChange={(e) =>
                  setLocationForm((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="e.g., An ancient library containing forbidden knowledge, guarded by mystical wards"
                rows={3}
              />
            </FormField>

            <FormField
              label="Visual Characteristics"
              name="locationVisual"
              helpText="Describe the visual appearance, architecture, colors, lighting"
            >
              <Textarea
                id="locationVisual"
                value={locationForm.visualCharacteristics || ''}
                onChange={(e) =>
                  setLocationForm((prev) => ({
                    ...prev,
                    visualCharacteristics: e.target.value,
                  }))
                }
                placeholder="e.g., Towering shelves of dark wood, dim candlelight, dust motes floating in shafts of light"
                rows={3}
              />
            </FormField>

            <FormField label="Mood" name="locationMood" helpText="The emotional atmosphere">
              <Select
                value={locationForm.mood || 'calm'}
                onValueChange={(value) =>
                  setLocationForm((prev) => ({ ...prev, mood: value as Mood }))
                }
              >
                <SelectTrigger id="locationMood">
                  <SelectValue placeholder="Select mood" />
                </SelectTrigger>
                <SelectContent>
                  {MOOD_OPTIONS.map((mood) => (
                    <SelectItem key={mood.value} value={mood.value}>
                      {mood.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsLocationDialogOpen(false)}
              type="button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveLocation}
              disabled={!locationForm.name || !locationForm.description}
              type="button"
            >
              {editingLocation ? 'Update Location' : 'Add Location'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </WizardFormLayout>
  );
}
