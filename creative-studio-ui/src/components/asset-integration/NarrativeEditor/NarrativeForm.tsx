import React, { useState } from 'react';
import { NarrativeText } from '../../../types/asset-integration';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Save, FileText, BookOpen, MessageSquare } from 'lucide-react';

interface NarrativeFormProps {
  narrative: NarrativeText;
  onNarrativeChange: (narrative: NarrativeText) => void;
  onSave?: () => void;
}

export const NarrativeForm: React.FC<NarrativeFormProps> = ({
  narrative,
  onNarrativeChange,
  onSave,
}) => {
  const [content, setContent] = useState(narrative.content);

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    const updatedNarrative = { ...narrative, content: newContent };
    onNarrativeChange(updatedNarrative);
  };

  const handleSave = () => {
    if (onSave) {
      onSave();
    }
  };

  const getTypeIcon = (type: NarrativeText['type']) => {
    switch (type) {
      case 'plot_outline':
        return <FileText className="h-4 w-4" />;
      case 'character_bio':
        return <BookOpen className="h-4 w-4" />;
      case 'dialogue_script':
        return <MessageSquare className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: NarrativeText['type']) => {
    switch (type) {
      case 'plot_outline':
        return 'Plot Outline';
      case 'character_bio':
        return 'Character Bio';
      case 'dialogue_script':
        return 'Dialogue Script';
      default:
        return 'Notes';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {getTypeIcon(narrative.type)}
            <CardTitle>{narrative.title}</CardTitle>
            <Badge variant="outline">{getTypeLabel(narrative.type)}</Badge>
          </div>
          <Button onClick={handleSave} size="sm">
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
            <div>Created: {new Date(narrative.created_at).toLocaleDateString()}</div>
            <div>Updated: {new Date(narrative.updated_at).toLocaleDateString()}</div>
          </div>

          <div>
            <Textarea
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
              placeholder="Start writing your narrative content..."
              className="min-h-96 text-base leading-relaxed"
            />
          </div>

          <div className="flex justify-between items-center text-sm text-gray-500">
            <span>{content.length} characters</span>
            <span>{content.split('\n').length} lines</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
