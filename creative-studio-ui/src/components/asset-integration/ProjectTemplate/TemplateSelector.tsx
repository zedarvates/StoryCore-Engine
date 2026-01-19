import React, { useState, useEffect } from 'react';
import { ProjectTemplate } from '../../../types/asset-integration';
import { ProjectTemplateService } from '../../../services/asset-integration';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Loader2, Plus } from 'lucide-react';

interface TemplateSelectorProps {
  selectedTemplate: ProjectTemplate | null;
  onTemplateSelect: (template: ProjectTemplate) => void;
  onNewTemplate: () => void;
}

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  selectedTemplate,
  onTemplateSelect,
  onNewTemplate,
}) => {
  const [templates, setTemplates] = useState<ProjectTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const service = ProjectTemplateService.getInstance();

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const templatePaths = await service.listAvailableTemplates();
      const loadedTemplates = await Promise.all(
        templatePaths.map(path => service.loadProjectTemplate(path))
      );
      setTemplates(loadedTemplates);
      setError(null);
    } catch (err) {
      setError(`Failed to load templates: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateChange = (templateId: string) => {
    const template = templates.find(t => t.project.id === templateId);
    if (template) {
      onTemplateSelect(template);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center space-x-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Loading templates...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 text-sm">
        {error}
        <Button
          variant="link"
          size="sm"
          onClick={loadTemplates}
          className="ml-2 p-0 h-auto"
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      <Select
        value={selectedTemplate?.project.id || ''}
        onValueChange={handleTemplateChange}
      >
        <SelectTrigger className="w-64">
          <SelectValue placeholder="Select a template" />
        </SelectTrigger>
        <SelectContent>
          {templates.map(template => (
            <SelectItem key={template.project.id} value={template.project.id}>
              {template.project.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button variant="outline" size="sm" onClick={onNewTemplate}>
        <Plus className="h-4 w-4 mr-1" />
        New
      </Button>
    </div>
  );
};