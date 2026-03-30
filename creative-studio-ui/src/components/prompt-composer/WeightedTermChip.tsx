/**
 * WeightedTermChip
 * 
 * Version 2.0 - "Unity Pro" Edition
 * Supporte : HSL Complet (Teinte, Saturation, Luminosité) + Mode Plage (Min/Max).
 */

import React, { useState, useRef, useEffect } from 'react';
import { getWeightClass } from '@/types/promptWeighting';
import type { WeightedTerm } from '@/types/promptWeighting';
import { Palette } from 'lucide-react';
import './prompt-composer.css';

// ---------------------------------------------------------------------------
// Détection des termes couleur
// ---------------------------------------------------------------------------

const COLOR_KEYWORDS: Record<string, number> = {
  rouge: 0, orange: 30, jaune: 55, vert: 120, cyan: 180, bleu: 220, violet: 270, rose: 350,
  red: 0, yellow: 55, green: 120, blue: 220, purple: 270, pink: 350, dark: 0, bright: 0
};

function detectDefaultColor(word: string): NonNullable<WeightedTerm['colorData']> {
  const lower = word.toLowerCase();
  let h = 220; // Default blue
  for (const [key, hue] of Object.entries(COLOR_KEYWORDS)) {
    if (lower.includes(key)) { h = hue; break; }
  }
  return { h, s: 85, l: 55, isRange: false };
}

// ---------------------------------------------------------------------------
// ColorStudio Pro (Unity-style HSL + Range Picker)
// ---------------------------------------------------------------------------

interface ColorStudioProps {
  data: NonNullable<WeightedTerm['colorData']>;
  onChange: (data: NonNullable<WeightedTerm['colorData']>) => void;
  onClose: () => void;
}

