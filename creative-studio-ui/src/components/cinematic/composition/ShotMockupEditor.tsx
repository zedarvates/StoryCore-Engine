import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Package, Users, Trash2, Move, Plus } from 'lucide-react';
import './ShotMockupEditor.css';

export interface MockupElement {
  id: string;
  type: 'character' | 'object' | 'figurant';
  name: string;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  scale: number;
  zIndex: number;
}

interface ShotMockupEditorProps {
  elements: MockupElement[];
  setElements: React.Dispatch<React.SetStateAction<MockupElement[]>>;
  availableCharacters: Array<{ id: string; name: string; avatar?: string }>;
}

export const ShotMockupEditor: React.FC<ShotMockupEditorProps> = ({
  elements,
  setElements,
  availableCharacters
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const updateElement = (id: string, updates: Partial<MockupElement>) => {
    setElements(prev => prev.map(el => el.id === id ? { ...el, ...updates } : el));
  };

  const removeElement = (id: string) => {
    setElements(prev => prev.filter(el => el.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const addElement = (type: MockupElement['type'], name: string) => {
    const newElement: MockupElement = {
      id: crypto.randomUUID(),
      type,
      name,
      x: 50,
      y: 50,
      scale: 1,
      zIndex: elements.length + 1
    };
    setElements([...elements, newElement]);
    setSelectedId(newElement.id);
  };

  return (
    <div className="shot-mockup-editor">
      <div className="mockup-canvas">
        <div className="canvas-container relative w-full h-full bg-[#050505] overflow-hidden rounded-lg border border-white/5">
             <div className="canvas-grid-bg" />
             
             {elements.sort((a, b) => a.zIndex - b.zIndex).map((el) => (
                <motion.div
                  key={el.id}
                  drag
                  dragMomentum={false}
                  onDrag={(_, _info) => {
                      // Logic would go here to update x/y percentage, for now simplified drag
                  }}
                  className={`mockup-element ${el.type} ${selectedId === el.id ? 'selected' : ''}`}
                  style={{
                    left: `${el.x}%`,
                    top: `${el.y}%`,
                    transform: `translate(-50%, -50%) scale(${el.scale})`,
                    zIndex: el.zIndex
                  }}
                  onClick={(e) => { e.stopPropagation(); setSelectedId(el.id); }}
                >
                    <div className="element-icon">
                        {el.type === 'character' && <User className="w-8 h-8" />}
                        {el.type === 'object' && <Package className="w-6 h-6" />}
                        {el.type === 'figurant' && <Users className="w-8 h-8 opacity-40" />}
                    </div>
                    <span className="element-label">{el.name}</span>
                    
                    {selectedId === el.id && (
                        <div className="element-controls">
                            <button title="Supprimer l'élément" onClick={() => removeElement(el.id)}><Trash2 className="w-3 h-3" /></button>
                        </div>
                    )}
                </motion.div>
             ))}
             
             {elements.length === 0 && (
                <div className="empty-canvas-hint flex flex-col items-center justify-center h-full opacity-20">
                    <Move className="w-12 h-12 mb-4" />
                    <p>Faites glisser des éléments pour composer votre plan</p>
                </div>
             )}
        </div>
      </div>

      <div className="mockup-sidebar">
        <div className="sidebar-section">
            <h4 className="flex items-center gap-2 mb-4"><Users className="w-4 h-4 text-indigo-400" /> Casting</h4>
            <div className="element-grid">
                {availableCharacters.map(char => (
                    <button 
                      title="Add character"
                      key={char.id} 
                      className="library-item" 
                      onClick={() => addElement('character', char.name)}
                    >
                        <User className="w-4 h-4" /> {char.name}
                    </button>
                ))}
                <button title="Add background actor" className="library-item ghost" onClick={() => addElement('figurant', 'Figurant')}>
                    <Plus className="w-3 h-3" /> Figurant
                </button>
            </div>
        </div>
        
        <div className="sidebar-section mt-6">
            <h4 className="flex items-center gap-2 mb-4"><Package className="w-4 h-4 text-blue-400" /> Objects & Props</h4>
            <div className="element-grid">
                <button title="Add prop" className="library-item" onClick={() => addElement('object', 'Prop Neutre')}>
                    <Plus className="w-3 h-3" /> Nouveau Prop
                </button>
            </div>
        </div>

        {selectedId && (
            <div className="element-inspector mt-auto p-4 bg-white/5 rounded-lg border border-white/10">
                <span className="text-[10px] uppercase font-bold text-indigo-400">Inspecteur d'Élément</span>
                <div className="mt-4">
                    <label className="text-[10px]">Échelle</label>
                    <input 
                      title="Échelle de l'élément"
                      type="range" 
                      min="0.2" max="3" step="0.1" 
                      value={elements.find(e => e.id === selectedId)?.scale} 
                      onChange={(e) => updateElement(selectedId, { scale: parseFloat(e.target.value) })}
                    />
                </div>
            </div>
        )}
      </div>
    </div>
  );
};
