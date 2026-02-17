/**
 * Composition Template Types & Service
 *
 * Defines "Composition Templates" — reusable groups of layers with relative
 * timing and positioning that can be dropped onto the timeline in one click
 * (similar to CapCut templates, Canva animated elements, or After Effects
 * Precomps).
 *
 * A CompositionTemplate contains:
 *  - A list of layers (text, media, effects) with relative times.
 *  - Preview thumbnail and animation metadata.
 *  - Category/tags for filtering (Intro, Outro, Lower Third, Title Card, etc.).
 *
 * Requirements: Phase 3 of R&D plan
 */

import type { Layer, LayerData, TextLayerData, MediaLayerData, RichTextStyle, Transform } from '../../sequence-editor/types';

// =============================================================================
// Types
// =============================================================================

export type CompositionCategory =
    | 'intro'
    | 'outro'
    | 'lower-third'
    | 'title-card'
    | 'call-to-action'
    | 'transition'
    | 'social-media'
    | 'subtitle-style'
    | 'overlay'
    | 'custom';

export interface CompositionLayerDefinition {
    /** Relative start time in frames (relative to template drop point) */
    relativeStartTime: number;
    /** Duration in frames */
    duration: number;
    /** Layer type */
    type: Layer['type'];
    /** Layer data (text content, media source, etc.) */
    data: LayerData;
    /** Opacity 0-1 */
    opacity: number;
    /** Blend mode */
    blendMode: string;
    /** Whether this layer's content is editable by the user after insertion */
    isEditable: boolean;
    /** Human-readable label (e.g. "Title Text", "Background Shape") */
    label: string;
}

export interface CompositionTemplate {
    id: string;
    name: string;
    description: string;
    category: CompositionCategory;
    tags: string[];
    /** Thumbnail preview image URL */
    thumbnailUrl: string;
    /** Animated preview URL (optional, e.g. a short GIF/WebP) */
    animatedPreviewUrl?: string;
    /** Duration of the entire composition in frames */
    totalDuration: number;
    /** Target resolution the template was designed for */
    designResolution: { width: number; height: number };
    /** Ordered list of layers (bottom to top) */
    layers: CompositionLayerDefinition[];
    /** Whether this is a built-in template or user-created */
    isBuiltIn: boolean;
    /** ISO date string */
    createdAt: string;
    /** Aspect ratios this template supports */
    supportedAspectRatios: ('16:9' | '9:16' | '1:1' | '4:5')[];
}

// =============================================================================
// Built-in Templates
// =============================================================================