const ColorStudio: React.FC<ColorStudioProps> = ({ data, onChange, onClose }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const update = (updates: Partial<NonNullable<WeightedTerm['colorData']>>) => {
    onChange({ ...data, ...updates });
  };

  const c1 = `hsl(${data.h}, ${data.s}%, ${data.l}%)`;
  const c2 = data.isRange ? `hsl(${data.h2 ?? data.h}, ${data.s2 ?? data.s}%, ${data.l2 ?? data.l}%)` : c1;

  return (
    <div ref={containerRef} className="color-studio-popup animate-in zoom-in-95 duration-150">
      <div className="studio-header">
        <span className="studio-title"><Palette className="w-3 h-3"/> Color Studio</span>
        <button className="range-toggle" onClick={() => update({ isRange: !data.isRange, h2: data.h, s2: data.s, l2: data.l })}>
          {data.isRange ? "Fixe" : "Gamme (Unity)"}
        </button>
      </div>

      {/* stylelint-disable-next-line */}
      <div className="studio-preview-strip" style={{ '--preview-bg': data.isRange ? `linear-gradient(90deg, ${c1}, ${c2})` : c1 } as React.CSSProperties} />

      {/* Point 1 (ou unique) */}
      <div className="studio-controls">
        <div className="control-group">
          <label>Teinte {data.isRange && "A"}</label>
          <input type="range" min="0" max="360" value={data.h} onChange={e => update({ h: Number(e.target.value) })} className="hue-slider" title="Teinte A" aria-label="Ajuster la teinte A" />
        </div>
        <div className="control-group">
          <label>Saturation</label>
          {/* stylelint-disable-next-line */}
          <input type="range" min="0" max="100" value={data.s} onChange={e => update({ s: Number(e.target.value) })} className="sat-slider" style={{'--hue': data.h} as React.CSSProperties} title="Saturation A" aria-label="Ajuster la saturation A" />
        </div>
        <div className="control-group">
          <label>Luminosité</label>
          {/* stylelint-disable-next-line */}
          <input type="range" min="0" max="100" value={data.l} onChange={e => update({ l: Number(e.target.value) })} className="lum-slider" style={{'--hue': data.h} as React.CSSProperties} title="Luminosité A" aria-label="Ajuster la luminosité A" />
        </div>
      </div>

      {/* Point 2 (si range) */}
      {data.isRange && (
        <div className="studio-controls border-t border-white/10 mt-2 pt-2">
          <div className="control-group">
            <label>Teinte B</label>
            <input type="range" min="0" max="360" value={data.h2 ?? 0} onChange={e => update({ h2: Number(e.target.value) })} className="hue-slider" title="Teinte B" aria-label="Ajuster la teinte B" />
          </div>
          <div className="control-group">
            <label>Saturation B</label>
            <input type="range" min="0" max="100" value={data.s2 ?? 80} onChange={e => update({ s2: Number(e.target.value) })} className="sat-slider" style={{'--hue': data.h2} as React.CSSProperties} title="Saturation B" aria-label="Ajuster la saturation B" />
          </div>
        </div>
      )}

      <div className="studio-presets">
        <button onClick={() => update({ s: 100, l: 50, isRange: false })} className="preset-btn">Néon</button>
        <button onClick={() => update({ s: 30, l: 85, isRange: false })} className="preset-btn">Pastel</button>
        <button onClick={() => update({ s: 90, l: 30, isRange: false })} className="preset-btn">Profond</button>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// WeightedTermChip
// ---------------------------------------------------------------------------

export interface WeightedTermChipProps {
  term: WeightedTerm;
  onWeightChange: (word: string, newWeight: number) => void;
  onColorChange?: (word: string, data: NonNullable<WeightedTerm['colorData']>) => void;
}

export const WeightedTermChip: React.FC<WeightedTermChipProps> = ({
  term,
  onWeightChange,
  onColorChange,
}) => {
  const chipClass = getWeightClass(term.weight);
  
  const [showStudio, setShowStudio] = useState(false);
  const colorData = term.colorData || detectDefaultColor(term.word);
  const isColorTerm = term.type === 'adjective' && (term.word.length > 2); // Simplistic check

  const chipContentRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (chipContentRef.current) {
      const c1 = `hsl(${colorData.h}, ${colorData.s}%, ${colorData.l}%)`;
      const c2 = colorData.isRange ? `hsl(${colorData.h2 ?? 0}, ${colorData.s2 ?? 0}%, ${colorData.l2 ?? 0}%)` : c1;
      chipContentRef.current.style.setProperty('--chip-color-1', c1);
      chipContentRef.current.style.setProperty('--chip-color-2', c2);
    }
  }, [colorData]);

  const typeLabel: Record<string, string> = {
    verb: 'v.', adjective: 'adj.', constraint: '⚡', noun: 'n.',
  };

  return (
    // Runtime CSS custom property -- cannot move to static CSS file
    <span className={`weighted-chip ${chipClass} ${colorData.isRange ? 'is-gradient' : ''}`} style={{'--weight-opacity': term.weight / 100} as React.CSSProperties}>
      <span className="chip-content" ref={chipContentRef}>
        <span className="chip-type-badge">{typeLabel[term.type] ?? ''}</span>

        <span className="chip-word-container" onClick={() => isColorTerm && setShowStudio(true)}>
          <span className="chip-word">{term.word}</span>
          {isColorTerm && <Palette className="w-2.5 h-2.5 ml-1 opacity-50" />}
        </span>

        <span className="chip-value">{term.weight}</span>

        <input
          type="range" min={0} max={100} value={term.weight}
          onChange={e => onWeightChange(term.word, parseInt(e.target.value, 10))}
          className="weight-slider"
          title="Poids sémantique"
          aria-label={`Ajuster le poids pour ${term.word}`}
        />

        {showStudio && (
          <ColorStudio 
            data={colorData} 
            onChange={(d) => onColorChange?.(term.word, d)}
            onClose={() => setShowStudio(false)} 
          />
        )}
      </span>
    </span>
  );
};
