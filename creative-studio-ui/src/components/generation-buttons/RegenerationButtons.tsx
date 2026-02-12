/**
 * Re-generation Buttons Component
 *
 * Provides contextual re-generation buttons for shots and assets.
 * Displayed inline on shot cards and in the editor preview.
 *
 * Features:
 * - Portrait re-generation (character images)
 * - Text/prompt re-generation
 * - Audio re-generation (voice, SFX)
 * - Batch re-generation (all selected)
 */

import React, { useState, useCallback } from 'react';
import {
    RefreshCw,
    Image,
    Type,
    Volume2,
    Layers,
    Sparkles,
    Loader2,
    RotateCcw,
} from 'lucide-react';
import { useGenerationStore } from '../../stores/generationStore';
import type { GeneratedAsset } from '../../types/generation';
import './RegenerationButtons.css';

// =============================================================================
// Types
// =============================================================================

export type RegenerationType = 'portrait' | 'text' | 'audio' | 'image' | 'video';

export interface RegenerationButtonProps {
    /** Type of re-generation */
    type: RegenerationType;
    /** Target ID (shot ID, character ID, etc.) */
    targetId: string;
    /** Optional target label for tooltip */
    targetLabel?: string;
    /** Size variant */
    size?: 'sm' | 'md' | 'lg';
    /** Whether to show label text */
    showLabel?: boolean;
    /** Custom onClick override */
    onRegenerate?: (type: RegenerationType, targetId: string) => void;
    /** Disabled state */
    disabled?: boolean;
}

export interface BatchRegenerationProps {
    /** IDs to re-generate */
    targetIds: string[];
    /** Type of assets to regenerate */
    type: RegenerationType;
    /** Callback */
    onBatchRegenerate?: (type: RegenerationType, ids: string[]) => void;
}

// =============================================================================
// Config
// =============================================================================

const REGEN_CONFIG: Record<
    RegenerationType,
    { icon: typeof RefreshCw; label: string; color: string; gradientFrom: string; gradientTo: string }
> = {
    portrait: {
        icon: Image,
        label: 'Portrait',
        color: '#a855f7',
        gradientFrom: '#7c3aed',
        gradientTo: '#a855f7',
    },
    text: {
        icon: Type,
        label: 'Texte',
        color: '#3b82f6',
        gradientFrom: '#2563eb',
        gradientTo: '#60a5fa',
    },
    audio: {
        icon: Volume2,
        label: 'Audio',
        color: '#22c55e',
        gradientFrom: '#16a34a',
        gradientTo: '#4ade80',
    },
    image: {
        icon: Sparkles,
        label: 'Image',
        color: '#f59e0b',
        gradientFrom: '#d97706',
        gradientTo: '#fbbf24',
    },
    video: {
        icon: RefreshCw,
        label: 'Vidéo',
        color: '#ef4444',
        gradientFrom: '#dc2626',
        gradientTo: '#f87171',
    },
};

// =============================================================================
// Single Re-generation Button
// =============================================================================

export const RegenerationButton: React.FC<RegenerationButtonProps> = ({
    type,
    targetId,
    targetLabel,
    size = 'sm',
    showLabel = false,
    onRegenerate,
    disabled = false,
}) => {
    const [isRegenerating, setIsRegenerating] = useState(false);
    const config = REGEN_CONFIG[type];
    const IconComponent = config.icon;

    const handleClick = useCallback(async () => {
        if (disabled || isRegenerating) return;

        setIsRegenerating(true);
        try {
            if (onRegenerate) {
                onRegenerate(type, targetId);
            } else {
                // Default: dispatch to generation store
                const store = useGenerationStore.getState();
                store.addToQueue({
                    type: type as any,
                    params: { targetId, regenerate: true },
                    priority: 2,
                });
            }
        } finally {
            // Keep loading state for 1s min to give visual feedback
            setTimeout(() => setIsRegenerating(false), 1000);
        }
    }, [type, targetId, onRegenerate, disabled, isRegenerating]);

    const sizeClasses = {
        sm: 'regen-btn-sm',
        md: 'regen-btn-md',
        lg: 'regen-btn-lg',
    };

    return (
        <button
            className={`regen-btn ${sizeClasses[size]} ${isRegenerating ? 'regen-btn-loading' : ''}`}
            onClick={handleClick}
            disabled={disabled || isRegenerating}
            title={`Régénérer ${config.label}${targetLabel ? ` de ${targetLabel}` : ''}`}
            style={{
                '--regen-color': config.color,
                '--regen-from': config.gradientFrom,
                '--regen-to': config.gradientTo,
            } as React.CSSProperties}
        >
            {isRegenerating ? (
                <Loader2 className="regen-icon regen-spin" />
            ) : (
                <IconComponent className="regen-icon" />
            )}
            {showLabel && <span className="regen-label">{config.label}</span>}
        </button>
    );
};

