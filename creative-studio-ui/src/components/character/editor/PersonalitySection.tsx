import React from 'react';
import type { Personality } from '@/types/character';
import './EditorSection.css';

interface PersonalitySectionProps {
  data: Partial<Personality>;
  errors: Record<string, string[]>;
  onChange: (field: string, value: unknown) => void;
  id?: string;
}

export function PersonalitySection({
  data,
  errors,
  onChange,
}: PersonalitySectionProps) {
  const handleArrayChange = (field: string, value: string) => {
    const array = value.split(',').map(item => item.trim()).filter(Boolean);
    onChange(field, array);
  };

  return (
    <div className="editor-section">
      <h3 className="editor-section__title">Personality</h3>
      
      <div className="editor-section__field">
        <label htmlFor="traits" className="editor-section__label">
          Traits
        </label>
        <input
          id="traits"
          type="text"
          className="editor-section__input"
          value={Array.isArray(data.traits) ? data.traits.join(', ') : ''}
          onChange={(e) => handleArrayChange('traits', e.target.value)}
          placeholder="Comma-separated: brave, curious, stubborn"
        />
        <p className="editor-section__hint">Separate multiple traits with commas</p>
      </div>
      
      <div className="editor-section__field">
        <label htmlFor="values" className="editor-section__label">
          Values
        </label>
        <input
          id="values"
          type="text"
          className="editor-section__input"
          value={Array.isArray(data.values) ? data.values.join(', ') : ''}
          onChange={(e) => handleArrayChange('values', e.target.value)}
          placeholder="Comma-separated: honesty, loyalty, freedom"
        />
        <p className="editor-section__hint">Separate multiple values with commas</p>
      </div>
      
      <div className="editor-section__field">
        <label htmlFor="fears" className="editor-section__label">
          Fears
        </label>
        <input
          id="fears"
          type="text"
          className="editor-section__input"
          value={Array.isArray(data.fears) ? data.fears.join(', ') : ''}
          onChange={(e) => handleArrayChange('fears', e.target.value)}
          placeholder="Comma-separated: failure, abandonment, heights"
        />
        <p className="editor-section__hint">Separate multiple fears with commas</p>
      </div>

      <div className="editor-section__field">
        <label htmlFor="desires" className="editor-section__label">
          Desires
        </label>
        <input
          id="desires"
          type="text"
          className="editor-section__input"
          value={Array.isArray(data.desires) ? data.desires.join(', ') : ''}
          onChange={(e) => handleArrayChange('desires', e.target.value)}
          placeholder="Comma-separated: adventure, recognition, love"
        />
        <p className="editor-section__hint">Separate multiple desires with commas</p>
      </div>
      
      <div className="editor-section__field">
        <label htmlFor="flaws" className="editor-section__label">
          Flaws
        </label>
        <input
          id="flaws"
          type="text"
          className="editor-section__input"
          value={Array.isArray(data.flaws) ? data.flaws.join(', ') : ''}
          onChange={(e) => handleArrayChange('flaws', e.target.value)}
          placeholder="Comma-separated: impulsive, arrogant, naive"
        />
        <p className="editor-section__hint">Separate multiple flaws with commas</p>
      </div>
      
      <div className="editor-section__field">
        <label htmlFor="strengths" className="editor-section__label">
          Strengths
        </label>
        <input
          id="strengths"
          type="text"
          className="editor-section__input"
          value={Array.isArray(data.strengths) ? data.strengths.join(', ') : ''}
          onChange={(e) => handleArrayChange('strengths', e.target.value)}
          placeholder="Comma-separated: intelligent, compassionate, determined"
        />
        <p className="editor-section__hint">Separate multiple strengths with commas</p>
      </div>
      
      <div className="editor-section__field">
        <label htmlFor="temperament" className="editor-section__label">
          Temperament
        </label>
        <input
          id="temperament"
          type="text"
          className="editor-section__input"
          value={data.temperament || ''}
          onChange={(e) => onChange('temperament', e.target.value)}
          placeholder="e.g., Calm, Fiery, Melancholic"
        />
      </div>
      
      <div className="editor-section__field">
        <label htmlFor="communication_style" className="editor-section__label">
          Communication Style
        </label>
        <textarea
          id="communication_style"
          className="editor-section__textarea"
          value={data.communication_style || ''}
          onChange={(e) => onChange('communication_style', e.target.value)}
          placeholder="Describe how the character communicates"
          rows={4}
        />
      </div>
    </div>
  );
}

