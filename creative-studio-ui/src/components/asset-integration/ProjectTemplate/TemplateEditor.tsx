import React, { useState } from 'react';
import { ProjectTemplate } from '../../../types/asset-integration';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface TemplateEditorProps {
  template: ProjectTemplate;
  onTemplateChange: (template: ProjectTemplate) => void;
}

export const TemplateEditor: React.FC<TemplateEditorProps> = ({
  template,
  onTemplateChange,
}) => {
  const [editedTemplate, setEditedTemplate] = useState<ProjectTemplate>(template);

  const updateTemplate = (updates: Partial<ProjectTemplate>) => {
    const newTemplate = { ...editedTemplate, ...updates };
    setEditedTemplate(newTemplate);
    onTemplateChange(newTemplate);
  };

  const updateProject = (updates: Partial<ProjectTemplate['project']>) => {
    updateTemplate({
      project: { ...editedTemplate.project, ...updates }
    });
  };

  const updateMetadata = (updates: Partial<ProjectTemplate['project']['metadata']>) => {
    updateProject({
      metadata: { ...editedTemplate.project.metadata, ...updates }
    });
  };

  const updateNarrative = (updates: Partial<ProjectTemplate['project']['narrative']>) => {
    updateProject({
      narrative: { ...editedTemplate.project.narrative, ...updates }
    });
  };

  const addGenre = (genre: string) => {
    if (!editedTemplate.project.genres.includes(genre)) {
      updateProject({
        genres: [...editedTemplate.project.genres, genre]
      });
    }
  };

  const removeGenre = (genre: string) => {
    updateProject({
      genres: editedTemplate.project.genres.filter(g => g !== genre)
    });
  };

  const { project } = editedTemplate;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Edit Project Template</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="format">Format</TabsTrigger>
            <TabsTrigger value="metadata">Metadata</TabsTrigger>
            <TabsTrigger value="narrative">Narrative</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={project.name}
                  onChange={(e) => updateProject({ name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="version">Version</Label>
                <Input
                  id="version"
                  value={project.version}
                  onChange={(e) => updateProject({ version: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={project.description}
                onChange={(e) => updateProject({ description: e.target.value })}
                rows={3}
              />
            </div>
          </TabsContent>

          <TabsContent value="format" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="type">Type</Label>
                <Select
                  value={project.format.type}
                  onValueChange={(value) => updateProject({
                    format: { ...project.format, type: value }
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="short_film">Short Film</SelectItem>
                    <SelectItem value="standard_feature">Standard Feature</SelectItem>
                    <SelectItem value="premium_feature">Premium Feature</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Genres</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {project.genres.map(genre => (
                    <Badge key={genre} variant="secondary" className="cursor-pointer"
                           onClick={() => removeGenre(genre)}>
                      {genre} ×
                    </Badge>
                  ))}
                </div>
                <Select onValueChange={addGenre}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Add genre" />
                  </SelectTrigger>
                  <SelectContent>
                    {project.available_genres.map(genre => (
                      <SelectItem key={genre} value={genre}>
                        {genre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="metadata" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="director">Director</Label>
                <Input
                  id="director"
                  value={project.metadata.director}
                  onChange={(e) => updateMetadata({ director: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="producer">Producer</Label>
                <Input
                  id="producer"
                  value={project.metadata.producer}
                  onChange={(e) => updateMetadata({ producer: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="budget">Budget</Label>
                <Input
                  id="budget"
                  type="number"
                  value={project.metadata.budget}
                  onChange={(e) => updateMetadata({ budget: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label htmlFor="language">Language</Label>
                <Input
                  id="language"
                  value={project.metadata.language}
                  onChange={(e) => updateMetadata({ language: e.target.value })}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="narrative" className="space-y-4">
            <div>
              <Label htmlFor="logline">Logline</Label>
              <Textarea
                id="logline"
                value={project.narrative.logline}
                onChange={(e) => updateNarrative({ logline: e.target.value })}
                rows={2}
              />
            </div>
            <div>
              <Label htmlFor="plot_outline">Plot Outline</Label>
              <Textarea
                id="plot_outline"
                value={project.narrative.plot_outline}
                onChange={(e) => updateNarrative({ plot_outline: e.target.value })}
                rows={6}
              />
            </div>
            <div>
              <Label htmlFor="tone">Tone</Label>
              <Input
                id="tone"
                value={project.narrative.tone}
                onChange={(e) => updateNarrative({ tone: e.target.value })}
              />
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
