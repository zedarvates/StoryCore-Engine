/**
 * ClipInspectorPanel — Panneau de propriétés pour les clips sélectionnés
 * Permet l'édition des effets, couleur, transitions, vitesse, opacité.
 * Inspiré de LTX-Desktop ClipPropertiesPanel + Premiere Pro Effect Controls.
 */
import React, { useCallback, useState, useMemo } from 'react';
import { useProjectStore } from '@/stores/useProjectStore';
import { useShallow } from 'zustand/react/shallow';
import type { Shot, TimelineTransition } from '@/types';
import {
  SlidersHorizontal, Palette, Timer, Layers, Film,
  Sun, Contrast, Droplets, Thermometer,
  Type, Image, Volume2, Scissors,
  Plus, Minus, RotateCcw, Trash2,
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

interface ClipInspectorPanelProps {
  className?: string;
}

interface NumericFieldProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
}

// ============================================================================
// Sub-components
// ============================================================================

const NumericField: React.FC<NumericFieldProps> = ({
  label, value, min = 0, max = 100, step = 1, unit = '', onChange,
}) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
    <span style={{ flex: 1, fontSize: '11px', color: '#a1a1aa', minWidth: '60px' }}>{label}</span>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      style={{ flex: 2, height: '4px', accentColor: '#818cf8' }}
    />
    <span style={{ width: '36px', textAlign: 'right', fontSize: '10px', color: '#d4d4d8', fontFamily: 'monospace' }}>
      {value}{unit}
    </span>
  </div>
);

type TabId = 'effects' | 'color' | 'transition' | 'speed';

// ============================================================================
// Main Component
// ============================================================================

