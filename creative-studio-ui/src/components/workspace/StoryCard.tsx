import React from 'react';
import { BookOpen, Calendar, Users, MapPin } from 'lucide-react';
import type { Story } from '@/types/story';

interface StoryCardProps {
  story: Story;
  onClick: () => void;
}

export function StoryCard({ story, onClick }: StoryCardProps) {
  // Truncate summary to 150 characters
  const truncatedSummary = story.summary.length > 150
    ? story.summary.substring(0, 147) + '...'
    : story.summary;

  // Format date
  const formattedDate = new Date(story.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div
      className="story-card"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div className="story-card-header">
        <div className="story-card-icon">
          <BookOpen className="w-5 h-5" />
        </div>
        <div className="story-card-title-section">
          <h4 className="story-card-title">{story.title}</h4>
          <div className="story-card-meta">
            <span className="story-card-genre">{story.genre.join(', ')}</span>
            <span className="story-card-separator">•</span>
            <span className="story-card-tone">{story.tone.join(', ')}</span>
          </div>
        </div>
      </div>

      <p className="story-card-summary">{truncatedSummary}</p>

      <div className="story-card-footer">
        <div className="story-card-stats">
          <div className="story-card-stat" title="Characters">
            <Users className="w-4 h-4" />
            <span>{story.charactersUsed.length}</span>
          </div>
          <div className="story-card-stat" title="Locations">
            <MapPin className="w-4 h-4" />
            <span>{story.locationsUsed.length}</span>
          </div>
        </div>
        <div className="story-card-date">
          <Calendar className="w-4 h-4" />
          <span>{formattedDate}</span>
          <span className="story-card-version">v{story.version}</span>
        </div>
      </div>
    </div>
  );
}
