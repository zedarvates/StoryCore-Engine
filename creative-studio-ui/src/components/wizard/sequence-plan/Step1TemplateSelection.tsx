import React, { useState, useMemo } from 'react';
import { Search, Filter, Info, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { SequenceTemplate } from '@/types/template';

interface Step1TemplateSelectionProps {
  selectedTemplate?: SequenceTemplate;
  availableTemplates: SequenceTemplate[];
  onTemplateSelect: (template: SequenceTemplate | undefined) => void;
}

export function Step1TemplateSelection({
  selectedTemplate,
  availableTemplates,
  onTemplateSelect,
}: Step1TemplateSelectionProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Get unique categories from available templates
  const categories = useMemo(() => {
    const cats = ['all', ...new Set(availableTemplates.map(t => t.category))];
    return cats.sort();
  }, [availableTemplates]);

  // Filter templates based on search and category
  const filteredTemplates = useMemo(() => {
    return availableTemplates.filter(template => {
      const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [availableTemplates, searchQuery, selectedCategory]);

  const handleTemplateSelect = (template: SequenceTemplate) => {
    onTemplateSelect(template);
  };

  const handleStartFromScratch = () => {
    onTemplateSelect(undefined);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold neon-text text-primary">Template & Concept Selection</h2>
        <p className="text-primary-foreground/80 max-w-2xl mx-auto">
          Initialize your multishot sequence with a structural archetype or build from scratch.
          Archetypes provide a narrative foundation with synchronized act pacing.
        </p>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-600" />
            <Input
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-40">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="z-[9999]">
              <SelectItem value="all">All Categories</SelectItem>
              {categories.filter(cat => cat !== 'all').map(category => (
                <SelectItem key={category} value={category}>
                  {category.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Grid
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            List
          </Button>
        </div>
      </div>

      {/* Templates Grid/List */}
      <div className={cn(
        viewMode === 'grid'
          ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
          : 'space-y-4'
      )}>
        {/* Start from Scratch Card */}
        <Card
          className={cn(
            'cursor-pointer transition-all hover:shadow-lg border-2 relative overflow-hidden group cyber-card',
            selectedTemplate === undefined
              ? 'border-primary bg-primary/10 shadow-[0_0_15px_rgba(var(--primary-rgb),0.3)]'
              : 'border-primary/20 hover:border-primary/40'
          )}
          onClick={handleStartFromScratch}
        >
          <div className="absolute top-0 right-0 p-2">
            <Badge variant="outline" className="text-[10px] uppercase border-primary/30 text-primary">Raw Input</Badge>
          </div>
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Plus className="h-6 w-6 text-primary neon-text" />
            </div>
            <CardTitle className="text-lg">Start from Scratch</CardTitle>
            <CardDescription className="text-primary-foreground/60">
              Complete creative control over structure and timing
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Badge variant="secondary" className="mb-2 bg-primary/20 text-primary border border-primary/30">Expert Mode</Badge>
            <p className="text-sm font-mono opacity-80 uppercase tracking-tighter">Null Archetype</p>
          </CardContent>
        </Card>

        {/* Template Cards */}
        {filteredTemplates.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            isSelected={selectedTemplate?.id === template.id}
            onSelect={() => handleTemplateSelect(template)}
            viewMode={viewMode}
          />
        ))}
      </div>

      {/* No Results */}
      {filteredTemplates.length === 0 && searchQuery && (
        <div className="text-center py-12">
          <div className="text-gray-500 mb-4">
            <Search className="h-12 w-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No templates found</h3>
          <p className="text-gray-800">
            Try adjusting your search or filter criteria
          </p>
        </div>
      )}

      {/* Results Summary */}
      <div className="text-center text-sm text-gray-800">
        {filteredTemplates.length === availableTemplates.length
          ? `Showing all ${availableTemplates.length} templates`
          : `Showing ${filteredTemplates.length} of ${availableTemplates.length} templates`
        }
        {selectedCategory !== 'all' && ` in ${selectedCategory.replace('-', ' ')}`}
        {searchQuery && ` matching "${searchQuery}"`}
      </div>
    </div>
  );
}

// Template Card Component
interface TemplateCardProps {
  template: SequenceTemplate;
  isSelected: boolean;
  onSelect: () => void;
  viewMode: 'grid' | 'list';
}

function TemplateCard({ template, isSelected, onSelect, viewMode }: TemplateCardProps) {
  return (
    <Card
      className={cn(
        'cursor-pointer transition-all hover:shadow-lg border-2',
        isSelected
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-200 hover:border-gray-300'
      )}
      onClick={onSelect}
    >
      <CardHeader className={viewMode === 'list' ? 'pb-2' : ''}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center gap-2 neon-text text-primary">
              {template.name}
              {template.isBuiltIn && (
                <Badge variant="outline" className="text-[10px] uppercase border-primary/30 text-primary">Core</Badge>
              )}
            </CardTitle>
            <CardDescription className="mt-1">
              {template.description}
            </CardDescription>
          </div>
          <TemplateDetailsDialog template={template} />
        </div>

        <div className="flex items-center gap-2 mt-3">
          <Badge variant="secondary" className="bg-primary/20 text-primary border border-primary/10 text-[10px] uppercase">{template.category.replace('-', ' ')}</Badge>
          <Badge variant="outline" className="border-primary/20 text-primary-foreground/70 text-[10px]">
            {template.structure.acts.length} ACTS
          </Badge>
          <Badge variant="outline" className="border-primary/20 text-primary-foreground/70 text-[10px]">
            ~{template.defaults.targetDuration}S
          </Badge>
        </div>
      </CardHeader>

      {viewMode === 'grid' && (
        <CardContent>
          <div className="space-y-3">
            {/* Act Structure Preview */}
            <div>
              <h4 className="text-sm font-medium text-gray-800 mb-2">Act Structure:</h4>
              <div className="space-y-1">
                {template.structure.acts.slice(0, 3).map((act, index) => (
                  <div key={index} className="flex justify-between text-xs text-gray-800">
                    <span>{act.title}</span>
                    <span>{act.targetDuration}s</span>
                  </div>
                ))}
                {template.structure.acts.length > 3 && (
                  <div className="text-xs text-gray-600">
                    +{template.structure.acts.length - 3} more acts
                  </div>
                )}
              </div>
            </div>

            {/* Tags */}
            <div>
              <div className="flex flex-wrap gap-1">
                {template.tags.slice(0, 3).map(tag => (
                  <Badge key={tag} variant="outline" className="text-[10px] uppercase border-primary/10 bg-primary/5 text-primary/60">
                    {tag}
                  </Badge>
                ))}
                {template.tags.length > 3 && (
                  <Badge variant="outline" className="text-[10px] uppercase border-primary/10 bg-primary/5 text-primary/60">
                    +{template.tags.length - 3}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// Template Details Dialog
function TemplateDetailsDialog({ template }: { template: SequenceTemplate }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <Info className="h-4 w-4" />
          <span className="sr-only">View template details</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {template.name}
            {template.isBuiltIn && (
              <Badge variant="outline" className="bg-blue-600 text-white">Built-in</Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            {template.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Template Overview */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <h4 className="font-medium text-sm text-gray-800">Category</h4>
              <p className="text-sm">{template.category.replace('-', ' ')}</p>
            </div>
            <div>
              <h4 className="font-medium text-sm text-gray-800">Target Duration</h4>
              <p className="text-sm">{template.defaults.targetDuration} seconds</p>
            </div>
            <div>
              <h4 className="font-medium text-sm text-gray-800">Frame Rate</h4>
              <p className="text-sm">{template.defaults.frameRate} fps</p>
            </div>
            <div>
              <h4 className="font-medium text-sm text-gray-800">Resolution</h4>
              <p className="text-sm">
                {template.defaults.resolution.width}x{template.defaults.resolution.height}
              </p>
            </div>
          </div>

          {/* Act Structure */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Act Structure</h4>
            <div className="space-y-3">
              {template.structure.acts.map((act, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div>
                    <h5 className="font-medium text-sm">{act.title}</h5>
                    <p className="text-xs text-gray-800">{act.narrativePurpose}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">{act.targetDuration}s</div>
                    <div className="text-xs text-gray-800">Act {act.number}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Tags</h4>
            <div className="flex flex-wrap gap-2">
              {template.tags.map(tag => (
                <Badge key={tag} variant="secondary" className="bg-blue-600 text-white">{tag}</Badge>
              ))}
            </div>
          </div>

          {/* Usage Stats */}
          <div className="p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Recommended For:</h4>
            <ul className="text-sm text-blue-900 space-y-1">
              <li>• {template.structure.acts.length} act structure</li>
              <li>• {template.structure.defaultSceneCount} suggested scenes per act</li>
              <li>• {template.structure.defaultShotCount} estimated shots total</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
