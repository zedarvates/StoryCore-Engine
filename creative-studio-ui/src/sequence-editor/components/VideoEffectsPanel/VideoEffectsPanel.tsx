/**
 * VideoEffectsPanel Component
 *
 * Panel for applying advanced video effects to media layers:
 *  - Chroma Key (green screen removal)
 *  - Masking (shape masks, image masks, AI alpha masks)
 *  - Color Correction (brightness, contrast, saturation, hue)
 *  - Blur
 *  - Vignette
 *  - Speed control
 *
 * Similar to CapCut's "Effects" and "Background Removal" tools.
 *
 * Requirements: Phase 2 of R&D plan
 */

import React, { useState, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { updateLayer } from '../../store/slices/timelineSlice';
import type { Shot, MediaLayerData, VideoMask, VideoEffects } from '../../types';
import './videoEffectsPanel.css';

interface VideoEffectsPanelProps {
    shot: Shot;
    selectedLayerId: string | null;
}

export const VideoEffectsPanel: React.FC<VideoEffectsPanelProps> = ({
    shot,
    selectedLayerId,
}) => {
    const dispatch = useDispatch();
    const [activeTab, setActiveTab] = useState<'mask' | 'chroma' | 'color' | 'blur' | 'vignette'>('mask');
    const [isProcessingAI, setIsProcessingAI] = useState(false);

    const selectedLayer = selectedLayerId
        ? shot.layers.find(l => l.id === selectedLayerId)
        : null;

    // Get media data safely
    const getMediaData = (): MediaLayerData => {
        if (selectedLayer && selectedLayer.type === 'media') {
            return selectedLayer.data as MediaLayerData;
        }
        return {} as MediaLayerData;
    };

    const mediaData = getMediaData();
    const currentEffects: VideoEffects = mediaData.effects ?? {};
    const currentMask: VideoMask | undefined = mediaData.mask;

    // ---------------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------------

    const updateMediaData = useCallback((updates: Partial<MediaLayerData>) => {
        if (!selectedLayer) return;
        dispatch(
            updateLayer({
                shotId: shot.id,
                layerId: selectedLayer.id,
                updates: {
                    data: {
                        ...mediaData,
                        ...updates,
                    },
                },
            }),
        );
    }, [dispatch, shot.id, selectedLayer, mediaData]);

    const updateEffects = useCallback((updates: Partial<VideoEffects>) => {
        updateMediaData({
            effects: { ...currentEffects, ...updates },
        });
    }, [updateMediaData, currentEffects]);

    const updateMask = useCallback((mask: VideoMask | undefined) => {
        updateMediaData({ mask });
    }, [updateMediaData]);

    // ---------------------------------------------------------------------------
    // AI Background Removal (Magic Cut)
    // ---------------------------------------------------------------------------

    const handleAIRemoveBackground = useCallback(async () => {
        if (!selectedLayer) return;
        setIsProcessingAI(true);
        try {
            // TODO: Call actual AI backend (rembg or ComfyUI segment-anything)
            // For now simulate a 2-second processing delay
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Set the mask to alpha type (the AI would produce a mask image)
            updateMask({
                type: 'alpha',
                source: 'ai-generated', // placeholder
                invert: false,
            });
        } catch {
            console.error('AI background removal failed');
        } finally {
            setIsProcessingAI(false);
        }
    }, [selectedLayer, updateMask]);

    // Show empty state if no valid layer selected
    if (!selectedLayer || selectedLayer.type !== 'media') {
        return (
            <div className="video-effects-panel">
                <div className="video-effects-empty">
                    <div className="video-effects-empty-icon">🎬</div>
                    <p>Select a media layer to apply effects</p>
                </div>
            </div>
        );
    }

    const isLocked = selectedLayer.locked;

    // ---------------------------------------------------------------------------
    // Render
    // ---------------------------------------------------------------------------

    return (
        <div className="video-effects-panel">
            <div className="video-effects-header">
                <h3>Video Effects</h3>
            </div>

            {/* Tab Bar */}
            <div className="video-effects-tabs">
                {(['mask', 'chroma', 'color', 'blur', 'vignette'] as const).map(tab => (
                    <button
                        key={tab}
                        className={`vfx-tab ${activeTab === tab ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab)}
                    >
                        {tab === 'mask' && '🎭'}
                        {tab === 'chroma' && '🟢'}
                        {tab === 'color' && '🎨'}
                        {tab === 'blur' && '💨'}
                        {tab === 'vignette' && '⬛'}
                        <span>{tab.charAt(0).toUpperCase() + tab.slice(1)}</span>
                    </button>
                ))}
            </div>

            <div className="video-effects-content">
                {/* ================================================================ */}
                {/* MASK TAB                                                         */}
                {/* ================================================================ */}
                {activeTab === 'mask' && (
                    <div className="vfx-section">
                        <div className="vfx-section-title">Mask / Alpha</div>

                        {/* AI Remove Background */}
                        <button
                            className="vfx-action-btn vfx-action-btn-primary"
                            onClick={handleAIRemoveBackground}
                            disabled={isProcessingAI || isLocked}
                        >
                            {isProcessingAI ? (
                                <span className="vfx-spinner" />
                            ) : (
                                '✨'
                            )}
                            <span>{isProcessingAI ? 'Processing...' : 'AI Remove Background'}</span>
                        </button>

                        {/* Shape Masks */}
                        <div className="vfx-row">
                            <label className="vfx-label">Shape Mask</label>
                            <div className="vfx-shape-buttons">
                                <button
                                    className={`vfx-shape-btn ${currentMask?.type === 'shape' && currentMask?.source === 'circle' ? 'active' : ''}`}
                                    onClick={() => updateMask({ type: 'shape', source: 'circle', invert: false })}
                                    disabled={isLocked}
                                    title="Circle"
                                >
                                    ⭕
                                </button>
                                <button
                                    className={`vfx-shape-btn ${currentMask?.type === 'shape' && currentMask?.source === 'rectangle' ? 'active' : ''}`}
                                    onClick={() => updateMask({ type: 'shape', source: 'rectangle', invert: false })}
                                    disabled={isLocked}
                                    title="Rectangle"
                                >
                                    ▬
                                </button>
                                <button
                                    className={`vfx-shape-btn ${currentMask?.type === 'shape' && currentMask?.source === 'star' ? 'active' : ''}`}
                                    onClick={() => updateMask({ type: 'shape', source: 'star', invert: false })}
                                    disabled={isLocked}
                                    title="Star"
                                >
                                    ⭐
                                </button>
                                <button
                                    className="vfx-shape-btn"
                                    onClick={() => updateMask(undefined)}
                                    disabled={isLocked}
                                    title="Remove Mask"
                                >
                                    ✖
                                </button>
                            </div>
                        </div>

                        {/* Invert Mask */}
                        {currentMask && (
                            <div className="vfx-row">
                                <label className="vfx-label">Invert Mask</label>
                                <input
                                    type="checkbox"
                                    checked={currentMask.invert ?? false}
                                    onChange={e => updateMask({ ...currentMask, invert: e.target.checked })}
                                    disabled={isLocked}
                                />
                            </div>
                        )}
                    </div>
                )}

                {/* ================================================================ */}
                {/* CHROMA KEY TAB                                                   */}
                {/* ================================================================ */}
                {activeTab === 'chroma' && (
                    <div className="vfx-section">
                        <div className="vfx-section-title">Chroma Key (Green Screen)</div>

                        <div className="vfx-row">
                            <label className="vfx-label">Key Color</label>
                            <input
                                type="color"
                                className="vfx-color-picker"
                                value={currentEffects.chromaKey?.color ?? '#00FF00'}
                                onChange={e =>
                                    updateEffects({
                                        chromaKey: {
                                            color: e.target.value,
                                            similarity: currentEffects.chromaKey?.similarity ?? 40,
                                        },
                                    })
                                }
                                disabled={isLocked}
                            />
                        </div>

                        <div className="vfx-row">
                            <label className="vfx-label">Similarity</label>
                            <input
                                type="range"
                                className="vfx-slider"
                                min={0}
                                max={100}
                                value={currentEffects.chromaKey?.similarity ?? 40}
                                onChange={e =>
                                    updateEffects({
                                        chromaKey: {
                                            color: currentEffects.chromaKey?.color ?? '#00FF00',
                                            similarity: Number(e.target.value),
                                        },
                                    })
                                }
                                disabled={isLocked}
                            />
                            <span className="vfx-value">{currentEffects.chromaKey?.similarity ?? 40}%</span>
                        </div>

                        <button
                            className="vfx-action-btn vfx-action-btn-danger"
                            onClick={() => {
                                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                                const { chromaKey: _chromaKey, ...rest } = currentEffects;
                                updateMediaData({ effects: rest });
                            }}
                            disabled={!currentEffects.chromaKey || isLocked}
                        >
                            Remove Chroma Key
                        </button>
                    </div>
                )}

                {/* ================================================================ */}
                {/* COLOR CORRECTION TAB                                             */}
                {/* ================================================================ */}
                {activeTab === 'color' && (
                    <div className="vfx-section">
                        <div className="vfx-section-title">Color Correction</div>

                        {[
                            { label: 'Brightness', key: 'brightness', min: -1, max: 1, step: 0.05, defaultVal: 0 },
                            { label: 'Contrast', key: 'contrast', min: 0, max: 3, step: 0.05, defaultVal: 1 },
                            { label: 'Saturation', key: 'saturation', min: 0, max: 3, step: 0.05, defaultVal: 1 },
                            { label: 'Hue', key: 'hue', min: -180, max: 180, step: 1, defaultVal: 0 },
                        ].map(({ label, key, min, max, step, defaultVal }) => {
                            const colorCorrection = currentEffects.colorCorrection ?? {
                                brightness: 0,
                                contrast: 1,
                                saturation: 1,
                                hue: 0,
                            };
                            const value = colorCorrection[key as keyof typeof colorCorrection] ?? defaultVal;
                            return (
                                <div className="vfx-row" key={key}>
                                    <label className="vfx-label">{label}</label>
                                    <input
                                        type="range"
                                        className="vfx-slider"
                                        min={min}
                                        max={max}
                                        step={step}
                                        value={value}
                                        onChange={e => {
                                            const newColorCorrection = {
                                                ...colorCorrection,
                                                [key]: Number(e.target.value),
                                            };
                                            updateEffects({
                                                colorCorrection: newColorCorrection,
                                            });
                                        }}
                                        disabled={isLocked}
                                    />
                                    <span className="vfx-value">
                                        {typeof value === 'number' ? value.toFixed(2) : defaultVal}
                                    </span>
                                </div>
                            );
                        })}

                        <button
                            className="vfx-action-btn"
                            onClick={() => {
                                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                                const { colorCorrection: _colorCorrection, ...rest } = currentEffects;
                                updateMediaData({ effects: rest });
                            }}
                            disabled={!currentEffects.colorCorrection || isLocked}
                        >
                            Reset Colors
                        </button>
                    </div>
                )}

                {/* ================================================================ */}
                {/* BLUR TAB                                                         */}
                {/* ================================================================ */}
                {activeTab === 'blur' && (
                    <div className="vfx-section">
                        <div className="vfx-section-title">Blur</div>

                        <div className="vfx-row">
                            <label className="vfx-label">Blur Radius</label>
                            <input
                                type="range"
                                className="vfx-slider"
                                min={0}
                                max={50}
                                value={currentEffects.blur ?? 0}
                                onChange={e => updateEffects({ blur: Number(e.target.value) })}
                                disabled={isLocked}
                            />
                            <span className="vfx-value">{currentEffects.blur ?? 0}px</span>
                        </div>

                        <button
                            className="vfx-action-btn"
                            onClick={() => updateEffects({ blur: 0 })}
                            disabled={isLocked}
                        >
                            Remove Blur
                        </button>
                    </div>
                )}

                {/* ================================================================ */}
                {/* VIGNETTE TAB                                                     */}
                {/* ================================================================ */}
                {activeTab === 'vignette' && (
                    <div className="vfx-section">
                        <div className="vfx-section-title">Vignette Effect</div>

                        <div className="vfx-row">
                            <label className="vfx-label">Intensity</label>
                            <input
                                type="range"
                                className="vfx-slider"
                                min={0}
                                max={100}
                                value={currentEffects.vignette?.intensity ?? 0}
                                onChange={e =>
                                    updateEffects({
                                        vignette: {
                                            intensity: Number(e.target.value),
                                            roundness: currentEffects.vignette?.roundness ?? 50,
                                            softness: currentEffects.vignette?.softness ?? 50,
                                        },
                                    })
                                }
                                disabled={isLocked}
                            />
                            <span className="vfx-value">{currentEffects.vignette?.intensity ?? 0}%</span>
                        </div>

                        <div className="vfx-row">
                            <label className="vfx-label">Roundness</label>
                            <input
                                type="range"
                                className="vfx-slider"
                                min={0}
                                max={100}
                                value={currentEffects.vignette?.roundness ?? 50}
                                onChange={e =>
                                    updateEffects({
                                        vignette: {
                                            intensity: currentEffects.vignette?.intensity ?? 0,
                                            roundness: Number(e.target.value),
                                            softness: currentEffects.vignette?.softness ?? 50,
                                        },
                                    })
                                }
                                disabled={isLocked}
                            />
                            <span className="vfx-value">{currentEffects.vignette?.roundness ?? 50}%</span>
                        </div>

                        <div className="vfx-row">
                            <label className="vfx-label">Softness</label>
                            <input
                                type="range"
                                className="vfx-slider"
                                min={0}
                                max={100}
                                value={currentEffects.vignette?.softness ?? 50}
                                onChange={e =>
                                    updateEffects({
                                        vignette: {
                                            intensity: currentEffects.vignette?.intensity ?? 0,
                                            roundness: currentEffects.vignette?.roundness ?? 50,
                                            softness: Number(e.target.value),
                                        },
                                    })
                                }
                                disabled={isLocked}
                            />
                            <span className="vfx-value">{currentEffects.vignette?.softness ?? 50}%</span>
                        </div>

                        <button
                            className="vfx-action-btn"
                            onClick={() => {
                                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                                const { vignette: _vignette, ...rest } = currentEffects;
                                updateMediaData({ effects: rest });
                            }}
                            disabled={!currentEffects.vignette || isLocked}
                        >
                            Remove Vignette
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};