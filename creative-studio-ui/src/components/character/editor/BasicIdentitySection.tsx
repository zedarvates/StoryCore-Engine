import React from 'react';
import type { Character } from '@/types/character';
import { CHARACTER_ARCHETYPES, AGE_RANGES, GENDER_OPTIONS } from '@/constants/characterOptions';
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
          {CHARACTER_ARCHETYPES.map((archetype) => (
            <option key={archetype} value={archetype}>
              {archetype}
            </option>
          ))}
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
          {AGE_RANGES.map((range) => (
            <option key={range} value={range}>
              {range}
            </option>
          ))}
        </select>
        {errors['visual_identity.age_range'] && (
          <div className="editor-section__error">
            {errors['visual_identity.age_range'].map((error, index) => (
              <p key={index}>{error}</p>
            ))}
          </div>
        )}
      </div>

      {/* Gender */}
      <div className="editor-section__field">
        <label htmlFor="gender" className="editor-section__label">
          Gender <span className="editor-section__required">*</span>
        </label>
        <select
          id="gender"
          className={`editor-section__select ${errors['visual_identity.gender'] ? 'editor-section__select--error' : ''}`}
          value={
            GENDER_OPTIONS.includes(data.visual_identity?.gender as typeof GENDER_OPTIONS[number])
              ? data.visual_identity?.gender || ''
              : data.visual_identity?.gender ? 'Other' : ''
          }
          onChange={(e) => {
            const val = e.target.value;
            if (val === 'Other') {
              onNestedChange('visual_identity', 'gender', 'Other');
            } else {
              onNestedChange('visual_identity', 'gender', val);
            }
          }}
        >
          <option value="">Select gender</option>
          {GENDER_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        {data.visual_identity?.gender &&
          !['Male', 'Female', 'Non-binary'].includes(data.visual_identity.gender) && (
            <input
              type="text"
              className="editor-section__input mt-2"
              value={data.visual_identity.gender === 'Other' ? '' : data.visual_identity.gender}
              onChange={(e) => onNestedChange('visual_identity', 'gender', e.target.value || 'Other')}
              placeholder="Specify gender..."
            />
          )}
        {errors['visual_identity.gender'] && (
          <div className="editor-section__error">
            {errors['visual_identity.gender'].map((error, index) => (
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

