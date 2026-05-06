/**
 * ExportPanel — Panneau d'export vidéo professionnel
 * Phase 8 — interface utilisateur pour le pipeline d'export.
 */
import React, { useState, useCallback, useMemo } from 'react';
import { useProjectStore } from '@/stores/useProjectStore';
import { useShallow } from 'zustand/react/shallow';
import { videoExportService, type ExportSettings } from '@/services/VideoExportService';
import type { FlattenTrack } from '@/sequence-editor/utils/flattenTimeline';
import {
  Film, Video, Headphones, Image, Settings2,
  Play, Square, Download, Loader2, Check, AlertCircle,
  Monitor, Smartphone, Tablet,
} from 'lucide-react';

// ============================================================================
// Presets
// ============================================================================

const RESOLUTION_PRESETS = [
  { label: '4K UHD', width: 3840, height: 2160, icon: <Monitor className="w-4 h-4" /> },
  { label: '1080p HD', width: 1920, height: 1080, icon: <Monitor className="w-4 h-4" /> },
  { label: '720p HD', width: 1280, height: 720, icon: <Smartphone className="w-4 h-4" /> },
  { label: 'Vertical 9:16', width: 1080, height: 1920, icon: <Smartphone className="w-4 h-4" /> },
  { label: 'Square 1:1', width: 1080, height: 1080, icon: <Tablet className="w-4 h-4" /> },
];

const FORMAT_PRESETS = [
  { label: 'MP4 (H.264)', format: 'mp4' as const, codec: 'libx264' as const },
  { label: 'WebM (VP9)', format: 'webm' as const, codec: 'libvpx-vp9' as const },
  { label: 'MOV (ProRes)', format: 'mov' as const, codec: 'prores_ks' as const },
  { label: 'GIF', format: 'gif' as const, codec: 'gif' as const },
];

const FPS_PRESETS = [24, 30, 60];

// ============================================================================
// Component
// ============================================================================

