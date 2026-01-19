import React, { useState } from 'react';
import type { VoiceOver } from '../types';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Slider } from './ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Mic, Loader2 } from 'lucide-react';

interface VoiceOverGeneratorProps {
  onGenerate: (voiceOver: VoiceOver) => void;
  onCancel?: () => void;
  isGenerating?: boolean;
}

const VOICE_OPTIONS = [
  { value: 'male', label: 'Male Voice' },
  { value: 'female', label: 'Female Voice' },
  { value: 'neutral', label: 'Neutral Voice' },
];

const LANGUAGE_OPTIONS = [
  { value: 'en-US', label: 'English (US)' },
  { value: 'en-GB', label: 'English (UK)' },
  { value: 'es-ES', label: 'Spanish (Spain)' },
  { value: 'es-MX', label: 'Spanish (Mexico)' },
  { value: 'fr-FR', label: 'French' },
  { value: 'de-DE', label: 'German' },
  { value: 'it-IT', label: 'Italian' },
  { value: 'pt-BR', label: 'Portuguese (Brazil)' },
  { value: 'ja-JP', label: 'Japanese' },
  { value: 'ko-KR', label: 'Korean' },
  { value: 'zh-CN', label: 'Chinese (Simplified)' },
];

const EMOTION_OPTIONS = [
  { value: 'neutral', label: 'Neutral' },
  { value: 'happy', label: 'Happy' },
  { value: 'sad', label: 'Sad' },
  { value: 'excited', label: 'Excited' },
  { value: 'calm', label: 'Calm' },
];

export const VoiceOverGenerator: React.FC<VoiceOverGeneratorProps> = ({
  onGenerate,
  onCancel,
  isGenerating = false,
}) => {
  const [text, setText] = useState('');
  const [voice, setVoice] = useState<string>('female');
  const [language, setLanguage] = useState('en-US');
  const [speed, setSpeed] = useState(1.0);
  const [pitch, setPitch] = useState(0);
  const [emotion, setEmotion] = useState<VoiceOver['emotion']>('neutral');

  const handleGenerate = () => {
    if (!text.trim()) {
      return;
    }

    const voiceOver: VoiceOver = {
      id: `voiceover-${Date.now()}`,
      text: text.trim(),
      voice,
      language,
      speed,
      pitch,
      emotion,
    };

    onGenerate(voiceOver);
  };

  const isValid = text.trim().length > 0;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mic className="h-5 w-5" />
          AI Voiceover Generator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Text Input */}
        <div className="space-y-2">
          <Label htmlFor="voiceover-text">Text to Speech</Label>
          <Textarea
            id="voiceover-text"
            placeholder="Enter the text you want to convert to speech..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            className="resize-none"
            disabled={isGenerating}
          />
          <p className="text-xs text-muted-foreground">
            {text.length} characters
          </p>
        </div>

        {/* Voice Selection */}
        <div className="space-y-2">
          <Label htmlFor="voice-select">Voice</Label>
          <Select value={voice} onValueChange={setVoice} disabled={isGenerating}>
            <SelectTrigger id="voice-select">
              <SelectValue placeholder="Select voice" />
            </SelectTrigger>
            <SelectContent>
              {VOICE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Language Selection */}
        <div className="space-y-2">
          <Label htmlFor="language-select">Language</Label>
          <Select
            value={language}
            onValueChange={setLanguage}
            disabled={isGenerating}
          >
            <SelectTrigger id="language-select">
              <SelectValue placeholder="Select language" />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Speed Control */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="speed-slider">Speed</Label>
            <span className="text-sm text-muted-foreground">{speed.toFixed(1)}x</span>
          </div>
          <Slider
            id="speed-slider"
            min={0.5}
            max={2.0}
            step={0.1}
            value={[speed]}
            onValueChange={([value]) => setSpeed(value)}
            disabled={isGenerating}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Slower</span>
            <span>Faster</span>
          </div>
        </div>

        {/* Pitch Control */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="pitch-slider">Pitch</Label>
            <span className="text-sm text-muted-foreground">
              {pitch > 0 ? '+' : ''}
              {pitch}
            </span>
          </div>
          <Slider
            id="pitch-slider"
            min={-10}
            max={10}
            step={1}
            value={[pitch]}
            onValueChange={([value]) => setPitch(value)}
            disabled={isGenerating}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Lower</span>
            <span>Higher</span>
          </div>
        </div>

        {/* Emotion Selection */}
        <div className="space-y-2">
          <Label htmlFor="emotion-select">Emotion (Optional)</Label>
          <Select
            value={emotion}
            onValueChange={(value) =>
              setEmotion(value as VoiceOver['emotion'])
            }
            disabled={isGenerating}
          >
            <SelectTrigger id="emotion-select">
              <SelectValue placeholder="Select emotion" />
            </SelectTrigger>
            <SelectContent>
              {EMOTION_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4">
          <Button
            onClick={handleGenerate}
            disabled={!isValid || isGenerating}
            className="flex-1"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Mic className="mr-2 h-4 w-4" />
                Generate Voiceover
              </>
            )}
          </Button>
          {onCancel && (
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={isGenerating}
            >
              Cancel
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
