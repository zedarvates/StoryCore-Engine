import { useStore } from '../store';
import type { TextLayer } from '../types';

// ============================================================================
// Text Template Definitions
// ============================================================================

export interface TextTemplate {
  id: string;
  name: string;
  description: string;
  preview: string;
  style: Partial<TextLayer>;
}

export const TEXT_TEMPLATES: TextTemplate[] = [
  {
    id: 'title-bold',
    name: 'Bold Title',
    description: 'Large, bold title for opening scenes',
    preview: 'BOLD TITLE',
    style: {
      font: 'Arial',
      fontSize: 72,
      color: '#ffffff',
      backgroundColor: 'transparent',
      alignment: 'center',
      position: { x: 50, y: 20 },
      style: {
        bold: true,
        italic: false,
        underline: false,
      },
      animation: {
        type: 'fade-in',
        duration: 1.0,
        delay: 0,
        easing: 'ease-out',
      },
    },
  },
  {
    id: 'subtitle-elegant',
    name: 'Elegant Subtitle',
    description: 'Refined subtitle with shadow',
    preview: 'Elegant Subtitle',
    style: {
      font: 'Georgia',
      fontSize: 48,
      color: '#f0f0f0',
      backgroundColor: 'transparent',
      alignment: 'center',
      position: { x: 50, y: 80 },
      style: {
        bold: false,
        italic: true,
        underline: false,
        shadow: { x: 2, y: 2, blur: 4, color: 'rgba(0,0,0,0.5)' },
      },
      animation: {
        type: 'slide-in',
        duration: 0.8,
        delay: 0.2,
        easing: 'ease-out',
      },
    },
  },
  {
    id: 'caption-modern',
    name: 'Modern Caption',
    description: 'Clean caption with background',
    preview: 'Modern Caption',
    style: {
      font: 'Helvetica',
      fontSize: 32,
      color: '#ffffff',
      backgroundColor: 'rgba(0,0,0,0.7)',
      alignment: 'left',
      position: { x: 10, y: 85 },
      style: {
        bold: false,
        italic: false,
        underline: false,
      },
      animation: {
        type: 'fade-in',
        duration: 0.5,
        delay: 0,
        easing: 'ease-in',
      },
    },
  },
  {
    id: 'title-cinematic',
    name: 'Cinematic Title',
    description: 'Dramatic title with stroke',
    preview: 'CINEMATIC',
    style: {
      font: 'Impact',
      fontSize: 96,
      color: '#ffffff',
      backgroundColor: 'transparent',
      alignment: 'center',
      position: { x: 50, y: 50 },
      style: {
        bold: true,
        italic: false,
        underline: false,
        stroke: { color: '#000000', width: 3 },
        shadow: { x: 4, y: 4, blur: 8, color: 'rgba(0,0,0,0.8)' },
      },
      animation: {
        type: 'fade-in',
        duration: 1.5,
        delay: 0,
        easing: 'ease-out',
      },
    },
  },
  {
    id: 'lower-third',
    name: 'Lower Third',
    description: 'Professional lower third banner',
    preview: 'Name • Title',
    style: {
      font: 'Arial',
      fontSize: 36,
      color: '#ffffff',
      backgroundColor: 'rgba(0,120,215,0.9)',
      alignment: 'left',
      position: { x: 5, y: 75 },
      style: {
        bold: true,
        italic: false,
        underline: false,
      },
      animation: {
        type: 'slide-in',
        duration: 0.6,
        delay: 0,
        easing: 'ease-out',
      },
    },
  },
  {
    id: 'typewriter-mono',
    name: 'Typewriter',
    description: 'Monospace typewriter effect',
    preview: 'Typewriter...',
    style: {
      font: 'Courier New',
      fontSize: 40,
      color: '#00ff00',
      backgroundColor: 'rgba(0,0,0,0.8)',
      alignment: 'left',
      position: { x: 10, y: 10 },
      style: {
        bold: false,
        italic: false,
        underline: false,
      },
      animation: {
        type: 'typewriter',
        duration: 2.0,
        delay: 0,
        easing: 'linear',
      },
    },
  },
  {
    id: 'title-minimal',
    name: 'Minimal Title',
    description: 'Simple, clean title',
    preview: 'Minimal',
    style: {
      font: 'Helvetica',
      fontSize: 64,
      color: '#333333',
      backgroundColor: 'transparent',
      alignment: 'center',
      position: { x: 50, y: 40 },
      style: {
        bold: false,
        italic: false,
        underline: false,
      },
      animation: {
        type: 'fade-in',
        duration: 0.8,
        delay: 0,
        easing: 'ease-in-out',
      },
    },
  },
  {
    id: 'title-bounce',
    name: 'Bouncy Title',
    description: 'Playful bouncing title',
    preview: 'BOUNCE!',
    style: {
      font: 'Comic Sans MS',
      fontSize: 80,
      color: '#ff6b6b',
      backgroundColor: 'transparent',
      alignment: 'center',
      position: { x: 50, y: 30 },
      style: {
        bold: true,
        italic: false,
        underline: false,
        shadow: { x: 3, y: 3, blur: 6, color: 'rgba(0,0,0,0.3)' },
      },
      animation: {
        type: 'bounce',
        duration: 1.2,
        delay: 0,
        easing: 'ease-out',
      },
    },
  },
];