// =============================================================================
// Re-generation Button Group (for a shot card)
// =============================================================================

export interface RegenerationGroupProps {
    shotId: string;
    shotLabel?: string;
    showLabels?: boolean;
    size?: 'sm' | 'md' | 'lg';
    types?: RegenerationType[];
    onRegenerate?: (type: RegenerationType, targetId: string) => void;
}

export const RegenerationGroup: React.FC<RegenerationGroupProps> = ({
    shotId,
    shotLabel,
    showLabels = false,
    size = 'sm',
    types = ['image', 'text', 'audio'],
    onRegenerate,
}) => {
    return (
        <div className="regen-group">
            {types.map((type) => (
                <RegenerationButton
                    key={type}
                    type={type}
                    targetId={shotId}
                    targetLabel={shotLabel}
                    size={size}
                    showLabel={showLabels}
                    onRegenerate={onRegenerate}
                />
            ))}
        </div>
    );
};

// =============================================================================
// Batch Re-generation Button
// =============================================================================

export const BatchRegenerationButton: React.FC<BatchRegenerationProps> = ({
    targetIds,
    type,
    onBatchRegenerate,
}) => {
    const [isRunning, setIsRunning] = useState(false);
    const config = REGEN_CONFIG[type];

    const handleBatch = useCallback(async () => {
        if (isRunning || targetIds.length === 0) return;
        setIsRunning(true);
        try {
            if (onBatchRegenerate) {
                onBatchRegenerate(type, targetIds);
            } else {
                const store = useGenerationStore.getState();
                for (const id of targetIds) {
                    store.addToQueue({
                        type: type as any,
                        params: { targetId: id, regenerate: true },
                        priority: 1,
                    });
                }
            }
        } finally {
            setTimeout(() => setIsRunning(false), 2000);
        }
    }, [type, targetIds, onBatchRegenerate, isRunning]);

    return (
        <button
            className="batch-regen-btn"
            onClick={handleBatch}
            disabled={isRunning || targetIds.length === 0}
            title={`Régénérer ${config.label} pour ${targetIds.length} éléments`}
            style={{
                '--regen-color': config.color,
                '--regen-from': config.gradientFrom,
                '--regen-to': config.gradientTo,
            } as React.CSSProperties}
        >
            {isRunning ? (
                <Loader2 className="regen-icon regen-spin" />
            ) : (
                <Layers className="regen-icon" />
            )}
            <span>Batch {config.label}</span>
            <span className="batch-count">{targetIds.length}</span>
        </button>
    );
};

// =============================================================================
// Export Film Button
// =============================================================================

export interface ExportFilmButtonProps {
    disabled?: boolean;
    onExport?: () => void;
    className?: string;
}

export const ExportFilmButton: React.FC<ExportFilmButtonProps> = ({
    disabled = false,
    onExport,
    className = '',
}) => {
    return (
        <button
            className={`export-film-btn ${className}`}
            onClick={onExport}
            disabled={disabled}
            title="Exporter le film final"
        >
            <span className="export-film-icon">🎞️</span>
            <span className="export-film-label">Exporter le Film</span>
        </button>
    );
};