export const ClipInspectorPanel: React.FC<ClipInspectorPanelProps> = ({ className = '' }) => {
  const { shots, selectedElements, updateShot, addCrossDissolve, removeTransition } = useProjectStore(useShallow(state => ({
    shots: state.shots,
    selectedElements: state.selectedElements,
    updateShot: state.updateShot,
    addCrossDissolve: state.addCrossDissolve,
    removeTransition: state.removeTransition,
  })));

  const [activeTab, setActiveTab] = useState<TabId>('effects');

  const selectedShot = useMemo(() => {
    if (selectedElements.length !== 1) return null;
    return shots.find(s => s.id === selectedElements[0]) ?? null;
  }, [selectedElements, shots]);

  // Effects state (per clip)
  const [blur, setBlur] = useState(0);
  const [sharpen, setSharpen] = useState(0);
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [saturation, setSaturation] = useState(0);
  const [temperature, setTemperature] = useState(0);
  const [opacity, setOpacity] = useState(100);
  const [volume, setVolume] = useState(80);
  const [speed, setSpeed] = useState(1);
  const [transitionDur, setTransitionDur] = useState(12);

  // Update shot helper
  const applyUpdate = useCallback((updates: Partial<Shot>) => {
    if (!selectedShot) return;
    updateShot(selectedShot.id, updates);
  }, [selectedShot, updateShot]);

  // Reset all effects
  const handleReset = useCallback(() => {
    setBlur(0); setSharpen(0); setBrightness(0); setContrast(0);
    setSaturation(0); setTemperature(0); setOpacity(100); setVolume(80); setSpeed(1);
    applyUpdate({
      visualStyle: {
        shotId: selectedShot?.id ?? '',
        styleId: '',
        styleName: 'default',
        intensity: 50,
        appliedAt: Date.now(),
        parameters: {
          brightness: 0, contrast: 0, saturation: 0, temperature: 0,
          vignette: 0, grain: 0, sharpness: 0,
        },
      },
      audioSettings: { volume: 0, pan: 0 },
    });
  }, [selectedShot, applyUpdate]);

  // Find adjacent shots for cross-dissolve
  const findAdjacentRight = useCallback((): Shot | null => {
    if (!selectedShot) return null;
    const leftEnd = selectedShot.startTime + selectedShot.duration;
    return shots.find(s => s.id !== selectedShot.id && Math.abs(s.startTime - leftEnd) <= 2) ?? null;
  }, [selectedShot, shots]);

  const findAdjacentLeft = useCallback((): Shot | null => {
    if (!selectedShot) return null;
    const rightStart = selectedShot.startTime;
    return shots.find(s => s.id !== selectedShot.id && Math.abs((s.startTime + s.duration) - rightStart) <= 2) ?? null;
  }, [selectedShot, shots]);

  const handleAddDissolve = useCallback((direction: 'left' | 'right') => {
    if (!selectedShot) return;
    if (direction === 'right') {
      const right = findAdjacentRight();
      if (right) addCrossDissolve(selectedShot.id, right.id, transitionDur);
    } else {
      const left = findAdjacentLeft();
      if (left) addCrossDissolve(left.id, selectedShot.id, transitionDur);
    }
  }, [selectedShot, findAdjacentRight, findAdjacentLeft, addCrossDissolve, transitionDur]);

  const handleRemoveTransition = useCallback((side: 'in' | 'out') => {
    if (!selectedShot) return;
    removeTransition(selectedShot.id, side);
  }, [selectedShot, removeTransition]);

  // ==========================================================================
  // Render: No selection
  // ==========================================================================

  if (!selectedShot) {
    return (
      <div className={`clip-inspector ${className}`} style={{
        padding: '16px', color: '#71717a', fontSize: '12px', textAlign: 'center',
        background: '#0a0a12', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '8px',
      }}>
        <SlidersHorizontal className="w-8 h-8 mx-auto mb-2 opacity-30" />
        <p>Sélectionnez un clip pour éditer ses propriétés</p>
      </div>
    );
  }

  // ==========================================================================
  // Render: With selection
  // ==========================================================================

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'effects', label: 'Effets', icon: <Layers className="w-3.5 h-3.5" /> },
    { id: 'color', label: 'Couleur', icon: <Palette className="w-3.5 h-3.5" /> },
    { id: 'transition', label: 'Transition', icon: <Film className="w-3.5 h-3.5" /> },
    { id: 'speed', label: 'Vitesse', icon: <Timer className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className={`clip-inspector ${className}`} style={{
      background: '#0a0a12', border: '1px solid rgba(255,255,255,0.04)',
      borderRadius: '8px', overflow: 'hidden', display: 'flex', flexDirection: 'column',
      maxHeight: '100%',
    }}>
      {/* Header */}
      <div style={{
        padding: '8px 12px', background: '#0d0d18',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        display: 'flex', alignItems: 'center', gap: '8px',
      }}>
        <Film className="w-4 h-4 text-indigo-400" />
        <span style={{ flex: 1, fontSize: '11px', fontWeight: 700, color: '#d4d4d8' }}>
          {selectedShot.name || `Shot ${selectedShot.id.slice(0, 6)}`}
        </span>
        <button onClick={handleReset} title="Reset" style={{
          background: 'transparent', border: 'none', color: '#71717a', cursor: 'pointer', padding: '2px',
        }}>
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Shot info */}
      <div style={{ padding: '6px 12px', fontSize: '10px', color: '#52525b', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
        Durée: {(selectedShot.duration / 24).toFixed(1)}s · Start: {selectedShot.startTime}f
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: '4px', padding: '6px 4px', fontSize: '10px', fontWeight: 600,
              background: activeTab === tab.id ? 'rgba(99,102,241,0.1)' : 'transparent',
              color: activeTab === tab.id ? '#a5b4fc' : '#52525b',
              border: 'none', borderBottom: activeTab === tab.id ? '2px solid #818cf8' : '2px solid transparent',
              cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '10px 12px' }}>
        {activeTab === 'effects' && (
          <div>
            <NumericField label="Opacité" value={opacity} min={0} max={100} unit="%" onChange={setOpacity} />
            <NumericField label="Volume" value={volume} min={0} max={100} unit="%" onChange={setVolume} />
            <NumericField label="Blur" value={blur} min={0} max={50} unit="px" onChange={setBlur} />
            <NumericField label="Sharpen" value={sharpen} min={0} max={100} unit="%" onChange={setSharpen} />
          </div>
        )}

        {activeTab === 'color' && (
          <div>
            <NumericField label="Luminosité" value={brightness} min={-100} max={100} onChange={setBrightness} />
            <NumericField label="Contraste" value={contrast} min={-100} max={100} onChange={setContrast} />
            <NumericField label="Saturation" value={saturation} min={-100} max={100} onChange={setSaturation} />
            <NumericField label="Température" value={temperature} min={-100} max={100} onChange={setTemperature} />
          </div>
        )}

        {activeTab === 'transition' && (
          <div>
            <div style={{ marginBottom: '12px' }}>
              <span style={{ fontSize: '11px', color: '#a1a1aa', fontWeight: 600 }}>Cross-Dissolve</span>
              <NumericField
                label="Durée"
                value={transitionDur}
                min={4}
                max={48}
                step={2}
                unit="f"
                onChange={setTransitionDur}
              />

              {/* Transitions existantes */}
              {selectedShot.transitions?.out && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', padding: '6px 8px', background: 'rgba(231,76,60,0.1)', borderRadius: '4px' }}>
                  <span style={{ flex: 1, fontSize: '10px', color: '#e74c3c' }}>
                    OUT: {selectedShot.transitions.out.type} ({selectedShot.transitions.out.duration}f)
                  </span>
                  <button onClick={() => handleRemoveTransition('out')} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              )}

              {selectedShot.transitions?.in && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', padding: '6px 8px', background: 'rgba(46,204,113,0.1)', borderRadius: '4px' }}>
                  <span style={{ flex: 1, fontSize: '10px', color: '#2ecc71' }}>
                    IN: {selectedShot.transitions.in.type} ({selectedShot.transitions.in.duration}f)
                  </span>
                  <button onClick={() => handleRemoveTransition('in')} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              )}

              {/* Boutons Add Dissolve */}
              <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                {findAdjacentLeft() && !selectedShot.transitions?.in && (
                  <button onClick={() => handleAddDissolve('left')} style={{
                    flex: 1, padding: '6px', fontSize: '10px', fontWeight: 600,
                    background: 'rgba(139,92,246,0.15)', color: '#a78bfa',
                    border: '1px solid rgba(139,92,246,0.2)', borderRadius: '4px', cursor: 'pointer',
                  }}>
                    ← Dissolve In
                  </button>
                )}
                {findAdjacentRight() && !selectedShot.transitions?.out && (
                  <button onClick={() => handleAddDissolve('right')} style={{
                    flex: 1, padding: '6px', fontSize: '10px', fontWeight: 600,
                    background: 'rgba(139,92,246,0.15)', color: '#a78bfa',
                    border: '1px solid rgba(139,92,246,0.2)', borderRadius: '4px', cursor: 'pointer',
                  }}>
                    Dissolve Out →
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'speed' && (
          <div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
              {[0.25, 0.5, 0.75, 1, 1.5, 2, 4].map(s => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  style={{
                    padding: '4px 10px', fontSize: '11px', fontWeight: 600,
                    background: speed === s ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.03)',
                    color: speed === s ? '#a5b4fc' : '#71717a',
                    border: `1px solid ${speed === s ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.05)'}`,
                    borderRadius: '4px', cursor: 'pointer',
                  }}
                >
                  {s}x
                </button>
              ))}
            </div>
            <p style={{ fontSize: '10px', color: '#52525b', marginTop: '8px' }}>
              Nouvelle durée: {(selectedShot.duration / speed).toFixed(0)}f ({(selectedShot.duration / speed / 24).toFixed(1)}s)
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClipInspectorPanel;
