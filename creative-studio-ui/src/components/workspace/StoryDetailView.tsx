import { useState } from 'react';
import {
  X,
  Download,
  Edit3,
  Users,
  MapPin,
  Calendar,
  Tag,
  Sparkles,
  FileText,
  ChevronLeft,
} from 'lucide-react';
import type { Story } from '@/types/story';
import { exportStory } from '@/services/storyExportService';
import type { ExportOptions } from '@/types/story';
import { ContentRenderer } from './ContentRenderer';
import { logger } from '@/utils/logging';

interface StoryDetailViewProps {
  story: Story;
  onClose: () => void;
  onEdit?: () => void;
}

export function StoryDetailView({ story, onClose, onEdit }: StoryDetailViewProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  // Format date
  const formattedDate = new Date(story.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const updatedDate = new Date(story.updatedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Handle export
  const handleExport = async (format: 'txt' | 'md') => {
    setIsExporting(true);
    setExportSuccess(false);
    setExportError(null);

    try {
      const exportOptions: ExportOptions = {
        format,
        includeMetadata: true,
        includeSummary: true,
        filename: story.title.replace(/[^a-z0-9]/gi, '_').toLowerCase(),
      };

      await exportStory(story, exportOptions);
      setExportSuccess(true);

      // Reset success message after 3 seconds
      setTimeout(() => setExportSuccess(false), 3000);
    } catch (error) {
      logger.error('Export failed:', error);
      setExportError(error instanceof Error ? error.message : 'Failed to export story');
    } finally {
      setIsExporting(false);
    }
  };

  // Handle edit
  const handleEdit = () => {
    if (onEdit) {
      onEdit();
    }
  };

  return (
    <div className="story-detail-overlay">
      <div className="story-detail-container">
        {/* Header */}
        <div className="story-detail-header">
          <button
            className="btn-back"
            onClick={onClose}
            title="Back to stories"
          >
            <ChevronLeft className="w-5 h-5" />
            <span>Back</span>
          </button>

          <div className="story-detail-actions">
            {onEdit && (
              <button
                className="btn-action btn-edit"
                onClick={handleEdit}
                title="Edit story"
              >
                <Edit3 className="w-4 h-4" />
                <span>Edit</span>
              </button>
            )}
            <button
              className="btn-action btn-export"
              onClick={() => handleExport('md')}
              disabled={isExporting}
              title="Export as Markdown"
            >
              <Download className="w-4 h-4" />
              <span>Export MD</span>
            </button>
            <button
              className="btn-action btn-export"
              onClick={() => handleExport('txt')}
              disabled={isExporting}
              title="Export as Text"
            >
              <FileText className="w-4 h-4" />
              <span>Export TXT</span>
            </button>
            <button
              className="btn-close"
              onClick={onClose}
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Export Status Messages */}
        {exportSuccess && (
          <div className="export-message export-success">
            ✅ Story exported successfully!
          </div>
        )}
        {exportError && (
          <div className="export-message export-error">
            ❌ {exportError}
          </div>
        )}

        {/* Content */}
        <div className="story-detail-content">
          {/* Title and Metadata */}
          <div className="story-detail-title-section">
            <h1 className="story-detail-title">{story.title}</h1>

            <div className="story-detail-metadata-grid">
              <div className="metadata-item">
                <Tag className="w-4 h-4" />
                <div>
                  <span className="metadata-label">Genre</span>
                  <span className="metadata-value">{story.genre.join(', ')}</span>
                </div>
              </div>

              <div className="metadata-item">
                <Sparkles className="w-4 h-4" />
                <div>
                  <span className="metadata-label">Tone</span>
                  <span className="metadata-value">{story.tone.join(', ')}</span>
                </div>
              </div>

              <div className="metadata-item">
                <FileText className="w-4 h-4" />
                <div>
                  <span className="metadata-label">Length</span>
                  <span className="metadata-value">{story.length}</span>
                </div>
              </div>

              <div className="metadata-item">
                <Calendar className="w-4 h-4" />
                <div>
                  <span className="metadata-label">Created</span>
                  <span className="metadata-value">{formattedDate}</span>
                </div>
              </div>

              {story.updatedAt.getTime() !== story.createdAt.getTime() && (
                <div className="metadata-item">
                  <Calendar className="w-4 h-4" />
                  <div>
                    <span className="metadata-label">Updated</span>
                    <span className="metadata-value">{updatedDate}</span>
                  </div>
                </div>
              )}

              <div className="metadata-item">
                <FileText className="w-4 h-4" />
                <div>
                  <span className="metadata-label">Version</span>
                  <span className="metadata-value">v{story.version}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="story-detail-section">
            <h2 className="section-title">Summary</h2>
            <div className="story-summary-box">
              <p>{story.summary}</p>
            </div>
          </div>

          {/* Story Content */}
          <div className="story-detail-section story-content-section">
            <h2 className="section-title">
              <FileText className="w-5 h-5" />
              Story Content
            </h2>
            <div className="story-content-box">
              <ContentRenderer content={story.content} />
            </div>
          </div>

          {/* Characters Used */}
          {story.charactersUsed.length > 0 && (
            <div className="story-detail-section">
              <h2 className="section-title">
                <Users className="w-5 h-5" />
                Characters ({story.charactersUsed.length})
              </h2>
              <div className="characters-grid">
                {story.charactersUsed.map((character) => (
                  <div key={character.id} className="character-item">
                    <div className="character-icon">
                      <Users className="w-4 h-4" />
                    </div>
                    <div className="character-info">
                      <span className="character-name">{character.name}</span>
                      <span className="character-role">{character.role}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Locations Used */}
          {story.locationsUsed.length > 0 && (
            <div className="story-detail-section">
              <h2 className="section-title">
                <MapPin className="w-5 h-5" />
                Locations ({story.locationsUsed.length})
              </h2>
              <div className="locations-grid">
                {story.locationsUsed.map((location) => (
                  <div key={location.id} className="location-item">
                    <div className="location-icon">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div className="location-info">
                      <span className="location-name">{location.name}</span>
                      <span className="location-significance">{location.significance}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Auto-Generated Elements */}
          {story.autoGeneratedElements.length > 0 && (
            <div className="story-detail-section">
              <h2 className="section-title">
                <Sparkles className="w-5 h-5" />
                Auto-Generated Elements ({story.autoGeneratedElements.length})
              </h2>
              <div className="auto-generated-list">
                {story.autoGeneratedElements.map((element) => (
                  <div key={element.id} className="auto-generated-item">
                    <span className="element-type">{element.type}</span>
                    <span className="element-name">{element.name}</span>
                    <span className="element-date">
                      {new Date(element.generatedAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
