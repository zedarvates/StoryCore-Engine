import { useState } from 'react';
import { useStore, useSelectedShot } from '../store';
import type { Effect } from '../types';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  SparklesIcon,
  PlusIcon,
  XIcon,
  GripVerticalIcon,
  SearchIcon,
  FilterIcon,
  EyeIcon,
  EyeOffIcon,
} from 'lucide-react';
import { useDrag, useDrop, DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

// ============================================================================
// Effect Library - Available Effects
// ============================================================================

interface EffectTemplate {
  id: string;
  name: string;
  type: Effect['type'];
  category: 'color' | 'blur' | 'artistic' | 'adjustment';
  description: string;
  defaultParameters: Record<string, number>;
}

const EFFECT_LIBRARY: EffectTemplate[] = [
  // Color Effects
  {
    id: 'vintage',
    name: 'Vintage',
    type: 'filter',
    category: 'color',
    description: 'Warm, nostalgic film look',
    defaultParameters: { warmth: 50, grain: 30 },
  },
  {
    id: 'sepia',
    name: 'Sepia',
    type: 'filter',
    category: 'color',
    description: 'Classic brown-toned effect',
    defaultParameters: { intensity: 70 },
  },
  {
    id: 'black-white',
    name: 'Black & White',
    type: 'filter',
    category: 'color',
    description: 'Monochrome conversion',
    defaultParameters: { contrast: 50 },
  },
  {
    id: 'cool-tone',
    name: 'Cool Tone',
    type: 'filter',
    category: 'color',
    description: 'Blue-tinted cinematic look',
    defaultParameters: { temperature: -30 },
  },
  {
    id: 'warm-tone',
    name: 'Warm Tone',
    type: 'filter',
    category: 'color',
    description: 'Orange-tinted sunset look',
    defaultParameters: { temperature: 30 },
  },
  
  // Blur Effects
  {
    id: 'gaussian-blur',
    name: 'Gaussian Blur',
    type: 'filter',
    category: 'blur',
    description: 'Smooth, even blur',
    defaultParameters: { radius: 5 },
  },
  {
    id: 'motion-blur',
    name: 'Motion Blur',
    type: 'filter',
    category: 'blur',
    description: 'Directional motion effect',
    defaultParameters: { angle: 0, distance: 10 },
  },
  {
    id: 'radial-blur',
    name: 'Radial Blur',
    type: 'filter',
    category: 'blur',
    description: 'Zoom or spin blur',
    defaultParameters: { amount: 5 },
  },
  
  // Artistic Effects
  {
    id: 'vignette',
    name: 'Vignette',
    type: 'overlay',
    category: 'artistic',
    description: 'Darkened edges',
    defaultParameters: { amount: 50, softness: 50 },
  },
  {
    id: 'film-grain',
    name: 'Film Grain',
    type: 'overlay',
    category: 'artistic',
    description: 'Analog film texture',
    defaultParameters: { amount: 30, size: 1 },
  },
  {
    id: 'light-leak',
    name: 'Light Leak',
    type: 'overlay',
    category: 'artistic',
    description: 'Vintage light effects',
    defaultParameters: { intensity: 40, color: 0 },
  },
  
  // Adjustment Effects
  {
    id: 'brightness',
    name: 'Brightness',
    type: 'adjustment',
    category: 'adjustment',
    description: 'Adjust overall brightness',
    defaultParameters: { value: 0 },
  },
  {
    id: 'contrast',
    name: 'Contrast',
    type: 'adjustment',
    category: 'adjustment',
    description: 'Adjust contrast levels',
    defaultParameters: { value: 0 },
  },
  {
    id: 'saturation',
    name: 'Saturation',
    type: 'adjustment',
    category: 'adjustment',
    description: 'Adjust color intensity',
    defaultParameters: { value: 0 },
  },
  {
    id: 'exposure',
    name: 'Exposure',
    type: 'adjustment',
    category: 'adjustment',
    description: 'Adjust exposure levels',
    defaultParameters: { value: 0 },
  },
  {
    id: 'sharpen',
    name: 'Sharpen',
    type: 'adjustment',
    category: 'adjustment',
    description: 'Enhance edge definition',
    defaultParameters: { amount: 50 },
  },
];

// DnD item types
const ItemTypes = {
  EFFECT: 'EFFECT',
};

// ============================================================================
// EffectsPanel Component
// ============================================================================

export function EffectsPanel() {
  const selectedShot = useSelectedShot();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  if (!selectedShot) {
    return (
      <div className="flex h-full flex-col bg-background">
        <div className="border-b p-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <SparklesIcon className="h-5 w-5" />
            Visual Effects
          </h2>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center text-center p-8">
          <div className="rounded-full bg-muted p-4 mb-4">
            <SparklesIcon className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-1">No Shot Selected</h3>
          <p className="text-sm text-muted-foreground">
            Select a shot to apply visual effects
          </p>
        </div>
      </div>
    );
  }

  // Filter effects based on search and category
  const filteredEffects = EFFECT_LIBRARY.filter((effect) => {
    const matchesSearch = effect.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         effect.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || effect.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex h-full flex-col bg-background">
        {/* Header */}
        <div className="border-b p-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <SparklesIcon className="h-5 w-5" />
            Visual Effects
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {selectedShot.title}
          </p>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-6">
            {/* Applied Effects */}
            <AppliedEffectsList shot={selectedShot} />

            <Separator />

            {/* Effect Library */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Effect Library</h3>
                <Badge variant="secondary">
                  {filteredEffects.length} effects
                </Badge>
              </div>

              {/* Search and Filter */}
              <div className="space-y-3">
                <div className="relative">
                  <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search effects..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <FilterIcon className="h-4 w-4 text-muted-foreground" />
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="color">Color</SelectItem>
                      <SelectItem value="blur">Blur</SelectItem>
                      <SelectItem value="artistic">Artistic</SelectItem>
                      <SelectItem value="adjustment">Adjustment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Effect Grid */}
              <div className="grid grid-cols-2 gap-3">
                {filteredEffects.map((effectTemplate) => (
                  <EffectCard
                    key={effectTemplate.id}
                    effectTemplate={effectTemplate}
                    shotId={selectedShot.id}
                  />
                ))}
              </div>

              {filteredEffects.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">No effects found</p>
                  <p className="text-xs mt-1">Try adjusting your search or filter</p>
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </div>
    </DndProvider>
  );
}

// ============================================================================
// Applied Effects List
// ============================================================================

interface AppliedEffectsListProps {
  shot: typeof useSelectedShot extends () => infer R ? NonNullable<R> : never;
}

function AppliedEffectsList({ shot }: AppliedEffectsListProps) {
  const reorderEffects = useStore((state) => state.reorderEffects);

  const handleReorder = (dragIndex: number, hoverIndex: number) => {
    const newEffects = [...shot.effects];
    const [draggedEffect] = newEffects.splice(dragIndex, 1);
    newEffects.splice(hoverIndex, 0, draggedEffect);
    reorderEffects(shot.id, newEffects);
  };

  if (shot.effects.length === 0) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Applied Effects</h3>
        <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg bg-muted/50">
          <div className="rounded-full bg-primary/10 p-3 mb-3">
            <SparklesIcon className="h-6 w-6 text-primary" />
          </div>
          <p className="text-sm font-medium mb-1">No Effects Applied</p>
          <p className="text-xs text-muted-foreground text-center">
            Add effects from the library below
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Applied Effects</h3>
        <Badge variant="secondary">
          {shot.effects.length} active
        </Badge>
      </div>

      <div className="space-y-2">
        {shot.effects.map((effect, index) => (
          <AppliedEffectItem
            key={effect.id}
            effect={effect}
            shotId={shot.id}
            index={index}
            onReorder={handleReorder}
          />
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        Drag to reorder • Effects are applied from top to bottom
      </p>
    </div>
  );
}

// ============================================================================
// Applied Effect Item (Draggable)
// ============================================================================

interface AppliedEffectItemProps {
  effect: Effect;
  shotId: string;
  index: number;
  onReorder: (dragIndex: number, hoverIndex: number) => void;
}

function AppliedEffectItem({ effect, shotId, index, onReorder }: AppliedEffectItemProps) {
  const updateEffect = useStore((state) => state.updateEffect);
  const deleteEffect = useStore((state) => state.deleteEffect);

  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.EFFECT,
    item: { index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [{ isOver }, drop] = useDrop({
    accept: ItemTypes.EFFECT,
    hover: (item: { index: number }) => {
      if (item.index !== index) {
        onReorder(item.index, index);
        item.index = index;
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  const handleToggle = () => {
    updateEffect(shotId, effect.id, { enabled: !effect.enabled });
  };

  const handleIntensityChange = (value: number[]) => {
    updateEffect(shotId, effect.id, { intensity: value[0] });
  };

  const handleRemove = () => {
    deleteEffect(shotId, effect.id);
  };

  return (
    <div
      ref={(node) => {
        if (node) {
          drag(drop(node));
        }
      }}
      className={`
        p-3 rounded-lg border bg-card transition-all
        ${isDragging ? 'opacity-50 scale-95' : 'opacity-100'}
        ${isOver ? 'ring-2 ring-primary' : ''}
        ${!effect.enabled ? 'opacity-60' : ''}
      `}
    >
      <div className="flex items-start gap-3">
        {/* Drag Handle */}
        <div className="cursor-move pt-1">
          <GripVerticalIcon className="h-4 w-4 text-muted-foreground" />
        </div>

        {/* Effect Info */}
        <div className="flex-1 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{effect.name}</span>
              <Badge variant="outline" className="text-xs capitalize">
                {effect.type}
              </Badge>
            </div>

            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleToggle}
                className="h-7 w-7 p-0"
                title={effect.enabled ? 'Disable effect' : 'Enable effect'}
              >
                {effect.enabled ? (
                  <EyeIcon className="h-4 w-4" />
                ) : (
                  <EyeOffIcon className="h-4 w-4" />
                )}
              </Button>

              <Button
                size="sm"
                variant="ghost"
                onClick={handleRemove}
                className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                title="Remove effect"
              >
                <XIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Intensity Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Intensity</Label>
              <span className="text-xs font-mono">{effect.intensity}%</span>
            </div>
            <Slider
              value={[effect.intensity]}
              onValueChange={handleIntensityChange}
              min={0}
              max={100}
              step={1}
              disabled={!effect.enabled}
              className="w-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Effect Card (Library Item)
// ============================================================================

interface EffectCardProps {
  effectTemplate: EffectTemplate;
  shotId: string;
}

function EffectCard({ effectTemplate, shotId }: EffectCardProps) {
  const addEffect = useStore((state) => state.addEffect);

  const handleAdd = () => {
    const newEffect: Effect = {
      id: `effect-${Date.now()}`,
      type: effectTemplate.type,
      name: effectTemplate.name,
      enabled: true,
      intensity: 50,
      parameters: effectTemplate.defaultParameters,
    };
    addEffect(shotId, newEffect);
  };

  return (
    <button
      onClick={handleAdd}
      className="
        p-3 rounded-lg border bg-card text-left
        hover:bg-accent hover:border-primary
        transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-primary
      "
    >
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{effectTemplate.name}</span>
          <PlusIcon className="h-4 w-4 text-muted-foreground" />
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2">
          {effectTemplate.description}
        </p>
        <Badge variant="outline" className="text-xs capitalize">
          {effectTemplate.category}
        </Badge>
      </div>
    </button>
  );
}

