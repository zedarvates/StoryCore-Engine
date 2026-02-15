import React, { useState, useEffect, useCallback } from 'react';
import './SeedancePanel.css';

// Types for Seedance API
interface SeedanceScene {
  name: string;
  description: string;
  characters?: Array<{
    name: string;
    appearance: string;
  }>;
  actions?: string[];
  environment?: string;
  style?: string;
  camera_movement?: string;
  character_consistency?: boolean;
  multishot?: boolean;
}

interface SeedanceReference {
  type: 'image' | 'audio';
  url: string;
  name: string;
}

interface SeedanceConfig {
  engine: string;
  fps: number;
  resolution: string;
  creativity_scale: number;
  physics_fidelity: string;
  enable_audio: boolean;
  enable_3d_export: boolean;
  aspect_ratio: string;
  quality_preset: string;
  seed: number;
}

interface SeedanceGenerationResult {
  status: 'success' | 'error';
  video?: string;
  audio?: string;
  '3d'?: string;
  metadata?: {
    generation_id: string;
    processing_time: number;
    engine: string;
    fps: number;
    resolution: string;
    seed: number;
    character_consistency: boolean;
    multishot: boolean;
    credits_used: number;
    timestamp: string;
  };
  error?: string;
}

interface SeedanceEngine {
  id: string;
  name: string;
  description: string;
  recommended_fps: number;
  max_resolution: string;
}

interface SeedancePreset {
  id: string;
  name: string;
  fps: number;
  resolution: string;
  creativity_scale: number;
  physics_fidelity: string;
}

// Props for SeedancePanel
export interface SeedancePanelProps {
  projectId: string;
  initialScene?: SeedanceScene;
  onClose?: () => void;
  className?: string;
}

const DEFAULT_SCENE: SeedanceScene = {
  name: '',
  description: '',
  characters: [],
  actions: [],
  environment: '',
  style: '',
  camera_movement: '',
  character_consistency: false,
  multishot: false
};

const DEFAULT_CONFIG: SeedanceConfig = {
  engine: 'seedance-v2-turbo',
  fps: 60,
  resolution: '2k',
  creativity_scale: 0.5,
  physics_fidelity: 'high',
  enable_audio: true,
  enable_3d_export: true,
  aspect_ratio: '16:9',
  quality_preset: 'high',
  seed: -1
};

/**
 * SeedancePanel - UI component for Seedance video generation
 */
