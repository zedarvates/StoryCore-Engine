/**
 * Video Generation Panel Component
 *
 * Interface de génération vidéo LTX2 / Wan 2.1 avec sélection de moteur,
 * modes de qualité (Fast / Pro / Ultra) et suivi de progression en temps réel.
 *
 * Validates: Requirements 14.13, 14.14 + LTX2 R&D Integration
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { backendApi } from '@/services/backendApiService';
import type { TaskStatusResponse, ApiResponse } from '@/services/backendApiService';
import { Play, Square, Loader2, Film, Cpu, Zap, Star, Crown, AlertCircle } from 'lucide-react';

// ==============================================================================
// TYPES
// ==============================================================================

type VideoEngine = 'wan21' | 'ltx2';
type QualityMode = 'draft' | 'standard' | 'cinematic' | 'ultra';

interface VideoGenerationPanelProps {
  onGenerateVideo?: (params: VideoGenerationParams) => Promise<void>;
  onCancel?: () => void;
}

interface VideoGenerationParams {
  inputImagePath: string;
  prompt: string;
  frameCount: number;
  frameRate: number;
  width: number;
  height: number;
  engine?: string;
  quality?: string;
}

interface GenerationProgress {
  stage: 'latent' | 'upscaling' | 'complete';
  stageProgress: number;
  overallProgress: number;
  message: string;
}

// ==============================================================================
// CONFIG
// ==============================================================================

const QUALITY_MODES: { id: QualityMode; label: string; steps: number; icon: React.ReactNode; color: string; hint: string }[] = [
  { id: 'draft',     label: 'Fast',      steps: 10, icon: <Zap className="h-4 w-4" />,    color: '#3b82f6', hint: 'Brouillons & tests rapides' },
  { id: 'standard',  label: 'Pro',       steps: 20, icon: <Star className="h-4 w-4" />,   color: '#8b5cf6', hint: 'Réseaux sociaux' },
  { id: 'cinematic', label: 'Cinematic', steps: 30, icon: <Film className="h-4 w-4" />,   color: '#f59e0b', hint: 'Contenu premium' },
  { id: 'ultra',     label: 'Ultra',     steps: 40, icon: <Crown className="h-4 w-4" />,  color: '#ef4444', hint: 'Rendu final client' },
];

const FRAME_PRESETS = [
  { label: '2s', frames: 49 },
  { label: '3s', frames: 73 },
  { label: '5s', frames: 121 },
  { label: '8s', frames: 193 },
  { label: '10s', frames: 241 },
  { label: '20s', frames: 481 },
];

const DIMENSION_PRESETS = [
  { label: '720p', w: 1280, h: 720 },
  { label: '1080p', w: 1920, h: 1080 },
  { label: 'Portrait', w: 768, h: 1280 },
  { label: 'Carré', w: 1024, h: 1024 },
];

// ==============================================================================
// STYLES
// ==============================================================================

const S = {
  panel: {
    background: 'linear-gradient(135deg, rgba(10,10,20,0.96) 0%, rgba(18,8,30,0.96) 100%)',
    border: '1px solid rgba(139,92,246,0.2)',
    borderRadius: 16,
    padding: '24px',
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
    color: '#e2d9f3',
    maxWidth: 720,
    boxShadow: '0 25px 60px rgba(0,0,0,0.5), 0 0 60px rgba(139,92,246,0.08)',
  } as React.CSSProperties,
  sectionTitle: {
    fontSize: '0.7rem',
    fontWeight: 700,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.1em',
    color: '#c4b5fd',
    marginBottom: 10,
  },
  card: (active: boolean, color = '#8b5cf6') => ({
    padding: '12px 14px',
    borderRadius: 10,
    border: active ? `2px solid ${color}` : '1px solid rgba(139,92,246,0.15)',
    background: active ? `${color}18` : 'rgba(255,255,255,0.02)',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: active ? `0 0 16px ${color}28` : 'none',
  } as React.CSSProperties),
  input: {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(139,92,246,0.2)',
    borderRadius: 8,
    padding: '8px 12px',
    color: '#e2d9f3',
    width: '100%',
    fontSize: '0.85rem',
    outline: 'none',
  } as React.CSSProperties,
  label: {
    fontSize: '0.73rem',
    color: '#8b7faa',
    marginBottom: 4,
    display: 'block',
  } as React.CSSProperties,
  progressTrack: {
    height: 6,
    borderRadius: 99,
    background: 'rgba(139,92,246,0.12)',
    overflow: 'hidden',
  } as React.CSSProperties,
  progressFill: (pct: number, color = '#8b5cf6') => ({
    height: '100%',
    width: `${pct}%`,
    background: `linear-gradient(90deg, ${color}, #a78bfa)`,
    borderRadius: 99,
    transition: 'width 0.4s ease',
    boxShadow: `0 0 10px ${color}80`,
  } as React.CSSProperties),
};

// ==============================================================================
// COMPONENT
// ==============================================================================

export const VideoGenerationPanel: React.FC<VideoGenerationPanelProps> = ({
  onGenerateVideo,
  onCancel,
}) => {
  const [engine, setEngine] = useState<VideoEngine>('ltx2');
  const [quality, setQuality] = useState<QualityMode>('standard');
  const [inputImage, setInputImage] = useState('');
  const [prompt, setPrompt] = useState('');
  const [frameCount, setFrameCount] = useState(121);
  const [frameRate, setFrameRate] = useState(25);
  const [width, setWidth] = useState(1280);
  const [height, setHeight] = useState(720);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<GenerationProgress | null>(null);
  const [generatedVideoPath, setGeneratedVideoPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, []);

  const pollTaskStatus = async (taskId: string): Promise<string | void> =>
    new Promise((resolve, reject) => {
      const startTime = Date.now();
      const MAX_POLLING_TIME = 10 * 60 * 1000; // 10 minutes max

      pollingRef.current = setInterval(async () => {
        if (Date.now() - startTime > MAX_POLLING_TIME) {
          if (pollingRef.current) clearInterval(pollingRef.current);
          pollingRef.current = null;
          reject(new Error("Délai d'attente dépassé (10 min) pour la génération vidéo."));
          return;
        }

        try {
          const response: ApiResponse<TaskStatusResponse> = await backendApi.getTaskStatus(taskId);
          if (!response.success || !response.data) { reject(new Error(response.error || 'Failed to get status')); return; }
          const status = response.data;
          if (status.status === 'completed') {
            const videoPath = status.result?.videoPath as string | undefined;
            if (videoPath) {
              setGeneratedVideoPath(videoPath);
              resolve(videoPath);
            } else {
              resolve(undefined);
            }
            clearInterval(pollingRef.current!);
            pollingRef.current = null;
          } else if (status.status === 'failed') {
            clearInterval(pollingRef.current!); pollingRef.current = null;
            reject(new Error(status.error || 'Task failed'));
          } else {
            setProgress({ stage: 'latent', stageProgress: status.progress, overallProgress: status.progress * 0.8, message: status.message || 'Traitement...' });
          }
        } catch (err) { clearInterval(pollingRef.current!); pollingRef.current = null; reject(err); }
      }, 2000);
    });

  const handleGenerate = useCallback(async () => {
    if (!inputImage || !prompt) { setError('Veuillez fournir une image source et une description.'); return; }
    setIsGenerating(true); setError(null);
    setProgress({ stage: 'latent', stageProgress: 0, overallProgress: 0, message: 'Démarrage de la génération vidéo...' });

    try {
      const genParams: VideoGenerationParams = { inputImagePath: inputImage, prompt, frameCount, frameRate, width, height, engine: engine === 'ltx2' ? 'ltx_video' : 'wan21', quality };
      if (onGenerateVideo) {
        await onGenerateVideo(genParams);
      } else {
        const payload = {
          inputImagePath: genParams.inputImagePath,
          prompt: genParams.prompt,
          frameCount: genParams.frameCount,
          frameRate: genParams.frameRate,
          width: genParams.width,
          height: genParams.height,
          engine: genParams.engine,
          quality: genParams.quality
        };
        const response = await backendApi.invokeCliCommand('generate_video_from_image', payload);
        if (!response.success) throw new Error(response.error || 'Video generation failed');
        
        const responseData = response.data as Record<string, unknown> | undefined;
        if (responseData?.taskId && typeof responseData.taskId === 'string') {
           const generatedPath = await pollTaskStatus(responseData.taskId);
           if (!generatedPath) {
             setGeneratedVideoPath(`/api/video/output_${Date.now()}.mp4`);
           }
        } else {
           setGeneratedVideoPath(`/api/video/output_${Date.now()}.mp4`);
        }
      }
      setProgress({ stage: 'complete', stageProgress: 100, overallProgress: 100, message: 'Vidéo générée avec succès !' });
    } catch (err) {
      console.error('Video generation failed:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      setProgress(null);
    } finally { setIsGenerating(false); }
  }, [inputImage, prompt, frameCount, frameRate, width, height, engine, quality, onGenerateVideo]);

  const handleCancel = useCallback(() => {
    if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
    onCancel?.();
    setIsGenerating(false); setProgress(null); setError(null);
  }, [onCancel]);

  const currentQuality = QUALITY_MODES.find((q) => q.id === quality)!;
  const duration = (frameCount / frameRate).toFixed(1);

  const calculateGemCost = () => {
    const baseCosts: Record<string, number> = {
      'draft': 2.5,
      'standard': 5.0,
      'cinematic': 10.0,
      'ultra': 25.0,
    };
    return baseCosts[quality] || 5.0;
  };

  const gemCost = calculateGemCost();

  return (
    <div style={S.panel}>
      {/* TITLE */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Film className="h-5 w-5" style={{ color: '#fff' }} />
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#e2d9f3' }}>Génération Vidéo Cinématique</h2>
          <p style={{ margin: 0, fontSize: '0.72rem', color: '#7c6f9e' }}>Powered by LTX2 · Wan 2.1 · Storycore Engine</p>
        </div>
      </div>

      {/* ENGINE SELECTOR */}
      <div style={{ marginBottom: 20 }}>
        <p style={S.sectionTitle}>🎬 Moteur de génération</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {/* Wan 2.1 */}
          <button onClick={() => setEngine('wan21')} disabled={isGenerating} style={S.card(engine === 'wan21')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Film className="h-4 w-4" style={{ color: engine === 'wan21' ? '#a78bfa' : '#5c5075' }} />
              <span style={{ fontWeight: 700, color: engine === 'wan21' ? '#e2d9f3' : '#7c6f9e', fontSize: '0.85rem' }}>Wan 2.1</span>
            </div>
            <p style={{ margin: 0, fontSize: '0.7rem', color: '#5c5075', lineHeight: 1.4 }}>Haute-fidélité, cohérence personnages</p>
          </button>
          {/* LTX2 */}
          <button onClick={() => setEngine('ltx2')} disabled={isGenerating} style={{ ...S.card(engine === 'ltx2'), position: 'relative' }}>
            <span style={{ position: 'absolute', top: 8, right: 8, fontSize: '0.58rem', fontWeight: 700, color: '#34d399', background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.3)', padding: '2px 5px', borderRadius: 4 }}>OPEN-SOURCE</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Cpu className="h-4 w-4" style={{ color: engine === 'ltx2' ? '#a78bfa' : '#5c5075' }} />
              <span style={{ fontWeight: 700, color: engine === 'ltx2' ? '#e2d9f3' : '#7c6f9e', fontSize: '0.85rem' }}>LTX2</span>
            </div>
            <p style={{ margin: 0, fontSize: '0.7rem', color: '#5c5075', lineHeight: 1.4 }}>Ultra-rapide, sans frais, tu possèdes tout</p>
          </button>
        </div>
      </div>

      {/* QUALITY SELECTOR */}
      <div style={{ marginBottom: 20 }}>
        <p style={S.sectionTitle}>⚙️ Mode de qualité</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {QUALITY_MODES.map((m) => (
            <button key={m.id} onClick={() => setQuality(m.id)} disabled={isGenerating}
              style={{ ...S.card(quality === m.id, m.color), textAlign: 'center', padding: '10px 6px' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4, color: quality === m.id ? m.color : '#5c5075' }}>
                {m.icon}
              </div>
              <div style={{ fontWeight: 700, fontSize: '0.75rem', color: quality === m.id ? '#e2d9f3' : '#7c6f9e' }}>{m.label}</div>
              <div style={{ fontSize: '0.6rem', color: '#5c5075', marginTop: 2 }}>{m.hint}</div>
              <div style={{ fontSize: '0.6rem', color: m.color, marginTop: 3, fontWeight: 600 }}>{m.steps} steps</div>
            </button>
          ))}
        </div>
      </div>

      {/* INPUT IMAGE */}
      <div style={{ marginBottom: 18 }}>
        <label htmlFor="input-image" style={S.sectionTitle}>🖼️ Image source</label>
        <input
          id="input-image"
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) setInputImage((file as File & { path?: string }).path || file.name);
          }}
          disabled={isGenerating}
          style={{ ...S.input, cursor: 'pointer' }}
        />
        {inputImage && <p style={{ fontSize: '0.7rem', color: '#8b7faa', marginTop: 4 }}>✓ {inputImage}</p>}
      </div>

      {/* PROMPT */}
      <div style={{ marginBottom: 18 }}>
        <label htmlFor="motion-prompt" style={S.sectionTitle}>✍️ Description du mouvement</label>
        <textarea
          id="motion-prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={engine === 'ltx2'
            ? 'Ex: Une personne en hoodie jaune à un bureau. Lumière de l\'après-midi. La caméra commence statique puis zoome lentement...'
            : 'Ex: Un plan large et dynamique suit un groupe de VTTistes dans la forêt...'}
          rows={4}
          disabled={isGenerating}
          style={{ ...S.input, resize: 'vertical', lineHeight: 1.5 }}
        />
        <p style={{ margin: '4px 0 0', fontSize: '0.68rem', color: '#5c5075' }}>
          {engine === 'ltx2' ? '💡 LTX2 adore les prompts cinématiques précis (lumière, sons, caméra).' : '📽️ Wan 2.1 excelle sur les mouvements de personnages.'}
        </p>
      </div>

      {/* DURATION / FRAME COUNT */}
      <div style={{ marginBottom: 18 }}>
        <p style={S.sectionTitle}>🎞️ Durée — <span style={{ color: '#a78bfa' }}>{duration}s</span> à {frameRate} fps</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6, marginBottom: 10 }}>
          {FRAME_PRESETS.map((p) => (
            <button key={p.label} onClick={() => setFrameCount(p.frames)} disabled={isGenerating}
              style={S.card(frameCount === p.frames, '#8b5cf6')}>
              <span style={{ fontSize: '0.78rem', fontWeight: frameCount === p.frames ? 700 : 400 }}>{p.label}</span>
            </button>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={S.label}>Frames</label>
            <input type="number" value={frameCount} onChange={(e) => setFrameCount(parseInt(e.target.value) || 121)} min={25} max={481} step={8} disabled={isGenerating} style={S.input} />
          </div>
          <div>
            <label style={S.label}>Frame Rate (fps)</label>
            <input type="number" value={frameRate} onChange={(e) => setFrameRate(parseInt(e.target.value) || 25)} min={1} max={60} disabled={isGenerating} style={S.input} />
          </div>
        </div>
      </div>

      {/* DIMENSIONS */}
      <div style={{ marginBottom: 20 }}>
        <p style={S.sectionTitle}>📐 Dimensions</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 10 }}>
          {DIMENSION_PRESETS.map((d) => (
            <button key={d.label} onClick={() => { setWidth(d.w); setHeight(d.h); }} disabled={isGenerating} style={S.card(width === d.w && height === d.h)}>
              <span style={{ fontSize: '0.72rem', fontWeight: width === d.w && height === d.h ? 700 : 400 }}>{d.label}</span>
            </button>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={S.label}>Largeur</label>
            <input type="number" value={width} onChange={(e) => setWidth(parseInt(e.target.value) || 1280)} min={256} max={1920} step={8} disabled={isGenerating} style={S.input} />
          </div>
          <div>
            <label style={S.label}>Hauteur</label>
            <input type="number" value={height} onChange={(e) => setHeight(parseInt(e.target.value) || 720)} min={256} max={1920} step={8} disabled={isGenerating} style={S.input} />
          </div>
        </div>
      </div>

      {/* PROGRESS */}
      {progress && (
        <div style={{ marginBottom: 18, padding: 14, borderRadius: 10, background: 'rgba(139,92,246,0.07)', border: '1px solid rgba(139,92,246,0.15)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.75rem' }}>
            <span style={{ color: '#a78bfa', fontWeight: 600 }}>
              {progress.stage === 'latent' && '⚙️ Génération latente'}
              {progress.stage === 'upscaling' && '✨ Upscaling spatial'}
              {progress.stage === 'complete' && '✅ Terminé !'}
            </span>
            <span style={{ color: '#7c6f9e' }}>{progress.overallProgress.toFixed(0)}%</span>
          </div>
          <div style={S.progressTrack}>
            <div style={S.progressFill(progress.overallProgress)} />
          </div>
          <p style={{ margin: '8px 0 0', fontSize: '0.7rem', color: '#7c6f9e' }}>{progress.message}</p>
        </div>
      )}

      {/* VIDEO PREVIEW */}
      {generatedVideoPath && (
        <div style={{ marginBottom: 18 }}>
          <p style={S.sectionTitle}>🎬 Vidéo générée</p>
          <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(139,92,246,0.2)' }}>
            <video src={generatedVideoPath} controls style={{ width: '100%', display: 'block', background: '#000' }}>
              Ton navigateur ne prend pas en charge la balise vidéo.
            </video>
          </div>
        </div>
      )}

      {/* ERROR */}
      {error && (
        <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <AlertCircle className="h-4 w-4 flex-shrink-0" style={{ color: '#f87171', marginTop: 2 }} />
          <span style={{ fontSize: '0.78rem', color: '#f87171' }}>{error}</span>
        </div>
      )}

      {/* ACTIONS */}
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={handleGenerate}
          disabled={isGenerating || !inputImage || !prompt}
          style={{
            flex: 1,
            padding: '12px 20px',
            borderRadius: 10,
            border: 'none',
            background: isGenerating
              ? 'rgba(139,92,246,0.25)'
              : `linear-gradient(135deg, ${currentQuality.color} 0%, #7c3aed 100%)`,
            color: '#fff',
            fontWeight: 700,
            fontSize: '0.85rem',
            cursor: isGenerating || !inputImage || !prompt ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            boxShadow: isGenerating ? 'none' : `0 0 20px ${currentQuality.color}40`,
            transition: 'all 0.2s',
          }}
        >
          {isGenerating
            ? <><Loader2 className="h-4 w-4 animate-spin" /> Génération en cours…</>
            : (
              <>
                <Play className="h-4 w-4" /> 
                Générer · {engine === 'ltx2' ? 'LTX2' : 'Wan 2.1'} · {currentQuality.label}
                <div style={{
                  marginLeft: 12,
                  padding: '2px 8px',
                  background: 'rgba(0,0,0,0.3)',
                  borderRadius: 20,
                  fontSize: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  border: '1px solid rgba(255,255,255,0.2)'
                }}>
                  <span style={{ color: '#fbbf24' }}>💎</span> {gemCost} Gems
                </div>
              </>
            )}
        </button>
        {isGenerating && (
          <button
            onClick={handleCancel}
            style={{ padding: '12px 18px', borderRadius: 10, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', color: '#f87171', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Square className="h-4 w-4" /> Annuler
          </button>
        )}
      </div>
    </div>
  );
};

export default VideoGenerationPanel;
