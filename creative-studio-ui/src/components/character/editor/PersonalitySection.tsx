import React, { useState } from 'react';
import type { Personality } from '@/types/character';
import { Plus, X, Brain } from 'lucide-react';
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
  const [newValues, setNewValues] = useState<Record<string, string>>({
    traits: '',
    values: '',
    fears: '',
    desires: '',
    flaws: '',
    strengths: '',
  });

  const handleAdd = (field: keyof Personality) => {
    const val = newValues[field]?.trim();
    if (!val) return;

    const currentArray = Array.isArray(data[field]) ? (data[field] as string[]) : [];
    if (!currentArray.includes(val)) {
      onChange(field, [...currentArray, val]);
    }
    setNewValues(prev => ({ ...prev, [field]: '' }));
  };

  const handleRemove = (field: keyof Personality, item: string) => {
    const currentArray = Array.isArray(data[field]) ? (data[field] as string[]) : [];
    onChange(field, currentArray.filter(i => i !== item));
  };

  const renderArrayField = (field: keyof Personality, label: string, placeholder: string) => {
    const items = Array.isArray(data[field]) ? (data[field] as string[]) : [];
    
    return (
      <div className="editor-section__field">
        <label className="editor-section__label">{label}</label>
        
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            className="editor-section__input flex-1"
            value={newValues[field] || ''}
            onChange={(e) => setNewValues(prev => ({ ...prev, [field]: e.target.value }))}
            onKeyPress={(e) => e.key === 'Enter' && handleAdd(field)}
            placeholder={placeholder}
          />
          <button
            type="button"
            className="editor-section__add-button"
            onClick={() => handleAdd(field)}
            aria-label={`Add ${label}`}
          >
            <Plus size={16} />
          </button>
        </div>

        <div className="flex flex-wrap gap-2 min-h-8">
          {items.map((item, idx) => (
            <div key={`${item}-${idx}`} className="editor-section__chip">
              <span>{item}</span>
              <button
                type="button"
                className="editor-section__chip-remove"
                onClick={() => handleRemove(field, item)}
                aria-label={`Remove ${item}`}
              >
                <X size={12} />
              </button>
            </div>
          ))}
          {items.length === 0 && (
            <span className="text-xs text-zinc-500 italic">None added yet</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="editor-section">
      <div className="flex items-center gap-2 mb-6 pb-2 border-b border-zinc-200">
        <Brain className="w-5 h-5 text-purple-500" />
        <h3 className="editor-section__title m-0">Personality & Psychology</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
        {renderArrayField('traits', 'Traits', 'Inject trait...')}
        {renderArrayField('values', 'Values', 'Core values...')}
        {renderArrayField('fears', 'Fears', 'What do they fear?')}
        {renderArrayField('desires', 'Desires', 'Goals & motivations...')}
        {renderArrayField('flaws', 'Flaws', 'Character flaws...')}
        {renderArrayField('strengths', 'Strengths', 'Skills & strengths...')}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8 pt-6 border-t border-zinc-100">
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
            placeholder="e.g., Sanguine, Melancholic, Stoic"
          />
        </div>
        
        <div className="editor-section__field">
          <label htmlFor="communication_style" className="editor-section__label">
            Communication Style
          </label>
          <input
            id="communication_style"
            type="text"
            className="editor-section__input"
            value={data.communication_style || ''}
            onChange={(e) => onChange('communication_style', e.target.value)}
            placeholder="e.g., Laconic, Formal, Sarcastic"
          />
        </div>
      </div>
    </div>
  );
}

