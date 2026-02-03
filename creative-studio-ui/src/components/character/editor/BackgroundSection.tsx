import React from 'react';
import type { Background } from '@/types/character';
import './EditorSection.css';

interface BackgroundSectionProps {
  data: Partial<Background>;
  errors: Record<string, string[]>;
  onChange: (field: string, value: any) => void;
}

export function BackgroundSection({
  data,
  errors,
  onChange,
}: BackgroundSectionProps) {
  const handleArrayChange = (field: string, value: string) => {
    const array = value.split(',').map(item => item.trim()).filter(Boolean);
    onChange(field, array);
  };

  return (
    <div className="editor-section">
      <h3 className="editor-section__title">Background</h3>
      
      <div className="editor-section__field">
        <label htmlFor="origin" className="editor-section__label">
          Origin
        </label>
        <input
          id="origin"
          type="text"
          className="editor-section__input"
          value={data.origin || ''}
          onChange={(e) => onChange('origin', e.target.value)}
          placeholder="e.g., Born in a small village, Raised in the city"
        />
      </div>
      
      <div className="editor-section__field">
        <label htmlFor="occupation" className="editor-section__label">
          Occupation
        </label>
        <input
          id="occupation"
          type="text"
          className="editor-section__input"
          value={data.occupation || ''}
          onChange={(e) => onChange('occupation', e.target.value)}
          placeholder="e.g., Teacher, Warrior, Merchant"
        />
      </div>
      
      <div className="editor-section__field">
        <label htmlFor="education" className="editor-section__label">
          Education
        </label>
        <input
          id="education"
          type="text"
          className="editor-section__input"
          value={data.education || ''}
          onChange={(e) => onChange('education', e.target.value)}
          placeholder="e.g., Self-taught, University degree, Apprenticeship"
        />
      </div>
      
      <div className="editor-section__field">
        <label htmlFor="family" className="editor-section__label">
          Family
        </label>
        <textarea
          id="family"
          className="editor-section__textarea"
          value={data.family || ''}
          onChange={(e) => onChange('family', e.target.value)}
          placeholder="Describe the character's family background"
          rows={4}
        />
      </div>

      <div className="editor-section__field">
        <label htmlFor="significant_events" className="editor-section__label">
          Significant Events
        </label>
        <input
          id="significant_events"
          type="text"
          className="editor-section__input"
          value={Array.isArray(data.significant_events) ? data.significant_events.join(', ') : ''}
          onChange={(e) => handleArrayChange('significant_events', e.target.value)}
          placeholder="Comma-separated: Lost parents at age 10, Won a major battle"
        />
        <p className="editor-section__hint">Separate multiple events with commas</p>
      </div>
      
      <div className="editor-section__field">
        <label htmlFor="current_situation" className="editor-section__label">
          Current Situation
        </label>
        <textarea
          id="current_situation"
          className="editor-section__textarea"
          value={data.current_situation || ''}
          onChange={(e) => onChange('current_situation', e.target.value)}
          placeholder="Describe the character's current circumstances"
          rows={4}
        />
      </div>
    </div>
  );
}
