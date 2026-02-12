import React from 'react';
import type { VisualIdentity } from '@/types/character';
import './EditorSection.css';

interface AppearanceSectionProps {
  data: Partial<VisualIdentity>;
  errors: Record<string, string[]>;
  onChange: (field: string, value: unknown) => void;
  id?: string;
}

export function AppearanceSection({
  data,
  errors,
  onChange,
}: AppearanceSectionProps) {
  const handleArrayChange = (field: string, value: string) => {
    const array = value.split(',').map(item => item.trim()).filter(Boolean);
    onChange(field, array);
  };

  return (
    <div className="editor-section">
      <h3 className="editor-section__title">Appearance</h3>
      
      <div className="editor-section__grid">
        {/* Hair */}
        <div className="editor-section__field">
          <label htmlFor="hair_color" className="editor-section__label">
            Hair Color
          </label>
          <input
            id="hair_color"
            type="text"
            className="editor-section__input"
            value={data.hair_color || ''}
            onChange={(e) => onChange('hair_color', e.target.value)}
            placeholder="e.g., Black, Blonde, Brown"
          />
        </div>
        
        <div className="editor-section__field">
          <label htmlFor="hair_style" className="editor-section__label">
            Hair Style
          </label>
          <input
            id="hair_style"
            type="text"
            className="editor-section__input"
            value={data.hair_style || ''}
            onChange={(e) => onChange('hair_style', e.target.value)}
            placeholder="e.g., Straight, Curly, Wavy"
          />
        </div>
        
        <div className="editor-section__field">
          <label htmlFor="hair_length" className="editor-section__label">
            Hair Length
          </label>
          <input
            id="hair_length"
            type="text"
            className="editor-section__input"
            value={data.hair_length || ''}
            onChange={(e) => onChange('hair_length', e.target.value)}
            placeholder="e.g., Short, Medium, Long"
          />
        </div>
        
        {/* Eyes */}
        <div className="editor-section__field">
          <label htmlFor="eye_color" className="editor-section__label">
            Eye Color
          </label>
          <input
            id="eye_color"
            type="text"
            className="editor-section__input"
            value={data.eye_color || ''}
            onChange={(e) => onChange('eye_color', e.target.value)}
            placeholder="e.g., Blue, Brown, Green"
          />
        </div>

        <div className="editor-section__field">
          <label htmlFor="eye_shape" className="editor-section__label">
            Eye Shape
          </label>
          <input
            id="eye_shape"
            type="text"
            className="editor-section__input"
            value={data.eye_shape || ''}
            onChange={(e) => onChange('eye_shape', e.target.value)}
            placeholder="e.g., Almond, Round, Hooded"
          />
        </div>
        
        {/* Skin */}
        <div className="editor-section__field">
          <label htmlFor="skin_tone" className="editor-section__label">
            Skin Tone
          </label>
          <input
            id="skin_tone"
            type="text"
            className="editor-section__input"
            value={data.skin_tone || ''}
            onChange={(e) => onChange('skin_tone', e.target.value)}
            placeholder="e.g., Fair, Olive, Dark"
          />
        </div>
        
        {/* Body */}
        <div className="editor-section__field">
          <label htmlFor="height" className="editor-section__label">
            Height
          </label>
          <input
            id="height"
            type="text"
            className="editor-section__input"
            value={data.height || ''}
            onChange={(e) => onChange('height', e.target.value)}
            placeholder="e.g., Tall, Average, Short"
          />
        </div>
        
        <div className="editor-section__field">
          <label htmlFor="build" className="editor-section__label">
            Build
          </label>
          <input
            id="build"
            type="text"
            className="editor-section__input"
            value={data.build || ''}
            onChange={(e) => onChange('build', e.target.value)}
            placeholder="e.g., Athletic, Slim, Muscular"
          />
        </div>
        
        <div className="editor-section__field">
          <label htmlFor="posture" className="editor-section__label">
            Posture
          </label>
          <input
            id="posture"
            type="text"
            className="editor-section__input"
            value={data.posture || ''}
            onChange={(e) => onChange('posture', e.target.value)}
            placeholder="e.g., Upright, Slouched, Confident"
          />
        </div>
      </div>

      {/* Full-width fields */}
      <div className="editor-section__field">
        <label htmlFor="facial_structure" className="editor-section__label">
          Facial Structure
        </label>
        <input
          id="facial_structure"
          type="text"
          className="editor-section__input"
          value={data.facial_structure || ''}
          onChange={(e) => onChange('facial_structure', e.target.value)}
          placeholder="e.g., Angular, Round, Square"
        />
      </div>
      
      <div className="editor-section__field">
        <label htmlFor="clothing_style" className="editor-section__label">
          Clothing Style
        </label>
        <input
          id="clothing_style"
          type="text"
          className="editor-section__input"
          value={data.clothing_style || ''}
          onChange={(e) => onChange('clothing_style', e.target.value)}
          placeholder="e.g., Casual, Formal, Bohemian"
        />
      </div>
      
      <div className="editor-section__field">
        <label htmlFor="distinctive_features" className="editor-section__label">
          Distinctive Features
        </label>
        <input
          id="distinctive_features"
          type="text"
          className="editor-section__input"
          value={Array.isArray(data.distinctive_features) ? data.distinctive_features.join(', ') : ''}
          onChange={(e) => handleArrayChange('distinctive_features', e.target.value)}
          placeholder="Comma-separated: scar on left cheek, tattoo on arm"
        />
        <p className="editor-section__hint">Separate multiple features with commas</p>
      </div>
      
      <div className="editor-section__field">
        <label htmlFor="color_palette" className="editor-section__label">
          Color Palette
        </label>
        <input
          id="color_palette"
          type="text"
          className="editor-section__input"
          value={Array.isArray(data.color_palette) ? data.color_palette.join(', ') : ''}
          onChange={(e) => handleArrayChange('color_palette', e.target.value)}
          placeholder="Comma-separated: blue, gold, white"
        />
        <p className="editor-section__hint">Separate multiple colors with commas</p>
      </div>
    </div>
  );
}