const SeedancePanel: React.FC<SeedancePanelProps> = ({
  projectId,
  initialScene,
  onClose,
  className = ''
}) => {
  // State
  const [scene, setScene] = useState<SeedanceScene>(initialScene || DEFAULT_SCENE);
  const [references, setReferences] = useState<SeedanceReference[]>([]);
  const [config, setConfig] = useState<SeedanceConfig>(DEFAULT_CONFIG);
  const [engines, setEngines] = useState<SeedanceEngine[]>([]);
  const [presets, setPresets] = useState<SeedancePreset[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [result, setResult] = useState<SeedanceGenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'ready' | 'processing' | 'error'>('ready');

  // Fetch available engines and presets
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [enginesRes, presetsRes, configRes] = await Promise.all([
          fetch('/api/seedance/engines'),
          fetch('/api/seedance/presets'),
          fetch('/api/seedance/config')
        ]);

        const enginesData = await enginesRes.json();
        const presetsData = await presetsRes.json();
        const configData = await configRes.json();

        if (enginesData.success) {
          setEngines(enginesData.engines);
        }
        if (presetsData.success) {
          setPresets(presetsData.presets);
        }
        if (configData.success) {
          setConfig(prev => ({ ...prev, ...configData.config }));
        }
      } catch (err) {
        console.error('Failed to fetch Seedance data:', err);
      }
    };

    fetchData();
  }, []);

  // Apply preset
  const applyPreset = useCallback((preset: SeedancePreset) => {
    setConfig(prev => ({
      ...prev,
      fps: preset.fps,
      resolution: preset.resolution,
      creativity_scale: preset.creativity_scale,
      physics_fidelity: preset.physics_fidelity,
      quality_preset: preset.id
    }));
  }, []);

  // Handle scene input changes
  const handleSceneChange = useCallback((field: keyof SeedanceScene, value: string | boolean) => {
    setScene(prev => ({ ...prev, [field]: value }));
  }, []);

  // Handle config changes
  const handleConfigChange = useCallback((field: keyof SeedanceConfig, value: string | number | boolean) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  }, []);

  // Add reference image
  const addReference = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,audio/*';
    input.multiple = true;
    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files) {
        const newRefs: SeedanceReference[] = Array.from(files).map(file => ({
          type: file.type.startsWith('image') ? 'image' : 'audio',
          url: URL.createObjectURL(file),
          name: file.name
        }));
        setReferences(prev => [...prev, ...newRefs]);
      }
    };
    input.click();
  }, []);

  // Remove reference
  const removeReference = useCallback((index: number) => {
    setReferences(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Generate video
  const generateVideo = useCallback(async () => {
    if (!scene.name || !scene.description) {
      setError('Veuillez fournir un nom et une description pour la scène');
      return;
    }

    setIsGenerating(true);
    setProgress(0);
    setProgressMessage('Initialisation...');
    setError(null);
    setResult(null);
    setStatus('processing');

    try {
      // Simulate progress
      const progressSteps = [
        { progress: 10, message: 'Préparation de la requête...' },
        { progress: 25, message: 'Envoi à l\'API Seedance...' },
        { progress: 50, message: 'Génération en cours...' },
        { progress: 75, message: 'Traitement des résultats...' },
        { progress: 90, message: 'Finalisation...' }
      ];

      for (const step of progressSteps) {
        await new Promise(resolve => setTimeout(resolve, 500));
        setProgress(step.progress);
        setProgressMessage(step.message);
      }

      const response = await fetch('/api/seedance/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          scene,
          references,
          config_overrides: config
        })
      });

      const data: SeedanceGenerationResult = await response.json();

      setProgress(100);
      setProgressMessage('Terminé !');

      if (data.status === 'success') {
        setResult(data);
        setStatus('ready');
      } else {
        setError(data.error || 'Erreur lors de la génération');
        setStatus('error');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(errorMessage);
      setStatus('error');
    } finally {
      setIsGenerating(false);
    }
  }, [scene, references, config]);

  // Reset form
  const resetForm = useCallback(() => {
    setScene(DEFAULT_SCENE);
    setReferences([]);
    setConfig(DEFAULT_CONFIG);
    setResult(null);
    setError(null);
    setProgress(0);
    setProgressMessage('');
    setStatus('ready');
  }, []);

  return (
    <div className={`seedance-panel ${className}`.trim()}>
      {/* Header */}
      <div className="seedance-panel-header">
        <div className="logo">🎬</div>
        <div>
          <h2 className="seedance-panel-title">Seedance 2.0</h2>
          <p className="seedance-panel-subtitle">Génération de vidéos IA</p>
        </div>
        <div className="seedance-header-status">
          <span className={`seedance-status seedance-status-${status}`}>
            <span className="seedance-status-dot"></span>
            {status === 'ready' && 'Prêt'}
            {status === 'processing' && 'En cours'}
            {status === 'error' && 'Erreur'}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="seedance-panel-content">
        {/* Scene Section */}
        <div className="seedance-section">
          <h3 className="seedance-section-title">Scène</h3>
          
          <div className="seedance-form-group">
            <label className="seedance-label">Nom de la scène</label>
            <input
              type="text"
              className="seedance-input"
              value={scene.name}
              onChange={(e) => handleSceneChange('name', e.target.value)}
              placeholder="Entrez le nom de la scène"
            />
          </div>

          <div className="seedance-form-group">
            <label className="seedance-label">Description</label>
            <textarea
              className="seedance-textarea"
              value={scene.description}
              onChange={(e) => handleSceneChange('description', e.target.value)}
              placeholder="Décrivez la scène en détail..."
            />
          </div>

          <div className="seedance-form-group">
            <label className="seedance-label">Style</label>
            <input
              type="text"
              className="seedance-input"
              value={scene.style || ''}
              onChange={(e) => handleSceneChange('style', e.target.value)}
              placeholder="cinématique, cartoon, réaliste..."
            />
          </div>

          <div className="seedance-form-group">
            <label className="seedance-label">Mouvement de caméra</label>
            <input
              type="text"
              className="seedance-input"
              value={scene.camera_movement || ''}
              onChange={(e) => handleSceneChange('camera_movement', e.target.value)}
              placeholder="panoramique, travelling, statique..."
            />
          </div>

          <div className="seedance-form-group">
            <div className="seedance-checkbox-group">
              <input
                type="checkbox"
                className="seedance-checkbox"
                id="character_consistency"
                checked={scene.character_consistency || false}
                onChange={(e) => handleSceneChange('character_consistency', e.target.checked)}
              />
              <label className="seedance-checkbox-label" htmlFor="character_consistency">
                Cohérence des personnages
              </label>
            </div>
          </div>

          <div className="seedance-form-group">
            <div className="seedance-checkbox-group">
              <input
                type="checkbox"
                className="seedance-checkbox"
                id="multishot"
                checked={scene.multishot || false}
                onChange={(e) => handleSceneChange('multishot', e.target.checked)}
              />
              <label className="seedance-checkbox-label" htmlFor="multishot">
                Multi-plan (séquence)
              </label>
            </div>
          </div>
        </div>

        {/* Configuration Section */}
        <div className="seedance-section">
          <h3 className="seedance-section-title">Configuration</h3>

          {/* Presets */}
          <div className="seedance-form-group">
            <label className="seedance-label">Préréglage</label>
            <div className="seedance-preset-buttons">
              {presets.map(preset => (
                <button
                  key={preset.id}
                  className={`seedance-button seedance-button-secondary seedance-preset-button ${config.quality_preset === preset.id ? 'seedance-preset-button-active' : 'seedance-preset-button-inactive'}`}
                  onClick={() => applyPreset(preset)}
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          <div className="seedance-form-group">
            <label className="seedance-label" htmlFor="seedance-engine">Moteur</label>
            <select
              id="seedance-engine"
              className="seedance-select"
              value={config.engine}
              onChange={(e) => handleConfigChange('engine', e.target.value)}
            >
              {engines.map(engine => (
                <option key={engine.id} value={engine.id}>
                  {engine.name}
                </option>
              ))}
            </select>
          </div>

          <div className="seedance-form-group">
            <label className="seedance-label" htmlFor="seedance-fps">FPS</label>
            <select
              id="seedance-fps"
              className="seedance-select"
              value={config.fps}
              onChange={(e) => handleConfigChange('fps', parseInt(e.target.value))}
            >
              <option value={24}>24 FPS</option>
              <option value={30}>30 FPS</option>
              <option value={60}>60 FPS</option>
            </select>
          </div>

          <div className="seedance-form-group">
            <label className="seedance-label" htmlFor="seedance-resolution">Résolution</label>
            <select
              id="seedance-resolution"
              className="seedance-select"
              value={config.resolution}
              onChange={(e) => handleConfigChange('resolution', e.target.value)}
            >
              <option value="720p">720p</option>
              <option value="1080p">1080p</option>
              <option value="2k">2K</option>
              <option value="4k">4K</option>
            </select>
          </div>

          <div className="seedance-form-group">
            <label className="seedance-label" htmlFor="seedance-creativity">Créativité</label>
            <div className="seedance-slider-group">
              <input
                id="seedance-creativity"
                type="range"
                className="seedance-slider"
                min="0"
                max="1"
                step="0.1"
                value={config.creativity_scale}
                onChange={(e) => handleConfigChange('creativity_scale', parseFloat(e.target.value))}
              />
              <span className="seedance-slider-value">{config.creativity_scale.toFixed(1)}</span>
            </div>
          </div>

          <div className="seedance-form-group">
            <label className="seedance-label" htmlFor="seedance-physics">Fidélité physique</label>
            <select
              id="seedance-physics"
              className="seedance-select"
              value={config.physics_fidelity}
              onChange={(e) => handleConfigChange('physics_fidelity', e.target.value)}
            >
              <option value="low">Basse</option>
              <option value="medium">Moyenne</option>
              <option value="high">Haute</option>
              <option value="ultra">Ultime</option>
            </select>
          </div>

          <div className="seedance-form-group">
            <div className="seedance-checkbox-group">
              <input
                type="checkbox"
                className="seedance-checkbox"
                id="enable_audio"
                checked={config.enable_audio}
                onChange={(e) => handleConfigChange('enable_audio', e.target.checked)}
              />
              <label className="seedance-checkbox-label" htmlFor="enable_audio">
                Activer l'audio
              </label>
            </div>
          </div>

          <div className="seedance-form-group">
            <div className="seedance-checkbox-group">
              <input
                type="checkbox"
                className="seedance-checkbox"
                id="enable_3d_export"
                checked={config.enable_3d_export}
                onChange={(e) => handleConfigChange('enable_3d_export', e.target.checked)}
              />
              <label className="seedance-checkbox-label" htmlFor="enable_3d_export">
                Activer l'export 3D
              </label>
            </div>
          </div>
        </div>

        {/* References Section */}
        <div className="seedance-section">
          <h3 className="seedance-section-title">Références</h3>
          <div className="seedance-references">
            {references.map((ref, index) => (
              <div key={index} className="seedance-reference-item">
                {ref.type === 'image' ? (
                  <img src={ref.url} alt={ref.name} />
                ) : (
                  <div className="seedance-reference-audio">🎵</div>
                )}
                <button
                  className="seedance-reference-remove"
                  onClick={() => removeReference(index)}
                >
                  ×
                </button>
              </div>
            ))}
            <button className="seedance-add-reference" onClick={addReference}>
              +
            </button>
          </div>
          <p className="seedance-reference-hint">
            Ajoutez des images ou de l'audio de référence
          </p>
        </div>

        {/* Generate Button */}
        <div className="seedance-section seedance-generate-section">
          <button
            className="seedance-button seedance-button-primary seedance-generate-button"
            onClick={generateVideo}
            disabled={isGenerating || !scene.name || !scene.description}
          >
            {isGenerating ? '⏳ Génération en cours...' : '🎬 Générer une vidéo'}
          </button>
          
          {isGenerating && (
            <div className="seedance-progress">
              <div className="seedance-progress-bar">
                <div 
                  className="seedance-progress-fill" 
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="seedance-progress-text">{progressMessage}</p>
            </div>
          )}

          <button
            className="seedance-button seedance-button-secondary seedance-reset-button"
            onClick={resetForm}
            disabled={isGenerating}
          >
            Réinitialiser
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="seedance-error">
            <div className="seedance-error-title">Erreur</div>
            <p>{error}</p>
          </div>
        )}

        {/* Result Preview */}
        {result && result.status === 'success' && (
          <>
            <div className="seedance-preview">
              <h3 className="seedance-section-title">Aperçu</h3>
              <div className="seedance-preview-video">
                {result.video ? (
                  <video src={result.video} controls />
                ) : (
                  <span>Vidéo générée: {result.metadata?.generation_id}</span>
                )}
              </div>
            </div>

            {/* Output Files */}
            <div className="seedance-outputs">
              {result.video && (
                <div className="seedance-output-item">
                  <div className="seedance-output-icon">🎬</div>
                  <div className="seedance-output-label">Vidéo</div>
                  <div className="seedance-output-value">{result.video}</div>
                </div>
              )}
              {result.audio && (
                <div className="seedance-output-item">
                  <div className="seedance-output-icon">🎵</div>
                  <div className="seedance-output-label">Audio</div>
                  <div className="seedance-output-value">{result.audio}</div>
                </div>
              )}
              {result['3d'] && (
                <div className="seedance-output-item">
                  <div className="seedance-output-icon">🎮</div>
                  <div className="seedance-output-label">3D</div>
                  <div className="seedance-output-value">{result['3d']}</div>
                </div>
              )}
            </div>

            {/* Metadata */}
            {result.metadata && (
              <div className="seedance-metadata">
                <h3 className="seedance-section-title">Métadonnées</h3>
                <div className="seedance-metadata-grid">
                  <div className="seedance-metadata-item">
                    <div className="seedance-metadata-label">ID Génération</div>
                    <div className="seedance-metadata-value">{result.metadata.generation_id.slice(0, 12)}...</div>
                  </div>
                  <div className="seedance-metadata-item">
                    <div className="seedance-metadata-label">Temps de traitement</div>
                    <div className="seedance-metadata-value">{result.metadata.processing_time.toFixed(1)}s</div>
                  </div>
                  <div className="seedance-metadata-item">
                    <div className="seedance-metadata-label">Moteur</div>
                    <div className="seedance-metadata-value">{result.metadata.engine}</div>
                  </div>
                  <div className="seedance-metadata-item">
                    <div className="seedance-metadata-label">Résolution</div>
                    <div className="seedance-metadata-value">{result.metadata.resolution}</div>
                  </div>
                  <div className="seedance-metadata-item">
                    <div className="seedance-metadata-label">FPS</div>
                    <div className="seedance-metadata-value">{result.metadata.fps}</div>
                  </div>
                  <div className="seedance-metadata-item">
                    <div className="seedance-metadata-label">Crédits utilisés</div>
                    <div className="seedance-metadata-value">{result.metadata.credits_used}</div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SeedancePanel;

