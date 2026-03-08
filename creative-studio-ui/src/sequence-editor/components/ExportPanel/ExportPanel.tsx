/**
 * Export Panel Component
 * 
 * Provides UI for video export with:
 * - Full preset selection (YouTube, TikTok, Instagram, Twitter)
 * - Custom resolution/quality settings
 * - Batch export queue tracking
 * - Download management
 * 
 * Modernized for 2026 UI Trends (Glassmorphism 2.0, Archival Index, Purposeful Motion)
 */

import React, { useState, useCallback, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '../../store';
import { addPreset } from '../../store/slices/presetsSlice';
import { addJob } from '../../store/slices/exportSlice';
import { CustomPreset } from '../../types';
import { ExportQueue } from './ExportQueue';
import { GlassCard } from '@/components/ui/GlassCard';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Rocket, 
  Save, 
  Settings2, 
  Youtube, 
  Smartphone, 
  Instagram, 
  Twitter, 
  Facebook, 
  Linkedin, 
  SlidersHorizontal,
  ChevronRight,
  Monitor
} from 'lucide-react';
import './exportPanel.css';

// =============================================================================
// Types
// =============================================================================

interface ExportPreset {
  id: string;
  name: string;
  platform: string;
  resolution: string;
  width: number;
  height: number;
  aspectRatio: string;
  format: string;
  quality: string;
  description: string;
  icon?: React.ReactNode;
}

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  'YouTube': <Youtube className="w-4 h-4 text-red-500" />,
  'TikTok': <Smartphone className="w-4 h-4 text-cyan-400" />,
  'Instagram': <Instagram className="w-4 h-4 text-pink-500" />,
  'Twitter': <Twitter className="w-4 h-4 text-blue-400" />,
  'Facebook': <Facebook className="w-4 h-4 text-blue-600" />,
  'LinkedIn': <Linkedin className="w-4 h-4 text-blue-700" />,
  'Custom': <Settings2 className="w-4 h-4 text-gray-400" />,
};

const EXPORT_PRESETS: ExportPreset[] = [
  { id: 'youtube_1080p', name: 'YouTube 1080p', platform: 'YouTube', resolution: '1920x1080', width: 1920, height: 1080, aspectRatio: '16:9', format: 'mp4', quality: 'high', description: 'Best for YouTube, standard HD' },
  { id: 'youtube_4k', name: 'YouTube 4K', platform: 'YouTube', resolution: '3840x2160', width: 3840, height: 2160, aspectRatio: '16:9', format: 'mp4', quality: 'ultra', description: '4K Ultra HD for YouTube' },
  { id: 'youtube_720p', name: 'YouTube 720p', platform: 'YouTube', resolution: '1280x720', width: 1280, height: 720, aspectRatio: '16:9', format: 'mp4', quality: 'medium', description: 'HD, faster upload' },
  { id: 'tiktok', name: 'TikTok/Reels', platform: 'TikTok', resolution: '1080x1920', width: 1080, height: 1920, aspectRatio: '9:16', format: 'mp4', quality: 'high', description: 'Vertical video for TikTok, Instagram Reels' },
  { id: 'instagram_feed', name: 'Instagram Feed', platform: 'Instagram', resolution: '1080x1080', width: 1080, height: 1080, aspectRatio: '1:1', format: 'mp4', quality: 'high', description: 'Square format for Instagram Feed' },
  { id: 'instagram_story', name: 'Instagram Story', platform: 'Instagram', resolution: '1080x1920', width: 1080, height: 1920, aspectRatio: '9:16', format: 'mp4', quality: 'high', description: 'Vertical for Instagram Stories' },
  { id: 'instagram_portrait', name: 'Instagram Portrait', platform: 'Instagram', resolution: '1080x1350', width: 1080, height: 1350, aspectRatio: '4:5', format: 'mp4', quality: 'high', description: 'Portrait for Instagram Feed' },
  { id: 'twitter', name: 'Twitter/X', platform: 'Twitter', resolution: '1280x720', width: 1280, height: 720, aspectRatio: '16:9', format: 'mp4', quality: 'medium', description: 'Standard Twitter video' },
  { id: 'facebook', name: 'Facebook', platform: 'Facebook', resolution: '1920x1080', width: 1920, height: 1080, aspectRatio: '16:9', format: 'mp4', quality: 'high', description: 'Best for Facebook' },
  { id: 'linkedin', name: 'LinkedIn', platform: 'LinkedIn', resolution: '1920x1080', width: 1920, height: 1080, aspectRatio: ' LinkedIn', format: 'mp4', quality: 'high', description: 'Professional content' },
  { id: 'custom', name: 'Custom', platform: 'Custom', resolution: 'Custom', width: 1920, height: 1080, aspectRatio: 'custom', format: 'mp4', quality: 'custom', description: 'Custom settings' },
];