// ============================================================================
// TextTemplates Component
// ============================================================================

interface TextTemplatesProps {
  shotId: string;
  onTemplateApply?: (template: TextTemplate) => void;
}

export function TextTemplates({
  shotId,
  onTemplateApply,
}: TextTemplatesProps) {
  const addTextLayer = useStore((state) => state.addTextLayer);

  const handleApplyTemplate = (template: TextTemplate) => {
    // Create a new text layer from the template
    const newLayer: TextLayer = {
      id: `text-${Date.now()}`,
      content: template.preview,
      font: template.style.font || 'Arial',
      fontSize: template.style.fontSize || 48,
      color: template.style.color || '#ffffff',
      backgroundColor: template.style.backgroundColor,
      position: template.style.position || { x: 50, y: 50 },
      alignment: template.style.alignment || 'center',
      startTime: template.style.startTime || 0,
      duration: template.style.duration || 3,
      animation: template.style.animation,
      style: template.style.style || {
        bold: false,
        italic: false,
        underline: false,
      },
    };

    addTextLayer(shotId, newLayer);
    
    if (onTemplateApply) {
      onTemplateApply(template);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Text Templates</h3>
        <span className="text-xs text-gray-500">
          {TEXT_TEMPLATES.length} templates
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {TEXT_TEMPLATES.map((template) => (
          <button
            key={template.id}
            onClick={() => handleApplyTemplate(template)}
            className="group relative overflow-hidden rounded-lg border border-gray-200 bg-white p-3 text-left transition-all hover:border-blue-500 hover:shadow-md"
          >
            {/* Preview */}
            <div
              className="mb-2 flex h-20 items-center justify-center rounded bg-gray-900 text-center"
              style={{
                fontFamily: template.style.font,
                fontSize: '14px',
                color: template.style.color,
                fontWeight: template.style.style?.bold ? 'bold' : 'normal',
                fontStyle: template.style.style?.italic ? 'italic' : 'normal',
                textDecoration: template.style.style?.underline
                  ? 'underline'
                  : 'none',
              }}
            >
              {template.preview}
            </div>

            {/* Template Info */}
            <div className="space-y-1">
              <h4 className="text-sm font-medium text-gray-900">
                {template.name}
              </h4>
              <p className="text-xs text-gray-500">{template.description}</p>
            </div>

            {/* Animation Badge */}
            {template.style.animation && (
              <div className="mt-2">
                <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                  {template.style.animation.type}
                </span>
              </div>
            )}

            {/* Hover Overlay */}
            <div className="absolute inset-0 flex items-center justify-center bg-blue-500 bg-opacity-0 transition-all group-hover:bg-opacity-10">
              <span className="text-sm font-medium text-blue-600 opacity-0 transition-opacity group-hover:opacity-100">
                Apply Template
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
