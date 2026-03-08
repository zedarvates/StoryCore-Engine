/**
 * VoiceSettingsPanel Component
 * 
 * Configuration UI for voice recognition settings including:
 * - Enable/disable voice recognition
 * - Language selection
 * - Voice speed, pitch, volume
 * - Hotkey configuration
 * - Auto-speak responses toggle
 */

import React, { useState } from 'react';
import { Mic, Volume2, Info, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { voiceTextService, VoiceTextService, type VoiceSettings } from '@/services/VoiceTextService';
import type { LanguageCode } from '@/utils/llmConfigStorage';
import { useEffect } from 'react';

interface VoiceSettingsPanelProps {
  className?: string;
  onSettingsChange?: (settings: VoiceSettings) => void;
}

const LANGUAGE_OPTIONS: { value: LanguageCode; label: string }[] = [
  { value: 'fr', label: 'Français' },
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
  { value: 'de', label: 'Deutsch' },
  { value: 'it', label: 'Italiano' },
  { value: 'pt', label: 'Português' },
  { value: 'ja', label: '日本語' },
  { value: 'zh', label: '中文' },
  { value: 'ko', label: '한국어' },
];

const HOTKEY_OPTIONS = [
  { value: 'none', label: 'Aucun (désactivé)' },
  { value: 'ctrl', label: 'Ctrl (maintenir)' },
  { value: 'alt', label: 'Alt + Space' },
  { value: 'shift', label: 'Shift + Space' },
];

// Get initial settings (synchronous at module level)
const getInitialVoiceSettings = (): VoiceSettings => voiceTextService.getSettings();

export function VoiceSettingsPanel({ className, onSettingsChange }: VoiceSettingsPanelProps) {
  const [settings, setSettings] = useState<VoiceSettings>(getInitialVoiceSettings);
  const [isTestListening, setIsTestListening] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [volumeLevel, setVolumeLevel] = useState(0);

  // Load devices on mount
  useEffect(() => {
    const loadDevices = async () => {
      try {
        // Request permissions first to get labels
        await navigator.mediaDevices.getUserMedia({ audio: true });
        const allDevices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = allDevices.filter(device => device.kind === 'audioinput');
        setDevices(audioInputs);
      } catch (err) {
        console.warn('Impossible de lister les microphones:', err);
      }
    };

    loadDevices();
  }, []);

  // Update volume Level indicator if listening
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isTestListening) {
      interval = setInterval(() => {
        setVolumeLevel(VoiceTextService.getInstance().getVolumeLevel());
      }, 50);
    } else {
      setVolumeLevel(0);
    }
    return () => clearInterval(interval);
  }, [isTestListening]);

  const updateSettings = (updates: Partial<VoiceSettings>) => {
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);
    voiceTextService.saveSettings(newSettings);
    onSettingsChange?.(newSettings);
  };

  const handleTestMicrophone = async () => {
    setIsTestListening(true);
    setTestResult(null);

    const success = voiceTextService.startListening({
      onStart: () => {
        setTestResult('Écoute en cours... Parlez maintenant.');
      },
      onResult: (result) => {
        if (result.isFinal) {
          setTestResult(`Reconnu: "${result.transcript}" (${Math.round(result.confidence * 100)}% confiance)`);
          setIsTestListening(false);
        }
      },
      onError: (error) => {
        setTestResult(`Erreur: ${error}`);
        setIsTestListening(false);
      },
      onEnd: () => {
        setIsTestListening(false);
      },
    });

    if (!success) {
      setTestResult('Impossible de démarrer la reconnaissance vocale');
      setIsTestListening(false);
    }

    // Auto-stop after 5 seconds
    setTimeout(() => {
      if (isTestListening) {
        voiceTextService.stopListening();
        setIsTestListening(false);
        if (!testResult) {
          setTestResult('Aucune parole détectée');
        }
      }
    }, 5000);
  };

  const handleTestSynthesis = () => {
    const testText = settings.outputLanguage === 'fr'
      ? 'Test de synthèse vocale réussi'
      : 'Speech synthesis test successful';
    
    const success = voiceTextService.speak(testText);
    if (!success) {
      console.warn('Synthèse vocale non disponible');
    }
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
          <Mic className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Reconnaissance Vocale</h2>
          <p className="text-sm text-muted-foreground">
            Configurez l'entrée et la sortie vocales
          </p>
        </div>
      </div>

      {/* Voice Recognition Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Mic className="w-4 h-4" />
            Entrée Vocale
          </CardTitle>
          <CardDescription>
            Configuration de la reconnaissance vocale
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Microphone Device Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Settings2 className="w-4 h-4" />
              Microphone principal
            </Label>
            <Select
              value={settings.inputDevice || 'default'}
              onValueChange={(value) => updateSettings({ inputDevice: value })}
              disabled={!settings.enabled}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un microphone" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Par défaut du système</SelectItem>
                {devices.map((device) => (
                  <SelectItem key={device.deviceId} value={device.deviceId}>
                    {device.label || `Microphone (${device.deviceId.slice(0, 5)}...)`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Volume Indicator / VU Meter */}
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden mt-2">
              <div 
                className={cn(
                  "h-full transition-all duration-75",
                  volumeLevel > 70 ? "bg-red-500" : volumeLevel > 40 ? "bg-green-500" : "bg-blue-500"
                )}
                style={{ width: `${Math.min(100, volumeLevel)}%` }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground flex justify-between">
              <span>Niveau d'entrée : {Math.round(volumeLevel)}%</span>
              {isTestListening && <span className="text-blue-500 animate-pulse">Capteur actif</span>}
            </p>
          </div>

          {/* Enable Voice */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Activer la reconnaissance vocale</Label>
              <p className="text-xs text-muted-foreground">
                Permet la saisie vocale dans l'application
              </p>
            </div>
            <Switch
              checked={settings.enabled}
              onCheckedChange={(checked) => updateSettings({ enabled: checked })}
            />
          </div>

          {/* Input Language */}
          <div className="space-y-2">
            <Label>Langue de reconnaissance</Label>
            <Select
              value={settings.inputLanguage}
              onValueChange={(value) => updateSettings({ inputLanguage: value as LanguageCode })}
              disabled={!settings.enabled}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner une langue" />
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

          {/* Hotkey Configuration */}
          <div className="space-y-2">
            <Label>Raccourci d'activation</Label>
            <Select
              value={settings.activationHotkey.modifier}
              onValueChange={(value) => 
                updateSettings({
                  activationHotkey: {
                    ...settings.activationHotkey,
                    modifier: value as 'alt' | 'ctrl' | 'shift' | 'meta' | 'none',
                    enabled: value !== 'none',
                  }
                })
              }
              disabled={!settings.enabled}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un raccourci" />
              </SelectTrigger>
              <SelectContent>
                {HOTKEY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {settings.activationHotkey.modifier === 'ctrl' 
                ? 'Maintenez Ctrl pour parler (push-to-talk)'
                : settings.activationHotkey.modifier === 'alt'
                ? 'Appuyez sur Alt + Space pour activer/désactiver'
                : settings.activationHotkey.modifier === 'shift'
                ? 'Appuyez sur Shift + Space pour activer/désactiver'
                : 'Utilisez le bouton microphone pour activer'}
            </p>
          </div>

          {/* Test Microphone */}
          <div className="space-y-2">
            <Button
              variant="outline"
              onClick={handleTestMicrophone}
              disabled={!settings.enabled || isTestListening}
              className="w-full"
            >
              <Mic className={cn('w-4 h-4 mr-2', isTestListening && 'animate-pulse')} />
              {isTestListening ? 'Écoute en cours...' : 'Tester le microphone'}
            </Button>
            {testResult && (
              <p className="text-xs text-muted-foreground p-2 bg-muted rounded-md">
                {testResult}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Voice Synthesis Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Volume2 className="w-4 h-4" />
            Synthèse Vocale
          </CardTitle>
          <CardDescription>
            Configuration de la lecture des réponses
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Output Language */}
          <div className="space-y-2">
            <Label>Langue de synthèse</Label>
            <Select
              value={settings.outputLanguage}
              onValueChange={(value) => updateSettings({ outputLanguage: value as LanguageCode })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner une langue" />
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

          {/* Auto Speak Responses */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Lire les réponses automatiquement</Label>
              <p className="text-xs text-muted-foreground">
                L'assistant lit ses réponses à voix haute
              </p>
            </div>
            <Switch
              checked={settings.autoSpeakResponses}
              onCheckedChange={(checked) => updateSettings({ autoSpeakResponses: checked })}
            />
          </div>

          {/* Voice Speed */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label>Vitesse de la voix</Label>
              <span className="text-sm text-muted-foreground">{settings.voiceSpeed.toFixed(1)}x</span>
            </div>
            <Slider
              min={0.5}
              max={2.0}
              step={0.1}
              value={[settings.voiceSpeed]}
              onValueChange={([value]) => updateSettings({ voiceSpeed: value })}
            />
          </div>

          {/* Voice Pitch */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label>Tonalité de la voix</Label>
              <span className="text-sm text-muted-foreground">{settings.voicePitch.toFixed(1)}</span>
            </div>
            <Slider
              min={0}
              max={2}
              step={0.1}
              value={[settings.voicePitch]}
              onValueChange={([value]) => updateSettings({ voicePitch: value })}
            />
          </div>

          {/* Voice Volume */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label>Volume</Label>
              <span className="text-sm text-muted-foreground">{Math.round(settings.voiceVolume * 100)}%</span>
            </div>
            <Slider
              min={0}
              max={1}
              step={0.1}
              value={[settings.voiceVolume]}
              onValueChange={([value]) => updateSettings({ voiceVolume: value })}
            />
          </div>

          {/* Test Synthesis */}
          <Button
            variant="outline"
            onClick={handleTestSynthesis}
            className="w-full"
          >
            <Volume2 className="w-4 h-4 mr-2" />
            Tester la synthèse vocale
          </Button>
        </CardContent>
      </Card>

      {/* Info Box */}
      <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
        <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
        <div className="text-xs text-blue-800 dark:text-blue-200">
          <p className="font-medium mb-1">Conseil d'utilisation</p>
          <p>
            {settings.activationHotkey.modifier === 'ctrl'
              ? 'Maintenez la touche Ctrl enfoncée pendant que vous parlez pour activer la reconnaissance vocale.'
              : 'Cliquez sur le bouton microphone ou utilisez le raccourci configuré pour activer la reconnaissance.'}
          </p>
        </div>
      </div>
    </div>
  );
}

export default VoiceSettingsPanel;