interface ExportFormat {
  id: string;
  name: string;
  extension: string;
}

const EXPORT_FORMATS: ExportFormat[] = [
  { id: 'mp4', name: 'MP4 (H.264)', extension: '.mp4' },
  { id: 'webm', name: 'WebM (VP9)', extension: '.webm' },
  { id: 'mov', name: 'MOV (QuickTime)', extension: '.mov' },
  { id: 'avi', name: 'AVI', extension: '.avi' },
];

interface ExportQuality {
  id: string;
  name: string;
  bitrate: string;
}

const QUALITY_LEVELS: ExportQuality[] = [
  { id: 'low', name: 'Low', bitrate: '2 Mbps' },
  { id: 'medium', name: 'Medium', bitrate: '5 Mbps' },
  { id: 'high', name: 'High', bitrate: '10 Mbps' },
  { id: 'ultra', name: 'Ultra', bitrate: '20 Mbps' },
];

interface ExportPresetData {
  preset: string;
  width: number;
  height: number;
  format: string;
  quality: string;
}

// =============================================================================
// Component
// =============================================================================

export const ExportPanel: React.FC = () => {
  const dispatch = useAppDispatch();
  const { toast } = useToast();
  const projectId = useAppSelector((state) => state.project.metadata?.id);
  const shots = useAppSelector((state) => state.timeline.shots);
  const jobs = useAppSelector((state) => state.export.jobs);
  const userPresets = useAppSelector((state) => state.presets.presets.filter(p => p.type === 'export'));
  
  // Selected preset
  const [selectedPreset, setSelectedPreset] = useState<string>('youtube_1080p');
  
  // Custom settings
  const [customWidth, setCustomWidth] = useState(1920);
  const [customHeight, setCustomHeight] = useState(1080);
  const [customFormat, setCustomFormat] = useState('mp4');
  const [customQuality, setCustomQuality] = useState('high');
  
  // Get selected preset details
  const currentPreset = useMemo(() => 
    EXPORT_PRESETS.find(p => p.id === selectedPreset) || EXPORT_PRESETS[0],
    [selectedPreset]
  );
  
  // Check if any job is currently exporting
  const isAnyJobExporting = useMemo(() => 
    jobs.some(job => job.status === 'processing' || job.status === 'pending'),
    [jobs]
  );

  // =============================================================================
  // Handlers
  // =============================================================================
  
  const handleStartExport = useCallback(async () => {
    const resolution = selectedPreset === 'custom' 
      ? `${customWidth}x${customHeight}`
      : currentPreset.resolution;
    
    try {
      const response = await fetch('/api/video-editor/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId || 'default',
          format: customFormat,
          preset: selectedPreset,
          resolution,
          quality: customQuality,
        }),
      });
      
      if (response.ok) {
        const _data = await response.json();
        // setResults({ status: 'processing' }); // This line was not in the original code, adding it as per instruction.
        dispatch(addJob({
          id: _data.job_id,
          projectId: projectId || 'default',
          presetName: currentPreset.name,
          format: customFormat,
          resolution,
          quality: customQuality,
          status: 'processing',
          progress: 0,
          createdAt: Date.now(),
        }));

        toast({
          title: "Export Started",
          description: `Rendering ${currentPreset.name} in background...`,
          variant: "info"
        });
      } else {
        toast({
          title: "Export Failed",
          description: "Could not start render job. Please check your project settings.",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Export Error",
        description: (error as Error).message,
        variant: "destructive"
      });
    }
  }, [projectId, selectedPreset, currentPreset, customWidth, customHeight, customFormat, customQuality, dispatch, toast]);

  const handleApplyUserPreset = useCallback((preset: CustomPreset) => {
    const data = preset.data as ExportPresetData;
    setSelectedPreset(data.preset || 'custom');
    if (data.width) setCustomWidth(data.width);
    if (data.height) setCustomHeight(data.height);
    if (data.format) setCustomFormat(data.format);
    if (data.quality) setCustomQuality(data.quality);
    
    toast({
      title: "Preset Applied",
      description: `Loaded custom preset: ${preset.name}`,
      variant: "default"
    });
  }, [toast]);
  
  // =============================================================================
  // Render
  // =============================================================================
  
  // Group presets by platform
  const presetsByPlatform = useMemo(() => EXPORT_PRESETS.reduce((acc, preset) => {
    if (!acc[preset.platform]) {
      acc[preset.platform] = [];
    }
    acc[preset.platform].push(preset);
    return acc;
  }, {} as Record<string, ExportPreset[]>), []);
  
  return (
    <div className="export-panel h-full flex flex-col gap-6 p-6 overflow-y-auto">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <Rocket className="w-5 h-5 text-primary" />
          Export Video
        </h3>
        <div className="text-xs text-white/30 uppercase font-bold tracking-widest">
          {shots.length} Shots Ready
        </div>
      </div>
      
      <div className="flex flex-col gap-6">
        {/* Presets - Archival Index Style */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-white/40 uppercase tracking-widest px-1">
            <Monitor className="w-3 h-3" />
            Platform Presets
          </div>
          
          <div className="glass-panel overflow-hidden rounded-xl border-white/5">
            <div className="divide-y divide-white/5">
              {Object.entries(presetsByPlatform).map(([platform, presets]) => (
                <div key={platform} className="bg-white/2">
                   {presets.map(preset => (
                    <motion.div
                      key={preset.id}
                      whileHover={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
                      className={`index-row cursor-pointer transition-colors group ${selectedPreset === preset.id ? 'bg-primary/10 border-l-2 border-l-primary' : 'border-l-2 border-l-transparent'}`}
                      onClick={() => setSelectedPreset(preset.id)}
                    >
                      <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-black/20">
                        {PLATFORM_ICONS[platform] || <Monitor className="w-4 h-4 text-white/40" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className={`text-sm font-medium leading-none ${selectedPreset === preset.id ? 'text-primary' : 'text-white/80'}`}>
                            {preset.name}
                          </span>
                          <span className="text-[10px] tabular-nums text-white/30 group-hover:text-white/50 transition-colors">
                            {preset.resolution}
                          </span>
                        </div>
                        <p className="text-[10px] text-white/40 mt-1 truncate">{preset.description}</p>
                      </div>
                      <div className={`opacity-0 group-hover:opacity-100 transition-opacity ${selectedPreset === preset.id ? 'opacity-100 text-primary' : 'text-white/20'}`}>
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </motion.div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* User Presets */}
        {userPresets.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-white/40 uppercase tracking-widest px-1">
              <Save className="w-3 h-3" />
              Your Presets
            </div>
            <div className="grid grid-cols-2 gap-2">
              {userPresets.map(preset => (
                <GlassCard
                  key={preset.id}
                  intensity="low"
                  className={`cursor-pointer p-4 border transition-all ${selectedPreset === preset.id ? 'border-primary ring-1 ring-primary/30' : 'border-white/5 hover:border-white/20'}`}
                  onClick={() => handleApplyUserPreset(preset)}
                >
                  <div className="text-xs font-bold text-white truncate">{preset.name}</div>
                  <div className="text-[10px] text-white/40 mt-1">
                    {(preset.data as ExportPresetData).width}×{(preset.data as ExportPresetData).height}
                  </div>
                </GlassCard>
              ))}
            </div>
          </section>
        )}
        
        {/* Settings Area */}
        <GlassCard intensity="medium" className="border-white/5 shadow-xl p-0 overflow-hidden">
          <div className="p-4 bg-white/5 border-bottom border-white/5 flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-primary" />
            <span className="text-sm font-bold text-white">Advanced Settings</span>
          </div>
          
          <div className="p-6 space-y-6">
            <AnimatePresence mode="wait">
              {selectedPreset === 'custom' && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="space-y-4 overflow-hidden"
                >
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Width</label>
                      <input
                        type="number"
                        value={customWidth}
                        onChange={(e) => setCustomWidth(parseInt(e.target.value) || 1920)}
                        className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-sm text-white focus:border-primary/50 outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Height</label>
                      <input
                        type="number"
                        value={customHeight}
                        onChange={(e) => setCustomHeight(parseInt(e.target.value) || 1080)}
                        className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-sm text-white focus:border-primary/50 outline-none"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Format</label>
                <select
                  value={customFormat}
                  onChange={(e) => setCustomFormat(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-sm text-white focus:border-primary/50 outline-none appearance-none"
                >
                  {EXPORT_FORMATS.map(fmt => (
                    <option key={fmt.id} value={fmt.id}>{fmt.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Quality</label>
                <select
                  value={customQuality}
                  onChange={(e) => setCustomQuality(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-sm text-white focus:border-primary/50 outline-none appearance-none"
                >
                  {QUALITY_LEVELS.map(q => (
                    <option key={q.id} value={q.id}>{q.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-4 border-t border-white/5 space-y-2">
              <div className="flex justify-between text-[11px]">
                <span className="text-white/40">Target Aspect Ratio</span>
                <span className="text-white/80 font-medium">{currentPreset.aspectRatio}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-white/40">Expected Quality</span>
                <span className="text-white/80 font-medium">
                  {QUALITY_LEVELS.find(q => q.id === customQuality)?.bitrate}
                </span>
              </div>
            </div>
          </div>
        </GlassCard>
        
        {/* Actions */}
        <div className="flex flex-col gap-3 pt-6 mt-auto">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-3 shadow-xl transition-all ${
              shots.length === 0 || isAnyJobExporting 
                ? 'bg-white/5 text-white/20 cursor-not-allowed' 
                : 'bg-primary text-white shadow-primary/20 hover:bg-primary/90'
            }`}
            onClick={handleStartExport}
            disabled={shots.length === 0 || isAnyJobExporting}
          >
            {isAnyJobExporting ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Exporting...</span>
              </>
            ) : (
              <>
                <Rocket className="w-5 h-5" />
                <span>Start Export</span>
              </>
            )}
          </motion.button>
          
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white font-semibold text-sm transition-all flex items-center justify-center gap-2 border border-white/5"
            onClick={() => {
              const name = window.prompt('Enter a name for this export preset:');
              if (name) {
                const exportData = {
                  preset: selectedPreset,
                  width: customWidth,
                  height: customHeight,
                  format: customFormat,
                  quality: customQuality
                };
                dispatch(addPreset({
                  name,
                  type: 'export',
                  data: exportData
                }));
                toast({
                  title: "Preset Saved",
                  description: `"${name}" is now available in your presets.`,
                  variant: "success"
                });
              }
            }}
          >
            <Save className="w-4 h-4" />
            Save Preset
          </motion.button>
        </div>

        <div className="mt-8 border-t border-white/5 pt-8">
           <ExportQueue />
        </div>
      </div>
    </div>
  );
};

export default ExportPanel;
