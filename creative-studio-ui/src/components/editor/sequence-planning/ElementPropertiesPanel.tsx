import React from 'react';
import { X, Settings, Palette, Move, RotateCw, Scale, Volume2, Speaker, Radio } from 'lucide-react';
import { CanvasElement, AudioProperties, calculateAudioProperties } from './types';

export interface ElementPropertiesPanelProps {
  selectedElement: CanvasElement | null;
  onElementUpdate: (elementId: string, updates: Partial<CanvasElement>) => void;
  onClose: () => void;
  className?: string;
}

export const ElementPropertiesPanel: React.FC<ElementPropertiesPanelProps> = ({
  selectedElement,
  onElementUpdate,
  onClose,
  className = ''
}) => {
  if (!selectedElement) {
    return (
      <div className={`properties-panel ${className}`}>
        <div className="panel-header">
          <h3>Propriétés</h3>
        </div>
        <div className="panel-content">
          <div className="no-selection">
            Sélectionnez un élément pour voir ses propriétés
          </div>
        </div>
      </div>
    );
  }

  const handlePropertyChange = (property: string, value: any) => {
    onElementUpdate(selectedElement.id, { [property]: value });
  };

  const handleTransformChange = (axis: 'x' | 'y' | 'z', value: number) => {
    const newPosition = { ...selectedElement.position };
    newPosition[axis] = value;
    onElementUpdate(selectedElement.id, { position: newPosition });
  };

  const handleRotationChange = (axis: 'x' | 'y' | 'z', value: number) => {
    const newRotation = { ...selectedElement.rotation };
    newRotation[axis] = value;
    onElementUpdate(selectedElement.id, { rotation: newRotation });
  };

  const handleScaleChange = (axis: 'x' | 'y' | 'z', value: number) => {
    const newScale = { ...selectedElement.scale };
    newScale[axis] = value;
    onElementUpdate(selectedElement.id, { scale: newScale });
  };

  const handleAudioChange = (property: keyof AudioProperties, value: any) => {
    const currentAudio = selectedElement.audio || {
      enabled: true,
      volume: 1,
      spatialization: true,
      speakerAssignment: 'auto' as const,
      reverb: 0,
      delay: 0,
      lowPassFilter: 20000,
      highPassFilter: 20
    };

    onElementUpdate(selectedElement.id, {
      audio: { ...currentAudio, [property]: value }
    });
  };

  const handleAutoSpatialize = () => {
    const audioProps = calculateAudioProperties(selectedElement.position);
    onElementUpdate(selectedElement.id, {
      audio: {
        ...audioProps,
        enabled: selectedElement.audio?.enabled ?? true
      } as any
    });
  };

  return (
    <div className={`properties-panel ${className}`}>
      <div className="panel-header">
        <h3>Propriétés - {selectedElement.name}</h3>
        <button className="close-btn" onClick={onClose}>
          <X size={16} />
        </button>
      </div>

      <div className="panel-content">
        <div className="property-section">
          <div className="section-header">
            <Settings size={16} />
            <span>Général</span>
          </div>

          <div className="property-group">
            <label>Nom</label>
            <input
              type="text"
              value={selectedElement.name}
              onChange={(e) => handlePropertyChange('name', e.target.value)}
              aria-label="Element name"
            />
          </div>

          <div className="property-group">
            <label>Type</label>
            <select
              value={selectedElement.type}
              onChange={(e) => handlePropertyChange('type', e.target.value as CanvasElement['type'])}
              aria-label="Element type"
            >
              <option value="puppet">Marionnette</option>
              <option value="prop">Accessoire</option>
              <option value="environment">Environnement</option>
              <option value="camera">Caméra</option>
              <option value="light">Lumière</option>
            </select>
          </div>

          <div className="property-group">
            <label>Visible</label>
            <input
              type="checkbox"
              checked={selectedElement.visible}
              onChange={(e) => handlePropertyChange('visible', e.target.checked)}
              aria-label="Element visibility"
            />
          </div>
        </div>

        <div className="property-section">
          <div className="section-header">
            <Move size={16} />
            <span>Position</span>
          </div>

          <div className="transform-controls">
            <div className="axis-control">
              <label>X</label>
              <input
                type="number"
                step="0.1"
                value={selectedElement.position.x}
                onChange={(e) => handleTransformChange('x', parseFloat(e.target.value))}
                aria-label="X position"
              />
            </div>
            <div className="axis-control">
              <label>Y</label>
              <input
                type="number"
                step="0.1"
                value={selectedElement.position.y}
                onChange={(e) => handleTransformChange('y', parseFloat(e.target.value))}
                aria-label="Y position"
              />
            </div>
            <div className="axis-control">
              <label>Z</label>
              <input
                type="number"
                step="0.1"
                value={selectedElement.position.z}
                onChange={(e) => handleTransformChange('z', parseFloat(e.target.value))}
                aria-label="Z position"
              />
            </div>
          </div>
        </div>

        <div className="property-section">
          <div className="section-header">
            <RotateCw size={16} />
            <span>Rotation</span>
          </div>

          <div className="transform-controls">
            <div className="axis-control">
              <label>X</label>
              <input
                type="number"
                step="1"
                value={selectedElement.rotation.x}
                onChange={(e) => handleRotationChange('x', parseFloat(e.target.value))}
                aria-label="X rotation"
              />
            </div>
            <div className="axis-control">
              <label>Y</label>
              <input
                type="number"
                step="1"
                value={selectedElement.rotation.y}
                onChange={(e) => handleRotationChange('y', parseFloat(e.target.value))}
                aria-label="Y rotation"
              />
            </div>
            <div className="axis-control">
              <label>Z</label>
              <input
                type="number"
                step="1"
                value={selectedElement.rotation.z}
                onChange={(e) => handleRotationChange('z', parseFloat(e.target.value))}
                aria-label="Z rotation"
              />
            </div>
          </div>
        </div>

        <div className="property-section">
          <div className="section-header">
            <Scale size={16} />
            <span>Échelle</span>
          </div>

          <div className="transform-controls">
            <div className="axis-control">
              <label>X</label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={selectedElement.scale.x}
                onChange={(e) => handleScaleChange('x', parseFloat(e.target.value))}
                aria-label="X scale"
              />
            </div>
            <div className="axis-control">
              <label>Y</label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={selectedElement.scale.y}
                onChange={(e) => handleScaleChange('y', parseFloat(e.target.value))}
                aria-label="Y scale"
              />
            </div>
            <div className="axis-control">
              <label>Z</label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={selectedElement.scale.z}
                onChange={(e) => handleScaleChange('z', parseFloat(e.target.value))}
                aria-label="Z scale"
              />
            </div>
          </div>
        </div>

        {selectedElement.type === 'puppet' && (
          <div className="property-section">
            <div className="section-header">
              <Volume2 size={16} />
              <span>Audio Spatialisé</span>
            </div>

            <div className="property-group">
              <label>Audio activé</label>
              <input
                type="checkbox"
                checked={selectedElement.audio?.enabled ?? false}
                onChange={(e) => handleAudioChange('enabled', e.target.checked)}
                aria-label="Audio activé"
              />
            </div>

            <div className="property-group">
              <label>Spatialisation automatique</label>
              <div className="audio-controls">
                <input
                  type="checkbox"
                  checked={selectedElement.audio?.spatialization ?? true}
                  onChange={(e) => handleAudioChange('spatialization', e.target.checked)}
                  aria-label="Spatialisation automatique"
                />
                <button className="auto-spatialize-btn" onClick={handleAutoSpatialize} aria-label="Auto spatialize">
                  <Radio size={14} />
                  Auto
                </button>
              </div>
            </div>

            <div className="property-group">
              <label>Volume</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={selectedElement.audio?.volume ?? 1}
                onChange={(e) => handleAudioChange('volume', parseFloat(e.target.value))}
                aria-label="Volume"
              />
              <span className="value-display">{Math.round((selectedElement.audio?.volume ?? 1) * 100)}%</span>
            </div>

            <div className="property-group">
              <label>Haut-parleur</label>
              <select
                value={selectedElement.audio?.speakerAssignment ?? 'auto'}
                onChange={(e) => handleAudioChange('speakerAssignment', e.target.value)}
                aria-label="Haut-parleur"
              >
                <option value="auto">Automatique</option>
                <option value="front-left">Avant Gauche</option>
                <option value="front-center">Avant Centre</option>
                <option value="front-right">Avant Droite</option>
                <option value="surround-left">Surround Gauche</option>
                <option value="surround-right">Surround Droite</option>
                <option value="back-left">Arrière Gauche</option>
                <option value="back-right">Arrière Droite</option>
                <option value="lfe">Caisson de basses</option>
              </select>
            </div>

            <div className="property-group">
              <label>Réverbération</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={selectedElement.audio?.reverb ?? 0}
                onChange={(e) => handleAudioChange('reverb', parseFloat(e.target.value))}
                aria-label="Réverbération"
              />
              <span className="value-display">{Math.round((selectedElement.audio?.reverb ?? 0) * 100)}%</span>
            </div>

            <div className="property-group">
              <label>Délai (ms)</label>
              <input
                type="number"
                min="0"
                max="500"
                step="1"
                value={selectedElement.audio?.delay ?? 0}
                onChange={(e) => handleAudioChange('delay', parseFloat(e.target.value))}
                aria-label="Délai (ms)"
              />
            </div>

            <div className="audio-filters">
              <div className="property-group">
                <label>Filtre passe-bas (Hz)</label>
                <input
                  type="number"
                  min="20"
                  max="20000"
                  step="10"
                  value={selectedElement.audio?.lowPassFilter ?? 20000}
                  onChange={(e) => handleAudioChange('lowPassFilter', parseFloat(e.target.value))}
                  aria-label="Filtre passe-bas (Hz)"
                />
              </div>

              <div className="property-group">
                <label>Filtre passe-haut (Hz)</label>
                <input
                  type="number"
                  min="20"
                  max="20000"
                  step="10"
                  value={selectedElement.audio?.highPassFilter ?? 20}
                  onChange={(e) => handleAudioChange('highPassFilter', parseFloat(e.target.value))}
                  aria-label="Filtre passe-haut (Hz)"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};