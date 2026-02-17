/**
 * CompositionTemplateBrowser Component
 *
 * A browsable panel that lists all available composition templates
 * (Lower Thirds, Title Cards, CTAs, etc.) and lets the user:
 *  1. Preview them (thumbnail + animated preview)
 *  2. Drop them onto the timeline with one click
 *  3. Create new templates from selected layers
 *
 * Similar to CapCut's "Templates" panel and Canva's "Elements" panel.
 *
 * Requirements: Phase 3 of R&D plan
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
    compositionTemplateService,
    type CompositionTemplate,
    type CompositionCategory,
} from '../../../services/templates/CompositionTemplateService';
import './compositionTemplateBrowser.css';

interface CompositionTemplateBrowserProps {
    /** Current playhead position in frames — templates are inserted here */
    insertionFrame: number;
    /** Called when the user wants to add layers from a template */
    onInsertLayers: (layers: any[]) => void;
}

const CATEGORY_LABELS: Record<CompositionCategory, string> = {
    'intro': '🎬 Intro',
    'outro': '🏁 Outro',
    'lower-third': '📝 Lower Third',
    'title-card': '🎯 Title Card',
    'call-to-action': '📣 CTA',
    'transition': '🔄 Transition',
    'social-media': '📱 Social',
    'subtitle-style': '💬 Subtitles',
    'overlay': '✨ Overlay',
    'custom': '🎨 Custom',
};

const ALL_CATEGORIES: CompositionCategory[] = [
    'lower-third',
    'title-card',
    'intro',
    'outro',
    'call-to-action',
    'social-media',
    'overlay',
    'transition',
    'subtitle-style',
    'custom',
];

export const CompositionTemplateBrowser: React.FC<CompositionTemplateBrowserProps> = ({
    insertionFrame,
    onInsertLayers,
}) => {
    const [selectedCategory, setSelectedCategory] = useState<CompositionCategory | 'all'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [hoveredTemplate, setHoveredTemplate] = useState<string | null>(null);

    const allTemplates = useMemo(
        () => compositionTemplateService.getAllTemplates(),
        [],
    );

    const filteredTemplates = useMemo(() => {
        let templates = allTemplates;

        if (selectedCategory !== 'all') {
            templates = templates.filter(t => t.category === selectedCategory);
        }

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            templates = templates.filter(
                t =>
                    t.name.toLowerCase().includes(q) ||
                    t.description.toLowerCase().includes(q) ||
                    t.tags.some(tag => tag.toLowerCase().includes(q)),
            );
        }

        return templates;
    }, [allTemplates, selectedCategory, searchQuery]);

    const handleInsertTemplate = useCallback(
        (template: CompositionTemplate) => {
            const layers = compositionTemplateService.instantiate(template.id, insertionFrame);
            onInsertLayers(layers);
        },
        [insertionFrame, onInsertLayers],
    );

    return (
        <div className="comp-template-browser">
            {/* Header */}
            <div className="comp-browser-header">
                <h3>Templates</h3>
                <div className="comp-browser-search">
                    <input
                        type="text"
                        placeholder="Search templates..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* Category Pills */}
            <div className="comp-browser-categories">
                <button
                    className={`comp-cat-pill ${selectedCategory === 'all' ? 'active' : ''}`}
                    onClick={() => setSelectedCategory('all')}
                >
                    All
                </button>
                {ALL_CATEGORIES.map(cat => {
                    const count = allTemplates.filter(t => t.category === cat).length;
                    if (count === 0) return null;
                    return (
                        <button
                            key={cat}
                            className={`comp-cat-pill ${selectedCategory === cat ? 'active' : ''}`}
                            onClick={() => setSelectedCategory(cat)}
                        >
                            {CATEGORY_LABELS[cat]}
                            <span className="comp-cat-count">{count}</span>
                        </button>
                    );
                })}
            </div>

            {/* Grid */}
            <div className="comp-browser-grid">
                {filteredTemplates.length === 0 && (
                    <div className="comp-browser-empty">No templates found</div>
                )}

                {filteredTemplates.map(template => (
                    <div
                        key={template.id}
                        className="comp-template-card"
                        onMouseEnter={() => setHoveredTemplate(template.id)}
                        onMouseLeave={() => setHoveredTemplate(null)}
                    >
                        {/* Thumbnail */}
                        <div className="comp-template-thumb">
                            {template.thumbnailUrl ? (
                                <img src={template.thumbnailUrl} alt={template.name} />
                            ) : (
                                <div className="comp-template-thumb-placeholder">
                                    {CATEGORY_LABELS[template.category]?.split(' ')[0] ?? '📦'}
                                </div>
                            )}

                            {/* Hover overlay with insert button */}
                            {hoveredTemplate === template.id && (
                                <div className="comp-template-overlay">
                                    <button
                                        className="comp-template-insert-btn"
                                        onClick={() => handleInsertTemplate(template)}
                                        title="Insert at playhead"
                                    >
                                        + Add
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Info */}
                        <div className="comp-template-info">
                            <div className="comp-template-name">{template.name}</div>
                            <div className="comp-template-meta">
                                {template.layers.length} layers · {Math.round(template.totalDuration / 30)}s
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