export const ExportPanel: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { shots, tracks } = useProjectStore(useShallow(state => ({
    shots: state.shots,
    tracks: state.tracks,
  })));

  const [resolution, setResolution] = useState(RESOLUTION_PRESETS[1]); // 1080p
  const [formatPreset, setFormatPreset] = useState(FORMAT_PRESETS[0]);
  const [fps, setFps] = useState(24);
  const [videoQuality, setVideoQuality] = useState(18); // CRF
  const [audioBitrate, setAudioBitrate] = useState('320k');
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'idle' | 'exporting' | 'completed' | 'error'>('idle');
  const [outputPath, setOutputPath] = useState<string | null>(null);

  const flattenTracks: FlattenTrack[] = useMemo(() =>
    tracks.map((t, i) => ({
      id: t.id,
      type: t.type,
      index: i,
      height: t.height,
      hidden: t.hidden,
    })),
    [tracks]
  );

  const exportSettings: ExportSettings = useMemo(() => ({
    format: formatPreset.format,
    codec: formatPreset.codec,
    audioCodec: 'aac',
    resolution: { width: resolution.width, height: resolution.height },
    fps,
    crf: videoQuality,
    videoBitrate: undefined,
    audioBitrate,
  }), [formatPreset, resolution, fps, videoQuality, audioBitrate]);

  const handleExport = useCallback(async () => {
    setExporting(true);
    setStatus('exporting');
    setProgress(0);

    try {
      const result = await videoExportService.exportTimeline(
        shots,
        flattenTracks,
        exportSettings,
        (p) => {
          setProgress(p.progress);
        }
      );

      if (result.status === 'completed') {
        setStatus('completed');
        setOutputPath(result.outputPath ?? 'output.mp4');
      } else {
        setStatus('error');
      }
    } catch (err) {
      setStatus('error');
    } finally {
      setExporting(false);
    }
  }, [shots, flattenTracks, exportSettings]);

  const handleCancel = useCallback(() => {
    // cancel logic
    setExporting(false);
    setStatus('idle');
    setProgress(0);
  }, []);

  const totalFrames = useMemo(() =>
    shots.reduce((sum, s) => sum + s.duration, 0),
    [shots]
  );

  const estimatedDuration = (totalFrames / fps).toFixed(1);
  const estimatedSize = useMemo(() => {
    // Estimation grossière : ~5 Mbps pour 1080p h264
    const bitrate = formatPreset.codec === 'prores_ks' ? 150 : 8;
    return ((totalFrames / fps) * bitrate / 8).toFixed(0);
  }, [totalFrames, fps, formatPreset]);

  return (
    <div className={`export-panel ${className}`} style={{
      background: '#0a0a12', border: '1px solid rgba(255,255,255,0.04)',
      borderRadius: '8px', overflow: 'hidden', display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        padding: '10px 14px', background: '#0d0d18',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        display: 'flex', alignItems: 'center', gap: '8px',
      }}>
        <Film className="w-4 h-4 text-indigo-400" />
        <span style={{ flex: 1, fontSize: '12px', fontWeight: 700, color: '#d4d4d8' }}>Export</span>
      </div>

      <div style={{ padding: '14px', flex: 1, overflow: 'auto' }}>
        {/* Resolution */}
        <div style={{ marginBottom: '16px' }}>
          <span style={{ fontSize: '10px', fontWeight: 700, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px', display: 'block' }}>
            Résolution
          </span>
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {RESOLUTION_PRESETS.map(p => (
              <button
                key={p.label}
                onClick={() => setResolution(p)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '4px',
                  padding: '6px 10px', fontSize: '10px', fontWeight: 600,
                  background: resolution === p ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)',
                  color: resolution === p ? '#a5b4fc' : '#71717a',
                  border: `1px solid ${resolution === p ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.05)'}`,
                  borderRadius: '6px', cursor: 'pointer',
                }}
              >
                {p.icon}
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Format */}
        <div style={{ marginBottom: '16px' }}>
          <span style={{ fontSize: '10px', fontWeight: 700, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px', display: 'block' }}>
            Format
          </span>
          <div style={{ display: 'flex', gap: '4px' }}>
            {FORMAT_PRESETS.map(f => (
              <button
                key={f.label}
                onClick={() => setFormatPreset(f)}
                style={{
                  padding: '6px 12px', fontSize: '10px', fontWeight: 600,
                  background: formatPreset === f ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)',
                  color: formatPreset === f ? '#a5b4fc' : '#71717a',
                  border: `1px solid ${formatPreset === f ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.05)'}`,
                  borderRadius: '6px', cursor: 'pointer',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* FPS & Quality */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: '10px', fontWeight: 700, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px', display: 'block' }}>
              FPS
            </span>
            <div style={{ display: 'flex', gap: '4px' }}>
              {FPS_PRESETS.map(f => (
                <button
                  key={f}
                  onClick={() => setFps(f)}
                  style={{
                    padding: '4px 10px', fontSize: '12px', fontWeight: 700,
                    fontFamily: 'monospace',
                    background: fps === f ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)',
                    color: fps === f ? '#a5b4fc' : '#71717a',
                    border: `1px solid ${fps === f ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.05)'}`,
                    borderRadius: '4px', cursor: 'pointer',
                  }}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: '10px', fontWeight: 700, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px', display: 'block' }}>
              Qualité (CRF: {videoQuality})
            </span>
            <input
              type="range"
              min={0}
              max={51}
              value={videoQuality}
              onChange={e => setVideoQuality(Number(e.target.value))}
              style={{ width: '100%', accentColor: '#818cf8' }}
            />
          </div>
        </div>

        {/* Info */}
        <div style={{
          padding: '10px', borderRadius: '6px',
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.04)',
          marginBottom: '16px',
          display: 'flex', gap: '16px',
          fontSize: '10px', color: '#a1a1aa',
        }}>
          <div>
            <span style={{ color: '#52525b' }}>Durée:</span> {estimatedDuration}s
          </div>
          <div>
            <span style={{ color: '#52525b' }}>Shots:</span> {shots.length}
          </div>
          <div>
            <span style={{ color: '#52525b' }}>Est. taille:</span> ~{estimatedSize}MB
          </div>
        </div>

        {/* Progress */}
        {status === 'exporting' && (
          <div style={{
            padding: '10px', borderRadius: '6px',
            background: 'rgba(99,102,241,0.08)',
            border: '1px solid rgba(99,102,241,0.15)',
            marginBottom: '12px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
              <span style={{ fontSize: '11px', color: '#a5b4fc', fontWeight: 600 }}>Export en cours...</span>
              <span style={{ fontSize: '10px', color: '#71717a', marginLeft: 'auto' }}>{Math.round(progress)}%</span>
            </div>
            <div style={{ height: '3px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, #6366f1, #8b5cf6)', borderRadius: '2px', transition: 'width 0.3s' }} />
            </div>
          </div>
        )}

        {status === 'completed' && (
          <div style={{
            padding: '10px', borderRadius: '6px',
            background: 'rgba(34,197,94,0.08)',
            border: '1px solid rgba(34,197,94,0.15)',
            marginBottom: '12px',
            display: 'flex', alignItems: 'center', gap: '8px',
          }}>
            <Check className="w-3.5 h-3.5 text-green-400" />
            <span style={{ fontSize: '11px', color: '#4ade80', fontWeight: 600 }}>Export terminé !</span>
          </div>
        )}

        {status === 'error' && (
          <div style={{
            padding: '10px', borderRadius: '6px',
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.15)',
            marginBottom: '12px',
            display: 'flex', alignItems: 'center', gap: '8px',
          }}>
            <AlertCircle className="w-3.5 h-3.5 text-red-400" />
            <span style={{ fontSize: '11px', color: '#f87171', fontWeight: 600 }}>Erreur d'export</span>
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {status === 'exporting' ? (
            <button
              onClick={handleCancel}
              style={{
                flex: 1, padding: '10px', fontSize: '12px', fontWeight: 700,
                background: 'rgba(239,68,68,0.1)', color: '#f87171',
                border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              }}
            >
              <Square className="w-4 h-4" />
              Annuler
            </button>
          ) : (
            <button
              onClick={handleExport}
              disabled={shots.length === 0 || exporting}
              style={{
                flex: 1, padding: '10px', fontSize: '12px', fontWeight: 700,
                background: shots.length === 0 ? 'rgba(255,255,255,0.03)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: shots.length === 0 ? '#52525b' : '#fff',
                border: 'none', borderRadius: '8px',
                cursor: shots.length === 0 ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                opacity: shots.length === 0 ? 0.5 : 1,
              }}
            >
              <Download className="w-4 h-4" />
              Exporter
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExportPanel;
