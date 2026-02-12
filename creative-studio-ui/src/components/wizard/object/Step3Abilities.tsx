/**
 * Object Wizard - Step 3: Abilities
 * 
 * Collects special abilities and powers of the object
 */

import React from 'react';
import { useWizard } from '@/contexts/WizardContext';
import type { StoryObject, ObjectAbility } from '@/types/object';
import { Plus, Trash2 } from 'lucide-react';
import './ObjectWizardSteps.css';

export function Step3Abilities() {
  const { data, updateData } = useWizard<StoryObject>();

  const abilities = data.abilities || [];

  const addAbility = () => {
    const newAbility: ObjectAbility = {
      id: crypto.randomUUID ? crypto.randomUUID() : `ability-${Date.now()}`,
      name: '',
      description: '',
      type: 'passive',
    };

    updateData({
      abilities: [...abilities, newAbility],
    });
  };

  const updateAbility = (index: number, field: keyof ObjectAbility, value: unknown) => {
    const updatedAbilities = [...abilities];
    updatedAbilities[index] = {
      ...updatedAbilities[index],
      [field]: value,
    };

    updateData({ abilities: updatedAbilities });
  };

  const removeAbility = (index: number) => {
    const updatedAbilities = abilities.filter((_, i) => i !== index);
    updateData({ abilities: updatedAbilities });
  };

  return (
    <div className="object-wizard-step">
      <div className="step-header">
        <h3>Abilities & Powers</h3>
        <p>Define special abilities or powers this object has (optional)</p>
      </div>

      <div className="form-section">
        {abilities.length === 0 ? (
          <div className="empty-state">
            <p>No abilities added yet</p>
            <button type="button" onClick={addAbility} className="btn-primary">
              <Plus className="w-4 h-4" />
              Add First Ability
            </button>
          </div>
        ) : (
          <div className="abilities-list">
            {abilities.map((ability, index) => (
              <div key={ability.id} className="ability-card">
                <div className="ability-header">
                  <h4>Ability {index + 1}</h4>
                  <button
                    type="button"
                    onClick={() => removeAbility(index)}
                    className="btn-icon-danger"
                    aria-label="Remove ability"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="form-group">
                  <label htmlFor={`ability-name-${index}`}>Ability Name</label>
                  <input
                    id={`ability-name-${index}`}
                    type="text"
                    value={ability.name}
                    onChange={(e) => updateAbility(index, 'name', e.target.value)}
                    placeholder="e.g., Fire Blast, Healing Touch"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor={`ability-type-${index}`}>Type</label>
                  <select
                    id={`ability-type-${index}`}
                    value={ability.type}
                    onChange={(e) => updateAbility(index, 'type', e.target.value)}
                  >
                    <option value="passive">Passive (Always active)</option>
                    <option value="active">Active (Must be activated)</option>
                    <option value="triggered">Triggered (Activates on condition)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor={`ability-description-${index}`}>Description</label>
                  <textarea
                    id={`ability-description-${index}`}
                    value={ability.description}
                    onChange={(e) => updateAbility(index, 'description', e.target.value)}
                    placeholder="Describe what this ability does..."
                    rows={3}
                  />
                </div>

                {ability.type !== 'passive' && (
                  <div className="form-group">
                    <label htmlFor={`ability-cooldown-${index}`}>Cooldown</label>
                    <input
                      id={`ability-cooldown-${index}`}
                      type="text"
                      value={ability.cooldown || ''}
                      onChange={(e) => updateAbility(index, 'cooldown', e.target.value)}
                      placeholder="e.g., 1 hour, once per day"
                    />
                  </div>
                )}
              </div>
            ))}

            <button type="button" onClick={addAbility} className="btn-secondary">
              <Plus className="w-4 h-4" />
              Add Another Ability
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

