import React, { useState } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import type { CharacterRelationship } from '@/types/character';
import { useCharacterManager } from '@/hooks/useCharacterManager';
import './EditorSection.css';

interface RelationshipsSectionProps {
  characterId: string;
  relationships: CharacterRelationship[];
  errors: Record<string, string[]>;
  onChange: (relationships: CharacterRelationship[]) => void;
  id: string;
}

export function RelationshipsSection({
  characterId,
  relationships,
  errors,
  onChange,
  id,
}: Readonly<RelationshipsSectionProps>) {
  const characterManager = useCharacterManager();
  const [isAdding, setIsAdding] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [formData, setFormData] = useState<Partial<CharacterRelationship>>({});
  
  // Get all characters except current one
  const availableCharacters = characterManager.getAllCharacters()
    .filter(char => char.character_id !== characterId);
  
  const handleAdd = () => {
    setIsAdding(true);
    setFormData({});
  };
  
  const handleEdit = (index: number) => {
    setEditingIndex(index);
    setFormData(relationships[index]);
  };
  
  const handleDelete = (index: number) => {
    const newRelationships = relationships.filter((_, i) => i !== index);
    onChange(newRelationships);
  };
  
  const handleSave = () => {
    if (!formData.character_id || !formData.relationship_type) {
      return;
    }
    
    const selectedChar = availableCharacters.find(
      char => char.character_id === formData.character_id
    );
    
    if (!selectedChar) {
      return;
    }
    
    const relationship: CharacterRelationship = {
      character_id: formData.character_id,
      character_name: selectedChar.name,
      relationship_type: formData.relationship_type,
      description: formData.description || '',
      dynamic: formData.dynamic || '',
    };
    
    if (editingIndex !== null) {
      const newRelationships = [...relationships];
      newRelationships[editingIndex] = relationship;
      onChange(newRelationships);
      setEditingIndex(null);
    } else {
      onChange([...relationships, relationship]);
      setIsAdding(false);
    }
    
    setFormData({});
  };
  
  const handleCancel = () => {
    setIsAdding(false);
    setEditingIndex(null);
    setFormData({});
  };

  return (
    <div className="editor-section">
      <div className="editor-section__header">
        <h3 className="editor-section__title">Relationships</h3>
        {!isAdding && editingIndex === null && (
          <button
            className="editor-section__add-button"
            onClick={handleAdd}
            type="button"
          >
            <Plus />
            Add Relationship
          </button>
        )}
      </div>
      
      {/* Existing relationships */}
      {relationships.length > 0 && (
        <div className="editor-section__relationships">
          {relationships.map((rel, index) => (
            <div key={rel.character_id || `relationship-${index}`} className="editor-section__relationship-card">
              {editingIndex === index ? (
                // Edit form
                <div className="editor-section__relationship-form">
                  <div className="editor-section__field">
                    <label htmlFor="character-select" className="editor-section__label">Character</label>
                    <select
                      id="character-select"
                      className="editor-section__select"
                      value={formData.character_id || ''}
                      onChange={(e) => setFormData({ ...formData, character_id: e.target.value })}
                      aria-label="Select character"
                    >
                      <option value="">Select character</option>
                      {availableCharacters.map(char => (
                        <option key={char.character_id} value={char.character_id}>
                          {char.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="editor-section__field">
                    <label htmlFor="relationship-type-select" className="editor-section__label">Relationship Type</label>
                    <select
                      id="relationship-type-select"
                      className="editor-section__select"
                      value={formData.relationship_type || ''}
                      onChange={(e) => setFormData({ ...formData, relationship_type: e.target.value })}
                      aria-label="Select relationship type"
                    >
                      <option value="">Select type</option>
                      <option value="parent">Parent</option>
                      <option value="child">Child</option>
                      <option value="sibling">Sibling</option>
                      <option value="friend">Friend</option>
                      <option value="enemy">Enemy</option>
                      <option value="mentor">Mentor</option>
                      <option value="student">Student</option>
                      <option value="lover">Lover</option>
                      <option value="rival">Rival</option>
                      <option value="ally">Ally</option>
                      <option value="colleague">Colleague</option>
                    </select>
                  </div>
                  
                  <div className="editor-section__field">
                    <label htmlFor="description-input" className="editor-section__label">Description</label>
                    <input
                      id="description-input"
                      type="text"
                      className="editor-section__input"
                      value={formData.description || ''}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Describe the relationship"
                    />
                  </div>
                  
                  <div className="editor-section__field">
                    <label htmlFor="dynamic-input" className="editor-section__label">Dynamic</label>
                    <input
                      id="dynamic-input"
                      type="text"
                      className="editor-section__input"
                      value={formData.dynamic || ''}
                      onChange={(e) => setFormData({ ...formData, dynamic: e.target.value })}
                      placeholder="Describe the dynamic"
                    />
                  </div>
                  
                  <div className="editor-section__relationship-actions">
                    <button
                      className="editor-section__button editor-section__button--secondary"
                      onClick={handleCancel}
                      type="button"
                    >
                      Cancel
                    </button>
                    <button
                      className="editor-section__button editor-section__button--primary"
                      onClick={handleSave}
                      type="button"
                      disabled={!formData.character_id || !formData.relationship_type}
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                // Display mode
                <>
                  <div className="editor-section__relationship-content">
                    <h4>{rel.character_name}</h4>
                    <p className="editor-section__relationship-type">{rel.relationship_type}</p>
                    {rel.description && (
                      <p className="editor-section__relationship-description">{rel.description}</p>
                    )}
                    {rel.dynamic && (
                      <p className="editor-section__relationship-dynamic">
                        <strong>Dynamic:</strong> {rel.dynamic}
                      </p>
                    )}
                  </div>
                  <div className="editor-section__relationship-actions">
                    <button
                      className="editor-section__icon-button"
                      onClick={() => handleEdit(index)}
                      type="button"
                      aria-label="Edit relationship"
                    >
                      <Edit2 />
                    </button>
                    <button
                      className="editor-section__icon-button editor-section__icon-button--danger"
                      onClick={() => handleDelete(index)}
                      type="button"
                      aria-label="Delete relationship"
                    >
                      <Trash2 />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add new relationship form */}
      {isAdding && (
        <div className="editor-section__relationship-card editor-section__relationship-card--new">
          <h4>Add New Relationship</h4>
          <div className="editor-section__relationship-form">
            <div className="editor-section__field">
              <label htmlFor="character-select-new" className="editor-section__label">Character</label>
              <select
                id="character-select-new"
                className="editor-section__select"
                value={formData.character_id || ''}
                onChange={(e) => setFormData({ ...formData, character_id: e.target.value })}
                aria-label="Select character"
              >
                <option value="">Select character</option>
                {availableCharacters.map(char => (
                  <option key={char.character_id} value={char.character_id}>
                    {char.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="editor-section__field">
              <label htmlFor="relationship-type-select-new" className="editor-section__label">Relationship Type</label>
              <select
                id="relationship-type-select-new"
                className="editor-section__select"
                value={formData.relationship_type || ''}
                onChange={(e) => setFormData({ ...formData, relationship_type: e.target.value })}
                aria-label="Select relationship type"
              >
                <option value="">Select type</option>
                <option value="parent">Parent</option>
                <option value="child">Child</option>
                <option value="sibling">Sibling</option>
                <option value="friend">Friend</option>
                <option value="enemy">Enemy</option>
                <option value="mentor">Mentor</option>
                <option value="student">Student</option>
                <option value="lover">Lover</option>
                <option value="rival">Rival</option>
                <option value="ally">Ally</option>
                <option value="colleague">Colleague</option>
              </select>
            </div>
            
            <div className="editor-section__field">
              <label htmlFor="description-input-new" className="editor-section__label">Description</label>
              <input
                id="description-input-new"
                type="text"
                className="editor-section__input"
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the relationship"
              />
            </div>
            
            <div className="editor-section__field">
              <label htmlFor="dynamic-input-new" className="editor-section__label">Dynamic</label>
              <input
                id="dynamic-input-new"
                type="text"
                className="editor-section__input"
                value={formData.dynamic || ''}
                onChange={(e) => setFormData({ ...formData, dynamic: e.target.value })}
                placeholder="Describe the dynamic"
              />
            </div>
            
            <div className="editor-section__relationship-actions">
              <button
                className="editor-section__button editor-section__button--secondary"
                onClick={handleCancel}
                type="button"
              >
                Cancel
              </button>
              <button
                className="editor-section__button editor-section__button--primary"
                onClick={handleSave}
                type="button"
                disabled={!formData.character_id || !formData.relationship_type}
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Empty state */}
      {relationships.length === 0 && !isAdding && (
        <div className="editor-section__empty">
          <p>No relationships defined yet.</p>
          <button
            className="editor-section__button editor-section__button--primary"
            onClick={handleAdd}
            type="button"
          >
            <Plus />
            Add First Relationship
          </button>
        </div>
      )}
    </div>
  );
}
