import React from 'react';
import type { Character } from '@/types/character';
import './EditorSection.css';

interface BasicIdentitySectionProps {
  data: Partial<Character>;
  errors: Record<string, string[]>;
  onChange: (field: string, value: unknown) => void;
  onNestedChange: (section: string, field: string, value: unknown) => void;
  id?: string;
}

export function BasicIdentitySection({
  data,
  errors,
  onChange,
  onNestedChange,
}: BasicIdentitySectionProps) {
  return (
    <div className="editor-section">
      <h3 className="editor-section__title">Basic Identity</h3>
      
      {/* Name */}
      <div className="editor-section__field">
        <label htmlFor="name" className="editor-section__label">
          Name <span className="editor-section__required">*</span>
        </label>
        <input
          id="name"
          type="text"
          className={`editor-section__input ${errors.name ? 'editor-section__input--error' : ''}`}
          value={data.name || ''}
          onChange={(e) => onChange('name', e.target.value)}
          placeholder="Enter character name"
        />
        {errors.name && (
          <div className="editor-section__error">
            {errors.name.map((error, index) => (
              <p key={index}>{error}</p>
            ))}
          </div>
        )}
      </div>
      
      {/* Archetype */}
      <div className="editor-section__field">
        <label htmlFor="archetype" className="editor-section__label">
          Archetype <span className="editor-section__required">*</span>
        </label>
        <select
          id="archetype"
          className={`editor-section__select ${errors['role.archetype'] ? 'editor-section__select--error' : ''}`}
          value={data.role?.archetype || ''}
          onChange={(e) => onNestedChange('role', 'archetype', e.target.value)}
        >
          <option value="">Select archetype</option>
          <option value="Hero">Hero</option>
          <option value="Mentor">Mentor</option>
          <option value="Ally">Ally</option>
          <option value="Guardian">Guardian</option>
          <option value="Trickster">Trickster</option>
          <option value="Shapeshifter">Shapeshifter</option>
          <option value="Shadow">Shadow</option>
          <option value="Herald">Herald</option>
        </select>
        {errors['role.archetype'] && (
          <div className="editor-section__error">
            {errors['role.archetype'].map((error, index) => (
              <p key={index}>{error}</p>
            ))}
          </div>
        )}
      </div>

      {/* Age Range */}
      <div className="editor-section__field">
        <label htmlFor="age_range" className="editor-section__label">
          Age Range <span className="editor-section__required">*</span>
        </label>
        <select
          id="age_range"
          className={`editor-section__select ${errors['visual_identity.age_range'] ? 'editor-section__select--error' : ''}`}
          value={data.visual_identity?.age_range || ''}
          onChange={(e) => onNestedChange('visual_identity', 'age_range', e.target.value)}
        >
          <option value="">Select age range</option>
          <option value="Child (0-12)">Child (0-12)</option>
          <option value="Teenager (13-19)">Teenager (13-19)</option>
          <option value="Young Adult (20-35)">Young Adult (20-35)</option>
          <option value="Middle-aged (36-55)">Middle-aged (36-55)</option>
          <option value="Senior (56+)">Senior (56+)</option>
        </select>
        {errors['visual_identity.age_range'] && (
          <div className="editor-section__error">
            {errors['visual_identity.age_range'].map((error, index) => (
              <p key={index}>{error}</p>
            ))}
          </div>
        )}
      </div>
      
      {/* Narrative Function */}
      <div className="editor-section__field">
        <label htmlFor="narrative_function" className="editor-section__label">
          Narrative Function
        </label>
        <input
          id="narrative_function"
          type="text"
          className="editor-section__input"
          value={data.role?.narrative_function || ''}
          onChange={(e) => onNestedChange('role', 'narrative_function', e.target.value)}
          placeholder="e.g., Protagonist, Antagonist, Supporting"
        />
      </div>
      
      {/* Character Arc */}
      <div className="editor-section__field">
        <label htmlFor="character_arc" className="editor-section__label">
          Character Arc
        </label>
        <textarea
          id="character_arc"
          className="editor-section__textarea"
          value={data.role?.character_arc || ''}
          onChange={(e) => onNestedChange('role', 'character_arc', e.target.value)}
          placeholder="Describe the character's journey and transformation"
          rows={4}
        />
      </div>
    </div>
  );
}