export const BUILTIN_COMPOSITION_TEMPLATES: CompositionTemplate[] = [
    // ---- Lower Third ----
    {
        id: 'lower-third-simple',
        name: 'Simple Lower Third',
        description: 'Clean lower-third name bar with subtitle.',
        category: 'lower-third',
        tags: ['name', 'subtitle', 'professional'],
        thumbnailUrl: '/templates/lower-third-simple.png',
        totalDuration: 150, // 5 seconds at 30fps
        designResolution: { width: 1920, height: 1080 },
        isBuiltIn: true,
        createdAt: new Date().toISOString(),
        supportedAspectRatios: ['16:9', '9:16'],
        layers: [
            {
                relativeStartTime: 0,
                duration: 150,
                type: 'media',
                data: {
                    sourceUrl: '', // Will be a generated solid-color rect
                    trim: { start: 0, end: 150 },
                    transform: {
                        position: { x: 50, y: 860 },
                        scale: { x: 0.45, y: 0.06 },
                        rotation: 0,
                        anchor: { x: 0, y: 0 },
                    },
                } as MediaLayerData,
                opacity: 0.85,
                blendMode: 'normal',
                isEditable: false,
                label: 'Background Bar',
            },
            {
                relativeStartTime: 5,
                duration: 140,
                type: 'text',
                data: {
                    content: 'Speaker Name',
                    style: {
                        fontFamily: 'Inter',
                        fontWeight: 'bold',
                        fontSize: 36,
                        fillColor: '#FFFFFF',
                        textAlign: 'left',
                    } as RichTextStyle,
                    transform: {
                        position: { x: 80, y: 870 },
                        scale: { x: 1, y: 1 },
                        rotation: 0,
                        anchor: { x: 0, y: 0 },
                    } as Transform,
                } as TextLayerData,
                opacity: 1,
                blendMode: 'normal',
                isEditable: true,
                label: 'Name Text',
            },
            {
                relativeStartTime: 10,
                duration: 130,
                type: 'text',
                data: {
                    content: 'Title / Role',
                    style: {
                        fontFamily: 'Inter',
                        fontWeight: 'normal',
                        fontSize: 22,
                        fillColor: '#CCCCCC',
                        textAlign: 'left',
                    } as RichTextStyle,
                    transform: {
                        position: { x: 80, y: 915 },
                        scale: { x: 1, y: 1 },
                        rotation: 0,
                        anchor: { x: 0, y: 0 },
                    } as Transform,
                } as TextLayerData,
                opacity: 1,
                blendMode: 'normal',
                isEditable: true,
                label: 'Title Text',
            },
        ],
    },

    // ---- Title Card ----
    {
        id: 'title-card-cinematic',
        name: 'Cinematic Title Card',
        description: 'Full-screen cinematic title with fade-in effect.',
        category: 'title-card',
        tags: ['cinematic', 'movie', 'opening'],
        thumbnailUrl: '/templates/title-cinematic.png',
        totalDuration: 180, // 6 seconds at 30fps
        designResolution: { width: 1920, height: 1080 },
        isBuiltIn: true,
        createdAt: new Date().toISOString(),
        supportedAspectRatios: ['16:9'],
        layers: [
            {
                relativeStartTime: 0,
                duration: 180,
                type: 'text',
                data: {
                    content: 'YOUR TITLE',
                    style: {
                        fontFamily: 'Inter',
                        fontWeight: '900',
                        fontSize: 96,
                        fillColor: '#FFFFFF',
                        strokeColor: '#000000',
                        strokeWidth: 2,
                        shadowColor: '#00000088',
                        shadowBlur: 20,
                        shadowOffsetX: 0,
                        shadowOffsetY: 4,
                        textAlign: 'center',
                    } as RichTextStyle,
                    transform: {
                        position: { x: 960, y: 500 },
                        scale: { x: 1, y: 1 },
                        rotation: 0,
                        anchor: { x: 0.5, y: 0.5 },
                    } as Transform,
                    animation: {
                        type: 'fade-in',
                        duration: 45,
                        parameters: {},
                    },
                } as TextLayerData,
                opacity: 1,
                blendMode: 'normal',
                isEditable: true,
                label: 'Main Title',
            },
            {
                relativeStartTime: 30,
                duration: 120,
                type: 'text',
                data: {
                    content: 'SUBTITLE OR TAGLINE',
                    style: {
                        fontFamily: 'Inter',
                        fontWeight: '300',
                        fontSize: 28,
                        fillColor: '#AAAAAA',
                        textAlign: 'center',
                    } as RichTextStyle,
                    transform: {
                        position: { x: 960, y: 590 },
                        scale: { x: 1, y: 1 },
                        rotation: 0,
                        anchor: { x: 0.5, y: 0.5 },
                    } as Transform,
                    animation: {
                        type: 'fade-in',
                        duration: 30,
                        parameters: {},
                    },
                } as TextLayerData,
                opacity: 0.8,
                blendMode: 'normal',
                isEditable: true,
                label: 'Subtitle',
            },
        ],
    },

    // ---- Social Media CTA ----
    {
        id: 'cta-subscribe',
        name: 'Subscribe Call to Action',
        description: 'Animated "Like & Subscribe" overlay.',
        category: 'call-to-action',
        tags: ['youtube', 'subscribe', 'like', 'social'],
        thumbnailUrl: '/templates/cta-subscribe.png',
        totalDuration: 120,
        designResolution: { width: 1920, height: 1080 },
        isBuiltIn: true,
        createdAt: new Date().toISOString(),
        supportedAspectRatios: ['16:9', '9:16'],
        layers: [
            {
                relativeStartTime: 0,
                duration: 120,
                type: 'text',
                data: {
                    content: '👍 Like & Subscribe!',
                    style: {
                        fontFamily: 'Inter',
                        fontWeight: 'bold',
                        fontSize: 42,
                        fillColor: '#FF0000',
                        strokeColor: '#FFFFFF',
                        strokeWidth: 3,
                        backgroundColor: '#00000099',
                        padding: 16,
                        textAlign: 'center',
                    } as RichTextStyle,
                    transform: {
                        position: { x: 960, y: 950 },
                        scale: { x: 1, y: 1 },
                        rotation: 0,
                        anchor: { x: 0.5, y: 0.5 },
                    } as Transform,
                    animation: {
                        type: 'bounce',
                        duration: 20,
                        parameters: {},
                    },
                } as TextLayerData,
                opacity: 1,
                blendMode: 'normal',
                isEditable: true,
                label: 'CTA Text',
            },
        ],
    },
];

// =============================================================================
// Composition Template Service
// =============================================================================

export class CompositionTemplateService {
    private customTemplates: Map<string, CompositionTemplate> = new Map();

    constructor() {
        this.loadCustomTemplates();
    }

