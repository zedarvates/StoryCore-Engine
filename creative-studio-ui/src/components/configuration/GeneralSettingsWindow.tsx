/**
 * General Settings Window Component
 *
 * Modal window for configuring general application settings with dark neon theme
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import {
  Settings,
  Monitor,
  Palette,
  Globe,
  Bell,
  HardDrive,
  Cpu,
  Zap,
  Volume2,
  Eye,
  Moon,
  Sun,
} from 'lucide-react';

interface GeneralSettingsWindowProps {
  isOpen: boolean;
  onClose: () => void;
}

interface GeneralSettings {
  // Appearance
  theme: 'dark' | 'light' | 'auto';
  language: string;
  fontSize: 'small' | 'medium' | 'large';
  neonEffects: boolean;
  animations: boolean;

  // Interface
  autoSave: boolean;
  autoSaveInterval: number;
  showTooltips: boolean;
  compactMode: boolean;
  sidebarPosition: 'left' | 'right';

  // Performance
  maxMemory: number;
  gpuAcceleration: boolean;
  backgroundProcessing: boolean;
  cacheSize: number;

  // Audio/Video
  defaultAudioFormat: string;
  defaultVideoFormat: string;
  previewQuality: 'low' | 'medium' | 'high';
  audioNormalization: boolean;

  // Notifications
  enableNotifications: boolean;
  notificationSound: boolean;
  notificationDuration: number;
  errorAlerts: boolean;
}

const DEFAULT_SETTINGS: GeneralSettings = {
  // Appearance
  theme: 'dark',
  language: 'fr',
  fontSize: 'medium',
  neonEffects: true,
  animations: true,

  // Interface
  autoSave: true,
  autoSaveInterval: 30,
  showTooltips: true,
  compactMode: false,
  sidebarPosition: 'left',

  // Performance
  maxMemory: 4096,
  gpuAcceleration: true,
  backgroundProcessing: true,
  cacheSize: 1024,

  // Audio/Video
  defaultAudioFormat: 'mp3',
  defaultVideoFormat: 'mp4',
  previewQuality: 'high',
  audioNormalization: true,

  // Notifications
  enableNotifications: true,
  notificationSound: true,
  notificationDuration: 5000,
  errorAlerts: true,
};

export function GeneralSettingsWindow({ isOpen, onClose }: GeneralSettingsWindowProps) {
  const { toast } = useToast();
  const [settings, setSettings] = useState<GeneralSettings>(DEFAULT_SETTINGS);
  const [hasChanges, setHasChanges] = useState(false);

  // Load settings on open
  useEffect(() => {
    if (isOpen) {
      const savedSettings = localStorage.getItem('general-settings');
      if (savedSettings) {
        try {
          const parsed = JSON.parse(savedSettings);
          setSettings({ ...DEFAULT_SETTINGS, ...parsed });
        } catch (error) {
          console.error('Failed to load general settings:', error);
          setSettings(DEFAULT_SETTINGS);
        }
      }
      setHasChanges(false);
    }
  }, [isOpen]);

  // Mark as changed when settings change
  useEffect(() => {
    setHasChanges(true);
  }, [settings]);

  const updateSetting = <K extends keyof GeneralSettings>(
    key: K,
    value: GeneralSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    try {
      localStorage.setItem('general-settings', JSON.stringify(settings));

      // Apply theme changes immediately
      document.documentElement.classList.toggle('dark', settings.theme === 'dark');

      // Apply neon effects
      document.documentElement.classList.toggle('neon-disabled', !settings.neonEffects);

      toast({
        title: 'Settings Saved',
        description: 'General settings have been saved successfully.',
      });

      setHasChanges(false);
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast({
        title: 'Save Failed',
        description: 'Failed to save general settings.',
        variant: 'destructive',
      });
    }
  };

  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS);
    toast({
      title: 'Settings Reset',
      description: 'Settings have been reset to defaults.',
    });
  };

  const handleCancel = () => {
    if (hasChanges) {
      const confirmed = window.confirm('You have unsaved changes. Are you sure you want to cancel?');
      if (!confirmed) return;
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto cyber-card border-primary/30 bg-card/95 backdrop-blur-sm">
        <DialogHeader className="border-b border-primary/30 bg-card/95 backdrop-blur-sm">
          <DialogTitle className="neon-text text-primary text-xl font-bold flex items-center gap-2">
            <Settings className="w-5 h-5" />
            General Settings
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 space-y-8">
          {/* Appearance Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Palette className="w-5 h-5 text-accent" />
              <h3 className="text-lg font-semibold neon-text">Appearance</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-7">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Theme</Label>
                <Select value={settings.theme} onValueChange={(value: unknown) => updateSetting('theme', value)}>
                  <SelectTrigger className="bg-background/50 border-primary/30">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dark">
                      <div className="flex items-center gap-2">
                        <Moon className="w-4 h-4" />
                        Dark
                      </div>
                    </SelectItem>
                    <SelectItem value="light">
                      <div className="flex items-center gap-2">
                        <Sun className="w-4 h-4" />
                        Light
                      </div>
                    </SelectItem>
                    <SelectItem value="auto">
                      <div className="flex items-center gap-2">
                        <Monitor className="w-4 h-4" />
                        Auto
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">Language</Label>
                <Select value={settings.language} onValueChange={(value) => updateSetting('language', value)}>
                  <SelectTrigger className="bg-background/50 border-primary/30">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="fr">Français</SelectItem>
                    <SelectItem value="es">Español</SelectItem>
                    <SelectItem value="de">Deutsch</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">Font Size</Label>
                <Select value={settings.fontSize} onValueChange={(value: unknown) => updateSetting('fontSize', value)}>
                  <SelectTrigger className="bg-background/50 border-primary/30">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">Small</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="large">Large</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <Label className="text-muted-foreground">Neon Effects</Label>
                <Switch
                  checked={settings.neonEffects}
                  onCheckedChange={(checked) => updateSetting('neonEffects', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label className="text-muted-foreground">Animations</Label>
                <Switch
                  checked={settings.animations}
                  onCheckedChange={(checked) => updateSetting('animations', checked)}
                />
              </div>
            </div>
          </div>

          <Separator className="bg-primary/30" />

          {/* Interface Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Monitor className="w-5 h-5 text-accent" />
              <h3 className="text-lg font-semibold neon-text">Interface</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-7">
              <div className="flex items-center justify-between">
                <Label className="text-muted-foreground">Auto Save</Label>
                <Switch
                  checked={settings.autoSave}
                  onCheckedChange={(checked) => updateSetting('autoSave', checked)}
                />
              </div>

              {settings.autoSave && (
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Auto Save Interval (seconds)</Label>
                  <Input
                    type="number"
                    value={settings.autoSaveInterval}
                    onChange={(e) => updateSetting('autoSaveInterval', parseInt(e.target.value))}
                    min="10"
                    max="300"
                    className="bg-background/50 border-primary/30"
                  />
                </div>
              )}

              <div className="flex items-center justify-between">
                <Label className="text-muted-foreground">Show Tooltips</Label>
                <Switch
                  checked={settings.showTooltips}
                  onCheckedChange={(checked) => updateSetting('showTooltips', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label className="text-muted-foreground">Compact Mode</Label>
                <Switch
                  checked={settings.compactMode}
                  onCheckedChange={(checked) => updateSetting('compactMode', checked)}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">Sidebar Position</Label>
                <Select value={settings.sidebarPosition} onValueChange={(value: unknown) => updateSetting('sidebarPosition', value)}>
                  <SelectTrigger className="bg-background/50 border-primary/30">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="left">Left</SelectItem>
                    <SelectItem value="right">Right</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator className="bg-primary/30" />

          {/* Performance Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-accent" />
              <h3 className="text-lg font-semibold neon-text">Performance</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-7">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Max Memory (MB)</Label>
                <Input
                  type="number"
                  value={settings.maxMemory}
                  onChange={(e) => updateSetting('maxMemory', parseInt(e.target.value))}
                  min="1024"
                  max="16384"
                  step="512"
                  className="bg-background/50 border-primary/30"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">Cache Size (MB)</Label>
                <Input
                  type="number"
                  value={settings.cacheSize}
                  onChange={(e) => updateSetting('cacheSize', parseInt(e.target.value))}
                  min="256"
                  max="4096"
                  step="256"
                  className="bg-background/50 border-primary/30"
                />
              </div>

              <div className="flex items-center justify-between">
                <Label className="text-muted-foreground">GPU Acceleration</Label>
                <Switch
                  checked={settings.gpuAcceleration}
                  onCheckedChange={(checked) => updateSetting('gpuAcceleration', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label className="text-muted-foreground">Background Processing</Label>
                <Switch
                  checked={settings.backgroundProcessing}
                  onCheckedChange={(checked) => updateSetting('backgroundProcessing', checked)}
                />
              </div>
            </div>
          </div>

          <Separator className="bg-primary/30" />

          {/* Audio/Video Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Volume2 className="w-5 h-5 text-accent" />
              <h3 className="text-lg font-semibold neon-text">Audio & Video</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-7">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Default Audio Format</Label>
                <Select value={settings.defaultAudioFormat} onValueChange={(value) => updateSetting('defaultAudioFormat', value)}>
                  <SelectTrigger className="bg-background/50 border-primary/30">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mp3">MP3</SelectItem>
                    <SelectItem value="wav">WAV</SelectItem>
                    <SelectItem value="flac">FLAC</SelectItem>
                    <SelectItem value="aac">AAC</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">Default Video Format</Label>
                <Select value={settings.defaultVideoFormat} onValueChange={(value) => updateSetting('defaultVideoFormat', value)}>
                  <SelectTrigger className="bg-background/50 border-primary/30">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mp4">MP4</SelectItem>
                    <SelectItem value="webm">WebM</SelectItem>
                    <SelectItem value="avi">AVI</SelectItem>
                    <SelectItem value="mov">MOV</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">Preview Quality</Label>
                <Select value={settings.previewQuality} onValueChange={(value: unknown) => updateSetting('previewQuality', value)}>
                  <SelectTrigger className="bg-background/50 border-primary/30">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <Label className="text-muted-foreground">Audio Normalization</Label>
                <Switch
                  checked={settings.audioNormalization}
                  onCheckedChange={(checked) => updateSetting('audioNormalization', checked)}
                />
              </div>
            </div>
          </div>

          <Separator className="bg-primary/30" />

          {/* Notifications Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-accent" />
              <h3 className="text-lg font-semibold neon-text">Notifications</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-7">
              <div className="flex items-center justify-between">
                <Label className="text-muted-foreground">Enable Notifications</Label>
                <Switch
                  checked={settings.enableNotifications}
                  onCheckedChange={(checked) => updateSetting('enableNotifications', checked)}
                />
              </div>

              {settings.enableNotifications && (
                <>
                  <div className="flex items-center justify-between">
                    <Label className="text-muted-foreground">Notification Sound</Label>
                    <Switch
                      checked={settings.notificationSound}
                      onCheckedChange={(checked) => updateSetting('notificationSound', checked)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Notification Duration (ms)</Label>
                    <Input
                      type="number"
                      value={settings.notificationDuration}
                      onChange={(e) => updateSetting('notificationDuration', parseInt(e.target.value))}
                      min="1000"
                      max="10000"
                      step="500"
                      className="bg-background/50 border-primary/30"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label className="text-muted-foreground">Error Alerts</Label>
                    <Switch
                      checked={settings.errorAlerts}
                      onCheckedChange={(checked) => updateSetting('errorAlerts', checked)}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-primary/30 bg-card/95 px-6 py-4 backdrop-blur-sm flex justify-between">
          <Button variant="outline" onClick={handleReset} className="border-primary/30 hover:bg-accent/20">
            Reset to Defaults
          </Button>
          <div className="space-x-2">
            <Button variant="ghost" onClick={handleCancel}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="btn-neon rounded neon-border"
              disabled={!hasChanges}
            >
              <Zap className="w-4 h-4 mr-2" />
              Save Settings
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

