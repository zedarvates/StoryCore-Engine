
import React, { useState } from 'react';
import { Search, Scissors, Music, ZoomIn, Brain, Mic, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';

interface SearchResult {
  id: string;
  media_id: string;
  type: 'transcription' | 'video_ocr';
  preview: string;
  matches: any[];
}

export const AISearchPanel: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const { toast } = useToast();

  const handleSearch = async () => {
    if (!query.trim()) return;
    
    setIsSearching(true);
    try {
      const response = await fetch('/api/video-editor/ai/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });
      const data = await response.json();
      setResults(data.results);
    } catch {
      toast({
        title: "Erreur de recherche",
        description: "Impossible de contacter le service AI.",
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleSmartZoom = async () => {
    toast({
      title: "Smart Zoom",
      description: "Analyse des visages en cours pour le recadrage automatique...",
    });
    // Appel API /ai/smart-crop...
  };

  const handleAutoTrim = async () => {
    toast({
      title: "Auto-Trim Silence",
      description: "Suppression des silences sur la piste active...",
    });
    // Appel API /ai/auto-trim...
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-200 p-4">
      <div className="flex items-center gap-2 mb-6">
        <Brain className="w-5 h-5 text-violet-400" />
        <h2 className="text-lg font-semibold bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
          AI Power Tools
        </h2>
      </div>

      {/* AI Automation Buttons */}
      <div className="grid grid-cols-2 gap-2 mb-6">
        <Button 
          variant="outline" 
          size="sm" 
          className="bg-slate-800 border-slate-700 hover:bg-slate-700 h-20 flex flex-col gap-2"
          onClick={handleAutoTrim}
        >
          <Scissors className="w-4 h-4 text-orange-400" />
          <span className="text-[10px]">Auto-Trim</span>
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          className="bg-slate-800 border-slate-700 hover:bg-slate-700 h-20 flex flex-col gap-2"
          onClick={() => {}}
        >
          <Music className="w-4 h-4 text-emerald-400" />
          <span className="text-[10px]">Beat Detect</span>
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          className="bg-slate-800 border-slate-700 hover:bg-slate-700 h-20 flex flex-col gap-2"
          onClick={handleSmartZoom}
        >
          <ZoomIn className="w-4 h-4 text-blue-400" />
          <span className="text-[10px]">Smart Zoom</span>
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          className="bg-slate-800 border-slate-700 hover:bg-slate-700 h-20 flex flex-col gap-2"
          onClick={() => {}}
        >
          <Brain className="w-4 h-4 text-pink-400" />
          <span className="text-[10px]">Magic Mask</span>
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          className="bg-slate-800 border-slate-700 hover:bg-slate-700 h-20 flex flex-col gap-2"
          onClick={() => {}}
        >
          <Mic className="w-4 h-4 text-cyan-400" />
          <span className="text-[10px]">Vocals</span>
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          className="bg-slate-800 border-slate-700 hover:bg-slate-700 h-20 flex flex-col gap-2"
          onClick={() => {}}
        >
          <Music className="w-4 h-4 text-yellow-400" />
          <span className="text-[10px]">Ducking</span>
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          className="bg-slate-800 border-slate-700 hover:bg-slate-700 h-20 flex flex-col gap-2"
          onClick={() => {}}
        >
          <Palette className="w-4 h-4 text-orange-400" />
          <span className="text-[10px]">Isolation</span>
        </Button>
      </div>

      <div className="h-px bg-slate-800 mb-6" />

      {/* Search Section */}
      <div className="space-y-4 flex-1 flex flex-col overflow-hidden">
        <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wider">
          Recherche Transcription & OCR
        </h3>
        <div className="flex gap-2">
          <Input 
            placeholder="Chercher un mot dit ou écrit..." 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="bg-slate-800 border-slate-700"
          />
          <Button size="icon" onClick={handleSearch} disabled={isSearching}>
            {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="space-y-3 pr-4">
            {results.length === 0 && !isSearching && query && (
              <p className="text-xs text-slate-500 text-center py-8">Aucun résultat trouvé pour "{query}"</p>
            )}
            
            {results.map((result) => (
              <div 
                key={result.id} 
                className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50 hover:border-violet-500/50 transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                    result.type === 'transcription' ? 'bg-violet-900/50 text-violet-300' : 'bg-emerald-900/50 text-emerald-300'
                  }`}>
                    {result.type.toUpperCase()}
                  </span>
                  <span className="text-[10px] text-slate-500">ID: {result.media_id.slice(0, 8)}</span>
                </div>
                <p className="text-xs text-slate-300 line-clamp-2 italic mb-2">"{result.preview}"</p>
                
                <div className="space-y-1">
                  {result.matches.slice(0, 3).map((match, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-[10px] text-violet-400 hover:text-white group">
                      <Play className="w-2 h-2 fill-current" />
                      <span>{match.start || match.timestamp}s</span>
                      <span className="text-slate-400 group-hover:text-slate-200 truncate">{match.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};
