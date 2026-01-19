import React, { useState, useEffect } from 'react';
import { ttsService, type Voice } from '../services/ttsService';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { Mic, Play, Search, Loader2 } from 'lucide-react';

interface VoiceLibraryProps {
  selectedVoice?: string;
  onSelectVoice: (voiceId: string) => void;
  filterLanguage?: string;
  filterGender?: 'male' | 'female' | 'neutral' | 'all';
}

export const VoiceLibrary: React.FC<VoiceLibraryProps> = ({
  selectedVoice,
  onSelectVoice,
  filterLanguage,
  filterGender = 'all',
}) => {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);

  useEffect(() => {
    loadVoices();
  }, []);

  const loadVoices = async () => {
    setLoading(true);
    setError(null);
    try {
      const availableVoices = await ttsService.getAvailableVoices();
      setVoices(availableVoices);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load voices');
    } finally {
      setLoading(false);
    }
  };

  const handlePlayPreview = async (voice: Voice) => {
    if (!voice.previewUrl) {
      return;
    }

    setPlayingVoiceId(voice.id);

    try {
      const audio = new Audio(voice.previewUrl);
      audio.onended = () => setPlayingVoiceId(null);
      audio.onerror = () => setPlayingVoiceId(null);
      await audio.play();
    } catch (err) {
      console.error('Failed to play preview:', err);
      setPlayingVoiceId(null);
    }
  };

  const filteredVoices = voices.filter((voice) => {
    // Filter by search query
    if (searchQuery && !voice.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    // Filter by language
    if (filterLanguage && !voice.language.startsWith(filterLanguage)) {
      return false;
    }

    // Filter by gender
    if (filterGender !== 'all' && voice.gender !== filterGender) {
      return false;
    }

    return true;
  });

  const getGenderColor = (gender: Voice['gender']) => {
    switch (gender) {
      case 'male':
        return 'bg-blue-100 text-blue-700';
      case 'female':
        return 'bg-pink-100 text-pink-700';
      case 'neutral':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center">
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={loadVoices} variant="outline">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mic className="h-5 w-5" />
          Voice Library
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="space-y-2">
          <Label htmlFor="voice-search">Search Voices</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="voice-search"
              placeholder="Search by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Voice List */}
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-2">
            {filteredVoices.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No voices found matching your criteria
              </div>
            ) : (
              filteredVoices.map((voice) => (
                <VoiceCard
                  key={voice.id}
                  voice={voice}
                  isSelected={selectedVoice === voice.id}
                  isPlaying={playingVoiceId === voice.id}
                  onSelect={() => onSelectVoice(voice.id)}
                  onPlayPreview={() => handlePlayPreview(voice)}
                  getGenderColor={getGenderColor}
                />
              ))
            )}
          </div>
        </ScrollArea>

        {/* Summary */}
        <div className="text-sm text-muted-foreground">
          Showing {filteredVoices.length} of {voices.length} voices
        </div>
      </CardContent>
    </Card>
  );
};

interface VoiceCardProps {
  voice: Voice;
  isSelected: boolean;
  isPlaying: boolean;
  onSelect: () => void;
  onPlayPreview: () => void;
  getGenderColor: (gender: Voice['gender']) => string;
}

const VoiceCard: React.FC<VoiceCardProps> = ({
  voice,
  isSelected,
  isPlaying,
  onSelect,
  onPlayPreview,
  getGenderColor,
}) => {
  return (
    <div
      className={`
        p-3 rounded-lg border cursor-pointer transition-colors
        ${isSelected ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent'}
      `}
      onClick={onSelect}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium">{voice.name}</span>
            <Badge className={getGenderColor(voice.gender)} variant="secondary">
              {voice.gender}
            </Badge>
          </div>
          <div className="text-sm text-muted-foreground">
            {voice.language}
          </div>
        </div>

        {voice.previewUrl && (
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              onPlayPreview();
            }}
            disabled={isPlaying}
          >
            {isPlaying ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>
    </div>
  );
};
