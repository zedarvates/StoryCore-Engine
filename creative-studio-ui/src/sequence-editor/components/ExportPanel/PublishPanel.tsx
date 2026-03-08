/**
 * Publish Panel Component
 * 
 * Allows users to publish completed exports to social platforms.
 * Modernized for 2026 UI Trends (Glassmorphism 2.0, Purposeful Motion)
 */

import React, { useState } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, CheckCircle2, X } from 'lucide-react';
import './exportPanel.css';

interface PublishPanelProps {
  mediaId: string;
  onClose: () => void;
}

export const PublishPanel: React.FC<PublishPanelProps> = ({ mediaId, onClose }) => {
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);
  const [results, setResults] = useState<{ status: string; platforms?: Array<{id: string, url: string}> } | null>(null);

  const PLATFORMS = [
    { id: 'youtube', name: 'YouTube', icon: '📺' },
    { id: 'tiktok', name: 'TikTok', icon: '📱' },
    { id: 'instagram', name: 'Instagram', icon: '📸' },
    { id: 'twitter', name: 'Twitter/X', icon: '🐦' },
    { id: 'storycore_blog', name: 'StoryCore Blog', icon: '📝' },
    { id: 'storycore_market', name: 'Marketplace', icon: '💎' },
  ];

  const handlePublish = async () => {
    if (platforms.length === 0) {
      toast({
        title: "Platform required",
        description: "Please select at least one platform to publish your story.",
        variant: "warning"
      });
      return;
    }

    setIsPublishing(true);
    try {
      const response = await fetch('/api/video-editor/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          media_id: mediaId,
          platforms,
          title,
          description,
          tags: tags.split(',').map(t => t.trim()).filter(t => t),
          privacy: 'public'
        })
      });

      if (response.ok) {
        const _data = await response.json();
        setResults({ status: 'processing' });
        
        // Simulating completion for mock
        setTimeout(() => {
           setResults({ status: 'completed', platforms: platforms.map(p => ({ 
             id: p, 
             url: `https://${p}.com/watch?v=mock` 
           }))});
           setIsPublishing(false);
           toast({
             title: "Published Successfully!",
             description: `Your story is now live on ${platforms.join(', ')}.`,
             variant: "success"
           });
        }, 3000);
      } else {
        toast({
          title: "Publishing Failed",
          description: "We couldn't reach the publishing server. Please try again.",
          variant: "destructive"
        });
        setIsPublishing(false);
      }
    } catch (error) {
       toast({
         title: "Error",
         description: (error as Error).message,
         variant: "destructive"
       });
       setIsPublishing(false);
    }
  };

  return (
    <div className="publish-panel-overlay fixed inset-0 z-50 flex items-center justify-center p-4">
      <AnimatePresence mode="wait">
        {results?.status === 'completed' ? (
          <GlassCard
            key="success"
            intensity="high"
            className="w-full max-w-md text-center border-emerald-500/30 shadow-emerald-500/10"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center gap-4"
            >
              <CheckCircle2 className="w-16 h-16 text-emerald-400 animate-success-pulse" />
              <h3 className="text-2xl font-bold text-white tracking-tight">🎉 Published Successfully!</h3>
              
              <div className="w-full space-y-2 my-6">
                {results.platforms?.map((p) => (
                  <motion.div 
                    key={p.id} 
                    whileHover={{ x: 5 }}
                    className="flex justify-between items-center p-3 rounded-lg bg-white/5 border border-white/10"
                  >
                    <span className="font-semibold text-white/70 uppercase tracking-widest text-xs">{p.id}</span>
                    <a 
                      href={p.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary/80 font-medium transition-colors"
                    >
                      View Post
                    </a>
                  </motion.div>
                ))}
              </div>

              <button 
                className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold transition-all" 
                onClick={onClose}
              >
                Return to Editor
              </button>
            </motion.div>
          </GlassCard>
        ) : (
          <GlassCard
            key="form"
            intensity="medium"
            className="w-full max-w-lg overflow-hidden border-white/5 shadow-2xl"
          >
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-2xl font-bold text-white leading-none">Share Story</h3>
                <p className="text-white/50 text-sm mt-2">Publish your creation to social networks</p>
              </div>
              <button 
                className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/70 hover:text-white" 
                onClick={onClose}
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-white/40 uppercase tracking-wider ml-1">Video Title</label>
                  <input 
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all outline-none"
                    value={title} 
                    onChange={e => setTitle(e.target.value)} 
                    placeholder="Enter a catchy title..."
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-white/40 uppercase tracking-wider ml-1">Tags</label>
                  <input 
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all outline-none"
                    value={tags} 
                    onChange={e => setTags(e.target.value)} 
                    placeholder="#story, #ai..."
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-white/40 uppercase tracking-wider ml-1">Description</label>
                <textarea 
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white h-24 resize-none transition-all outline-none focus:border-primary/50"
                  value={description} 
                  onChange={e => setDescription(e.target.value)} 
                  placeholder="Tell your viewers more about this..."
                />
              </div>

              <div className="space-y-4">
                <label className="text-xs font-bold text-white/40 uppercase tracking-wider ml-1">Target Platforms</label>
                <div className="grid grid-cols-2 gap-3">
                  {PLATFORMS.map(p => (
                    <motion.button
                      key={p.id}
                      whileTap={{ scale: 0.95 }}
                      className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                        platforms.includes(p.id) 
                          ? 'bg-primary/20 border-primary shadow-lg shadow-primary/10' 
                          : 'bg-white/5 border-white/5 hover:bg-white/10'
                      }`}
                      onClick={() => {
                        if (platforms.includes(p.id)) {
                          setPlatforms(platforms.filter(id => id !== p.id));
                        } else {
                          setPlatforms([...platforms, p.id]);
                        }
                      }}
                    >
                      <span className="text-xl">{p.icon}</span>
                      <span className={`font-medium ${platforms.includes(p.id) ? 'text-white' : 'text-white/60'}`}>{p.name}</span>
                    </motion.button>
                  ))}
                </div>
              </div>

              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full mt-4 flex items-center justify-center gap-3 py-4 bg-primary text-white font-bold rounded-2xl shadow-xl shadow-primary/20 hover:bg-primary/90 disabled:opacity-50 disabled:grayscale transition-all" 
                onClick={handlePublish}
                disabled={isPublishing || !title}
              >
                {isPublishing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Publishing...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    <span>Launch Story</span>
                  </>
                )}
              </motion.button>
            </div>
          </GlassCard>
        )}
      </AnimatePresence>
    </div>
  );
};
