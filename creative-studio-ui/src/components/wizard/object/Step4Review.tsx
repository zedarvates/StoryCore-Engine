/**
 * Object Wizard - Step 4: Review
 * 
 * Final review and confirmation before creating the object
 */

import React from 'react';
import { useWizard } from '@/contexts/WizardContext';
import type { StoryObject } from '@/types/object';
import { OBJECT_TYPE_LABELS, OBJECT_RARITY_LABELS, OBJECT_CONDITION_LABELS } from '@/types/object';
import './ObjectWizardSteps.css';

export function Step4Review() {
  const { data } = useWizard<StoryObject>();

  return (
    <div className="object-wizard-step">
      <div className="step-header">
        <h3>Review Object</h3>
        <p>Review your object before finalizing</p>
      </div>

      <div className="review-section">
        {/* Basic Info */}
        <div className="review-group">
          <h4>Basic Information</h4>
          <div className="review-item">
            <span className="label">Name:</span>
            <span className="value">{data.name || 'Not set'}</span>
          </div>
          <div className="review-item">
            <span className="label">Type:</span>
            <span className="value">{data.type ? OBJECT_TYPE_LABELS[data.type] : 'Not set'}</span>
          </div>
          <div className="review-item">
            <span className="label">Rarity:</span>
            <span className="value">{data.rarity ? OBJECT_RARITY_LABELS[data.rarity] : 'Common'}</span>
          </div>
          <div className="review-item">
            <span className="label">Description:</span>
            <span className="value">{data.description || 'Not set'}</span>
          </div>
          {data.appearance && (
            <div className="review-item">
              <span className="label">Appearance:</span>
              <span className="value">{data.appearance}</span>
            </div>
          )}
          {data.significance && (
            <div className="review-item">
              <span className="label">Significance:</span>
              <span className="value">{data.significance}</span>
            </div>
          )}
        </div>

        {/* Properties */}
        {data.properties && Object.keys(data.properties).length > 0 && (
          <div className="review-group">
            <h4>Properties</h4>
            {data.properties.weight && (
              <div className="review-item">
                <span className="label">Weight:</span>
                <span className="value">{data.properties.weight}</span>
              </div>
            )}
            {data.properties.size && (
              <div className="review-item">
                <span className="label">Size:</span>
                <span className="value">{data.properties.size}</span>
              </div>
            )}
            {data.properties.material && (
              <div className="review-item">
                <span className="label">Material:</span>
                <span className="value">{data.properties.material}</span>
              </div>
            )}
            {data.properties.color && (
              <div className="review-item">
                <span className="label">Color:</span>
                <span className="value">{data.properties.color}</span>
              </div>
            )}
            {data.properties.durability && (
              <div className="review-item">
                <span className="label">Condition:</span>
                <span className="value">{OBJECT_CONDITION_LABELS[data.properties.durability]}</span>
              </div>
            )}
            {data.properties.magical && (
              <div className="review-item">
                <span className="label">Magical:</span>
                <span className="value">Yes</span>
              </div>
            )}
            {data.properties.value && (
              <div className="review-item">
                <span className="label">Value:</span>
                <span className="value">{data.properties.value}</span>
              </div>
            )}
            {data.properties.origin && (
              <div className="review-item">
                <span className="label">Origin:</span>
                <span className="value">{data.properties.origin}</span>
              </div>
            )}
          </div>
        )}

        {/* History & Context */}
        {(data.history || data.currentOwner || data.location) && (
          <div className="review-group">
            <h4>Context</h4>
            {data.history && (
              <div className="review-item">
                <span className="label">History:</span>
                <span className="value">{data.history}</span>
              </div>
            )}
            {data.currentOwner && (
              <div className="review-item">
                <span className="label">Current Owner:</span>
                <span className="value">{data.currentOwner}</span>
              </div>
            )}
            {data.location && (
              <div className="review-item">
                <span className="label">Location:</span>
                <span className="value">{data.location}</span>
              </div>
            )}
          </div>
        )}

        {/* Abilities */}
        {data.abilities && data.abilities.length > 0 && (
          <div className="review-group">
            <h4>Abilities ({data.abilities.length})</h4>
            {data.abilities.map((ability, index) => (
              <div key={ability.id} className="ability-review">
                <div className="ability-name">
                  {index + 1}. {ability.name} <span className="ability-type">({ability.type})</span>
                </div>
                <div className="ability-description">{ability.description}</div>
                {ability.cooldown && (
                  <div className="ability-cooldown">Cooldown: {ability.cooldown}</div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Tags */}
        {data.tags && data.tags.length > 0 && (
          <div className="review-group">
            <h4>Tags</h4>
            <div className="tags-list">
              {data.tags.map((tag, index) => (
                <span key={index} className="tag">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="review-footer">
        <p className="text-sm text-muted-foreground">
          Click "Complete" to create this object and add it to your project.
        </p>
      </div>
    </div>
  );
}