    // ------ CRUD ------

    getAllTemplates(): CompositionTemplate[] {
        return [
            ...BUILTIN_COMPOSITION_TEMPLATES,
            ...Array.from(this.customTemplates.values()),
        ];
    }

    getTemplatesByCategory(category: CompositionCategory): CompositionTemplate[] {
        return this.getAllTemplates().filter(t => t.category === category);
    }

    getTemplateById(id: string): CompositionTemplate | undefined {
        const builtin = BUILTIN_COMPOSITION_TEMPLATES.find(t => t.id === id);
        if (builtin) return builtin;
        return this.customTemplates.get(id);
    }

    /**
     * Create a new composition template from a selection of layers.
     */
    async createFromSelection(
        name: string,
        category: CompositionCategory,
        layers: Layer[],
        designResolution: { width: number; height: number },
    ): Promise<CompositionTemplate> {
        if (layers.length === 0) {
            throw new Error('Cannot create template from empty selection');
        }

        // Calculate relative times based on the earliest layer
        const minStart = Math.min(...layers.map(l => l.startTime));
        const maxEnd = Math.max(...layers.map(l => l.startTime + l.duration));

        const templateLayers: CompositionLayerDefinition[] = layers.map(layer => ({
            relativeStartTime: layer.startTime - minStart,
            duration: layer.duration,
            type: layer.type,
            data: { ...layer.data },
            opacity: layer.opacity,
            blendMode: layer.blendMode,
            isEditable: layer.type === 'text', // Text layers are editable by default
            label: `${layer.type} layer`,
        }));

        const template: CompositionTemplate = {
            id: `comp-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
            name,
            description: `Custom template with ${layers.length} layers`,
            category,
            tags: [category],
            thumbnailUrl: '', // TODO: Generate thumbnail
            totalDuration: maxEnd - minStart,
            designResolution,
            layers: templateLayers,
            isBuiltIn: false,
            createdAt: new Date().toISOString(),
            supportedAspectRatios: ['16:9'],
        };

        this.customTemplates.set(template.id, template);
        await this.saveCustomTemplates();

        return template;
    }

    /**
     * Apply a template at a given insertion point, returning the layers to add
     * to the shot.
     */
    instantiate(
        templateId: string,
        insertionFrame: number,
        overrides?: Record<string, string>, // label → new text content
    ): Layer[] {
        const template = this.getTemplateById(templateId);
        if (!template) throw new Error(`Template not found: ${templateId}`);

        return template.layers.map((tl, idx) => {
            let data = { ...tl.data };

            // Apply text overrides if provided
            if (tl.isEditable && tl.type === 'text' && overrides?.[tl.label]) {
                (data as any).content = overrides[tl.label];
            }

            return {
                id: `layer-${Date.now()}-${idx}`,
                type: tl.type,
                startTime: insertionFrame + tl.relativeStartTime,
                duration: tl.duration,
                locked: false,
                hidden: false,
                opacity: tl.opacity,
                blendMode: tl.blendMode,
                data,
            } as Layer;
        });
    }

    async deleteTemplate(id: string): Promise<void> {
        const t = this.getTemplateById(id);
        if (!t) throw new Error(`Template not found: ${id}`);
        if (t.isBuiltIn) throw new Error('Cannot delete built-in templates');
        this.customTemplates.delete(id);
        await this.saveCustomTemplates();
    }

    async duplicateTemplate(id: string, newName?: string): Promise<CompositionTemplate> {
        const original = this.getTemplateById(id);
        if (!original) throw new Error(`Template not found: ${id}`);

        const dup: CompositionTemplate = {
            ...original,
            id: `comp-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
            name: newName ?? `${original.name} (Copy)`,
            isBuiltIn: false,
            createdAt: new Date().toISOString(),
        };

        this.customTemplates.set(dup.id, dup);
        await this.saveCustomTemplates();
        return dup;
    }

    // ------ Persistence ------

    private loadCustomTemplates(): void {
        try {
            const stored = localStorage.getItem('storycore_composition_templates');
            if (stored) {
                const parsed: CompositionTemplate[] = JSON.parse(stored);
                parsed.forEach(t => this.customTemplates.set(t.id, t));
            }
        } catch {
            console.warn('[CompositionTemplateService] Failed to load custom templates');
        }
    }

    private async saveCustomTemplates(): Promise<void> {
        try {
            const data = Array.from(this.customTemplates.values());
            localStorage.setItem('storycore_composition_templates', JSON.stringify(data));
        } catch {
            console.warn('[CompositionTemplateService] Failed to save custom templates');
        }
    }
}

// Singleton
export const compositionTemplateService = new CompositionTemplateService();
