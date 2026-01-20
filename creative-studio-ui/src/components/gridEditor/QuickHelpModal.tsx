/**
 * Quick Help Modal - Grid Editor Help Guide
 * 
 * Provides quick reference for Grid Editor tools and shortcuts
 */

import React from 'react';
import { X } from 'lucide-react';

interface QuickHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QuickHelpModal: React.FC<QuickHelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#2a2a2a',
          borderRadius: '8px',
          padding: '24px',
          maxWidth: '600px',
          maxHeight: '80vh',
          overflow: 'auto',
          color: '#fff',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '600' }}>Grid Editor Quick Help</h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#ccc',
              cursor: 'pointer',
              padding: '4px',
            }}
            title="Close"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Tools Section */}
          <section>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px', color: '#4a90e2' }}>
              🛠️ Tools
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <HelpItem
                shortcut="V"
                title="Select Tool"
                description="Click to select panels, drag to move, Ctrl+Click for multi-select"
              />
              <HelpItem
                shortcut="C"
                title="Crop Tool"
                description="Define crop region for selected panels, drag handles to adjust"
              />
              <HelpItem
                shortcut="R"
                title="Rotate Tool"
                description="Rotate selected panels, drag to rotate or enter angle value"
              />
              <HelpItem
                shortcut="S"
                title="Scale Tool"
                description="Resize selected panels, drag corners to scale, Shift for uniform"
              />
              <HelpItem
                shortcut="Space"
                title="Pan Tool"
                description="Navigate the canvas, drag to move viewport, scroll to zoom"
              />
              <HelpItem
                shortcut="A"
                title="Annotate Tool"
                description="Draw annotations, add text notes, mark areas of interest"
              />
            </div>
          </section>

          {/* Keyboard Shortcuts */}
          <section>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px', color: '#4a90e2' }}>
              ⌨️ Keyboard Shortcuts
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <HelpItem shortcut="Ctrl+Z" title="Undo" description="Revert last action" />
              <HelpItem shortcut="Ctrl+Shift+Z" title="Redo" description="Restore undone action" />
              <HelpItem shortcut="Ctrl+S" title="Save" description="Save grid configuration" />
              <HelpItem shortcut="Ctrl+E" title="Export" description="Export grid configuration" />
              <HelpItem shortcut="Delete" title="Delete" description="Delete selected panels" />
              <HelpItem shortcut="Ctrl+D" title="Duplicate" description="Duplicate selected panels" />
              <HelpItem shortcut="F" title="Fit to View" description="Zoom to fit entire grid" />
              <HelpItem shortcut="+/-" title="Zoom" description="Zoom in/out" />
            </div>
          </section>

          {/* Workflow Tips */}
          <section>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px', color: '#4a90e2' }}>
              💡 Workflow Tips
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px', color: '#ccc' }}>
              <div>• <strong>Master Coherence Sheet:</strong> The 3x3 grid locks the visual DNA of your project</div>
              <div>• <strong>Auto-Save:</strong> Changes are automatically saved every 30 seconds</div>
              <div>• <strong>Layers:</strong> Use the Properties Panel to manage layers for each panel</div>
              <div>• <strong>Presets:</strong> Save and load common configurations for quick setup</div>
              <div>• <strong>Export:</strong> Export configurations to share or backup your work</div>
            </div>
          </section>

          {/* Getting Started */}
          <section>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px', color: '#4a90e2' }}>
              🚀 Getting Started
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px', color: '#ccc' }}>
              <div><strong>1.</strong> Load or generate assets for your project</div>
              <div><strong>2.</strong> Assets will auto-populate the 3x3 grid</div>
              <div><strong>3.</strong> Use tools to adjust position, crop, and rotation</div>
              <div><strong>4.</strong> Add annotations to mark important areas</div>
              <div><strong>5.</strong> Save your configuration for the pipeline</div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #444', textAlign: 'center' }}>
          <button
            onClick={onClose}
            style={{
              backgroundColor: '#4a90e2',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              padding: '10px 24px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
};

// Helper component for help items
interface HelpItemProps {
  shortcut: string;
  title: string;
  description: string;
}

const HelpItem: React.FC<HelpItemProps> = ({ shortcut, title, description }) => {
  return (
    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
      <div
        style={{
          backgroundColor: '#3a3a3a',
          border: '1px solid #555',
          borderRadius: '4px',
          padding: '4px 8px',
          fontSize: '12px',
          fontFamily: 'monospace',
          fontWeight: '600',
          minWidth: '80px',
          textAlign: 'center',
          color: '#4a90e2',
        }}
      >
        {shortcut}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: '600', marginBottom: '2px', fontSize: '14px' }}>{title}</div>
        <div style={{ fontSize: '13px', color: '#aaa' }}>{description}</div>
      </div>
    </div>
  );
};

export default QuickHelpModal;
